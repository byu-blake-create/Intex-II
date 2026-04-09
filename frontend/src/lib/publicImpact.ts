import type { PublicImpactSnapshot } from '../types/domain'

interface RawImpactMetrics {
  month?: unknown
  avg_health_score?: unknown
  avg_education_progress?: unknown
  total_residents?: unknown
  donations_total_for_month?: unknown
}

export interface ImpactMetrics {
  month: string | null
  avgHealthScore: number | null
  avgEducationProgress: number | null
  totalResidents: number | null
  donationsTotalForMonth: number | null
}

interface SnapshotWithMetrics {
  snapshot: PublicImpactSnapshot
  metrics: ImpactMetrics
  effectiveDate: Date
}

const YEAR_MONTH_PATTERN = /^(\d{4})-(\d{2})$/
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export interface ImpactTrendPoint {
  id: number
  label: string
  educationProgress: number
  healthScore: number
  residents: number
  donations: number
}

export interface ImpactDashboardModel {
  latest: SnapshotWithMetrics
  previous: SnapshotWithMetrics | null
  trend: ImpactTrendPoint[]
  sixMonthDonations: number
  educationDelta: number | null
  healthDelta: number | null
  supportPerResident: number | null
}

function parseImpactDate(value: string): Date | null {
  const trimmed = value.trim()
  const yearMonthMatch = YEAR_MONTH_PATTERN.exec(trimmed)
  if (yearMonthMatch) {
    const [, year, month] = yearMonthMatch
    return new Date(Date.UTC(Number(year), Number(month) - 1, 1, 12))
  }

  const isoDateMatch = ISO_DATE_PATTERN.exec(trimmed)
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12))
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

function parsePayloadObject(raw: string): RawImpactMetrics | null {
  const candidates = [
    raw.trim(),
    raw
      .trim()
      .replace(/([{,]\s*)'([^']+)'(\s*:)/g, '$1"$2"$3')
      .replace(/:\s*'([^']*)'/g, ': "$1"'),
  ]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as RawImpactMetrics
      }
    } catch {
      continue
    }
  }

  return null
}

export function parseImpactMetrics(payloadJson?: string | null): ImpactMetrics | null {
  if (!payloadJson) return null

  const parsed = parsePayloadObject(payloadJson)
  if (!parsed) return null

  return {
    month: typeof parsed.month === 'string' ? parsed.month : null,
    avgHealthScore: coerceNumber(parsed.avg_health_score),
    avgEducationProgress: coerceNumber(parsed.avg_education_progress),
    totalResidents: coerceNumber(parsed.total_residents),
    donationsTotalForMonth: coerceNumber(parsed.donations_total_for_month),
  }
}

function parseEffectiveDate(snapshot: PublicImpactSnapshot, metrics: ImpactMetrics): Date | null {
  const candidates = [snapshot.snapshotDate, snapshot.publishedAt, metrics.month]

  for (const candidate of candidates) {
    if (!candidate) continue
    const date = parseImpactDate(candidate)
    if (date) return date
  }

  return null
}

function isMeaningfulSnapshot(metrics: ImpactMetrics): boolean {
  return Boolean(
    (metrics.totalResidents ?? 0) > 0 &&
      ((metrics.avgHealthScore ?? 0) > 0 || (metrics.avgEducationProgress ?? 0) > 0),
  )
}

export function formatImpactMonth(value?: string | null): string {
  if (!value) return 'Unknown period'
  const date = parseImpactDate(value)
  if (!date) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(
    date,
  )
}

export function formatImpactNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
}

export function formatImpactCurrency(value: number, fractionDigits = 0): string {
  return `$${formatImpactNumber(value, fractionDigits)}`
}

export function replaceShelterReferences(value?: string | null): string {
  if (!value) return ''
  return value.replace(/Lighthouse Sanctuary/gi, 'North Star Shelter')
}

export function buildImpactDashboardModel(
  snapshots: PublicImpactSnapshot[],
  now = new Date(),
): ImpactDashboardModel | null {
  const prepared = snapshots
    .map(snapshot => {
      const metrics = parseImpactMetrics(snapshot.metricPayloadJson)
      if (!metrics) return null

      const effectiveDate = parseEffectiveDate(snapshot, metrics)
      if (!effectiveDate || effectiveDate > now || !isMeaningfulSnapshot(metrics)) return null

      return { snapshot, metrics, effectiveDate }
    })
    .filter((item): item is SnapshotWithMetrics => item !== null)
    .sort((left, right) => right.effectiveDate.getTime() - left.effectiveDate.getTime())

  if (prepared.length === 0) return null

  const latest = prepared[0]
  const previous = prepared[1] ?? null
  const recentWindow = prepared.slice(0, 6)
  const trend = recentWindow.map(item => ({
    id: item.snapshot.snapshotId,
    label: formatImpactMonth(item.metrics.month ?? item.snapshot.snapshotDate),
    educationProgress: item.metrics.avgEducationProgress ?? 0,
    healthScore: item.metrics.avgHealthScore ?? 0,
    residents: item.metrics.totalResidents ?? 0,
    donations: item.metrics.donationsTotalForMonth ?? 0,
  }))
  const latestTrend = trend[0] ?? null
  const oldestInWindow = trend[trend.length - 1] ?? null

  return {
    latest,
    previous,
    trend,
    sixMonthDonations: recentWindow.reduce(
      (total, item) => total + (item.metrics.donationsTotalForMonth ?? 0),
      0,
    ),
    educationDelta:
      oldestInWindow && latestTrend
        ? latestTrend.educationProgress - oldestInWindow.educationProgress
        : null,
    healthDelta:
      oldestInWindow && latestTrend ? latestTrend.healthScore - oldestInWindow.healthScore : null,
    supportPerResident:
      (latest.metrics.totalResidents ?? 0) > 0
        ? (latest.metrics.donationsTotalForMonth ?? 0) / (latest.metrics.totalResidents ?? 1)
        : null,
  }
}
