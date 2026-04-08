import { apiGet } from './api'
import type { PaginatedList } from '../types/api'
import type { SocialMediaPost } from '../types/domain'

export interface SocialMediaPostsQuery {
  pageNum?: number
  pageSize?: number
  platform?: string
}

const SOCIAL_POSTS_PAGE_SIZE = 100

export function fetchSocialMediaPosts(query: SocialMediaPostsQuery = {}): Promise<PaginatedList<SocialMediaPost>> {
  const params = new URLSearchParams()
  if (query.pageNum) params.set('pageNum', String(query.pageNum))
  if (query.pageSize) params.set('pageSize', String(query.pageSize))
  if (query.platform) params.set('platform', query.platform)

  const suffix = params.size > 0 ? `?${params.toString()}` : ''
  return apiGet<PaginatedList<SocialMediaPost>>(`/api/socialmediaposts${suffix}`)
}

export async function fetchAllSocialMediaPosts(
  query: Omit<SocialMediaPostsQuery, 'pageNum' | 'pageSize'> = {}
): Promise<PaginatedList<SocialMediaPost>> {
  const firstPage = await fetchSocialMediaPosts({ ...query, pageNum: 1, pageSize: SOCIAL_POSTS_PAGE_SIZE })
  const totalPages = Math.ceil(firstPage.totalCount / SOCIAL_POSTS_PAGE_SIZE)

  if (totalPages <= 1) {
    return firstPage
  }

  const remainingPages = await Promise.all(
    Array.from({ length: totalPages - 1 }, (_, index) =>
      fetchSocialMediaPosts({
        ...query,
        pageNum: index + 2,
        pageSize: SOCIAL_POSTS_PAGE_SIZE,
      })
    )
  )

  return {
    items: [firstPage, ...remainingPages].flatMap(page => page.items),
    totalCount: firstPage.totalCount,
  }
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
  avgClicks?: number
  postFrequency: string
  opportunity: string
  priority: 'critical' | 'high' | 'medium'
}

export interface SocialTopPost {
  postId: number
  platform: string
  caption: string
  engagementRate: number
  clickThroughs?: number
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

export function fetchSocialMediaInsights(platform?: string): Promise<SocialMediaInsights> {
  const suffix = platform ? `?platform=${encodeURIComponent(platform)}` : ''
  return apiGet<SocialMediaInsights>(`/api/socialmediaposts/insights${suffix}`)
}

export interface SocialRecommendation {
  platform: string
  topic: string
  suggestedHour: string
  suggestedDay: string
  expectedClicks: number
  platformBaselineClicks: number
  bestPostType: string
  bestTone: string
  reasoning: string
  priority: 'high' | 'medium'
  category: string  // 'untapped' | 'double_down'
}

export function fetchRecommendations(platform?: string): Promise<SocialRecommendation[]> {
  const url = platform
    ? `/api/socialmediaposts/recommendations?platform=${encodeURIComponent(platform)}`
    : '/api/socialmediaposts/recommendations'
  return apiGet<SocialRecommendation[]>(url)
}
