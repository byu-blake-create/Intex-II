import { apiGet } from './api'
import type { PaginatedList } from '../types/api'
import type { Supporter } from '../types/domain'

export function supportersUrl(params: { pageNum?: number; pageSize?: number; supporterType?: string; status?: string }) {
  const q = new URLSearchParams()
  if (params.pageNum) q.set('pageNum', String(params.pageNum))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.supporterType) q.set('supporterType', params.supporterType)
  if (params.status) q.set('status', params.status)
  const qs = q.toString()
  return `/api/supporters${qs ? `?${qs}` : ''}`
}

export function fetchSupporters(params: Parameters<typeof supportersUrl>[0]) {
  return apiGet<PaginatedList<Supporter>>(supportersUrl(params))
}
