import { apiGet } from './api'
import type { PaginatedList } from '../types/api'
import type { PublicImpactSnapshot } from '../types/domain'

export function fetchPublishedSnapshots(pageNum = 1, pageSize = 20) {
  return apiGet<PaginatedList<PublicImpactSnapshot>>(
    `/api/publicimpactsnapshots/published?pageNum=${pageNum}&pageSize=${pageSize}`,
  )
}
