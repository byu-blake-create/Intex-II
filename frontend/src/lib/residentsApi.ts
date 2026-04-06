import { apiGet } from './api'
import type { PaginatedList } from '../types/api'
import type { Resident } from '../types/domain'

export function residentsUrl(params: {
  pageNum?: number
  pageSize?: number
  safehouseId?: number
  caseStatus?: string
  caseCategory?: string
  search?: string
}) {
  const q = new URLSearchParams()
  if (params.pageNum) q.set('pageNum', String(params.pageNum))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.safehouseId != null) q.set('safehouseId', String(params.safehouseId))
  if (params.caseStatus) q.set('caseStatus', params.caseStatus)
  if (params.caseCategory) q.set('caseCategory', params.caseCategory)
  if (params.search) q.set('search', params.search)
  const qs = q.toString()
  return `/api/residents${qs ? `?${qs}` : ''}`
}

export function fetchResidents(params: Parameters<typeof residentsUrl>[0]) {
  return apiGet<PaginatedList<Resident>>(residentsUrl(params))
}
