export interface Resident {
  residentId: number
  caseControlNo: string
  internalCode?: string | null
  safehouseId: number
  caseStatus?: string | null
  sex?: string | null
  dateOfBirth?: string | null
  caseCategory?: string | null
  assignedSocialWorker?: string | null
  caseConferenceDate?: string | null
  notesRestricted?: string | null
}

export interface ResidentUpsertInput {
  caseControlNo: string
  internalCode?: string | null
  safehouseId: number
  caseStatus?: string | null
  sex?: string | null
  dateOfBirth?: string | null
  caseCategory?: string | null
  assignedSocialWorker?: string | null
  caseConferenceDate?: string | null
}

export interface Safehouse {
  safehouseId: number
  safehouseCode: string
  name: string
  region?: string | null
  city?: string | null
}

export interface Supporter {
  supporterId: number
  supporterType: string
  displayName: string
  organizationName?: string | null
  email?: string | null
  status?: string | null
}

export interface Donation {
  donationId: number
  supporterId: number
  donationType: string
  donationDate?: string | null
  amount?: number | null
  currencyCode?: string | null
  campaignName?: string | null
}

export interface ProcessRecording {
  recordingId: number
  residentId: number
  sessionDate?: string | null
  socialWorker?: string | null
  sessionType?: string | null
  sessionNarrative?: string | null
  notesRestricted?: string | null
}

export interface ProcessRecordingUpsertInput {
  residentId: number
  sessionDate?: string | null
  socialWorker?: string | null
  sessionType?: string | null
  sessionDurationMinutes?: number | null
  emotionalStateObserved?: string | null
  emotionalStateEnd?: string | null
  sessionNarrative?: string | null
  interventionsApplied?: string | null
  followUpActions?: string | null
  progressNoted?: string | null
  concernsFlagged?: string | null
  referralMade?: string | null
  notesRestricted?: string | null
}

export interface HomeVisitation {
  visitationId: number
  residentId: number
  visitDate?: string | null
  socialWorker?: string | null
  visitType?: string | null
  observations?: string | null
  visitOutcome?: string | null
}

export interface HomeVisitationUpsertInput {
  residentId: number
  visitDate?: string | null
  socialWorker?: string | null
  visitType?: string | null
  locationVisited?: string | null
  familyMembersPresent?: string | null
  purpose?: string | null
  observations?: string | null
  familyCooperationLevel?: string | null
  safetyConcernsNoted?: string | null
  followUpNeeded?: boolean | null
  followUpNotes?: string | null
  visitOutcome?: string | null
}

export interface PublicImpactSnapshot {
  snapshotId: number
  snapshotDate?: string | null
  headline?: string | null
  summaryText?: string | null
  metricPayloadJson?: string | null
  isPublished: boolean
  publishedAt?: string | null
}

export interface DashboardSummary {
  activeResidents: number
  totalDonationsLast30Days: number
  donationAmountLast30Days: number
  upcomingCaseConferences: number
}

export interface SocialMediaPost {
  postId: number
  platform?: string | null
  postUrl?: string | null
  createdAt?: string | null
  postType?: string | null
  mediaType?: string | null
  caption?: string | null
  campaignName?: string | null
  sentimentTone?: string | null
  impressions?: number | null
  reach?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
  saves?: number | null
  clickThroughs?: number | null
  engagementRate?: number | null
  donationReferrals?: number | null
}
