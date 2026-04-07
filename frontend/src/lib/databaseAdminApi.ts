import { apiDelete, apiGet, apiPost, apiPut } from './api'
import type { AdminDatabaseLookupOption, AdminDatabasePage, AdminDatabaseRow, AdminDatabaseTable, AdminDatabaseValue } from '../types/adminDatabase'

export function fetchAdminDatabaseTables() {
  return apiGet<AdminDatabaseTable[]>('/api/admin/database/tables')
}

export function fetchAdminDatabaseRows(table: string, params: { pageNum?: number; pageSize?: number; search?: string }) {
  const query = new URLSearchParams()
  if (params.pageNum) query.set('pageNum', String(params.pageNum))
  if (params.pageSize) query.set('pageSize', String(params.pageSize))
  if (params.search) query.set('search', params.search)

  const qs = query.toString()
  return apiGet<AdminDatabasePage>(`/api/admin/database/${table}${qs ? `?${qs}` : ''}`)
}

export function fetchAdminDatabaseRow(table: string, id: string) {
  return apiGet<AdminDatabaseRow>(`/api/admin/database/${table}/${encodeURIComponent(id)}`)
}

export function createAdminDatabaseRow(table: string, payload: Record<string, AdminDatabaseValue>) {
  return apiPost<AdminDatabaseRow>(`/api/admin/database/${table}`, payload)
}

export function updateAdminDatabaseRow(table: string, id: string, payload: Record<string, AdminDatabaseValue>) {
  return apiPut(`/api/admin/database/${table}/${encodeURIComponent(id)}`, payload)
}

export function deleteAdminDatabaseRow(table: string, id: string) {
  return apiDelete(`/api/admin/database/${table}/${encodeURIComponent(id)}`, { confirm: true })
}

export function fetchAdminDatabaseLookup(table: string, field: string) {
  return apiGet<AdminDatabaseLookupOption[]>(`/api/admin/database/${table}/lookup/${field}`)
}
