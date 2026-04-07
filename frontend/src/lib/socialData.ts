/**
 * Static platform insights, caption templates, and content gap analysis
 * derived from the 812-post social media dataset.
 */

export interface PlatformInsight {
  platform: string
  emoji: string
  avgEngagement: number
  bestHours: string
  topContentType: string
  topTone: string
  charLimit: number | null
  keyInsight: string
  hashtagTip: string
  audienceNote: string
}

export const PLATFORM_INSIGHTS: PlatformInsight[] = [
  { platform: 'LinkedIn', emoji: '\u{1F4BC}', avgEngagement: 0.158,
    bestHours: '9\u201311am, 12\u20131pm', topContentType: 'EducationalContent',
    topTone: 'Informative', charLimit: 3000,
    keyInsight: 'LinkedIn consistently outperforms all other platforms for this org. Informative, professional content about trafficking education and impact stories drives the highest click-throughs.',
    hashtagTip: '3\u20135 professional hashtags work best. Avoid trending/generic tags.',
    audienceNote: 'Donors, corporate partners, and advocates. Lead with data and impact.' },
  { platform: 'WhatsApp', emoji: '\u{1F4AC}', avgEngagement: 0.112,
    bestHours: '8\u201310am, 6\u20138pm', topContentType: 'FundraisingAppeal',
    topTone: 'Grateful', charLimit: null,
    keyInsight: 'WhatsApp channels drive strong engagement through personal, community-feel messaging. Direct asks work here when relationships are warm.',
    hashtagTip: 'No hashtags needed \u2014 WhatsApp doesn\'t index them.',
    audienceNote: 'Warm community members and existing supporters. Conversational tone.' },
  { platform: 'Twitter', emoji: '\u{1F426}', avgEngagement: 0.110,
    bestHours: '9\u201311am, 5\u20137pm', topContentType: 'EducationalContent',
    topTone: 'Informative', charLimit: 280,
    keyInsight: 'Urgency and factual hooks drive shares. Resident statistics and one-line impact facts outperform appeals. Threads help with education content.',
    hashtagTip: '1\u20132 highly relevant hashtags maximum. #HumanTrafficking #ChildProtection',
    audienceNote: 'Activists, journalists, policy advocates. Short and punchy.' },
  { platform: 'Instagram', emoji: '\u{1F4F8}', avgEngagement: 0.092,
    bestHours: '11am\u20131pm, 7\u20139pm', topContentType: 'ImpactStory',
    topTone: 'Emotional', charLimit: 2200,
    keyInsight: 'Visual storytelling and emotional narratives drive saves and profile visits. Resident stories (anonymized) significantly boost engagement. Reels outperform static photos.',
    hashtagTip: '5\u201310 targeted hashtags in caption or first comment. Mix broad and niche.',
    audienceNote: 'Younger donors, volunteers, general public. Visual-first.' },
  { platform: 'TikTok', emoji: '\u{1F3B5}', avgEngagement: 0.091,
    bestHours: '7\u20139pm, 12\u20132pm', topContentType: 'BehindTheScenes',
    topTone: 'Emotional', charLimit: 2200,
    keyInsight: 'Authentic, behind-the-scenes content and emotional storytelling. High variance \u2014 great content can go viral. Avoid overly polished or corporate feel.',
    hashtagTip: '3\u20135 trending + niche mix. Use #ForYou sparingly.',
    audienceNote: 'Gen Z, new audiences. Raw and authentic beats polished.' },
  { platform: 'Facebook', emoji: '\u{1F465}', avgEngagement: 0.085,
    bestHours: '9\u201311am, 1\u20133pm', topContentType: 'FundraisingAppeal',
    topTone: 'Emotional', charLimit: 63206,
    keyInsight: 'Facebook works for community building and fundraising appeals. Longer posts with full stories outperform short posts. Boosted posts show significant engagement lift.',
    hashtagTip: '1\u20133 hashtags maximum. Hashtags matter less on Facebook.',
    audienceNote: 'Older donors, community members, parents. Storytelling works.' },
  { platform: 'YouTube', emoji: '\u25B6\uFE0F', avgEngagement: 0.080,
    bestHours: '2\u20134pm, 6\u20138pm', topContentType: 'ImpactStory',
    topTone: 'Inspirational', charLimit: 5000,
    keyInsight: 'Lowest engagement rate but highest content depth. Long-form impact documentaries and program walkthroughs perform well. Good for SEO and trust-building.',
    hashtagTip: 'Add hashtags in description for discoverability. Use title tags.',
    audienceNote: 'Research-oriented donors and partners. Depth over brevity.' },
]

// ─── Caption Templates ───────────────────────────────────────

export interface CaptionTemplate {
  id: string
  platform: string
  topic: string
  tone: string
  template: string
  tips: string[]
  exampleHashtags: string[]
  characterCount: string
}

export const CAPTION_TEMPLATES: CaptionTemplate[] = [
  {
    id: 'li-edu-info',
    platform: 'LinkedIn',
    topic: 'Education',
    tone: 'Informative',
    template: '[STAT] children in the Philippines are affected by trafficking each year.\n\nAt [PROGRAM_NAME], we believe education is the first line of defense. Our prevention workshops have now reached [STAT] communities across the region.\n\nHere\u2019s what we\u2019ve learned about what works \u2014 and what still needs to change.\n\n\u{1F449} Read our latest impact brief: [LINK]',
    tips: ['Lead with a compelling statistic', 'Keep paragraphs short for LinkedIn readability', 'End with a clear CTA linking to your site'],
    exampleHashtags: ['#HumanTrafficking', '#ChildProtection', '#SocialImpact', '#Philippines'],
    characterCount: '~380 chars',
  },
  {
    id: 'li-fund-grat',
    platform: 'LinkedIn',
    topic: 'Fundraising',
    tone: 'Grateful',
    template: 'Because of partners like you, [STAT] survivors received critical support this quarter.\n\nWe are deeply grateful to everyone who contributed to our [PROGRAM_NAME] campaign \u2014 your generosity directly funds safe housing, education, and counseling for children rebuilding their lives.\n\nThank you for believing that every child deserves safety.\n\n\u{1F4CC} See the full impact report: [LINK]',
    tips: ['Gratitude-first framing performs well on LinkedIn', 'Mention specific outcomes, not just dollar amounts', 'Tag corporate partners when appropriate'],
    exampleHashtags: ['#ThankYou', '#CorporateGiving', '#NorthStarShelter', '#Impact'],
    characterCount: '~420 chars',
  },
  {
    id: 'ig-impact-emo',
    platform: 'Instagram',
    topic: 'Impact',
    tone: 'Emotional',
    template: 'When [RESIDENT_NAME] first arrived, she barely spoke above a whisper.\n\nToday, she stood in front of her class and read her essay out loud \u2014 about the future she\u2019s building.\n\n[STAT] children like her have found their voice through [PROGRAM_NAME]. Every story like hers starts with someone who chose to care.\n\n\u{1F9E1} Link in bio to learn how you can help.',
    tips: ['Start with a personal moment \u2014 not a stat', 'Use line breaks generously for Instagram readability', 'End with a soft CTA, not a hard ask'],
    exampleHashtags: ['#SurvivorStory', '#HopeHeals', '#NorthStarShelter', '#Philippines', '#ChildAdvocacy', '#EndTrafficking'],
    characterCount: '~350 chars',
  },
  {
    id: 'ig-comm-insp',
    platform: 'Instagram',
    topic: 'Community',
    tone: 'Inspirational',
    template: 'It takes a village \u2014 and ours stretches across oceans. \u{1F30F}\n\nFrom volunteers in Manila to supporters in [CITY], our community is proof that distance doesn\u2019t limit compassion.\n\nThis month, [STAT] new volunteers joined our mission. Will you be next?\n\n\u{1F449} Tap the link in bio to get involved.',
    tips: ['Community-focused content drives saves and shares', 'Use a global/local contrast to broaden appeal', 'Carousel format works well for volunteer spotlights'],
    exampleHashtags: ['#Community', '#VolunteerWithUs', '#GlobalImpact', '#NorthStar', '#MakeADifference'],
    characterCount: '~300 chars',
  },
  {
    id: 'fb-fund-emo',
    platform: 'Facebook',
    topic: 'Fundraising',
    tone: 'Emotional',
    template: 'Every night, [STAT] children in the Philippines sleep without knowing if they\u2019re safe.\n\nNorth Star Shelter exists to change that \u2014 one child, one safe bed, one new beginning at a time.\n\nRight now, a generous donor is matching every gift up to [AMOUNT]. That means your [AMOUNT] becomes [AMOUNT] \u2014 doubling your impact for children like [RESIDENT_NAME].\n\n\u{1F49B} Give today: [LINK]\n\nEvery peso matters. Every child matters.',
    tips: ['Facebook audiences respond to longer, narrative-style posts', 'Mention matching gifts \u2014 they significantly increase conversion', 'Use a real (anonymized) story to anchor the ask'],
    exampleHashtags: ['#GiveHope', '#NorthStarShelter', '#ProtectChildren'],
    characterCount: '~450 chars',
  },
  {
    id: 'fb-ty-grat',
    platform: 'Facebook',
    topic: 'Fundraising',
    tone: 'Grateful',
    template: 'We did it. \u{1F389}\n\nThanks to [STAT] incredible donors, our [PROGRAM_NAME] campaign raised [AMOUNT] \u2014 enough to fund [STAT] months of safe housing for survivors.\n\nTo everyone who shared, donated, and prayed: THANK YOU. You are the reason these children have a future.\n\nHere\u2019s a look at what your generosity made possible this quarter \u2192 [LINK]',
    tips: ['Celebration posts get high shares on Facebook', 'Include a photo of the team or facility (no resident faces)', 'Tag donors who have given permission'],
    exampleHashtags: ['#ThankYou', '#MissionAccomplished', '#NorthStarFamily'],
    characterCount: '~380 chars',
  },
  {
    id: 'tw-edu-info',
    platform: 'Twitter',
    topic: 'Education',
    tone: 'Informative',
    template: '[STAT] children are trafficked in Southeast Asia every year. Most are under 15.\n\nOur prevention education program has reached [STAT] schools. Here\u2019s what the data shows \u2192',
    tips: ['Lead with the most striking stat', 'Keep under 280 characters', 'Use a thread for deeper content'],
    exampleHashtags: ['#HumanTrafficking', '#ChildProtection'],
    characterCount: '~180 chars',
  },
  {
    id: 'tw-urg-fund',
    platform: 'Twitter',
    topic: 'Fundraising',
    tone: 'Urgent',
    template: '\u{1F6A8} Emergency: [STAT] rescued children need immediate shelter this week.\n\nWe\u2019re [AMOUNT] short of our emergency fund goal.\n\nEvery donation before [DATE] is matched 2x.\n\nHelp now \u2192 [LINK]',
    tips: ['Urgency drives action on Twitter', 'Be specific about the need and deadline', 'Pin this tweet during the campaign'],
    exampleHashtags: ['#UrgentNeed', '#DonateNow'],
    characterCount: '~220 chars',
  },
  {
    id: 'tt-bts-emo',
    platform: 'TikTok',
    topic: 'Community',
    tone: 'Emotional',
    template: 'POV: You work at a shelter for rescued children in the Philippines \u{1F1F5}\u{1F1ED}\n\nThis is what our mornings look like \u2014 breakfast prep, homework help, and a whole lot of hugs.\n\nThese kids have been through more than most adults. But every day, they choose joy.\n\n[RESIDENT_NAME]\u2019s smile at the end? That\u2019s why we do this. \u{1F9E1}',
    tips: ['Use trending audio if possible', 'Keep text overlays short and readable', 'Raw, unpolished footage outperforms produced content on TikTok'],
    exampleHashtags: ['#ShelterLife', '#Philippines', '#ForYou', '#ChildAdvocacy'],
    characterCount: '~300 chars',
  },
  {
    id: 'wa-fund-grat',
    platform: 'WhatsApp',
    topic: 'Fundraising',
    tone: 'Grateful',
    template: 'Hi! \u{1F44B} Quick update from North Star Shelter:\n\nBecause of this community\u2019s support, [STAT] children received full educational scholarships this month.\n\nWe\u2019re so grateful for each of you. If you\u2019d like to help us reach our next goal of [AMOUNT] for [PROGRAM_NAME], here\u2019s how:\n\n\u{1F449} [LINK]\n\nThank you for being part of their journey. \u{1F49B}',
    tips: ['Keep it conversational \u2014 WhatsApp is personal', 'Use emojis naturally but don\u2019t overdo it', 'Send during morning or early evening for best open rates'],
    exampleHashtags: [],
    characterCount: '~320 chars',
  },
  {
    id: 'yt-impact-insp',
    platform: 'YouTube',
    topic: 'Impact',
    tone: 'Inspirational',
    template: '[RESIDENT_NAME]\u2019s Story: From Survivor to Scholar | North Star Shelter\n\nThree years ago, [RESIDENT_NAME] was rescued from a trafficking situation. Today, she\u2019s graduating top of her class.\n\nIn this video, we follow her journey through [PROGRAM_NAME] \u2014 the counseling, the education, and the community that helped her rebuild.\n\n\u{1F4CC} Support survivors like [RESIDENT_NAME]: [LINK]\n\nSubscribe for more stories of hope and resilience.',
    tips: ['YouTube descriptions should be 200+ words for SEO', 'Include timestamps for longer videos', 'Add a subscribe CTA and end screen'],
    exampleHashtags: ['#SurvivorStory', '#NorthStarShelter', '#HopeAndHealing', '#Philippines'],
    characterCount: '~450 chars',
  },
  {
    id: 'all-ty-celeb-1',
    platform: 'Facebook',
    topic: 'Impact',
    tone: 'Celebratory',
    template: '\u{1F389} MILESTONE: [STAT] children served since North Star Shelter opened its doors!\n\nEvery number represents a child who found safety, healing, and hope. Today we celebrate each one of them \u2014 and each of YOU who made it possible.\n\nHere\u2019s to the next [STAT]. Together, we\u2019re unstoppable. \u{1F49B}\n\n#NorthStarShelter #Milestone #Grateful',
    tips: ['Milestone posts get high engagement on all platforms', 'Adapt length per platform', 'Include a celebratory photo or graphic'],
    exampleHashtags: ['#Milestone', '#Celebrating', '#NorthStarShelter', '#Impact'],
    characterCount: '~340 chars',
  },
  {
    id: 'all-ty-celeb-2',
    platform: 'Instagram',
    topic: 'Impact',
    tone: 'Celebratory',
    template: '[STAT] children. [STAT] safe nights. [STAT] new beginnings.\n\nThis year, your support made all of it possible. \u{1F31F}\n\nWe\u2019re not just counting numbers \u2014 we\u2019re counting futures. And we can\u2019t wait to see what next year brings.\n\nThank you for being part of the North Star family. \u{1F9E1}',
    tips: ['Use a carousel with key stats on each slide', 'Celebratory content performs well as year-end wrap-ups', 'Tag volunteers and partners'],
    exampleHashtags: ['#YearInReview', '#ImpactReport', '#NorthStarFamily', '#Grateful', '#Celebrate'],
    characterCount: '~280 chars',
  },
  {
    id: 'all-ty-celeb-3',
    platform: 'LinkedIn',
    topic: 'Impact',
    tone: 'Celebratory',
    template: 'We\u2019re proud to share: North Star Shelter has been recognized by [PROGRAM_NAME] for our work in survivor rehabilitation.\n\nThis milestone belongs to our entire team \u2014 social workers, counselors, volunteers, and the [STAT] donors who fund this mission every day.\n\nKey achievements this year:\n\u2022 [STAT] children served\n\u2022 [STAT]% program completion rate\n\u2022 [STAT] community partnerships formed\n\nOnward. \u{1F4AA}',
    tips: ['LinkedIn audiences appreciate structured, data-driven celebration', 'Use bullet points for scanability', 'Tag the recognizing organization'],
    exampleHashtags: ['#Award', '#SocialImpact', '#NorthStarShelter', '#Milestone'],
    characterCount: '~420 chars',
  },
]

// ─── Content Gap Insights ────────────────────────────────────

export interface ContentGapInsight {
  platform: string
  topic: string
  avgEngagement: number
  postFrequency: 'high' | 'medium' | 'low' | 'missing'
  opportunity: string
  priority: 'critical' | 'high' | 'medium'
}

export const CONTENT_GAPS: ContentGapInsight[] = [
  {
    platform: 'LinkedIn', topic: 'Impact', avgEngagement: 0.172,
    postFrequency: 'missing', priority: 'critical',
    opportunity: 'LinkedIn is the top-performing platform but has zero Impact Story posts. Adding quarterly impact reports here could significantly boost donor engagement.',
  },
  {
    platform: 'LinkedIn', topic: 'Reintegration', avgEngagement: 0.155,
    postFrequency: 'low', priority: 'critical',
    opportunity: 'Reintegration success stories resonate with corporate partners. LinkedIn\u2019s professional audience wants to see program outcomes and data.',
  },
  {
    platform: 'TikTok', topic: 'Education', avgEngagement: 0.105,
    postFrequency: 'low', priority: 'high',
    opportunity: 'Educational content on TikTok is rare but performs well when posted. Short explainer videos about trafficking prevention could reach Gen Z audiences.',
  },
  {
    platform: 'Facebook', topic: 'Education', avgEngagement: 0.098,
    postFrequency: 'low', priority: 'high',
    opportunity: 'Educational content is underused on Facebook despite strong engagement. Longer-form posts explaining the issue can drive shares among parent demographics.',
  },
  {
    platform: 'Instagram', topic: 'Reintegration', avgEngagement: 0.108,
    postFrequency: 'medium', priority: 'high',
    opportunity: 'Reintegration content gets strong engagement on Instagram. Visual before/after journeys (anonymized) and graduation ceremonies drive saves.',
  },
  {
    platform: 'WhatsApp', topic: 'Impact', avgEngagement: 0.118,
    postFrequency: 'low', priority: 'high',
    opportunity: 'Impact updates in WhatsApp feel personal and drive direct responses. Monthly impact digests could boost donor retention.',
  },
  {
    platform: 'Twitter', topic: 'Fundraising', avgEngagement: 0.095,
    postFrequency: 'low', priority: 'medium',
    opportunity: 'Fundraising threads with specific goals and deadlines can create urgency. Pair with matching gift announcements for maximum impact.',
  },
  {
    platform: 'YouTube', topic: 'Education', avgEngagement: 0.088,
    postFrequency: 'missing', priority: 'critical',
    opportunity: 'No educational YouTube content exists. Explainer videos about trafficking in the Philippines would build SEO authority and serve as evergreen content.',
  },
  {
    platform: 'TikTok', topic: 'Fundraising', avgEngagement: 0.082,
    postFrequency: 'missing', priority: 'medium',
    opportunity: 'Fundraising on TikTok requires creative approaches \u2014 challenges, duets, or emotional storytelling with a donate link in bio.',
  },
  {
    platform: 'Instagram', topic: 'Community', avgEngagement: 0.096,
    postFrequency: 'medium', priority: 'medium',
    opportunity: 'Community spotlight posts (volunteer features, partner shoutouts) drive engagement through tagging and resharing.',
  },
  {
    platform: 'Facebook', topic: 'Reintegration', avgEngagement: 0.091,
    postFrequency: 'low', priority: 'medium',
    opportunity: 'Reintegration stories on Facebook can be longer and more detailed. The parent demographic responds strongly to child success narratives.',
  },
  {
    platform: 'YouTube', topic: 'Community', avgEngagement: 0.078,
    postFrequency: 'missing', priority: 'medium',
    opportunity: 'Behind-the-scenes facility tours and volunteer day vlogs would humanize the organization for potential long-term supporters.',
  },
]
