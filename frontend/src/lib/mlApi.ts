import { apiGet } from './api'

export interface DonorInsight {
  supporterId: number
  displayName: string
  supporterType: string
  status?: string | null
  email?: string | null
  churnProbability: number
  topFactor?: string | null
  highValueProbability?: number | null
  opportunityTier?: string | null
  predictionDate?: string | null
}

export interface ResidentInsight {
  residentId: number
  caseControlNo: string
  caseStatus?: string | null
  caseCategory?: string | null
  assignedSocialWorker?: string | null
  safehouseId: number
  safehouseName: string
  concernProbability: number
  riskLevel?: string | null
  topFactor?: string | null
  predictionDate?: string | null
}

export interface ReintegrationInsight {
  residentId: number
  caseControlNo: string
  caseStatus?: string | null
  reintegrationStatus?: string | null
  safehouseId: number
  safehouseName: string
  favorableProbability: number
  readinessLevel?: string | null
  topFactor?: string | null
}

export function fetchDonorWatchlist() {
  return apiGet<DonorInsight[]>('/api/ml/watchlist/donors?limit=100')
}

export function fetchTopOpportunities() {
  return apiGet<DonorInsight[]>('/api/ml/top-opportunities?limit=100')
}

export function fetchResidentWatchlist() {
  return apiGet<ResidentInsight[]>('/api/ml/watchlist/residents?limit=100')
}

export function fetchReintegrationPredictions() {
  return apiGet<ReintegrationInsight[]>('/api/ml/reintegration?limit=100')
}

