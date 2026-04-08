export interface PredictRequest {
  platform: string
  postHour: number
  numHashtags: number
  mentionsCount: number
  captionLength: number
  hasCallToAction: boolean
  featuresResidentStory: boolean
  isBoosted: boolean
  boostBudgetPhp: number
  followerCountAtPost: number
  monthNum: number
  isWeekend: boolean
  dayOfWeek: string
  postType: string
  mediaType: string
  callToActionType: string | null
  contentTopic: string
  sentimentTone: string
  campaignName: string | null
}

export interface PredictResponse {
  // Engagement
  engagementPredictedRate: number
  engagementPredictedPct: string
  engagementTier: 'Low' | 'Medium' | 'High'
  engagementTierDescription: string
  // Click-throughs
  clicksPredicted: number
  clicksPredictedStr: string
  clicksTier: 'Low' | 'Medium' | 'High'
  clicksTierDescription: string
  // Reach
  reachPredicted: number
  reachTier: 'Low' | 'Medium' | 'High'
  reachTierDescription: string
  // Impressions
  impressionsPredicted: number
  impressionsTier: 'Low' | 'Medium' | 'High'
  impressionsTierDescription: string
  // Context
  platformContext: string
  modelNote: string
  tips: string[]
}

export async function predictPostPerformance(req: PredictRequest): Promise<PredictResponse> {
  const response = await fetch('/api/socialpredict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<PredictResponse>
}
