import { apiGet } from './api'
import type { PaginatedList } from '../types/api'
import type { Donation } from '../types/domain'

export function donationsUrl(params: { pageNum?: number; pageSize?: number; supporterId?: number }) {
  const q = new URLSearchParams()
  if (params.pageNum) q.set('pageNum', String(params.pageNum))
  if (params.pageSize) q.set('pageSize', String(params.pageSize))
  if (params.supporterId != null) q.set('supporterId', String(params.supporterId))
  const qs = q.toString()
  return `/api/donations${qs ? `?${qs}` : ''}`
}

export function fetchDonations(params: Parameters<typeof donationsUrl>[0]) {
  return apiGet<PaginatedList<Donation>>(donationsUrl(params))
}

export interface MyDonationsResponse {
  supporterId?: number | null
  displayName: string
  email: string
  donationCount: number
  totalAmount: number
  donations: PaginatedList<Donation>
}

export function fetchMyDonations(pageNum = 1, pageSize = 20) {
  return apiGet<MyDonationsResponse>(`/api/donations/mine?pageNum=${pageNum}&pageSize=${pageSize}`)
}
