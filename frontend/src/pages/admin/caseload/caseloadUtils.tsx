import type { Resident } from '../../../types/domain'
import type { ResidentUpsertInput } from '../../../types/domain'

export function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="badge badge--gray">Unknown</span>
  const normalized = status.toLowerCase()
  if (normalized === 'active') return <span className="badge badge--green">Active</span>
  if (normalized === 'closed') return <span className="badge badge--gray">Closed</span>
  return <span className="badge badge--blue">{status}</span>
}

export function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

export function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
}

export function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

export function residentToUpsertInput(resident: Resident): ResidentUpsertInput {
  return {
    caseControlNo: resident.caseControlNo.trim(),
    internalCode: resident.internalCode ?? null,
    safehouseId: resident.safehouseId,
    caseStatus: resident.caseStatus ?? null,
    sex: resident.sex ?? null,
    dateOfBirth: resident.dateOfBirth ?? null,
    caseCategory: resident.caseCategory ?? null,
    assignedSocialWorker: resident.assignedSocialWorker ?? null,
    caseConferenceDate: resident.caseConferenceDate ?? null,
  }
}
