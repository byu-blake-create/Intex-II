export type DetailTab = 'visits' | 'notes'

export type ResidentEditField = 'socialWorker' | 'conferenceDate'

export type InsightLevel = {
  label: 'High' | 'Medium' | 'Low'
  tone: 'high' | 'medium' | 'low'
}

export type OverdueInfo = {
  overdue: boolean
  noRecord: boolean
  days: number | null
}
