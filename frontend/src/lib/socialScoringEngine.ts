/**
 * Client-side ML approximation for social media post engagement scoring.
 * Based on GradientBoosting model (R²=0.75) trained on 812 posts.
 */

export interface PostScoreInputs {
  platform: string
  postType: string
  mediaType: string
  sentimentTone: string
  contentTopic: string
  hasCallToAction: boolean
  ctaType: string
  postHour: number
  isWeekend: boolean
  numHashtags: number
  captionLength: number
  featuresResidentStory: boolean
  isBoosted: boolean
  boostBudget: number
}

export interface PostScoreResult {
  predictedRate: number
  tier: 'needs-work' | 'fair' | 'good' | 'strong' | 'excellent'
  tierLabel: string
  primaryDriver: string
  improvements: Improvement[]
  platformComparison: { platform: string; rate: number }[]
}

export interface Improvement {
  change: string
  gain: number
  explanation: string
}

// ─── Constants ───────────────────────────────────────────────

const PLATFORM_BASE: Record<string, number> = {
  LinkedIn: 0.158, WhatsApp: 0.112, Twitter: 0.110,
  Instagram: 0.092, TikTok: 0.091, Facebook: 0.085, YouTube: 0.080,
}

const TONE_MULT: Record<string, number> = {
  Informative: 1.18, Emotional: 1.12, Inspirational: 1.09,
  Grateful: 1.05, Celebratory: 1.00, Urgent: 0.92,
}

const POST_TYPE_MULT: Record<string, number> = {
  ImpactStory: 1.15, EducationalContent: 1.10, ThankYou: 1.08,
  BehindTheScenes: 1.05, FundraisingAppeal: 0.97, EventPromotion: 0.91,
}

const MEDIA_MULT: Record<string, number> = {
  Reel: 1.25, Video: 1.20, Carousel: 1.13,
  Photo: 1.05, Story: 1.02, Text: 0.88,
}

export const PLATFORMS = Object.keys(PLATFORM_BASE)
export const TONES = Object.keys(TONE_MULT)
export const POST_TYPES = Object.keys(POST_TYPE_MULT)
export const MEDIA_TYPES = Object.keys(MEDIA_MULT)
export const TOPICS = ['Education', 'Reintegration', 'Fundraising', 'EventPromotion', 'Impact', 'Community']
export const CTA_TYPES = ['Donate', 'LearnMore', 'Share', 'Follow', 'Register', 'Volunteer']

// ─── Scoring ─────────────────────────────────────────────────

function computeRaw(inputs: PostScoreInputs, platformOverride?: string): number {
  const platform = platformOverride ?? inputs.platform
  const base = PLATFORM_BASE[platform] ?? 0.09
  const tone = TONE_MULT[inputs.sentimentTone] ?? 1.0
  const postType = POST_TYPE_MULT[inputs.postType] ?? 1.0
  const media = MEDIA_MULT[inputs.mediaType] ?? 1.0

  let score = base * tone * postType * media

  // Additive bonuses
  if (inputs.hasCallToAction) score += 0.015
  if (inputs.featuresResidentStory) score += 0.020
  if (inputs.isBoosted) {
    score += 0.008
    score += Math.min(inputs.boostBudget / 10000, 1) * 0.018
  }

  // Hashtags
  const h = inputs.numHashtags
  if (h >= 1 && h <= 2) score += 0.004
  else if (h >= 3 && h <= 7) score += 0.009
  else if (h >= 8 && h <= 15) score += 0.005
  else if (h >= 16) score -= 0.003

  // Caption length
  const cl = inputs.captionLength
  if (cl < 50) score -= 0.004
  else if (cl >= 100 && cl <= 250) score += 0.006
  else if (cl >= 251 && cl <= 400) score += 0.003
  else if (cl > 400) score -= 0.001

  // Post hour
  const hr = inputs.postHour
  if (hr >= 0 && hr <= 5) score -= 0.009
  else if (hr >= 6 && hr <= 8) score -= 0.002
  else if (hr >= 9 && hr <= 11) score += 0.011
  else if (hr >= 12 && hr <= 14) score += 0.005
  else if (hr >= 15 && hr <= 16) score += 0.003
  else if (hr >= 17 && hr <= 19) score += 0.009
  else if (hr >= 20 && hr <= 21) score += 0.002
  else if (hr >= 22) score -= 0.005

  // Weekend
  if (inputs.isWeekend) {
    if (platform === 'LinkedIn' || platform === 'Twitter') score -= 0.006
    else if (platform === 'Instagram' || platform === 'TikTok') score += 0.004
  }

  return Math.max(0, Math.min(1, score))
}

function getTier(rate: number): { tier: PostScoreResult['tier']; tierLabel: string } {
  if (rate < 0.06) return { tier: 'needs-work', tierLabel: 'Needs Work' }
  if (rate < 0.09) return { tier: 'fair', tierLabel: 'Fair' }
  if (rate < 0.12) return { tier: 'good', tierLabel: 'Good' }
  if (rate < 0.16) return { tier: 'strong', tierLabel: 'Strong' }
  return { tier: 'excellent', tierLabel: 'Excellent' }
}

function findPrimaryDriver(inputs: PostScoreInputs): string {
  const factors: { label: string; impact: number }[] = [
    { label: `Platform: ${inputs.platform}`, impact: PLATFORM_BASE[inputs.platform] ?? 0 },
    { label: `Tone: ${inputs.sentimentTone}`, impact: (TONE_MULT[inputs.sentimentTone] ?? 1) - 1 },
    { label: `Format: ${inputs.mediaType}`, impact: (MEDIA_MULT[inputs.mediaType] ?? 1) - 1 },
    { label: `Type: ${inputs.postType}`, impact: (POST_TYPE_MULT[inputs.postType] ?? 1) - 1 },
  ]
  if (inputs.featuresResidentStory) factors.push({ label: 'Resident Story', impact: 0.15 })
  if (inputs.hasCallToAction) factors.push({ label: 'Call to Action', impact: 0.10 })
  factors.sort((a, b) => b.impact - a.impact)
  return factors[0].label
}

function generateImprovements(inputs: PostScoreInputs, currentScore: number): Improvement[] {
  const candidates: Improvement[] = []

  // Try each media type
  for (const mt of MEDIA_TYPES) {
    if (mt === inputs.mediaType) continue
    const alt = computeRaw({ ...inputs, mediaType: mt })
    const gain = alt - currentScore
    if (gain > 0.005) {
      candidates.push({ change: `Switch to ${mt}`, gain, explanation: `${mt} content drives higher engagement for this platform and tone combination.` })
    }
  }

  // Informative tone
  if (inputs.sentimentTone !== 'Informative') {
    const alt = computeRaw({ ...inputs, sentimentTone: 'Informative' })
    const gain = alt - currentScore
    if (gain > 0.005) {
      candidates.push({ change: 'Use Informative tone', gain, explanation: 'Informative tone is the top engagement driver across all platforms (+18% vs baseline).' })
    }
  }

  // ImpactStory
  if (inputs.postType !== 'ImpactStory') {
    const alt = computeRaw({ ...inputs, postType: 'ImpactStory' })
    const gain = alt - currentScore
    if (gain > 0.005) {
      candidates.push({ change: 'Frame as an Impact Story', gain, explanation: 'Impact stories consistently outperform other post types by showing real outcomes.' })
    }
  }

  // Hour 10
  if (inputs.postHour !== 10) {
    const alt = computeRaw({ ...inputs, postHour: 10 })
    const gain = alt - currentScore
    if (gain > 0.005) {
      candidates.push({ change: 'Post at 10am instead', gain, explanation: 'Morning posts (9-11am) see the highest engagement across most platforms.' })
    }
  }

  // Resident story
  if (!inputs.featuresResidentStory) {
    const alt = computeRaw({ ...inputs, featuresResidentStory: true })
    const gain = alt - currentScore
    if (gain > 0.005) {
      candidates.push({ change: 'Include a resident story', gain, explanation: 'Posts featuring resident stories add ~2% predicted engagement when privacy allows.' })
    }
  }

  // CTA
  if (!inputs.hasCallToAction) {
    const alt = computeRaw({ ...inputs, hasCallToAction: true, ctaType: 'Donate' })
    const gain = alt - currentScore
    if (gain > 0.005) {
      candidates.push({ change: 'Add a call-to-action', gain, explanation: 'A clear CTA boosts engagement by giving the audience a next step.' })
    }
  }

  // Hashtags 3-7
  if (inputs.numHashtags < 3 || inputs.numHashtags > 7) {
    const alt = computeRaw({ ...inputs, numHashtags: 5 })
    const gain = alt - currentScore
    if (gain > 0.005) {
      candidates.push({ change: 'Use 3\u20137 hashtags', gain, explanation: 'The 3-7 hashtag range hits the sweet spot for discoverability without looking spammy.' })
    }
  }

  // Caption 100-250
  if (inputs.captionLength < 100 || inputs.captionLength > 250) {
    const alt = computeRaw({ ...inputs, captionLength: 175 })
    const gain = alt - currentScore
    if (gain > 0.005) {
      candidates.push({ change: 'Aim for 100\u2013250 character caption', gain, explanation: 'Mid-length captions balance detail with readability for optimal engagement.' })
    }
  }

  candidates.sort((a, b) => b.gain - a.gain)
  return candidates.slice(0, 3)
}

export function scorePost(inputs: PostScoreInputs): PostScoreResult {
  const predictedRate = computeRaw(inputs)
  const { tier, tierLabel } = getTier(predictedRate)
  const primaryDriver = findPrimaryDriver(inputs)
  const improvements = generateImprovements(inputs, predictedRate)

  const platformComparison = PLATFORMS.map(p => ({
    platform: p,
    rate: computeRaw(inputs, p),
  })).sort((a, b) => b.rate - a.rate)

  return { predictedRate, tier, tierLabel, primaryDriver, improvements, platformComparison }
}
