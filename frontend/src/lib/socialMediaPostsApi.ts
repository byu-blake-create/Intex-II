import { apiGet } from './api'
import type { PaginatedList } from '../types/api'
import type { SocialMediaPost } from '../types/domain'

export interface SocialMediaPostsQuery {
  pageNum?: number
  pageSize?: number
  platform?: string
}

export function fetchSocialMediaPosts(query: SocialMediaPostsQuery = {}): Promise<PaginatedList<SocialMediaPost>> {
  const params = new URLSearchParams()
  if (query.pageNum) params.set('pageNum', String(query.pageNum))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.platform) params.set('platform', query.platform)

  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return apiGet<PaginatedList<SocialMediaPost>>(`/api/socialmediaposts${suffix}`)
}

export interface SocialPlatformInsight {
  platform: string
  avgEngagement: number
  bestHours: string
  topContentType: string
  topTone: string
  postCount: number
  keyInsight: string
}

export interface SocialContentGap {
  platform: string
  topic: string
  avgEngagement: number
  postFrequency: string
  opportunity: string
  priority: 'critical' | 'high' | 'medium'
}

export interface SocialTopPost {
  postId: number
  platform: string
  caption: string
  engagementRate: number
  postType: string
  tone: string
  mediaType: string
}

export interface SocialMediaInsights {
  platformInsights: SocialPlatformInsight[]
  contentGaps: SocialContentGap[]
  staticInsights: string[]
  topPosts: SocialTopPost[]
}

export function fetchSocialMediaInsights(): Promise<SocialMediaInsights> {
  return apiGet<SocialMediaInsights>('/api/socialmediaposts/insights')
}
