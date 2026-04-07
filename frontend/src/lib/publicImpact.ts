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
    const value = candidate.length === 7 ? `${candidate}-01` : candidate
    const date = new Date(value)
    if (!Number.isNaN(date.getTime())) return date
  }

  return null
}

function isMeaningfulSnapshot(metrics: ImpactMetrics): boolean {
  return Boolean(
    (metrics.totalResidents ?? 0) > 0 &&
      ((metrics.avgHealthScore ?? 0) > 0 ||
        (metrics.avgEducationProgress ?? 0) > 0 ||
        (metrics.donationsTotalForMonth ?? 0) > 0),
  )
}

export function formatImpactMonth(value?: string | null): string {
  if (!value) return 'Unknown period'
  const normalized = value.length === 7 ? `${value}-01` : value
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric' }).format(date)
}

export function formatImpactNumber(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value)
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
  const trend = [...recentWindow].reverse().map(item => ({
    id: item.snapshot.snapshotId,
    label: formatImpactMonth(item.metrics.month ?? item.snapshot.snapshotDate),
    educationProgress: item.metrics.avgEducationProgress ?? 0,
    healthScore: item.metrics.avgHealthScore ?? 0,
    residents: item.metrics.totalResidents ?? 0,
    donations: item.metrics.donationsTotalForMonth ?? 0,
  }))
  const oldestInWindow = trend[0] ?? null
  const latestTrend = trend[trend.length - 1] ?? null

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
