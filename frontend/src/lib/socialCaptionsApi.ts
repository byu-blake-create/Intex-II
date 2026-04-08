import { apiPost } from './api'

export interface CaptionRequest {
  platform: string
  topic: string
  tone: string
  campaign?: string
  ctaPhrase?: string
  includeResidentStory: boolean
  additionalContext?: string
}

export interface CaptionResponse {
  variants: string[]
  factsUsed: string[]
  voiceNotes: string
  modelUsed: string
}

export function generateCaption(req: CaptionRequest): Promise<CaptionResponse> {
  return apiPost<CaptionResponse>('/api/socialmediacaptions/generate', req)
}
