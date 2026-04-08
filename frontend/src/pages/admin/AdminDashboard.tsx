import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import {
  fetchAdminDashboard,
  type AdminDashboardData,
  type AdminDashboardCard,
} from '../../lib/adminDashboardApi'
import { fetchSummary, fetchDonationsByMonth } from '../../lib/reportsApi'
import type { DashboardSummary } from '../../types/domain'
import './AdminDashboard.css'

const TONE_LABELS: Record<string, string> = {
  alert: 'Urgent',
  opportunity: 'Opportunity',
  care: 'Care',
  progress: 'Progress',
  forecast: 'Forecast',
  outreach: 'Outreach',
}

function MLCard({ card }: { card: AdminDashboardCard }) {
  return (
    <article className="dash-card" data-tone={card.tone}>
      <div className="dash-card__inner">
        <div className="dash-card__top-row">
          <span className="dash-card__pill">{TONE_LABELS[card.tone] ?? card.tone}</span>
          <span className="dash-card__model-name">{card.model.name}</span>
        </div>
        <h2 className="dash-card__title">{card.title}</h2>
        <div className="dash-card__value">{card.value}</div>
        <p className="dash-card__plain">{card.plainLanguage}</p>
        <p className="dash-card__detail">{card.detail}</p>
        <Link to={card.route} className="dash-card__link">
          {card.routeLabel} &rarr;
        </Link>
      </div>
    </article>
  )
}

const STAT_STRIPES = [
  'var(--adm-accent)',
  '#4e9fdc',
  '#2ab87e',
  '#9b6ecf',
]

export default function AdminDashboard() {
  const [dashData, setDashData] = useState<AdminDashboardData | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [donationTrend, setDonationTrend] = useState<{ direction: 'up' | 'down' | 'flat'; pct: number } | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([fetchSummary(), fetchAdminDashboard(), fetchDonationsByMonth(2)])
      .then(([s, d, monthly]) => {
        if (mounted) {
          setSummary(s)
          setDashData(d)
          if (monthly.length >= 2) {
            const prev = monthly[monthly.length - 2].total
            const curr = monthly[monthly.length - 1].total
            const pct = prev === 0 ? 0 : Math.round(Math.abs((curr - prev) / prev) * 100)
            setDonationTrend({ direction: curr > prev ? 'up' : curr < prev ? 'down' : 'flat', pct })
          }
        }
      })
      .catch(() => {
        if (mounted) setError('Could not load dashboard data.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  const allAlertCards = dashData?.cards.filter(c => c.tone === 'alert') ?? []
  const safetyAlertCards = allAlertCards.filter(c => c.route.includes('caseload') || c.route.includes('visitations'))
  const attentionCards = allAlertCards.filter(c => !c.route.includes('caseload') && !c.route.includes('visitations'))

  return (
    <AdminLayout>
      <div className="dash">
        {/* Page header */}
        <header className="page-header">
          <h1>Command Center</h1>
          <p>{dashData?.summary ?? 'Loading live operational signals...'}</p>
        </header>

        {/* Loading / error */}
        {loading && (
          <div className="dash__loading" aria-live="polite">
            <span className="dash__spinner" aria-hidden="true" />
            Loading command center...
          </div>
        )}
        {error && <p className="dash__error" role="alert">{error}</p>}

        {/* Safety Alerts strip */}
        {!loading && !error && safetyAlertCards.length > 0 && (
          <section className="dash__safety-alerts">
            <span className="dash__safety-label">Safety Alerts</span>
            <div className="dash__safety-strip">
              {safetyAlertCards.map(card => (
                <div key={card.id} className="dash__safety-item">
                  <span className="dash__safety-item__title">{card.title}</span>
                  <span className="dash__safety-item__value">{card.value}</span>
                  <Link to={card.route} className="dash__safety-item__link">{card.routeLabel} &rarr;</Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Stat cards */}
        {!loading && !error && summary && (
          <div className="dash__stat-grid">
            {[
              { label: 'Active Residents', value: String(summary.activeResidents), sub: 'Currently in shelter', trend: null },
              { label: 'Donations (30d)', value: String(summary.totalDonationsLast30Days), sub: 'Transaction count', trend: null },
              { label: 'Amount (30d)', value: `$${summary.donationAmountLast30Days.toLocaleString()}`, sub: 'Total received', trend: donationTrend },
              { label: 'Case Conferences', value: String(summary.upcomingCaseConferences), sub: 'Upcoming', trend: null },
            ].map((s, i) => (
              <div
                key={s.label}
                className="stat-card"
                style={{ boxShadow: `inset 4px 0 0 ${STAT_STRIPES[i]}` }}
              >
                <p className="stat-card__label">{s.label}</p>
                <p className="stat-card__value">{s.value}</p>
                {s.trend && (
                  <p className={`stat-card__trend stat-card__trend--${s.trend.direction}`}>
                    {s.trend.direction === 'up' ? '↑' : s.trend.direction === 'down' ? '↓' : '–'}
                    {' '}{s.trend.pct}% vs last month
                  </p>
                )}
                <p className="stat-card__sub">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {dashData && (
          <p className="dash__disclaimer">{dashData.disclaimer}</p>
        )}

        {/* Action Items / Needs Attention */}
        {!loading && !error && summary && (
          <section className="dash__action-items">
            <span className="dash__action-label">Needs Attention</span>
            {(summary.upcomingCaseConferences > 0 || attentionCards.length > 0) ? (
              <div className="dash__action-list">
                {summary.upcomingCaseConferences > 0 && (
                  <div className="dash__action-row">
                    <span className="dash__action-row__text">
                      {summary.upcomingCaseConferences} upcoming case conference{summary.upcomingCaseConferences !== 1 ? 's' : ''}
                    </span>
                    <Link to="/admin/caseload" className="dash__action-row__link">View caseload &rarr;</Link>
                  </div>
                )}
                {attentionCards.map(card => (
                  <div key={card.id} className="dash__action-row">
                    <span className="dash__action-row__text">{card.title}</span>
                    <Link to={card.route} className="dash__action-row__link">{card.routeLabel} &rarr;</Link>
                  </div>
                ))}
              </div>
            ) : (
              <span className="dash__action-clear">&#10003; All clear</span>
            )}
          </section>
        )}

        {/* Signals */}
        {!loading && !error && dashData && dashData.cards.length > 0 && (
          <>
            <div className="dash__section-header">
              <span className="dash__ml-label">Live Signals</span>
              <span className="dash__snapshot-date">{dashData.snapshotLabel}</span>
            </div>
            <div className="dash__cards">
              {dashData.cards.map(card => (
                <MLCard key={card.id} card={card} />
              ))}
            </div>
          </>
        )}

        {!loading && !error && dashData && dashData.cards.length === 0 && (
          <div className="empty-state">
            No signals are available yet. Check back once the pipeline runs.
          </div>
        )}

        {/* Workbench lanes */}
        {!loading && !error && dashData && (
          <>
            <p className="section-title">Workbenches</p>
            <div className="dash__lanes">
              {dashData.lanes.map(lane => (
                <Link key={lane.title} to={lane.route} className="dash__lane-card">
                  <div className="dash__lane-copy">
                    <span className="dash__lane-title">{lane.title}</span>
                    <span className="dash__lane-desc">{lane.description}</span>
                  </div>
                  <span className="dash__lane-arrow" aria-hidden="true">&rarr;</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
