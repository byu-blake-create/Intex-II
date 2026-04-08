export type DetailTab = 'visits' | 'notes'

export type ResidentEditField = 'socialWorker' | 'conferenceDate'

export type OverdueInfo = {
  overdue: boolean
  noRecord: boolean
  days: number | null
}
