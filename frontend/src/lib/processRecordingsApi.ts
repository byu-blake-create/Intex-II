import { apiGet } from './api'
import type { PaginatedList } from '../types/api'
import type { ProcessRecording } from '../types/domain'

export function fetchProcessRecordings(residentId: number, pageNum = 1, pageSize = 50) {
  return apiGet<PaginatedList<ProcessRecording>>(
    `/api/processrecordings?residentId=${residentId}&pageNum=${pageNum}&pageSize=${pageSize}`,
  )
}
