import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import {
  fetchSocialMediaInsights,
  fetchSocialMediaPosts,
  type SocialMediaInsights,
} from '../../lib/socialMediaPostsApi'
import type { SocialMediaPost } from '../../types/domain'
import './SocialSuitePage.css'

function pct(value: number | null | undefined): string {
  return value == null ? '\u2014' : `${(value * 100).toFixed(1)}%`
}

function average(values: Array<number | null | undefined>): number | null {
  const present = values.filter((value): value is number => value != null)
  if (present.length === 0) return null
  return present.reduce((sum, value) => sum + value, 0) / present.length
}

export default function SocialSuitePage() {
  const [posts, setPosts] = useState<SocialMediaPost[]>([])
  const [insights, setInsights] = useState<SocialMediaInsights | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [platform, setPlatform] = useState('')

  useEffect(() => {
    let mounted = true

    Promise.all([
      fetchSocialMediaPosts({ pageSize: 100, platform: platform || undefined }),
      fetchSocialMediaInsights(),
    ])
      .then(([result, nextInsights]) => {
        if (mounted) setPosts(result.items)
        if (mounted) setInsights(nextInsights)
      })
      .catch(() => {
        if (mounted) setError('Could not load social media posts.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [platform])

  const platforms = useMemo(
    () => Array.from(new Set(posts.map(post => post.platform).filter((value): value is string => Boolean(value)))).sort(),
    [posts],
  )

  const avgEngagement = useMemo(() => average(posts.map(post => post.engagementRate)), [posts])
  const totalReferrals = useMemo(() => posts.reduce((sum, post) => sum + (post.donationReferrals ?? 0), 0), [posts])
  const totalClicks = useMemo(() => posts.reduce((sum, post) => sum + (post.clickThroughs ?? 0), 0), [posts])
  const topPlatform = useMemo(() => {
    const groups = new Map<string, number[]>()
    for (const post of posts) {
      if (!post.platform || post.engagementRate == null) continue
      const existing = groups.get(post.platform) ?? []
      existing.push(post.engagementRate)
      groups.set(post.platform, existing)
    }

    let best: { platform: string; engagement: number } | null = null
    for (const [name, values] of groups.entries()) {
      const engagement = average(values)
      if (engagement == null) continue
      if (!best || engagement > best.engagement) {
        best = { platform: name, engagement }
      }
    }
    return best
  }, [posts])

  return (
    <AdminLayout>
      <div style={{ display: 'grid', gap: '1.5rem' }}>
        <header className="page-header">
          <h1>Social Suite</h1>
          <p>Live social post performance pulled from the production database.</p>
        </header>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'grid', gap: '0.4rem' }}>
            <span>Platform</span>
            <select
              value={platform}
              onChange={event => {
                setPlatform(event.target.value)
                setLoading(true)
                setError(null)
              }}
            >
              <option value="">All platforms</option>
              {platforms.map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </label>
          <span style={{ color: 'var(--adm-muted)' }}>{posts.length} posts loaded</span>
        </div>

        <div className="dash__stat-grid">
          <div className="stat-card">
            <p className="stat-card__label">Average Engagement</p>
            <p className="stat-card__value">{pct(avgEngagement)}</p>
            <p className="stat-card__sub">Across the currently loaded posts</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Donation Referrals</p>
            <p className="stat-card__value">{totalReferrals.toLocaleString()}</p>
            <p className="stat-card__sub">Recorded from live posts</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Click Throughs</p>
            <p className="stat-card__value">{totalClicks.toLocaleString()}</p>
            <p className="stat-card__sub">Across the loaded result set</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Top Platform</p>
            <p className="stat-card__value">{topPlatform?.platform ?? '\u2014'}</p>
            <p className="stat-card__sub">
              {topPlatform ? `${pct(topPlatform.engagement)} average engagement` : 'No engagement data yet'}
            </p>
          </div>
        </div>

        {loading && <div className="inline-loading">Loading social posts...</div>}
        {error && <p className="admin-error">{error}</p>}

        {!loading && !error && insights && (
          <>
            <p className="section-title">Platform Insights</p>
            <div className="dash__stat-grid">
              {insights.platformInsights.slice(0, 4).map(item => (
                <div key={item.platform} className="stat-card">
                  <p className="stat-card__label">{item.platform}</p>
                  <p className="stat-card__value">{pct(item.avgEngagement)}</p>
                  <p className="stat-card__sub">{item.bestHours}</p>
                </div>
              ))}
            </div>

            {insights.staticInsights.length > 0 && (
              <>
                <p className="section-title">Live Signals</p>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {insights.staticInsights.map(signal => (
                    <div key={signal} className="ss-live-card">
                      <p style={{ margin: 0, lineHeight: 1.6 }}>{signal}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {insights.contentGaps.length > 0 && (
              <>
                <p className="section-title">Content Opportunities</p>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {insights.contentGaps.map(gap => (
                    <div key={`${gap.platform}-${gap.topic}`} className="ss-live-card">
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge badge--blue">{gap.platform}</span>
                        <span className="badge badge--purple">{gap.topic}</span>
                        <span className={gap.priority === 'critical' ? 'badge badge--red' : gap.priority === 'high' ? 'badge badge--green' : 'badge badge--gray'}>
                          {gap.priority}
                        </span>
                        <span style={{ color: 'var(--adm-muted)', fontSize: '0.82rem' }}>
                          {pct(gap.avgEngagement)} avg engagement
                        </span>
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.6 }}>{gap.opportunity}</p>
                    </div>
                  ))}
                </div>
              </>
            )}

            {insights.topPosts.length > 0 && (
              <>
                <p className="section-title">Top Posts</p>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  {insights.topPosts.map(post => (
                    <div key={post.postId} className="ss-live-card">
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className="badge badge--blue">{post.platform}</span>
                        <span className="badge badge--purple">{post.postType}</span>
                        <span style={{ color: 'var(--adm-muted)', fontSize: '0.82rem' }}>{pct(post.engagementRate)}</span>
                      </div>
                      <p style={{ margin: 0, lineHeight: 1.6 }}>{post.caption}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className="empty-state">No social posts were returned for the current filter.</div>
        )}

        {!loading && !error && posts.length > 0 && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Created</th>
                  <th>Platform</th>
                  <th>Post Type</th>
                  <th>Campaign</th>
                  <th>Engagement</th>
                  <th>Clicks</th>
                  <th>Referrals</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.postId}>
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
        )}
      </div>
    </AdminLayout>
  )
}
