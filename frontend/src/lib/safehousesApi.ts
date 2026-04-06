import { apiGet } from './api'
import type { PaginatedList } from '../types/api'
import type { Safehouse } from '../types/domain'

export function fetchSafehouses(pageNum = 1, pageSize = 100) {
  return apiGet<PaginatedList<Safehouse>>(`/api/safehouses?pageNum=${pageNum}&pageSize=${pageSize}`)
}
