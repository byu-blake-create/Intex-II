import { apiGet } from './api'

export interface AdminDashboardModelInfo {
  name: string
  version: string
  trainedAt: string
  metricLabel: string
  metricValue: string
  topFactor?: string
}

export interface AdminDashboardCard {
  id: string
  tone: 'alert' | 'opportunity' | 'care' | 'progress' | 'forecast' | 'outreach'
  title: string
  value: string
  plainLanguage: string
  detail: string
  route: string
  routeLabel: string
  model: AdminDashboardModelInfo
}

export interface AdminDashboardPriority {
  title: string
  detail: string
  route: string
  routeLabel: string
}

export interface AdminDashboardLane {
  title: string
  description: string
  route: string
}

export interface AdminDashboardData {
  snapshotLabel: string
  summary: string
  disclaimer: string
  heroChips: string[]
  cards: AdminDashboardCard[]
  priorities: AdminDashboardPriority[]
  lanes: AdminDashboardLane[]
}

export function fetchAdminDashboard() {
  return apiGet<AdminDashboardData>('/api/reports/command-center')
}
