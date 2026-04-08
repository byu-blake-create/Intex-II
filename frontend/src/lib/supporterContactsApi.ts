import { apiGet } from './api'

export interface SupporterContact {
  supporterContactId: number
  supporterId: number
  contactDate: string
  contactType: string
  outcome?: string | null
  notes?: string | null
  createdAt?: string | null
}

export function fetchSupporterContacts(supporterId: number) {
  return apiGet<SupporterContact[]>(`/api/supporters/${supporterId}/contacts`)
}
