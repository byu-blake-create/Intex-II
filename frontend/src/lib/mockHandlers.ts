/**
 * Mock API handler — used when VITE_MOCK=true.
 * Intercepts fetch-style calls and returns realistic dummy data.
 * Remove or ignore once the real DB is wired up.
 */

import type { PaginatedList } from '../types/api'
import type {
  Resident,
  Safehouse,
  Supporter,
  Donation,
  HomeVisitation,
  ProcessRecording,
  DashboardSummary,
} from '../types/domain'

// ─── Safehouses ───────────────────────────────────────────────
const SAFEHOUSES: Safehouse[] = [
  { safehouseId: 1, safehouseCode: 'NSS-01', name: 'Morning Light House',  region: 'North', city: 'Provo' },
  { safehouseId: 2, safehouseCode: 'NSS-02', name: 'Cedar Ridge Shelter',  region: 'South', city: 'Orem' },
  { safehouseId: 3, safehouseCode: 'NSS-03', name: 'Sunrise Haven',        region: 'East',  city: 'Springville' },
  { safehouseId: 4, safehouseCode: 'NSS-04', name: 'Valley Hope Center',   region: 'West',  city: 'Pleasant Grove' },
  { safehouseId: 5, safehouseCode: 'NSS-05', name: 'Northstar Transition', region: 'North', city: 'Lindon' },
]

// ─── Residents ────────────────────────────────────────────────
const CASE_STATUSES = ['Active', 'Active', 'Active', 'Closed', 'Active']
const CASE_CATEGORIES = ['Neglect', 'Abuse', 'Trafficking', 'Domestic Violence', 'Abandonment']
const SOCIAL_WORKERS = [
  'Maria Santos', 'David Kim', 'Rachel Torres', 'James Okafor', 'Linda Patel',
]

const RESIDENTS: Resident[] = Array.from({ length: 50 }, (_, i) => ({
  residentId: i + 1,
  caseControlNo: `CC-2024-${String(i + 1).padStart(3, '0')}`,
  internalCode: `INT-${String(i + 101).padStart(4, '0')}`,
  safehouseId: SAFEHOUSES[i % 5].safehouseId,
  caseStatus: CASE_STATUSES[i % 5],
  sex: i % 3 === 0 ? 'Male' : 'Female',
  dateOfBirth: `${1985 + (i % 20)}-${String((i % 12) + 1).padStart(2, '0')}-${String((i % 28) + 1).padStart(2, '0')}`,
  caseCategory: CASE_CATEGORIES[i % 5],
  assignedSocialWorker: SOCIAL_WORKERS[i % 5],
  notesRestricted: i % 7 === 0 ? 'Y' : 'N',
}))

// ─── Supporters ───────────────────────────────────────────────
const SUPPORTER_NAMES = [
  'Alice Hartman', 'Bob Nguyen', 'Carol Jensen', 'David Park', 'Elena Russo',
  'Frank Osei', 'Grace Li', 'Henry Morales', 'Isabel Chavez', 'James Wright',
  'Karen Bloom', 'Leo Tanaka', 'Mia Collins', 'Nathan Brooks', 'Olivia Stone',
  'Paul Reyes', 'Quinn Foster', 'Rachel Hayes', 'Samuel King', 'Tina Walsh',
  'United Way Utah', 'BYU Community Fund', 'Provo Rotary Club', 'Alpine School Fund',
  'Mountain West Giving Circle', 'LDS Charities', 'Deseret Foundation', 'Excel Energy Cares',
  'First National Bank Foundation', 'Intermountain Healthcare Fund',
]

const SUPPORTERS: Supporter[] = SUPPORTER_NAMES.map((name, i) => ({
  supporterId: i + 1,
  supporterType: i >= 20 ? 'Organization' : 'Individual',
  displayName: name,
  organizationName: i >= 20 ? name : null,
  email: i >= 20
    ? `giving@${name.toLowerCase().replace(/\s+/g, '')}.org`
    : `${name.split(' ')[0].toLowerCase()}@email.com`,
  status: i % 8 === 5 ? 'Inactive' : 'Active',
}))

// ─── Donations ────────────────────────────────────────────────
const CAMPAIGNS = ['Annual Gala 2024', 'Spring Drive', 'Holiday Match', 'General Fund', 'Emergency Relief']
const DONATION_TYPES = ['One-Time', 'Recurring', 'In-Kind', 'Pledge']

const allDonations: Donation[] = []
let donId = 1
SUPPORTERS.forEach(s => {
  const count = s.supporterType === 'Organization' ? 6 : 3
  for (let j = 0; j < count; j++) {
    const month = String((j * 2 + 1) % 12 + 1).padStart(2, '0')
    const year = j < 3 ? '2024' : '2023'
    allDonations.push({
      donationId: donId++,
      supporterId: s.supporterId,
      donationType: DONATION_TYPES[j % 4],
      donationDate: `${year}-${month}-${String((j % 28) + 1).padStart(2, '0')}`,
      amount: s.supporterType === 'Organization'
        ? [500, 1000, 2500, 5000, 750, 3000][j % 6]
        : [50, 100, 250, 75, 150, 200][j % 6],
      currencyCode: 'USD',
      campaignName: CAMPAIGNS[j % 5],
    })
  }
})

// ─── Visitations ──────────────────────────────────────────────
const VISIT_TYPES = ['Home Visit', 'Follow-Up', 'Initial Assessment', 'Safety Check', 'Reintegration Review']
const VISIT_OUTCOMES = ['Positive', 'Neutral', 'Positive', 'Concern', 'Positive']
const OBSERVATIONS = [
  'Resident appears stable and engaged. Living environment is clean and safe. Children are attending school regularly.',
  'Follow-up visit showed continued progress. Resident has secured part-time employment. Emotional state improved significantly.',
  'Initial visit completed. Safety plan established. Resident expressed gratitude for support services.',
  'Some concerns noted regarding living situation. Case conference scheduled. Referred to additional support resources.',
  'Reintegration review positive. Resident has maintained sobriety for 90 days. Family relationships improving.',
  'Visit completed. Resident participating actively in counseling. Goals on track for quarterly review.',
  'Safety check conducted. No concerns at this time. Resident requested additional job training resources.',
  'Observed strong support network forming. Resident connected with community group this week.',
]

const allVisitations: HomeVisitation[] = []
let visId = 1
RESIDENTS.forEach(r => {
  const count = 2 + (r.residentId % 4)
  for (let j = 0; j < count; j++) {
    const month = String((j * 3 + r.residentId) % 12 + 1).padStart(2, '0')
    allVisitations.push({
      visitationId: visId++,
      residentId: r.residentId,
      visitDate: `2024-${month}-${String((j * 7 + 5) % 28 + 1).padStart(2, '0')}`,
      socialWorker: SOCIAL_WORKERS[r.residentId % 5],
      visitType: VISIT_TYPES[j % 5],
      observations: OBSERVATIONS[(r.residentId + j) % OBSERVATIONS.length],
      visitOutcome: VISIT_OUTCOMES[j % 5],
    })
  }
})

// ─── Process Recordings ───────────────────────────────────────
const SESSION_TYPES = ['Individual Counseling', 'Group Session', 'Crisis Intervention', 'Life Skills', 'Family Mediation']
const NARRATIVES = [
  'Client presented with elevated anxiety related to upcoming court date. Session focused on grounding techniques and coping strategies. Client demonstrated good insight and engaged actively throughout. Plan: continue weekly sessions, refer to legal aid for court preparation support.',
  'Group session addressed trauma responses and building resilience. Client participated actively and shared experiences with peers. Positive peer support dynamic observed. Homework assigned: journaling exercise on personal strengths.',
  'Crisis intervention required following notification of custody dispute. Immediate safety planning completed. Client de-escalated successfully. Collaborated with supervisor on next steps. Emergency housing secured for the weekend.',
  'Life skills session covered budgeting and financial literacy. Client set goal to open savings account within 30 days. Discussed community resources for job training. Client responded well and expressed motivation to achieve financial independence.',
  'Family mediation session with client and sibling. Communication patterns explored. Progress made on establishing healthy boundaries. Both parties agreed to biweekly check-ins. Recommend continued family sessions.',
  'Client reported nightmares and sleep disruption this week. Explored sleep hygiene and relaxation techniques. Discussed trauma-informed approaches to sleep. Referral made to psychiatrist for evaluation. Follow-up scheduled in one week.',
  'Reintegration planning session. Reviewed 90-day goals: employment, housing stability, and social support. Client has met employment goal. Housing remains primary concern. Active search for transitional housing initiated.',
  'Client attended session voluntarily following peer recommendation. Discussed treatment goals and boundaries of confidentiality. Strong therapeutic alliance established early. Intake paperwork completed. Initial assessment indicates moderate risk level.',
]

const allRecordings: ProcessRecording[] = []
let recId = 1
RESIDENTS.forEach(r => {
  const count = 2 + (r.residentId % 3)
  for (let j = 0; j < count; j++) {
    const month = String((j * 2 + r.residentId) % 12 + 1).padStart(2, '0')
    allRecordings.push({
      recordingId: recId++,
      residentId: r.residentId,
      sessionDate: `2024-${month}-${String((j * 9 + 3) % 28 + 1).padStart(2, '0')}`,
      socialWorker: SOCIAL_WORKERS[r.residentId % 5],
      sessionType: SESSION_TYPES[j % 5],
      sessionNarrative: NARRATIVES[(r.residentId + j) % NARRATIVES.length],
      notesRestricted: r.notesRestricted ?? 'N',
    })
  }
})

// ─── Social Media Posts ──────────────────────────────────────
interface SocialMediaPost {
  postId: number
  platform: string
  postUrl: string
  createdAt: string
  dayOfWeek: string
  postHour: number
  postType: string
  mediaType: string
  caption: string
  hashtags: string
  numHashtags: number
  mentionsCount: number
  hasCallToAction: boolean
  callToActionType: string
  contentTopic: string
  sentimentTone: string
  captionLength: number
  featuresResidentStory: boolean
  campaignName: string
  isBoosted: boolean
  boostBudgetPhp: number
  impressions: number
  reach: number
  likes: number
  comments: number
  shares: number
  saves: number
  clickThroughs: number
  videoViews: number | null
  engagementRate: number
  profileVisits: number
  donationReferrals: number
  estimatedDonationValuePhp: number
  followerCountAtPost: number
}

const SOCIAL_POSTS: SocialMediaPost[] = [
  { postId:1, platform:'LinkedIn', postUrl:'https://linkedin.com/post/1', createdAt:'2024-11-05T09:30:00', dayOfWeek:'Tuesday', postHour:9, postType:'EducationalContent', mediaType:'Carousel', caption:'This quarter, our education program reached 1,200 children across 14 schools in Metro Manila. Here is what the data shows about early intervention and prevention.', hashtags:'#HumanTrafficking #ChildProtection #SocialImpact #Philippines', numHashtags:4, mentionsCount:2, hasCallToAction:true, callToActionType:'LearnMore', contentTopic:'Education', sentimentTone:'Informative', captionLength:162, featuresResidentStory:false, campaignName:'Q4 Education', isBoosted:false, boostBudgetPhp:0, impressions:4200, reach:3100, likes:189, comments:34, shares:67, saves:45, clickThroughs:112, videoViews:null, engagementRate:0.214, profileVisits:78, donationReferrals:5, estimatedDonationValuePhp:12500, followerCountAtPost:2100 },
  { postId:2, platform:'LinkedIn', postUrl:'https://linkedin.com/post/2', createdAt:'2024-10-18T10:00:00', dayOfWeek:'Friday', postHour:10, postType:'ImpactStory', mediaType:'Video', caption:'From survivor to scholar: how one young woman\'s journey through our reintegration program is redefining what recovery looks like.', hashtags:'#SurvivorStory #Impact #NorthStarShelter', numHashtags:3, mentionsCount:1, hasCallToAction:true, callToActionType:'Donate', contentTopic:'Reintegration', sentimentTone:'Inspirational', captionLength:128, featuresResidentStory:true, campaignName:'Impact Stories', isBoosted:true, boostBudgetPhp:1500, impressions:3800, reach:2900, likes:156, comments:28, shares:52, saves:38, clickThroughs:89, videoViews:2100, engagementRate:0.168, profileVisits:63, donationReferrals:8, estimatedDonationValuePhp:24000, followerCountAtPost:2050 },
  { postId:3, platform:'LinkedIn', postUrl:'https://linkedin.com/post/3', createdAt:'2024-09-22T11:15:00', dayOfWeek:'Sunday', postHour:11, postType:'ThankYou', mediaType:'Photo', caption:'Grateful to our corporate partners who made this quarter possible. Together we served 340 children.', hashtags:'#ThankYou #CorporateGiving #NorthStar', numHashtags:3, mentionsCount:4, hasCallToAction:false, callToActionType:'', contentTopic:'Community', sentimentTone:'Grateful', captionLength:96, featuresResidentStory:false, campaignName:'Partner Thanks', isBoosted:false, boostBudgetPhp:0, impressions:2100, reach:1600, likes:98, comments:15, shares:22, saves:12, clickThroughs:34, videoViews:null, engagementRate:0.132, profileVisits:29, donationReferrals:2, estimatedDonationValuePhp:5000, followerCountAtPost:1980 },
  { postId:4, platform:'LinkedIn', postUrl:'https://linkedin.com/post/4', createdAt:'2024-08-14T09:00:00', dayOfWeek:'Wednesday', postHour:9, postType:'EducationalContent', mediaType:'Text', caption:'Did you know? 47,000 children are trafficked in Southeast Asia annually. Our prevention programs are making a difference.', hashtags:'#ChildProtection #Prevention', numHashtags:2, mentionsCount:0, hasCallToAction:true, callToActionType:'LearnMore', contentTopic:'Education', sentimentTone:'Informative', captionLength:120, featuresResidentStory:false, campaignName:'Awareness', isBoosted:false, boostBudgetPhp:0, impressions:1800, reach:1400, likes:72, comments:11, shares:31, saves:18, clickThroughs:45, videoViews:null, engagementRate:0.118, profileVisits:22, donationReferrals:1, estimatedDonationValuePhp:2500, followerCountAtPost:1920 },
  { postId:5, platform:'WhatsApp', postUrl:'', createdAt:'2024-11-02T08:30:00', dayOfWeek:'Saturday', postHour:8, postType:'ThankYou', mediaType:'Photo', caption:'Hi friends! Quick update: because of YOUR generosity, 8 more children received full scholarships this month. We are so grateful for each of you.', hashtags:'', numHashtags:0, mentionsCount:0, hasCallToAction:false, callToActionType:'', contentTopic:'Education', sentimentTone:'Grateful', captionLength:143, featuresResidentStory:false, campaignName:'Monthly Update', isBoosted:false, boostBudgetPhp:0, impressions:890, reach:780, likes:134, comments:42, shares:28, saves:0, clickThroughs:56, videoViews:null, engagementRate:0.178, profileVisits:0, donationReferrals:4, estimatedDonationValuePhp:8000, followerCountAtPost:420 },
  { postId:6, platform:'WhatsApp', postUrl:'', createdAt:'2024-10-15T18:00:00', dayOfWeek:'Tuesday', postHour:18, postType:'FundraisingAppeal', mediaType:'Photo', caption:'We are just 15,000 PHP away from our emergency shelter goal. Can you help us get there by Friday?', hashtags:'', numHashtags:0, mentionsCount:0, hasCallToAction:true, callToActionType:'Donate', contentTopic:'Fundraising', sentimentTone:'Urgent', captionLength:97, featuresResidentStory:false, campaignName:'Emergency Fund', isBoosted:false, boostBudgetPhp:0, impressions:650, reach:590, likes:78, comments:23, shares:15, saves:0, clickThroughs:67, videoViews:null, engagementRate:0.145, profileVisits:0, donationReferrals:12, estimatedDonationValuePhp:18500, followerCountAtPost:415 },
  { postId:7, platform:'WhatsApp', postUrl:'', createdAt:'2024-09-28T07:45:00', dayOfWeek:'Saturday', postHour:7, postType:'ImpactStory', mediaType:'Photo', caption:'Maria (name changed) just completed her first year of vocational training. She wants you to know: your support changed her life.', hashtags:'', numHashtags:0, mentionsCount:0, hasCallToAction:false, callToActionType:'', contentTopic:'Impact', sentimentTone:'Emotional', captionLength:127, featuresResidentStory:true, campaignName:'Impact Stories', isBoosted:false, boostBudgetPhp:0, impressions:720, reach:640, likes:112, comments:31, shares:19, saves:0, clickThroughs:28, videoViews:null, engagementRate:0.156, profileVisits:0, donationReferrals:3, estimatedDonationValuePhp:7500, followerCountAtPost:408 },
  { postId:8, platform:'WhatsApp', postUrl:'', createdAt:'2024-08-20T19:00:00', dayOfWeek:'Tuesday', postHour:19, postType:'EventPromotion', mediaType:'Text', caption:'Join us this Saturday for our community prayer gathering. All are welcome. Details below.', hashtags:'', numHashtags:0, mentionsCount:0, hasCallToAction:true, callToActionType:'Register', contentTopic:'Community', sentimentTone:'Informative', captionLength:90, featuresResidentStory:false, campaignName:'Events', isBoosted:false, boostBudgetPhp:0, impressions:480, reach:420, likes:45, comments:12, shares:8, saves:0, clickThroughs:22, videoViews:null, engagementRate:0.089, profileVisits:0, donationReferrals:0, estimatedDonationValuePhp:0, followerCountAtPost:395 },
  { postId:9, platform:'Twitter', postUrl:'https://twitter.com/northstar/9', createdAt:'2024-11-01T09:15:00', dayOfWeek:'Friday', postHour:9, postType:'EducationalContent', mediaType:'Text', caption:'47,000 children are trafficked in Southeast Asia annually. Most are under 15. Our prevention education has reached 14 schools. Here is what works.', hashtags:'#HumanTrafficking #ChildProtection', numHashtags:2, mentionsCount:1, hasCallToAction:true, callToActionType:'LearnMore', contentTopic:'Education', sentimentTone:'Informative', captionLength:148, featuresResidentStory:false, campaignName:'Awareness', isBoosted:false, boostBudgetPhp:0, impressions:3200, reach:2800, likes:89, comments:18, shares:112, saves:0, clickThroughs:78, videoViews:null, engagementRate:0.143, profileVisits:45, donationReferrals:2, estimatedDonationValuePhp:5000, followerCountAtPost:1850 },
  { postId:10, platform:'Twitter', postUrl:'https://twitter.com/northstar/10', createdAt:'2024-10-22T17:30:00', dayOfWeek:'Tuesday', postHour:17, postType:'FundraisingAppeal', mediaType:'Text', caption:'URGENT: 12 rescued children need immediate shelter this week. We are 25,000 PHP short. Every donation before Friday is matched 2x. Help now.', hashtags:'#DonateNow #UrgentNeed', numHashtags:2, mentionsCount:0, hasCallToAction:true, callToActionType:'Donate', contentTopic:'Fundraising', sentimentTone:'Urgent', captionLength:140, featuresResidentStory:false, campaignName:'Emergency Fund', isBoosted:true, boostBudgetPhp:500, impressions:2900, reach:2500, likes:67, comments:12, shares:89, saves:0, clickThroughs:134, videoViews:null, engagementRate:0.128, profileVisits:38, donationReferrals:15, estimatedDonationValuePhp:37500, followerCountAtPost:1830 },
  { postId:11, platform:'Twitter', postUrl:'https://twitter.com/northstar/11', createdAt:'2024-09-15T10:00:00', dayOfWeek:'Sunday', postHour:10, postType:'ImpactStory', mediaType:'Photo', caption:'One year ago, she could barely read. Today she scored top of her class. This is what investment in children looks like.', hashtags:'#Impact #Education', numHashtags:2, mentionsCount:0, hasCallToAction:false, callToActionType:'', contentTopic:'Impact', sentimentTone:'Inspirational', captionLength:117, featuresResidentStory:true, campaignName:'Impact Stories', isBoosted:false, boostBudgetPhp:0, impressions:2100, reach:1800, likes:134, comments:22, shares:78, saves:0, clickThroughs:45, videoViews:null, engagementRate:0.135, profileVisits:32, donationReferrals:3, estimatedDonationValuePhp:7500, followerCountAtPost:1800 },
  { postId:12, platform:'Twitter', postUrl:'https://twitter.com/northstar/12', createdAt:'2024-08-08T05:00:00', dayOfWeek:'Thursday', postHour:5, postType:'BehindTheScenes', mediaType:'Photo', caption:'Early morning at the shelter. Breakfast prep starts at 5am. Our staff are here every day, rain or shine.', hashtags:'#ShelterLife', numHashtags:1, mentionsCount:0, hasCallToAction:false, callToActionType:'', contentTopic:'Community', sentimentTone:'Emotional', captionLength:102, featuresResidentStory:false, campaignName:'Behind the Scenes', isBoosted:false, boostBudgetPhp:0, impressions:1200, reach:980, likes:45, comments:8, shares:12, saves:0, clickThroughs:15, videoViews:null, engagementRate:0.072, profileVisits:11, donationReferrals:0, estimatedDonationValuePhp:0, followerCountAtPost:1780 },
  { postId:13, platform:'Instagram', postUrl:'https://instagram.com/p/13', createdAt:'2024-11-03T12:00:00', dayOfWeek:'Sunday', postHour:12, postType:'ImpactStory', mediaType:'Reel', caption:'She arrived afraid to speak. Today she read her essay about hope to her entire class. This is what healing looks like.', hashtags:'#SurvivorStory #HopeHeals #NorthStarShelter #Philippines #ChildAdvocacy #EndTrafficking', numHashtags:6, mentionsCount:0, hasCallToAction:true, callToActionType:'Donate', contentTopic:'Impact', sentimentTone:'Emotional', captionLength:116, featuresResidentStory:true, campaignName:'Impact Stories', isBoosted:true, boostBudgetPhp:2000, impressions:5600, reach:4200, likes:478, comments:56, shares:123, saves:189, clickThroughs:67, videoViews:3800, engagementRate:0.152, profileVisits:134, donationReferrals:7, estimatedDonationValuePhp:17500, followerCountAtPost:3200 },
  { postId:14, platform:'Instagram', postUrl:'https://instagram.com/p/14', createdAt:'2024-10-20T19:30:00', dayOfWeek:'Sunday', postHour:19, postType:'BehindTheScenes', mediaType:'Carousel', caption:'A day in the life at North Star Shelter. Swipe to see what a typical Tuesday looks like for our residents and staff.', hashtags:'#BehindTheScenes #ShelterLife #NorthStar #Philippines #NonProfit', numHashtags:5, mentionsCount:1, hasCallToAction:false, callToActionType:'', contentTopic:'Community', sentimentTone:'Inspirational', captionLength:114, featuresResidentStory:false, campaignName:'Behind the Scenes', isBoosted:false, boostBudgetPhp:0, impressions:3400, reach:2600, likes:312, comments:28, shares:45, saves:98, clickThroughs:34, videoViews:null, engagementRate:0.112, profileVisits:67, donationReferrals:1, estimatedDonationValuePhp:2500, followerCountAtPost:3150 },
  { postId:15, platform:'Instagram', postUrl:'https://instagram.com/p/15', createdAt:'2024-09-12T11:00:00', dayOfWeek:'Thursday', postHour:11, postType:'FundraisingAppeal', mediaType:'Photo', caption:'Every child deserves safety. This month we need your help to fund 10 more scholarship spots. Link in bio.', hashtags:'#GiveHope #NorthStarShelter #ProtectChildren #Philippines #Donate', numHashtags:5, mentionsCount:0, hasCallToAction:true, callToActionType:'Donate', contentTopic:'Fundraising', sentimentTone:'Emotional', captionLength:104, featuresResidentStory:false, campaignName:'Scholarship Drive', isBoosted:true, boostBudgetPhp:1000, impressions:2800, reach:2100, likes:198, comments:22, shares:34, saves:56, clickThroughs:89, videoViews:null, engagementRate:0.095, profileVisits:78, donationReferrals:9, estimatedDonationValuePhp:22500, followerCountAtPost:3080 },
  { postId:16, platform:'Instagram', postUrl:'https://instagram.com/p/16', createdAt:'2024-08-25T20:00:00', dayOfWeek:'Sunday', postHour:20, postType:'ThankYou', mediaType:'Story', caption:'THANK YOU! We hit our August goal thanks to 234 amazing donors. You are incredible.', hashtags:'#ThankYou #Grateful #NorthStarFamily', numHashtags:3, mentionsCount:0, hasCallToAction:false, callToActionType:'', contentTopic:'Fundraising', sentimentTone:'Celebratory', captionLength:82, featuresResidentStory:false, campaignName:'Monthly Thanks', isBoosted:false, boostBudgetPhp:0, impressions:1900, reach:1500, likes:267, comments:18, shares:12, saves:8, clickThroughs:22, videoViews:null, engagementRate:0.088, profileVisits:34, donationReferrals:0, estimatedDonationValuePhp:0, followerCountAtPost:3020 },
  { postId:17, platform:'TikTok', postUrl:'https://tiktok.com/@northstar/17', createdAt:'2024-11-04T19:00:00', dayOfWeek:'Monday', postHour:19, postType:'BehindTheScenes', mediaType:'Reel', caption:'POV: You work at a shelter for rescued children in the Philippines. This is what our mornings look like.', hashtags:'#ShelterLife #Philippines #ForYou #ChildAdvocacy', numHashtags:4, mentionsCount:0, hasCallToAction:false, callToActionType:'', contentTopic:'Community', sentimentTone:'Emotional', captionLength:103, featuresResidentStory:false, campaignName:'Behind the Scenes', isBoosted:false, boostBudgetPhp:0, impressions:12000, reach:9500, likes:890, comments:134, shares:256, saves:178, clickThroughs:45, videoViews:8900, engagementRate:0.128, profileVisits:234, donationReferrals:2, estimatedDonationValuePhp:5000, followerCountAtPost:1200 },
  { postId:18, platform:'TikTok', postUrl:'https://tiktok.com/@northstar/18', createdAt:'2024-10-28T12:30:00', dayOfWeek:'Monday', postHour:12, postType:'ImpactStory', mediaType:'Video', caption:'She used to hide from adults. Now she runs to greet us every morning. Watch what happened when she got her first library card.', hashtags:'#SurvivorStory #Healing #Philippines #FYP', numHashtags:4, mentionsCount:0, hasCallToAction:false, callToActionType:'', contentTopic:'Impact', sentimentTone:'Emotional', captionLength:123, featuresResidentStory:true, campaignName:'Impact Stories', isBoosted:false, boostBudgetPhp:0, impressions:8500, reach:6800, likes:1200, comments:89, shares:345, saves:234, clickThroughs:23, videoViews:6200, engagementRate:0.142, profileVisits:189, donationReferrals:1, estimatedDonationValuePhp:2500, followerCountAtPost:1150 },
  { postId:19, platform:'TikTok', postUrl:'https://tiktok.com/@northstar/19', createdAt:'2024-09-20T20:00:00', dayOfWeek:'Friday', postHour:20, postType:'EducationalContent', mediaType:'Reel', caption:'3 signs of trafficking that everyone should know. Please share this. It could save a life.', hashtags:'#HumanTrafficking #KnowTheSigns #Philippines #Educational', numHashtags:4, mentionsCount:0, hasCallToAction:true, callToActionType:'Share', contentTopic:'Education', sentimentTone:'Informative', captionLength:89, featuresResidentStory:false, campaignName:'Awareness', isBoosted:false, boostBudgetPhp:0, impressions:18000, reach:14500, likes:2300, comments:178, shares:890, saves:456, clickThroughs:12, videoViews:13200, engagementRate:0.098, profileVisits:312, donationReferrals:0, estimatedDonationValuePhp:0, followerCountAtPost:1100 },
  { postId:20, platform:'TikTok', postUrl:'https://tiktok.com/@northstar/20', createdAt:'2024-08-15T19:30:00', dayOfWeek:'Thursday', postHour:19, postType:'EventPromotion', mediaType:'Video', caption:'We are hosting a virtual fundraiser next week! Here is a sneak peek of what we have planned.', hashtags:'#Fundraiser #NorthStar #Event', numHashtags:3, mentionsCount:0, hasCallToAction:true, callToActionType:'Register', contentTopic:'EventPromotion', sentimentTone:'Celebratory', captionLength:92, featuresResidentStory:false, campaignName:'Virtual Gala', isBoosted:true, boostBudgetPhp:800, impressions:4500, reach:3600, likes:234, comments:34, shares:56, saves:23, clickThroughs:89, videoViews:3100, engagementRate:0.074, profileVisits:67, donationReferrals:0, estimatedDonationValuePhp:0, followerCountAtPost:1050 },
  { postId:21, platform:'Facebook', postUrl:'https://facebook.com/northstar/21', createdAt:'2024-11-01T09:30:00', dayOfWeek:'Friday', postHour:9, postType:'FundraisingAppeal', mediaType:'Photo', caption:'Every night, thousands of children in the Philippines sleep without knowing if they are safe. North Star Shelter exists to change that. Right now, a generous donor is matching every gift up to 50,000 PHP. Your 500 becomes 1,000. Please help us reach our goal by November 15.', hashtags:'#GiveHope #NorthStarShelter #ProtectChildren', numHashtags:3, mentionsCount:0, hasCallToAction:true, callToActionType:'Donate', contentTopic:'Fundraising', sentimentTone:'Emotional', captionLength:271, featuresResidentStory:false, campaignName:'November Match', isBoosted:true, boostBudgetPhp:3000, impressions:4800, reach:3600, likes:156, comments:34, shares:89, saves:23, clickThroughs:145, videoViews:null, engagementRate:0.112, profileVisits:56, donationReferrals:18, estimatedDonationValuePhp:45000, followerCountAtPost:4500 },
  { postId:22, platform:'Facebook', postUrl:'https://facebook.com/northstar/22', createdAt:'2024-10-12T13:00:00', dayOfWeek:'Saturday', postHour:13, postType:'ImpactStory', mediaType:'Video', caption:'Meet the team behind North Star Shelter. Every day they show up for children who need them most. Watch their story and see the impact your donations make.', hashtags:'#Impact #NorthStarTeam', numHashtags:2, mentionsCount:3, hasCallToAction:true, callToActionType:'Donate', contentTopic:'Impact', sentimentTone:'Inspirational', captionLength:152, featuresResidentStory:false, campaignName:'Team Spotlight', isBoosted:true, boostBudgetPhp:2000, impressions:3200, reach:2400, likes:189, comments:28, shares:67, saves:34, clickThroughs:78, videoViews:1800, engagementRate:0.098, profileVisits:45, donationReferrals:6, estimatedDonationValuePhp:15000, followerCountAtPost:4450 },
  { postId:23, platform:'Facebook', postUrl:'https://facebook.com/northstar/23', createdAt:'2024-09-08T10:00:00', dayOfWeek:'Sunday', postHour:10, postType:'ThankYou', mediaType:'Photo', caption:'To every single person who donated during our September drive: THANK YOU. Because of you, 15 children will have safe beds this month.', hashtags:'#ThankYou #NorthStarFamily', numHashtags:2, mentionsCount:0, hasCallToAction:false, callToActionType:'', contentTopic:'Fundraising', sentimentTone:'Grateful', captionLength:133, featuresResidentStory:false, campaignName:'September Drive', isBoosted:false, boostBudgetPhp:0, impressions:2100, reach:1700, likes:234, comments:45, shares:34, saves:12, clickThroughs:23, videoViews:null, engagementRate:0.091, profileVisits:28, donationReferrals:0, estimatedDonationValuePhp:0, followerCountAtPost:4380 },
  { postId:24, platform:'Facebook', postUrl:'https://facebook.com/northstar/24', createdAt:'2024-08-22T14:30:00', dayOfWeek:'Thursday', postHour:14, postType:'EventPromotion', mediaType:'Photo', caption:'Join us for our Annual Gala on December 7! An evening of hope, music, and community. All proceeds support our shelter programs.', hashtags:'#AnnualGala #NorthStar', numHashtags:2, mentionsCount:0, hasCallToAction:true, callToActionType:'Register', contentTopic:'EventPromotion', sentimentTone:'Celebratory', captionLength:123, featuresResidentStory:false, campaignName:'Annual Gala', isBoosted:true, boostBudgetPhp:1500, impressions:2800, reach:2200, likes:112, comments:18, shares:45, saves:28, clickThroughs:134, videoViews:null, engagementRate:0.078, profileVisits:67, donationReferrals:0, estimatedDonationValuePhp:0, followerCountAtPost:4320 },
  { postId:25, platform:'YouTube', postUrl:'https://youtube.com/watch?v=25', createdAt:'2024-10-30T14:00:00', dayOfWeek:'Wednesday', postHour:14, postType:'ImpactStory', mediaType:'Video', caption:'North Star Shelter: 2024 Impact Documentary. See how your support changed lives this year. Full 12-minute documentary following three survivors through their recovery journey.', hashtags:'#Documentary #Impact #NorthStarShelter #Philippines #SurvivorStory', numHashtags:5, mentionsCount:0, hasCallToAction:true, callToActionType:'Donate', contentTopic:'Impact', sentimentTone:'Inspirational', captionLength:172, featuresResidentStory:true, campaignName:'Annual Impact', isBoosted:false, boostBudgetPhp:0, impressions:2800, reach:2200, likes:189, comments:34, shares:45, saves:0, clickThroughs:67, videoViews:1900, engagementRate:0.098, profileVisits:34, donationReferrals:4, estimatedDonationValuePhp:10000, followerCountAtPost:890 },
  { postId:26, platform:'YouTube', postUrl:'https://youtube.com/watch?v=26', createdAt:'2024-09-18T15:00:00', dayOfWeek:'Wednesday', postHour:15, postType:'EducationalContent', mediaType:'Video', caption:'Understanding Child Trafficking in the Philippines: A 2024 Overview. Facts, figures, and what you can do to help.', hashtags:'#Education #ChildTrafficking #Philippines', numHashtags:3, mentionsCount:0, hasCallToAction:true, callToActionType:'Share', contentTopic:'Education', sentimentTone:'Informative', captionLength:112, featuresResidentStory:false, campaignName:'Education Series', isBoosted:false, boostBudgetPhp:0, impressions:1900, reach:1500, likes:112, comments:22, shares:34, saves:0, clickThroughs:56, videoViews:1200, engagementRate:0.082, profileVisits:23, donationReferrals:1, estimatedDonationValuePhp:2500, followerCountAtPost:860 },
  { postId:27, platform:'YouTube', postUrl:'https://youtube.com/watch?v=27', createdAt:'2024-08-10T18:00:00', dayOfWeek:'Saturday', postHour:18, postType:'BehindTheScenes', mediaType:'Video', caption:'A Day at North Star Shelter: What Really Happens Behind Our Doors. Tour our facilities, meet our staff, and see how donations are used.', hashtags:'#BehindTheScenes #Transparency #NorthStar', numHashtags:3, mentionsCount:0, hasCallToAction:true, callToActionType:'Volunteer', contentTopic:'Community', sentimentTone:'Informative', captionLength:136, featuresResidentStory:false, campaignName:'Transparency', isBoosted:false, boostBudgetPhp:0, impressions:1400, reach:1100, likes:78, comments:15, shares:22, saves:0, clickThroughs:34, videoViews:890, engagementRate:0.075, profileVisits:18, donationReferrals:0, estimatedDonationValuePhp:0, followerCountAtPost:830 },
  { postId:28, platform:'YouTube', postUrl:'https://youtube.com/watch?v=28', createdAt:'2024-07-22T16:00:00', dayOfWeek:'Monday', postHour:16, postType:'ThankYou', mediaType:'Video', caption:'Thank You, Donors! A Special Message from North Star Shelter Residents (Names Changed). They wanted to say thank you in their own words.', hashtags:'#ThankYou #GratefulHearts', numHashtags:2, mentionsCount:0, hasCallToAction:false, callToActionType:'', contentTopic:'Fundraising', sentimentTone:'Grateful', captionLength:137, featuresResidentStory:true, campaignName:'Donor Thanks', isBoosted:false, boostBudgetPhp:0, impressions:1100, reach:880, likes:134, comments:28, shares:18, saves:0, clickThroughs:23, videoViews:720, engagementRate:0.089, profileVisits:12, donationReferrals:2, estimatedDonationValuePhp:5000, followerCountAtPost:800 },
  { postId:29, platform:'Instagram', postUrl:'https://instagram.com/p/29', createdAt:'2024-07-15T11:30:00', dayOfWeek:'Monday', postHour:11, postType:'EducationalContent', mediaType:'Carousel', caption:'Swipe to learn 5 facts about child trafficking in the Philippines that everyone should know. Knowledge is the first step to prevention.', hashtags:'#KnowTheFacts #ChildProtection #Philippines #Prevention #EndTrafficking #Education #Advocacy', numHashtags:7, mentionsCount:0, hasCallToAction:true, callToActionType:'Share', contentTopic:'Education', sentimentTone:'Informative', captionLength:134, featuresResidentStory:false, campaignName:'Awareness', isBoosted:false, boostBudgetPhp:0, impressions:3100, reach:2400, likes:267, comments:34, shares:89, saves:156, clickThroughs:45, videoViews:null, engagementRate:0.104, profileVisits:89, donationReferrals:0, estimatedDonationValuePhp:0, followerCountAtPost:2950 },
  { postId:30, platform:'Facebook', postUrl:'https://facebook.com/northstar/30', createdAt:'2024-07-08T09:00:00', dayOfWeek:'Monday', postHour:9, postType:'EducationalContent', mediaType:'Video', caption:'Watch our 3-minute explainer on how North Star Shelter is preventing trafficking through community education programs. The results may surprise you.', hashtags:'#Education #Prevention #NorthStar', numHashtags:3, mentionsCount:1, hasCallToAction:true, callToActionType:'LearnMore', contentTopic:'Education', sentimentTone:'Informative', captionLength:148, featuresResidentStory:false, campaignName:'Education Series', isBoosted:false, boostBudgetPhp:0, impressions:2400, reach:1900, likes:134, comments:22, shares:56, saves:18, clickThroughs:67, videoViews:1400, engagementRate:0.086, profileVisits:34, donationReferrals:1, estimatedDonationValuePhp:2500, followerCountAtPost:4250 },
]

// ─── Reports ──────────────────────────────────────────────────
const SUMMARY: DashboardSummary = {
  activeResidents: 38,
  totalDonationsLast30Days: 14,
  donationAmountLast30Days: 12450,
  upcomingCaseConferences: 6,
}

const DONATIONS_BY_MONTH = [
  { month: '2024-01', total: 8200 },
  { month: '2024-02', total: 5400 },
  { month: '2024-03', total: 11300 },
  { month: '2024-04', total: 7600 },
  { month: '2024-05', total: 9800 },
  { month: '2024-06', total: 6100 },
  { month: '2024-07', total: 14200 },
  { month: '2024-08', total: 10500 },
  { month: '2024-09', total: 8900 },
  { month: '2024-10', total: 15600 },
  { month: '2024-11', total: 22100 },
  { month: '2024-12', total: 31400 },
]

// ─── Helpers ──────────────────────────────────────────────────
function paginate<T>(items: T[], pageNum: number, pageSize: number): PaginatedList<T> {
  const start = (pageNum - 1) * pageSize
  return {
    items: items.slice(start, start + pageSize),
    totalCount: items.length,
  }
}

function json(data: unknown): Response {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─── Router ───────────────────────────────────────────────────
export function mockFetch(url: string): Response {
  const u = new URL(url, 'http://localhost')
  const path = u.pathname
  const q = u.searchParams

  // Safehouses
  if (path === '/api/safehouses') {
    const pageNum = Number(q.get('pageNum') ?? 1)
    const pageSize = Number(q.get('pageSize') ?? 100)
    return json(paginate(SAFEHOUSES, pageNum, pageSize))
  }

  // Residents
  if (path === '/api/residents') {
    const pageNum = Number(q.get('pageNum') ?? 1)
    const pageSize = Number(q.get('pageSize') ?? 20)
    const safehouseId = q.get('safehouseId') ? Number(q.get('safehouseId')) : null
    const caseStatus = q.get('caseStatus')
    const caseCategory = q.get('caseCategory')
    const search = q.get('search')?.toLowerCase()

    let filtered = RESIDENTS
    if (safehouseId) filtered = filtered.filter(r => r.safehouseId === safehouseId)
    if (caseStatus) filtered = filtered.filter(r => r.caseStatus === caseStatus)
    if (caseCategory) filtered = filtered.filter(r => r.caseCategory === caseCategory)
    if (search) filtered = filtered.filter(r =>
      r.caseControlNo.toLowerCase().includes(search) ||
      (r.internalCode ?? '').toLowerCase().includes(search) ||
      (r.assignedSocialWorker ?? '').toLowerCase().includes(search)
    )
    return json(paginate(filtered, pageNum, pageSize))
  }

  // Supporters
  if (path === '/api/supporters') {
    const pageNum = Number(q.get('pageNum') ?? 1)
    const pageSize = Number(q.get('pageSize') ?? 50)
    const supporterType = q.get('supporterType')
    const status = q.get('status')

    let filtered = SUPPORTERS
    if (supporterType) filtered = filtered.filter(s => s.supporterType === supporterType)
    if (status) filtered = filtered.filter(s => s.status === status)
    return json(paginate(filtered, pageNum, pageSize))
  }

  // Donations
  if (path === '/api/donations') {
    const pageNum = Number(q.get('pageNum') ?? 1)
    const pageSize = Number(q.get('pageSize') ?? 100)
    const supporterId = q.get('supporterId') ? Number(q.get('supporterId')) : null

    let filtered = allDonations
    if (supporterId) filtered = filtered.filter(d => d.supporterId === supporterId)
    filtered = [...filtered].sort((a, b) =>
      (b.donationDate ?? '').localeCompare(a.donationDate ?? ''))
    return json(paginate(filtered, pageNum, pageSize))
  }

  // Home Visitations
  if (path === '/api/homevisitations') {
    const pageNum = Number(q.get('pageNum') ?? 1)
    const pageSize = Number(q.get('pageSize') ?? 50)
    const residentId = q.get('residentId') ? Number(q.get('residentId')) : null

    let filtered = allVisitations
    if (residentId) filtered = filtered.filter(v => v.residentId === residentId)
    filtered = [...filtered].sort((a, b) =>
      (b.visitDate ?? '').localeCompare(a.visitDate ?? ''))
    return json(paginate(filtered, pageNum, pageSize))
  }

  // Process Recordings
  if (path === '/api/processrecordings') {
    const pageNum = Number(q.get('pageNum') ?? 1)
    const pageSize = Number(q.get('pageSize') ?? 50)
    const residentId = q.get('residentId') ? Number(q.get('residentId')) : null

    let filtered = allRecordings
    if (residentId) filtered = filtered.filter(r => r.residentId === residentId)
    filtered = [...filtered].sort((a, b) =>
      (b.sessionDate ?? '').localeCompare(a.sessionDate ?? ''))
    return json(paginate(filtered, pageNum, pageSize))
  }

  // Social Media Posts
  if (path === '/api/socialmediaposts') {
    const pageNum = Number(q.get('pageNum') ?? 1)
    const pageSize = Number(q.get('pageSize') ?? 20)
    const platform = q.get('platform')
    let filtered: SocialMediaPost[] = SOCIAL_POSTS
    if (platform) filtered = filtered.filter(p => p.platform === platform)
    return json(paginate(filtered, pageNum, pageSize))
  }

  // Reports — summary
  if (path === '/api/reports/summary') {
    return json(SUMMARY)
  }

  // Reports — donations by month
  if (path === '/api/reports/donations-by-month') {
    const months = Number(q.get('months') ?? 12)
    return json(DONATIONS_BY_MONTH.slice(-months))
  }

  // Auth — login (demo passthrough)
  if (path === '/api/auth/login') {
    return json({ email: 'staff@northstarshelter.org', roles: ['Staff'] })
  }

  // Auth — me
  if (path === '/api/auth/me') {
    return json({ email: 'staff@northstarshelter.org', roles: ['Staff'] })
  }

  // Fallback
  return new Response(JSON.stringify({ error: `Mock: no handler for ${path}` }), { status: 404 })
}
