import React, { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import {
  fetchAllSocialMediaPosts,
  fetchSocialMediaInsights,
  fetchRecommendations,
  type SocialMediaInsights,
  type SocialRecommendation,
} from '../../lib/socialMediaPostsApi'
import { predictPostPerformance, type PredictRequest, type PredictResponse } from '../../lib/socialPredictApi'
import { generateCaption, type CaptionRequest, type CaptionResponse } from '../../lib/socialCaptionsApi'
import type { SocialMediaPost } from '../../types/domain'
import './SocialSuitePage.css'

type Tab = 'learn' | 'plan' | 'predict' | 'draft' | 'posts'

function pct(value: number | null | undefined): string {
  return value == null ? '\u2014' : `${(value * 100).toFixed(1)}%`
}

function average(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value != null)
  if (present.length === 0) return null
  return present.reduce((sum, value) => sum + value, 0) / present.length
}

const PLATFORMS = ['Facebook', 'Instagram', 'LinkedIn', 'YouTube', 'TikTok', 'WhatsApp']
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

// {value: DB/ML value, label: human-readable display name}
const POST_TYPES = [
  { value: 'Campaign',           label: 'Campaign' },
  { value: 'EducationalContent', label: 'Educational Content' },
  { value: 'EventPromotion',     label: 'Event Promotion' },
  { value: 'FundraisingAppeal',  label: 'Fundraising Appeal' },
  { value: 'ImpactStory',        label: 'Impact Story' },
  { value: 'ThankYou',           label: 'Thank You' },
]
const MEDIA_TYPES = [
  { value: 'Carousel', label: 'Carousel' },
  { value: 'Photo',    label: 'Photo' },
  { value: 'Reel',     label: 'Reel' },
  { value: 'Text',     label: 'Text' },
  { value: 'Video',    label: 'Video' },
]
const CONTENT_TOPICS = [
  { value: 'AwarenessRaising', label: 'Awareness Raising' },
  { value: 'CampaignLaunch',   label: 'Campaign Launch' },
  { value: 'DonorImpact',      label: 'Donor Impact' },
  { value: 'Education',        label: 'Education' },
  { value: 'EventRecap',       label: 'Event Recap' },
  { value: 'Gratitude',        label: 'Gratitude' },
  { value: 'Health',           label: 'Health' },
  { value: 'Reintegration',    label: 'Reintegration' },
  { value: 'SafehouseLife',    label: 'Safehouse Life' },
]
const SENTIMENT_TONES = [
  { value: 'Celebratory', label: 'Celebratory' },
  { value: 'Emotional',   label: 'Emotional' },
  { value: 'Grateful',    label: 'Grateful' },
  { value: 'Hopeful',     label: 'Hopeful' },
  { value: 'Informative', label: 'Informative' },
  { value: 'Urgent',      label: 'Urgent' },
]
const CTA_TYPES = [
  { value: 'DonateNow',  label: 'Donate Now' },
  { value: 'LearnMore',  label: 'Learn More' },
  { value: 'ShareStory', label: 'Share Story' },
  { value: 'SignUp',     label: 'Sign Up' },
]

// Maps a raw DB value to its human-readable label across all option lists
const ALL_OPTIONS = [...POST_TYPES, ...MEDIA_TYPES, ...CONTENT_TOPICS, ...SENTIMENT_TONES, ...CTA_TYPES]
function toLabel(value: string | null | undefined): string {
  if (!value) return '—'
  return ALL_OPTIONS.find(o => o.value === value)?.label ?? value
}

// ─── Tab: Learn ───────────────────────────────────────────────────────────────

function LearnTab({
  posts,
  insights,
  globalInsights,
  loading,
  error,
  onDraftThis,
}: {
  posts: SocialMediaPost[]
  insights: SocialMediaInsights | null
  globalInsights: SocialMediaInsights | null
  loading: boolean
  error: string | null
  onDraftThis: (platform: string, topic: string) => void
}) {
  const avgEngagement = useMemo(() => average(posts.map(post => post.engagementRate)), [posts])

  const avgClicks = useMemo(() => {
    const present = posts.filter(p => p.clickThroughs != null)
    return present.length === 0 ? null : present.reduce((sum, p) => sum + (p.clickThroughs ?? 0), 0) / present.length
  }, [posts])

  const bestPostType = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const post of posts) {
      if (!post.postType || post.engagementRate == null) continue
      const existing = groups.get(post.postType) ?? []
      existing.push(post.engagementRate)
      groups.set(post.postType, existing)
    }
    let best: { postType: string; engagement: number } | null = null
    for (const [type, values] of groups.entries()) {
      const eng = values.reduce((s, v) => s + v, 0) / values.length
      if (!best || eng > best.engagement) best = { postType: type, engagement: eng }
    }
    return best
  }, [posts])

  const avgReach = useMemo(() => {
    const present = posts.filter(p => p.reach != null)
    return present.length === 0 ? null : present.reduce((sum, p) => sum + (p.reach ?? 0), 0) / present.length
  }, [posts])

  const avgImpressions = useMemo(() => {
    const present = posts.filter(p => p.impressions != null)
    return present.length === 0 ? null : present.reduce((sum, p) => sum + (p.impressions ?? 0), 0) / present.length
  }, [posts])

  const [expandedPost, setExpandedPost] = useState<number | null>(null)

  return (
    <div className="ss-tab-content">
      {loading && <div className="inline-loading">Loading social posts...</div>}
      {error && <p className="admin-error">{error}</p>}

      {!loading && !error && globalInsights && globalInsights.staticInsights.length > 0 && (
        <div className="ss-key-insight" style={{ marginBottom: '0.75rem' }}>
          <span className="ss-key-insight__arrow">→</span>
          {globalInsights.staticInsights[0]}
        </div>
      )}

      <div className="ss-learn-grid">
        <div className="ss-learn-left">
          <div className="stat-card">
            <p className="stat-card__label">
              Avg Click-Throughs
              <span className="ss-kpi-info" data-tip="Measures how many people clicked a link in your post — directly indicates donor and volunteer traffic driven to your site." aria-label="About average click-throughs" tabIndex={0}>ⓘ</span>
            </p>
            <p className="stat-card__value">{avgClicks == null ? '—' : avgClicks.toFixed(1)}</p>
            <p className="stat-card__sub">Per post average</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">
              Avg Reach
              <span className="ss-kpi-info" data-tip="The number of unique accounts that saw your post — shows how far your content is spreading beyond your existing followers." aria-label="About average reach" tabIndex={0}>ⓘ</span>
            </p>
            <p className="stat-card__value">{avgReach == null ? '—' : Math.round(avgReach).toLocaleString()}</p>
            <p className="stat-card__sub">Per post average</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">
              Avg Impressions
              <span className="ss-kpi-info" data-tip="Total times your post was displayed, including repeat views — reflects overall visibility and how often your content resurfaces." aria-label="About average impressions" tabIndex={0}>ⓘ</span>
            </p>
            <p className="stat-card__value">{avgImpressions == null ? '—' : Math.round(avgImpressions).toLocaleString()}</p>
            <p className="stat-card__sub">Per post average</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">
              Avg Engagement
              <span className="ss-kpi-info" data-tip="Likes, comments, and shares as a percentage of reach — indicates how resonant and compelling your content is to those who see it." aria-label="About average engagement" tabIndex={0}>ⓘ</span>
            </p>
            <p className="stat-card__value">{pct(avgEngagement)}</p>
            <p className="stat-card__sub">As a percentage</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">
              Best Post Type
              <span className="ss-kpi-info" data-tip="The post format with the highest average click-throughs for the selected platform — use this as your go-to format." aria-label="About best post type" tabIndex={0}>ⓘ</span>
            </p>
            <p className="stat-card__value" style={{ fontSize: '1.3rem' }}>{bestPostType?.postType ?? '—'}</p>
            <p className="stat-card__sub">{(() => { const ps = [...new Set(posts.map(p => p.platform).filter(Boolean))]; return ps.length === 1 ? ps[0] : 'All platforms'; })()}</p>
          </div>
        </div>

        <div className="ss-learn-right">
          {!loading && !error && insights && insights.topPosts.length > 0 && (
            <div>
              <p className="section-title">Top Posts</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.5rem' }}>
                {insights.topPosts.map((post, idx) => {
                  const isExpanded = expandedPost === post.postId
                  const preview = post.caption
                    ? post.caption.length > 80
                      ? post.caption.slice(0, 80) + '…'
                      : post.caption
                    : '\u2014'
                  return (
                    <button
                      key={post.postId}
                      type="button"
                      className={`ss-top-post-row${isExpanded ? ' ss-top-post-row--expanded' : ''}`}
                      onClick={() => setExpandedPost(isExpanded ? null : post.postId)}
                    >
                      <span className="ss-top-post-rank">#{idx + 1}</span>
                      <span className="badge badge--blue">{post.platform}</span>
                      {post.tone && <span className="ss-chip">{post.tone}</span>}
                      <span className="ss-top-post-rate">{post.clickThroughs?.toLocaleString() ?? '—'} clicks</span>
                      <span className="ss-top-post-caption">
                        {isExpanded ? post.caption : preview}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {!loading && !error && insights && insights.contentGaps.length > 0 && (
            <div>
              <p className="section-title">Opportunities</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                {insights.contentGaps.slice(0, 3).map(gap => (
                  <div key={`${gap.platform}-${gap.topic}`} className="ss-opp-row">
                    <span className="ss-opp-row__bullet">●</span>
                    <span className="badge badge--blue">{gap.platform}</span>
                    <span className="ss-opp-row__topic">{toLabel(gap.topic)}</span>
                    <span className="ss-opp-row__avg">{gap.avgClicks?.toFixed(0) ?? '—'} avg clicks</span>
                    <button
                      type="button"
                      className="ss-draft-btn"
                      onClick={() => onDraftThis(gap.platform, gap.topic)}
                    >
                      Draft →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {!loading && !error && posts.length === 0 && (
        <div className="empty-state">No social posts were returned for the current filter.</div>
      )}
    </div>
  )
}

// ─── Tab: Plan ────────────────────────────────────────────────────────────────

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT: Record<string, string> = {
  Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed',
  Thursday: 'Thu', Friday: 'Fri', Saturday: 'Sat', Sunday: 'Sun'
}

function CalCard({ rec, onDraft, detailed = false }: {
  rec: SocialRecommendation
  onDraft: (p: string, t: string) => void
  detailed?: boolean
}) {
  const lift = (rec.expectedClicks - rec.platformBaselineClicks).toFixed(0)
  return (
    <div className={`ss-cal-card ss-cal-card--${rec.category}`}>
      <div className="ss-cal-card__header">
        <span className={rec.priority === 'high' ? 'ss-priority-badge ss-priority-badge--high' : 'ss-priority-badge ss-priority-badge--medium'}>
          {rec.priority}
        </span>
        <span className="ss-cal-card__time">{rec.suggestedHour}</span>
      </div>
      <div className="ss-cal-card__topic">{toLabel(rec.topic)}</div>
      <div className="ss-cal-card__chips">
        <span className="ss-chip ss-chip--xs">{toLabel(rec.bestPostType)}</span>
        <span className="ss-chip ss-chip--xs">{toLabel(rec.bestTone)}</span>
      </div>
      <div className="ss-cal-card__clicks">+{lift} clicks</div>
      {detailed && <p className="ss-cal-card__reasoning">{rec.reasoning}</p>}
      <button type="button" className="ss-cal-card__draft" onClick={() => onDraft(rec.platform, rec.topic)}>
        Draft →
      </button>
    </div>
  )
}

function PlanTab({ onDraftThis, selectedPlatform }: {
  onDraftThis: (platform: string, topic: string) => void
  selectedPlatform: string
}) {
  const [recs, setRecs] = useState<SocialRecommendation[]>([])
  const [loadedPlatform, setLoadedPlatform] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetchRecommendations(selectedPlatform || undefined)
      .then(data => {
        if (mounted) {
          setRecs(data)
          setLoadedPlatform(selectedPlatform)
        }
      })
      .catch(() => { if (mounted) setError(null) })
    return () => { mounted = false }
  }, [selectedPlatform])

  const loading = loadedPlatform !== selectedPlatform

  if (loading) return <div className="ss-tab-content"><div className="inline-loading">Loading plan...</div></div>
  if (error) return <div className="ss-tab-content"><p className="admin-error">{error}</p></div>
  if (recs.length === 0) return (
    <div className="ss-tab-content">
      <div className="empty-state">No recommendations yet. Check back after more post data is collected.</div>
    </div>
  )

  // ── Single platform view ──────────────────────────────────
  if (selectedPlatform) {
    const untapped = recs.filter(r => r.category === 'untapped')
    const doubleDown = recs.filter(r => r.category === 'double_down')
    return (
      <div className="ss-tab-content">
        <p className="section-title">Content Plan — {selectedPlatform}</p>
        <div className="ss-plan-summary">
          <div className="ss-plan-summary__box ss-plan-summary__box--untapped">
            <span className="ss-plan-summary__count">{untapped.length}</span>
            <span className="ss-plan-summary__label">💡 Untapped Topics</span>
            <span className="ss-plan-summary__sub">High potential, low posting frequency</span>
          </div>
          <div className="ss-plan-summary__box ss-plan-summary__box--double-down">
            <span className="ss-plan-summary__count">{doubleDown.length}</span>
            <span className="ss-plan-summary__label">🔥 Double Down</span>
            <span className="ss-plan-summary__sub">Already working — post more</span>
          </div>
        </div>
        <div className="ss-calendar">
          <div className="ss-calendar-grid">
            {/* Header row */}
            <div className="ss-calendar-header-row">
              <div className="ss-calendar-header-cell" />
              {DAYS.map(d => (
                <div key={d} className="ss-calendar-header-cell">{DAY_SHORT[d]}</div>
              ))}
            </div>
            {/* Single platform row */}
            <div className="ss-calendar-platform-label">
              <span className="badge badge--blue" style={{ fontSize: '0.72rem' }}>{selectedPlatform}</span>
            </div>
            {DAYS.map(day => {
              const dayRecs = recs.filter(r => r.suggestedDay === day)
              return (
                <div key={day} className="ss-calendar-day-cell">
                  {dayRecs.map((rec, i) => (
                    <CalCard key={i} rec={rec} onDraft={onDraftThis} detailed />
                  ))}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  // ── All platforms view ────────────────────────────────────
  const platforms = [...new Set(recs.map(r => r.platform))]
  return (
    <div className="ss-tab-content">
      <p className="section-title">Content Calendar — All Platforms</p>
      <div className="ss-calendar">
        <div className="ss-calendar-grid">
          {/* Header row */}
          <div className="ss-calendar-header-row">
            <div className="ss-calendar-header-cell" />
            {DAYS.map(d => (
              <div key={d} className="ss-calendar-header-cell">{DAY_SHORT[d]}</div>
            ))}
          </div>
          {/* One row per platform */}
          {platforms.map(platform => (
            <React.Fragment key={platform}>
              <div className="ss-calendar-platform-label">
                <span className="badge badge--blue" style={{ fontSize: '0.72rem' }}>{platform}</span>
              </div>
              {DAYS.map(day => {
                const dayRecs = recs.filter(r => r.platform === platform && r.suggestedDay === day)
                return (
                  <div key={day} className="ss-calendar-day-cell">
                    {dayRecs.map((rec, i) => (
                      <CalCard key={i} rec={rec} onDraft={onDraftThis} />
                    ))}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Predict ─────────────────────────────────────────────────────────────

const DEFAULT_PREDICT: PredictRequest = {
  platform: 'Instagram',
  postHour: 18,
  numHashtags: 3,
  mentionsCount: 0,
  captionLength: 150,
  hasCallToAction: false,
  featuresResidentStory: false,
  isBoosted: false,
  boostBudgetPhp: 0,
  followerCountAtPost: 5000,
  monthNum: new Date().getMonth() + 1,
  isWeekend: false,
  dayOfWeek: 'Monday',
  postType: 'Campaign',
  mediaType: 'Photo',
  callToActionType: null,
  contentTopic: 'AwarenessRaising',
  sentimentTone: 'Hopeful',
  campaignName: null,
}

function PredictTab({ onDraftFromPredict }: { onDraftFromPredict: (platform: string, topic: string) => void }) {
  const [form, setForm] = useState<PredictRequest>(DEFAULT_PREDICT)
  const [result, setResult] = useState<PredictResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [serviceDown, setServiceDown] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function setField<K extends keyof PredictRequest>(key: K, value: PredictRequest[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      isWeekend: prev.dayOfWeek === 'Saturday' || prev.dayOfWeek === 'Sunday'
    }))
  }, [form.dayOfWeek])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setServiceDown(false)
    try {
      const res = await predictPostPerformance(form)
      setResult(res)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('ECONNREFUSED')) {
        setServiceDown(true)
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  function tierColor(tier: 'Low' | 'Medium' | 'High') {
    return tier === 'High' ? '#2ab87e' : tier === 'Medium' ? '#f59e0b' : '#e05c3a'
  }

  return (
    <div className="ss-tab-content">
      {serviceDown && (
        <div className="ss-callout" style={{ marginBottom: '1rem', borderColor: '#e05c3a' }}>
          Prediction service unavailable. Make sure the ML service is running on port 8001.
        </div>
      )}

      <div className="ss-predict-layout">
        <form className="ss-form" onSubmit={e => void handleSubmit(e)}>
          <div className="ss-form-section">
            <div className="ss-predict-form-grid">
              <div>
                <p className="ss-form-section__title">Post Details</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <div className="ss-field">
                    <label>Platform</label>
                    <select value={form.platform} onChange={e => setField('platform', e.target.value)}>
                      {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="ss-field">
                    <label>Post Type</label>
                    <select value={form.postType} onChange={e => setField('postType', e.target.value)}>
                      {POST_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="ss-field">
                    <label>Media Type</label>
                    <select value={form.mediaType} onChange={e => setField('mediaType', e.target.value)}>
                      {MEDIA_TYPES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="ss-field">
                    <label>Content Topic</label>
                    <select value={form.contentTopic} onChange={e => setField('contentTopic', e.target.value)}>
                      {CONTENT_TOPICS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                  <div className="ss-field">
                    <label>Sentiment Tone</label>
                    <select value={form.sentimentTone} onChange={e => setField('sentimentTone', e.target.value)}>
                      {SENTIMENT_TONES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <p className="ss-form-section__title">Timing &amp; Options</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.5rem' }}>
                  <div className="ss-field">
                    <label>Post Hour (0–23)</label>
                    <input
                      type="number" min={0} max={23}
                      value={form.postHour}
                      onChange={e => setField('postHour', Number(e.target.value))}
                    />
                  </div>
                  <div className="ss-field">
                    <label>Day of Week</label>
                    <select value={form.dayOfWeek} onChange={e => setField('dayOfWeek', e.target.value)}>
                      {DAYS_OF_WEEK.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="ss-field">
                    <label>Hashtags</label>
                    <input type="number" min={0} value={form.numHashtags} onChange={e => setField('numHashtags', Number(e.target.value))} />
                  </div>
                  <div className="ss-field">
                    <label>Caption Length (chars)</label>
                    <input type="number" min={0} value={form.captionLength} onChange={e => setField('captionLength', Number(e.target.value))} />
                  </div>
                  <div className="ss-toggle-row">
                    <label>Has CTA</label>
                    <label className="ss-toggle">
                      <input type="checkbox" checked={form.hasCallToAction} onChange={e => setField('hasCallToAction', e.target.checked)} />
                      <span className="ss-toggle__track" />
                    </label>
                  </div>
                  {form.hasCallToAction && (
                    <div className="ss-field">
                      <label>CTA Type</label>
                      <select
                        value={form.callToActionType ?? ''}
                        onChange={e => setField('callToActionType', e.target.value || null)}
                      >
                        <option value="">None</option>
                        {CTA_TYPES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="ss-toggle-row">
                    <label>Resident Story</label>
                    <label className="ss-toggle">
                      <input type="checkbox" checked={form.featuresResidentStory} onChange={e => setField('featuresResidentStory', e.target.checked)} />
                      <span className="ss-toggle__track" />
                    </label>
                  </div>
                  <div className="ss-toggle-row">
                    <label>Is Boosted</label>
                    <label className="ss-toggle">
                      <input type="checkbox" checked={form.isBoosted} onChange={e => setField('isBoosted', e.target.checked)} />
                      <span className="ss-toggle__track" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" className="ss-generate-btn" disabled={loading}>
            {loading ? 'Predicting...' : 'Predict Performance'}
          </button>
          {error && <p className="admin-error">{error}</p>}
        </form>

        <div>
          {!result && !loading && (
            <div className="ss-predict-placeholder">
              <p>Fill in the post details and click <strong>Predict Performance</strong> to see your engagement and click-through forecast.</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--adm-muted)', marginTop: '0.5rem' }}>Powered by a Gradient Boosting model trained on 812 historical posts (R²=0.75).</p>
            </div>
          )}
          {loading && (
            <div className="ss-predict-placeholder">
              <div className="ss-spinner" />
              <p>Running prediction...</p>
            </div>
          )}
          {result && (
            <div className="ss-predict-result">
              <div className="ss-predict-dual">
                <div className="ss-predict-card" style={{ borderTopColor: tierColor(result.engagementTier) }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--adm-muted)' }}>Engagement Rate</p>
                  <p className="ss-predict-metric" style={{ color: tierColor(result.engagementTier) }}>{result.engagementPredictedPct}</p>
                  <span className="ss-tier-badge" style={{ background: `${tierColor(result.engagementTier)}22`, color: tierColor(result.engagementTier) }}>
                    {result.engagementTier}
                  </span>
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.83rem', color: 'var(--adm-ink)', lineHeight: 1.5 }}>
                    {result.engagementTierDescription}
                  </p>
                </div>
                <div className="ss-predict-card" style={{ borderTopColor: tierColor(result.clicksTier) }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--adm-muted)' }}>Click-Throughs</p>
                  <p className="ss-predict-metric" style={{ color: tierColor(result.clicksTier) }}>{result.clicksPredictedStr}</p>
                  <span className="ss-tier-badge" style={{ background: `${tierColor(result.clicksTier)}22`, color: tierColor(result.clicksTier) }}>
                    {result.clicksTier}
                  </span>
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.83rem', color: 'var(--adm-ink)', lineHeight: 1.5 }}>
                    {result.clicksTierDescription}
                  </p>
                </div>
                <div className="ss-predict-card" style={{ borderTopColor: tierColor(result.reachTier) }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--adm-muted)' }}>Reach</p>
                  <p className="ss-predict-metric" style={{ color: tierColor(result.reachTier) }}>{result.reachPredicted.toLocaleString()}</p>
                  <span className="ss-tier-badge" style={{ background: `${tierColor(result.reachTier)}22`, color: tierColor(result.reachTier) }}>
                    {result.reachTier}
                  </span>
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.83rem', color: 'var(--adm-ink)', lineHeight: 1.5 }}>
                    {result.reachTierDescription}
                  </p>
                </div>
                <div className="ss-predict-card" style={{ borderTopColor: tierColor(result.impressionsTier) }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--adm-muted)' }}>Impressions</p>
                  <p className="ss-predict-metric" style={{ color: tierColor(result.impressionsTier) }}>{result.impressionsPredicted.toLocaleString()}</p>
                  <span className="ss-tier-badge" style={{ background: `${tierColor(result.impressionsTier)}22`, color: tierColor(result.impressionsTier) }}>
                    {result.impressionsTier}
                  </span>
                  <p style={{ margin: '0.75rem 0 0', fontSize: '0.83rem', color: 'var(--adm-ink)', lineHeight: 1.5 }}>
                    {result.impressionsTierDescription}
                  </p>
                </div>
              </div>
              <div className="ss-callout">
                <p style={{ margin: 0, fontSize: '0.83rem' }}>{result.platformContext}</p>
              </div>
              {result.tips.length > 0 && (
                <div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--adm-muted)' }}>Tips</p>
                  <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    {result.tips.map((tip, i) => (
                      <li key={i} style={{ fontSize: '0.83rem', color: 'var(--adm-ink)', lineHeight: 1.5 }}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}
              <p style={{ margin: 0, fontSize: '0.72rem', color: 'var(--adm-muted)' }}>
                {result.modelNote}
              </p>
              <button
                type="button"
                className="ss-draft-btn"
                onClick={() => onDraftFromPredict(form.platform, form.contentTopic)}
              >
                → Draft a caption for this post
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Draft ───────────────────────────────────────────────────────────────

const DEFAULT_CAPTION: CaptionRequest = {
  platform: 'Instagram',
  topic: 'AwarenessRaising',
  tone: 'Hopeful',
  campaign: '',
  ctaPhrase: '',
  includeResidentStory: false,
  additionalContext: '',
}

function DraftTab({ prefill }: { prefill: { platform?: string; topic?: string } | null }) {
  const [form, setForm] = useState<CaptionRequest>(() => ({
    ...DEFAULT_CAPTION,
    ...(prefill?.platform ? { platform: prefill.platform } : {}),
    ...(prefill?.topic ? { topic: prefill.topic } : {}),
  }))
  const [result, setResult] = useState<CaptionResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<number | null>(null)
  const [showFacts, setShowFacts] = useState(false)

  // Update form when prefill changes
  useEffect(() => {
    if (prefill) {
      setForm(prev => ({
        ...prev,
        ...(prefill.platform ? { platform: prefill.platform } : {}),
        ...(prefill.topic ? { topic: prefill.topic } : {}),
      }))
    }
  }, [prefill])

  function setField<K extends keyof CaptionRequest>(key: K, value: CaptionRequest[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setCopied(null)
    setShowFacts(false)
    try {
      const res = await generateCaption(form)
      setResult(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate captions.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(text: string, idx: number) {
    await navigator.clipboard.writeText(text)
    setCopied(idx)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="ss-tab-content">
      <div className="ss-captions-layout">
        <div className="ss-captions-layout__form">
          <form className="ss-form" onSubmit={e => void handleGenerate(e)}>
            <div className="ss-form-section">
              <p className="ss-form-section__title">Caption Setup</p>
              <div className="ss-field">
                <label>Platform</label>
                <select value={form.platform} onChange={e => setField('platform', e.target.value)}>
                  {PLATFORMS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="ss-field">
                <label>Topic</label>
                <select value={form.topic} onChange={e => setField('topic', e.target.value)}>
                  {CONTENT_TOPICS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="ss-field">
                <label>Tone</label>
                <select value={form.tone} onChange={e => setField('tone', e.target.value)}>
                  {SENTIMENT_TONES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="ss-field">
                <label>Campaign (optional)</label>
                <input type="text" value={form.campaign ?? ''} onChange={e => setField('campaign', e.target.value)} placeholder="e.g. Spring 2025" />
              </div>
              <div className="ss-field">
                <label>Call to Action phrase (optional)</label>
                <input type="text" value={form.ctaPhrase ?? ''} onChange={e => setField('ctaPhrase', e.target.value)} placeholder="e.g. Donate today" />
              </div>
              <div className="ss-toggle-row">
                <label>Include resident story</label>
                <label className="ss-toggle">
                  <input type="checkbox" checked={form.includeResidentStory} onChange={e => setField('includeResidentStory', e.target.checked)} />
                  <span className="ss-toggle__track" />
                </label>
              </div>
              <div className="ss-field">
                <label>Additional context (optional)</label>
                <textarea
                  value={form.additionalContext ?? ''}
                  onChange={e => setField('additionalContext', e.target.value)}
                  placeholder="Any extra guidance for the AI..."
                  rows={4}
                  style={{ padding: '0.4rem 0.55rem', borderRadius: '8px', border: '1px solid var(--adm-border)', background: 'var(--adm-card)', color: 'var(--adm-ink)', fontSize: '0.88rem', resize: 'vertical' }}
                />
              </div>
            </div>

            <button type="submit" className="ss-generate-btn" disabled={loading}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="ss-spinner" /> Generating...
                </span>
              ) : 'Generate Captions'}
            </button>
            {error && <p className="admin-error">{error}</p>}
          </form>
        </div>

        <div className="ss-captions-layout__results">
          {result ? (
            <>
              <div className="ss-results-header">
                <p className="ss-form-section__title">Generated Variants</p>
                <span className="ss-results-header__count">{result.variants.length} options</span>
              </div>
            {result.variants.map((variant, i) => (
              <div key={i} className="ss-caption-variant">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--adm-muted)' }}>
                    Variant {String.fromCharCode(65 + i)}
                  </span>
                  <button
                    type="button"
                    className="ss-copy-btn"
                    onClick={() => void handleCopy(variant, i)}
                  >
                    {copied === i ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--adm-ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {variant}
                </p>
              </div>
            ))}

            <div>
              <button
                type="button"
                className="ss-brand-voice__toggle"
                style={{ width: 'auto', padding: '0.5rem 0', justifyContent: 'flex-start', gap: '0.5rem' }}
                onClick={() => setShowFacts(f => !f)}
              >
                <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Facts &amp; Voice Used</span>
                <span>{showFacts ? '▲' : '▼'}</span>
              </button>
              {showFacts && (
                <div className="ss-form-section" style={{ marginTop: '0.5rem' }}>
                  {result.factsUsed.length > 0 && (
                    <ul style={{ margin: 0, paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      {result.factsUsed.map((fact, i) => (
                        <li key={i} style={{ fontSize: '0.82rem', color: 'var(--adm-ink)' }}>{fact}</li>
                      ))}
                    </ul>
                  )}
                  {result.voiceNotes && (
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--adm-muted)', fontStyle: 'italic' }}>{result.voiceNotes}</p>
                  )}
                </div>
              )}
            </div>

            <button
              type="button"
              className="ss-generate-btn"
              onClick={() => void handleGenerate({ preventDefault: () => {} } as React.FormEvent)}
            >
              Regenerate
            </button>
            </>
          ) : (
            <div className="ss-caption-placeholder">
              <p className="ss-form-section__title">Generated Variants</p>
              <h3>Caption variants will appear here.</h3>
              <p>
                Choose your setup on the left, then generate captions to compare multiple options side by side.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Tab: Posts ───────────────────────────────────────────────────────────────

type SortKey = 'platform' | 'engagementRate' | 'clickThroughs' | 'donationReferrals' | 'createdAt'
type SortDir = 'asc' | 'desc'
const POSTS_TAB_PAGE_SIZE = 11

function SortHeader({
  label,
  col,
  active,
  sortDir,
  onSort,
}: {
  label: string
  col: SortKey
  active: boolean
  sortDir: SortDir
  onSort: (key: SortKey) => void
}) {
  return (
    <th
      style={{ cursor: 'pointer', userSelect: 'none', color: active ? 'var(--adm-accent)' : undefined }}
      onClick={() => onSort(col)}
    >
      {label} {active ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  )
}

function PostsTab({ posts }: { posts: SocialMediaPost[] }) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedPost, setSelectedPost] = useState<SocialMediaPost | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return posts.filter(post =>
      !q ||
      (post.caption ?? '').toLowerCase().includes(q) ||
      (post.campaignName ?? '').toLowerCase().includes(q)
    )
  }, [posts, search])

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDir === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }
      const aNum = Number(aVal)
      const bNum = Number(bVal)
      return sortDir === 'asc' ? aNum - bNum : bNum - aNum
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / POSTS_TAB_PAGE_SIZE))
  const currentPageSafe = Math.min(currentPage, totalPages)

  const pagedPosts = useMemo(() => {
    const start = (currentPageSafe - 1) * POSTS_TAB_PAGE_SIZE
    return sorted.slice(start, start + POSTS_TAB_PAGE_SIZE)
  }, [currentPageSafe, sorted])

  return (
    <div className="ss-tab-content">
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="search"
          placeholder="Search caption or campaign..."
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setCurrentPage(1)
          }}
          style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid var(--adm-border)', background: 'var(--adm-card)', color: 'var(--adm-ink)', fontSize: '0.88rem', width: '100%', maxWidth: '320px' }}
        />
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">No posts match the current filter.</div>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <SortHeader label="Platform" col="platform" active={sortKey === 'platform'} sortDir={sortDir} onSort={handleSort} />
                  <th>Post Type</th>
                  <th>Campaign</th>
                  <SortHeader label="Engagement" col="engagementRate" active={sortKey === 'engagementRate'} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Clicks" col="clickThroughs" active={sortKey === 'clickThroughs'} sortDir={sortDir} onSort={handleSort} />
                  <SortHeader label="Referrals" col="donationReferrals" active={sortKey === 'donationReferrals'} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {pagedPosts.map(post => (
                  <tr
                    key={post.postId}
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedPost(post)}
                  >
                    <td>{post.createdAt ? new Date(post.createdAt).toLocaleDateString() : '\u2014'}</td>
                    <td>{post.platform ?? '\u2014'}</td>
                    <td>{post.postType ?? '\u2014'}</td>
                    <td>{post.campaignName ?? '\u2014'}</td>
                    <td>{pct(post.engagementRate)}</td>
                    <td>{post.clickThroughs?.toLocaleString() ?? '\u2014'}</td>
                    <td>{post.donationReferrals?.toLocaleString() ?? '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <span className="pager__info">Page {currentPageSafe} of {totalPages}, {sorted.length} posts</span>
            <button
              type="button"
              className="pager__btn"
              disabled={currentPageSafe <= 1}
              onClick={() => setCurrentPage(page => page - 1)}
            >
              Prev
            </button>
            <button
              type="button"
              className="pager__btn"
              disabled={currentPageSafe >= totalPages}
              onClick={() => setCurrentPage(page => page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {selectedPost && (
        <div className="ss-detail-panel" onClick={e => { if (e.target === e.currentTarget) setSelectedPost(null) }}>
          <div className="ss-detail-panel__inner">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <strong style={{ fontSize: '1rem' }}>Post #{selectedPost.postId}</strong>
              <button type="button" onClick={() => setSelectedPost(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--adm-muted)' }}>✕</button>
            </div>
            <dl className="ss-detail-list">
              {[
                ['Platform', selectedPost.platform],
                ['Post Type', selectedPost.postType],
                ['Media Type', selectedPost.mediaType],
                ['Campaign', selectedPost.campaignName],
                ['Tone', selectedPost.sentimentTone],
                ['Created', selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleDateString() : null],
                ['Engagement', pct(selectedPost.engagementRate)],
                ['Clicks', selectedPost.clickThroughs?.toLocaleString()],
                ['Referrals', selectedPost.donationReferrals?.toLocaleString()],
                ['Impressions', selectedPost.impressions?.toLocaleString()],
                ['Reach', selectedPost.reach?.toLocaleString()],
                ['Likes', selectedPost.likes?.toLocaleString()],
                ['Comments', selectedPost.comments?.toLocaleString()],
                ['Shares', selectedPost.shares?.toLocaleString()],
                ['Saves', selectedPost.saves?.toLocaleString()],
              ].map(([label, value]) => (
                <div key={String(label)} style={{ display: 'contents' }}>
                  <dt>{label}</dt>
                  <dd>{value ?? '\u2014'}</dd>
                </div>
              ))}
            </dl>
            {selectedPost.caption && (
              <div style={{ marginTop: '1rem' }}>
                <p style={{ margin: '0 0 0.35rem', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--adm-muted)' }}>Caption</p>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--adm-ink)', lineHeight: 1.6 }}>{selectedPost.caption}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Root page ────────────────────────────────────────────────────────────────

export default function SocialSuitePage() {
  const [posts, setPosts] = useState<SocialMediaPost[]>([])
  const [insights, setInsights] = useState<SocialMediaInsights | null>(null)
  const [globalInsights, setGlobalInsights] = useState<SocialMediaInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('learn')
  const [draftPrefill, setDraftPrefill] = useState<{ platform?: string; topic?: string } | null>(null)
  const [allPlatforms, setAllPlatforms] = useState<string[]>([])

  // Fetch global insights once on mount (no platform filter) for key insight banner
  useEffect(() => {
    fetchSocialMediaInsights(undefined).then(setGlobalInsights).catch(() => {})
  }, [])

  // Fetch full platform list once on mount, independent of filtered posts
  useEffect(() => {
    fetchAllSocialMediaPosts().then(result => {
      const uniquePlatforms = Array.from(
        new Set(result.items.map(p => p.platform).filter((v): v is string => Boolean(v)))
      ).sort()
      setAllPlatforms(uniquePlatforms)
    })
  }, [])

  useEffect(() => {
    let mounted = true

    Promise.all([
      fetchAllSocialMediaPosts({ platform: platform || undefined }),
      fetchSocialMediaInsights(platform || undefined),
    ])
      .then(([result, nextInsights]) => {
        if (mounted) {
          setPosts(result.items)
          setInsights(nextInsights)
        }
      })
      .catch(() => {
        if (mounted) setError('Could not load social media posts.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => { mounted = false }
  }, [platform])

  function handleDraftThis(plt: string, topic: string) {
    setDraftPrefill({ platform: plt, topic })
    setActiveTab('draft')
  }

  const TABS: { id: Tab; label: string }[] = [
    { id: 'learn', label: 'Learn' },
    { id: 'plan', label: 'Plan' },
    { id: 'predict', label: 'Predict' },
    { id: 'draft', label: 'Draft' },
    { id: 'posts', label: 'Posts' },
  ]

  return (
    <AdminLayout>
      <div className="ss">
        <header className="page-header">
          <h1>Social Suite</h1>
          <p>Live social post performance pulled from the production database.</p>
        </header>

        <div className="ss-filter-bar">
          <label className="ss-filter-label">
            <span>Platform</span>
            <div className="ss-platform-select-wrap">
              <select
                className="ss-platform-select"
                value={platform}
                onChange={event => {
                  setPlatform(event.target.value)
                  setLoading(true)
                  setError(null)
                }}
              >
                <option value="">All platforms</option>
                {allPlatforms.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>
          </label>
        </div>

        <div className="ss-tabs">
          {TABS.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`ss-tab${activeTab === tab.id ? ' ss-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'learn' && (
          <LearnTab
            posts={posts}
            insights={insights}
            globalInsights={globalInsights}
            loading={loading}
            error={error}
            onDraftThis={handleDraftThis}
          />
        )}
        {activeTab === 'plan' && <PlanTab onDraftThis={handleDraftThis} selectedPlatform={platform} />}
        {activeTab === 'predict' && <PredictTab onDraftFromPredict={handleDraftThis} />}
        {activeTab === 'draft' && <DraftTab prefill={draftPrefill} />}
        {activeTab === 'posts' && <PostsTab posts={posts} />}
      </div>
    </AdminLayout>
  )
}
