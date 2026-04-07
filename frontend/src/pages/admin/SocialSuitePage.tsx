import { useState, useMemo, useCallback } from 'react'
import AdminLayout from '../../components/AdminLayout'
import {
  scorePost,
  PLATFORMS,
  TONES,
  POST_TYPES,
  MEDIA_TYPES,
  TOPICS,
  CTA_TYPES,
} from '../../lib/socialScoringEngine'
import type { PostScoreInputs, PostScoreResult } from '../../lib/socialScoringEngine'
import { PLATFORM_INSIGHTS, CAPTION_TEMPLATES, CONTENT_GAPS } from '../../lib/socialData'
import './SocialSuitePage.css'

// ─── Helpers ─────────────────────────────────────────────────

function formatHour(h: number): string {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

const TIER_ORDER = ['needs-work', 'fair', 'good', 'strong', 'excellent'] as const

const TIER_COLORS: Record<string, string> = {
  'needs-work': '#e05c3a',
  fair: '#d4960a',
  good: '#4e9fdc',
  strong: '#2ab87e',
  excellent: '#9b6ecf',
}

interface BrandVoice {
  orgName: string
  mission: string
  tonePreference: string
  audienceDescription: string
  keyPhrases: string
  avoidPhrases: string
  websiteUrl: string
}

const DEFAULT_BRAND: BrandVoice = {
  orgName: 'North Star Shelter',
  mission: 'Protecting and restoring the lives of trafficking and abuse survivors',
  tonePreference: 'Warm, hopeful, and evidence-driven',
  audienceDescription: 'Donors, advocates, volunteers, and community supporters',
  keyPhrases: 'hope, healing, restoration, safety, future, resilience',
  avoidPhrases: 'victim (use survivor), helpless, charity case, pity',
  websiteUrl: 'https://northstarshelter.org',
}

function loadBrandVoice(): BrandVoice {
  try {
    const raw = localStorage.getItem('ss_brand_voice')
    if (raw) return { ...DEFAULT_BRAND, ...JSON.parse(raw) }
  } catch { /* ignore parse errors */ }
  return { ...DEFAULT_BRAND }
}

const STATIC_INSIGHTS = [
  'Informative tone consistently drives the highest engagement across all platforms (+18% vs baseline)',
  'Resident stories add +2% predicted engagement \u2014 use them where privacy allows',
  'Posts boosted even modestly (\u20B1500+) show measurable engagement lift',
  'Morning posts (9\u201311am) outperform late-night by ~2% across platforms',
  'LinkedIn & WhatsApp are your highest-performing channels but likely underutilized',
  'Video and Reels significantly outperform static photos (+15-25%)',
]

const TOP_POSTS = [
  { platform: 'LinkedIn', caption: 'This quarter, our education program reached 1,200 children across 14 schools in Metro Manila. Here\u2019s what the data shows about early intervention...', engagementRate: 0.214, postType: 'EducationalContent', tone: 'Informative', mediaType: 'Carousel' },
  { platform: 'WhatsApp', caption: 'Hi friends! Quick update: because of YOUR generosity, 8 more children received full scholarships this month. We\u2019re so grateful for each of you.', engagementRate: 0.178, postType: 'ThankYou', tone: 'Grateful', mediaType: 'Photo' },
  { platform: 'LinkedIn', caption: 'From survivor to scholar: how one young woman\u2019s journey through our reintegration program is redefining what recovery looks like.', engagementRate: 0.168, postType: 'ImpactStory', tone: 'Inspirational', mediaType: 'Video' },
  { platform: 'Instagram', caption: 'She arrived afraid to speak. Today she read her essay about hope to her entire class. This is what healing looks like. \u{1F9E1}', engagementRate: 0.152, postType: 'ImpactStory', tone: 'Emotional', mediaType: 'Reel' },
  { platform: 'Twitter', caption: '47,000 children are trafficked in Southeast Asia annually. Most are under 15. Our prevention education has reached 14 schools. Here\u2019s what works \u2192', engagementRate: 0.143, postType: 'EducationalContent', tone: 'Informative', mediaType: 'Text' },
]

// ─── Component ───────────────────────────────────────────────

type Tab = 'score' | 'platforms' | 'gaps' | 'captions'

export default function SocialSuitePage() {
  const [tab, setTab] = useState<Tab>('score')

  return (
    <AdminLayout>
      <div className="ss">
        <div className="page-header">
          <h1>Social Suite</h1>
          <p>ML-powered engagement scoring, platform insights, and caption tools</p>
        </div>

        <div className="ss-tabs">
          {([
            ['score', 'Score'],
            ['platforms', 'Platforms'],
            ['gaps', 'Gaps'],
            ['captions', 'Captions'],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              className={`ss-tab${tab === key ? ' ss-tab--active' : ''}`}
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="ss-tab-content">
          {tab === 'score' && <ScoreTab />}
          {tab === 'platforms' && <PlatformsTab />}
          {tab === 'gaps' && <GapsTab />}
          {tab === 'captions' && <CaptionsTab />}
        </div>
      </div>
    </AdminLayout>
  )
}

// ─── Score Tab ───────────────────────────────────────────────

function ScoreTab() {
  const [inputs, setInputs] = useState<PostScoreInputs>({
    platform: 'Instagram',
    postType: 'ImpactStory',
    mediaType: 'Photo',
    sentimentTone: 'Informative',
    contentTopic: 'Education',
    hasCallToAction: true,
    ctaType: 'Donate',
    postHour: 10,
    isWeekend: false,
    numHashtags: 5,
    captionLength: 150,
    featuresResidentStory: false,
    isBoosted: false,
    boostBudget: 0,
  })

  const result = useMemo(() => scorePost(inputs), [inputs])

  const set = useCallback(<K extends keyof PostScoreInputs>(key: K, val: PostScoreInputs[K]) => {
    setInputs(prev => ({ ...prev, [key]: val }))
  }, [])

  return (
    <div className="ss-score-layout">
      <div className="ss-form">
        {/* Channel & Format */}
        <div className="ss-form-section">
          <p className="ss-form-section__title">Channel &amp; Format</p>
          <div className="ss-field">
            <label>Platform</label>
            <select value={inputs.platform} onChange={e => set('platform', e.target.value)}>
              {PLATFORMS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="ss-field">
            <label>Post Type</label>
            <select value={inputs.postType} onChange={e => set('postType', e.target.value)}>
              {POST_TYPES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="ss-field">
            <label>Media Type</label>
            <select value={inputs.mediaType} onChange={e => set('mediaType', e.target.value)}>
              {MEDIA_TYPES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {/* Content & Tone */}
        <div className="ss-form-section">
          <p className="ss-form-section__title">Content &amp; Tone</p>
          <div className="ss-field">
            <label>Content Topic</label>
            <select value={inputs.contentTopic} onChange={e => set('contentTopic', e.target.value)}>
              {TOPICS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="ss-field">
            <label>Sentiment Tone</label>
            <select value={inputs.sentimentTone} onChange={e => set('sentimentTone', e.target.value)}>
              {TONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="ss-toggle-row">
            <label>Include Resident Story</label>
            <div className="ss-toggle">
              <input
                type="checkbox"
                checked={inputs.featuresResidentStory}
                onChange={e => set('featuresResidentStory', e.target.checked)}
              />
              <span className="ss-toggle__track" />
            </div>
          </div>
        </div>

        {/* Copy */}
        <div className="ss-form-section">
          <p className="ss-form-section__title">Copy</p>
          <div className="ss-field">
            <label>Caption Length (chars)</label>
            <input
              type="number"
              min={0}
              max={5000}
              value={inputs.captionLength}
              onChange={e => set('captionLength', Number(e.target.value))}
            />
            <span className="ss-field__hint">~{Math.round(inputs.captionLength / 5)} words</span>
          </div>
          <div className="ss-field">
            <label>Hashtag Count</label>
            <input
              type="number"
              min={0}
              max={30}
              value={inputs.numHashtags}
              onChange={e => set('numHashtags', Number(e.target.value))}
            />
          </div>
          <div className="ss-toggle-row">
            <label>Has Call to Action</label>
            <div className="ss-toggle">
              <input
                type="checkbox"
                checked={inputs.hasCallToAction}
                onChange={e => set('hasCallToAction', e.target.checked)}
              />
              <span className="ss-toggle__track" />
            </div>
          </div>
          {inputs.hasCallToAction && (
            <div className="ss-field">
              <label>CTA Type</label>
              <select value={inputs.ctaType} onChange={e => set('ctaType', e.target.value)}>
                {CTA_TYPES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Timing */}
        <div className="ss-form-section">
          <p className="ss-form-section__title">Timing</p>
          <div className="ss-field">
            <label>Post Hour</label>
            <select value={inputs.postHour} onChange={e => set('postHour', Number(e.target.value))}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>{formatHour(i)}</option>
              ))}
            </select>
          </div>
          <div className="ss-toggle-row">
            <label>Weekend</label>
            <div className="ss-toggle">
              <input
                type="checkbox"
                checked={inputs.isWeekend}
                onChange={e => set('isWeekend', e.target.checked)}
              />
              <span className="ss-toggle__track" />
            </div>
          </div>
        </div>

        {/* Boost */}
        <div className="ss-form-section">
          <p className="ss-form-section__title">Boost</p>
          <div className="ss-toggle-row">
            <label>Boosted</label>
            <div className="ss-toggle">
              <input
                type="checkbox"
                checked={inputs.isBoosted}
                onChange={e => set('isBoosted', e.target.checked)}
              />
              <span className="ss-toggle__track" />
            </div>
          </div>
          {inputs.isBoosted && (
            <div className="ss-field">
              <label>Boost Budget (PHP)</label>
              <input
                type="number"
                min={0}
                value={inputs.boostBudget}
                onChange={e => set('boostBudget', Number(e.target.value))}
              />
            </div>
          )}
        </div>
      </div>

      <ScoreResult result={result} currentPlatform={inputs.platform} />
    </div>
  )
}

function ScoreResult({ result, currentPlatform }: { result: PostScoreResult; currentPlatform: string }) {
  const maxRate = Math.max(...result.platformComparison.map(p => p.rate), 0.01)
  const tierIdx = TIER_ORDER.indexOf(result.tier)

  return (
    <div className="ss-result">
      <div className="ss-score-display">
        <p className="ss-score-number" style={{ color: TIER_COLORS[result.tier] }}>
          {pct(result.predictedRate)}
        </p>
        <span className={`ss-score-tier ss-score-tier--${result.tier}`}>{result.tierLabel}</span>
      </div>

      <div className="ss-tier-bar">
        {TIER_ORDER.map((t, i) => (
          <div
            key={t}
            className={`ss-tier-segment ss-tier-segment--${t}${i <= tierIdx ? ' ss-tier-segment--active' : ''}`}
          />
        ))}
      </div>

      <div className="ss-driver-box">
        <strong>Top signal:</strong> {result.primaryDriver}
      </div>

      {result.improvements.length > 0 && (
        <>
          <p className="ss-gap-section-title">Suggested improvements</p>
          <div className="ss-improvement-cards">
            {result.improvements.map((imp, i) => (
              <div key={i} className="ss-improvement-card">
                <div className="ss-improvement-card__header">
                  <span className="ss-improvement-card__change">{imp.change}</span>
                  <span className="ss-gain-badge">+{(imp.gain * 100).toFixed(1)}%</span>
                </div>
                <p className="ss-improvement-card__explanation">{imp.explanation}</p>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="ss-platform-bars">
        <p className="ss-platform-bars__title">Platform comparison</p>
        {result.platformComparison.map(p => (
          <div
            key={p.platform}
            className={`ss-platform-bar-row${p.platform === currentPlatform ? ' ss-platform-bar-row--active' : ''}`}
          >
            <span className="ss-platform-bar-row__label">{p.platform}</span>
            <div className="ss-platform-bar-track">
              <div
                className="ss-platform-bar-fill"
                style={{ width: `${(p.rate / maxRate) * 100}%` }}
              />
            </div>
            <span className="ss-platform-bar-row__value">{pct(p.rate)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Platforms Tab ────────────────────────────────────────────

function PlatformsTab() {
  return (
    <div className="ss-platforms-grid">
      {PLATFORM_INSIGHTS.map(p => (
        <div key={p.platform} className="ss-platform-card">
          <div className="ss-platform-card__header">
            <span className="ss-platform-card__emoji">{p.emoji}</span>
            <span className="ss-platform-card__name">{p.platform}</span>
            <span className="ss-platform-card__avg">{pct(p.avgEngagement)}</span>
          </div>
          <div className="ss-platform-card__hours">
            {p.bestHours.split(', ').map(h => (
              <span key={h} className="ss-platform-card__hours-chip">{h}</span>
            ))}
          </div>
          <dl className="ss-platform-card__facts">
            <dt>Top Content</dt><dd>{p.topContentType}</dd>
            <dt>Tone</dt><dd>{p.topTone}</dd>
            <dt>Audience</dt><dd>{p.audienceNote}</dd>
            <dt>Char Limit</dt><dd>{p.charLimit ? p.charLimit.toLocaleString() : 'None'}</dd>
          </dl>
          <p className="ss-platform-card__insight">{p.keyInsight}</p>
          <p className="ss-platform-card__hashtag"># {p.hashtagTip}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Gaps Tab ────────────────────────────────────────────────

function GapsTab() {
  const sorted = useMemo(() =>
    [...CONTENT_GAPS].sort((a, b) => {
      const prio = { critical: 0, high: 1, medium: 2 }
      const d = prio[a.priority] - prio[b.priority]
      if (d !== 0) return d
      return b.avgEngagement - a.avgEngagement
    }), [])

  return (
    <div>
      <p className="ss-gap-section-title">Where to focus next</p>
      <div className="ss-gap-grid">
        {sorted.map((g, i) => (
          <div key={i} className="ss-gap-card">
            <div className={`ss-priority-bar ss-priority-bar--${g.priority}`} />
            <div className="ss-gap-card__chips">
              <span className="ss-gap-card__chip">{g.platform}</span>
              <span className="ss-gap-card__chip">{g.topic}</span>
              <span className={`ss-gap-card__chip ss-gap-card__chip--priority ss-gap-card__chip--${g.priority}`}>
                {g.priority}
              </span>
              <span className="ss-gap-card__chip">{g.postFrequency}</span>
            </div>
            <p className="ss-gap-card__text">{g.opportunity}</p>
            <span className="ss-gap-card__engagement">Avg engagement: {pct(g.avgEngagement)}</span>
          </div>
        ))}
      </div>

      <div className="ss-section-gap">
        <p className="ss-gap-section-title">Content mix insights</p>
        <div className="ss-insight-cards">
          {STATIC_INSIGHTS.map((text, i) => (
            <div key={i} className="ss-insight-card">
              <span className="ss-insight-card__icon">{'\u{1F4A1}'}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Captions Tab ────────────────────────────────────────────

function CaptionsTab() {
  // Brand voice
  const [brandVoice, setBrandVoice] = useState<BrandVoice>(loadBrandVoice)
  const [brandOpen, setBrandOpen] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)

  const saveBrand = useCallback(() => {
    localStorage.setItem('ss_brand_voice', JSON.stringify(brandVoice))
    setSavedFlash(true)
    setTimeout(() => setSavedFlash(false), 2000)
  }, [brandVoice])

  const setBV = useCallback(<K extends keyof BrandVoice>(key: K, val: BrandVoice[K]) => {
    setBrandVoice(prev => ({ ...prev, [key]: val }))
  }, [])

  // Generator
  const [genPlatform, setGenPlatform] = useState('Instagram')
  const [genTopic, setGenTopic] = useState('Impact')
  const [genTone, setGenTone] = useState('Emotional')
  const [genCTA, setGenCTA] = useState(true)
  const [generated, setGenerated] = useState<typeof CAPTION_TEMPLATES[number] | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = useCallback(() => {
    // Find best match: exact first, then partial
    let match = CAPTION_TEMPLATES.find(
      t => t.platform === genPlatform && t.topic === genTopic && t.tone === genTone
    )
    if (!match) {
      match = CAPTION_TEMPLATES.find(t => t.platform === genPlatform && t.topic === genTopic)
    }
    if (!match) {
      match = CAPTION_TEMPLATES.find(t => t.platform === genPlatform && t.tone === genTone)
    }
    if (!match) {
      match = CAPTION_TEMPLATES.find(t => t.platform === genPlatform)
    }
    if (!match) {
      match = CAPTION_TEMPLATES.find(t => t.tone === genTone && t.topic === genTopic)
    }
    setGenerated(match ?? null)
  }, [genPlatform, genTopic, genTone])

  const copyTemplate = useCallback(async () => {
    if (!generated) return
    await navigator.clipboard.writeText(generated.template)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [generated])

  const copyHashtag = useCallback(async (tag: string) => {
    await navigator.clipboard.writeText(tag)
  }, [])

  return (
    <div className="ss-captions-layout">
      {/* Brand Voice */}
      <div className="ss-brand-voice">
        <button className="ss-brand-voice__toggle" onClick={() => setBrandOpen(v => !v)}>
          <span>Brand Voice Settings</span>
          <span>{brandOpen ? '\u25B2' : '\u25BC'}</span>
        </button>
        {brandOpen && (
          <div className="ss-brand-voice__form">
            <div className="ss-field">
              <label>Organization Name</label>
              <input value={brandVoice.orgName} onChange={e => setBV('orgName', e.target.value)} />
            </div>
            <div className="ss-field">
              <label>Website URL</label>
              <input value={brandVoice.websiteUrl} onChange={e => setBV('websiteUrl', e.target.value)} />
            </div>
            <div className="ss-field ss-field--full">
              <label>Mission</label>
              <input value={brandVoice.mission} onChange={e => setBV('mission', e.target.value)} />
            </div>
            <div className="ss-field">
              <label>Tone Preference</label>
              <input value={brandVoice.tonePreference} onChange={e => setBV('tonePreference', e.target.value)} />
            </div>
            <div className="ss-field">
              <label>Audience Description</label>
              <input value={brandVoice.audienceDescription} onChange={e => setBV('audienceDescription', e.target.value)} />
            </div>
            <div className="ss-field">
              <label>Key Phrases (comma-separated)</label>
              <input value={brandVoice.keyPhrases} onChange={e => setBV('keyPhrases', e.target.value)} />
            </div>
            <div className="ss-field">
              <label>Avoid Phrases (comma-separated)</label>
              <input value={brandVoice.avoidPhrases} onChange={e => setBV('avoidPhrases', e.target.value)} />
            </div>
            <div className="ss-brand-voice__actions">
              <button className="ss-save-btn" onClick={saveBrand}>Save</button>
              {savedFlash && <span className="ss-saved-flash">Saved &#10003;</span>}
            </div>
          </div>
        )}
      </div>

      {/* Caption Generator */}
      <div className="ss-generator">
        <p className="ss-generator__title">Caption Generator</p>
        <div className="ss-platform-chips">
          {PLATFORMS.map(p => (
            <button
              key={p}
              className={`ss-platform-chip${genPlatform === p ? ' ss-platform-chip--active' : ''}`}
              onClick={() => setGenPlatform(p)}
            >
              {PLATFORM_INSIGHTS.find(pi => pi.platform === p)?.emoji} {p}
            </button>
          ))}
        </div>
        <div className="ss-generator__controls">
          <div className="ss-field">
            <label>Topic</label>
            <select value={genTopic} onChange={e => setGenTopic(e.target.value)}>
              {TOPICS.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="ss-field">
            <label>Tone</label>
            <select value={genTone} onChange={e => setGenTone(e.target.value)}>
              {TONES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="ss-toggle-row">
            <label>Include CTA</label>
            <div className="ss-toggle">
              <input type="checkbox" checked={genCTA} onChange={e => setGenCTA(e.target.checked)} />
              <span className="ss-toggle__track" />
            </div>
          </div>
          <button className="ss-generate-btn" onClick={handleGenerate}>Generate</button>
        </div>

        {generated ? (
          <div className="ss-template-display">
            <pre className="ss-template-text">{generated.template}</pre>
            <ul className="ss-template-tips">
              {generated.tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
            {generated.exampleHashtags.length > 0 && (
              <div className="ss-hashtag-chips">
                {generated.exampleHashtags.map(tag => (
                  <button key={tag} className="ss-hashtag-chip" onClick={() => void copyHashtag(tag)}>{tag}</button>
                ))}
              </div>
            )}
            <button className="ss-copy-btn" onClick={() => void copyTemplate()}>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
          </div>
        ) : (
          <div className="ss-no-match">Select options and click Generate to see a caption template</div>
        )}
      </div>

      {/* Top Performers */}
      <div className="ss-top-performers">
        <p className="ss-top-performers__title">Top Performers</p>
        {TOP_POSTS.map((post, i) => (
          <div key={i} className="ss-post-card">
            <div className="ss-post-card__header">
              <span className="ss-post-card__platform">
                {PLATFORM_INSIGHTS.find(p => p.platform === post.platform)?.emoji} {post.platform}
              </span>
              <span className="ss-post-card__rate">{pct(post.engagementRate)}</span>
            </div>
            <p className="ss-post-card__caption">{post.caption}</p>
            <div className="ss-post-card__meta">
              <span>{post.postType}</span>
              <span>{post.tone}</span>
              <span>{post.mediaType}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
