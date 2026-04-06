import { apiGet } from './api'
import type { DashboardSummary } from '../types/domain'

export function fetchSummary() {
  return apiGet<DashboardSummary>('/api/reports/summary')
}

export function fetchDonationsByMonth(months = 12) {
  return apiGet<{ month: string; total: number }[]>(`/api/reports/donations-by-month?months=${months}`)
}
