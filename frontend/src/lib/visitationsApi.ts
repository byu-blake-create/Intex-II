import { apiGet } from './api'
import type { PaginatedList } from '../types/api'
import type { HomeVisitation } from '../types/domain'

export function fetchVisitations(residentId: number, pageNum = 1, pageSize = 50) {
  return apiGet<PaginatedList<HomeVisitation>>(
    `/api/homevisitations?residentId=${residentId}&pageNum=${pageNum}&pageSize=${pageSize}`,
  )
}
