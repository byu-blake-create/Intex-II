import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import {
  fetchAdminDashboard,
  type AdminDashboardData,
  type AdminDashboardCard,
} from '../../lib/adminDashboardApi'
import { fetchSummary } from '../../lib/reportsApi'
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

  useEffect(() => {
    let mounted = true
    Promise.all([fetchSummary(), fetchAdminDashboard()])
      .then(([s, d]) => {
        if (mounted) {
          setSummary(s)
          setDashData(d)
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

  const statCards = summary
    ? [
        { label: 'Active Residents', value: String(summary.activeResidents), sub: 'Currently in shelter' },
        { label: 'Donations (30d)', value: String(summary.totalDonationsLast30Days), sub: 'Transaction count' },
        { label: 'Amount (30d)', value: `$${summary.donationAmountLast30Days.toLocaleString()}`, sub: 'Total received' },
        { label: 'Case Conferences', value: String(summary.upcomingCaseConferences), sub: 'Upcoming' },
      ]
    : []

  return (
    <AdminLayout>
      <div className="dash">
        {/* Page header */}
        <header className="page-header">
          <h1>Command Center</h1>
          <p>{dashData?.summary ?? 'Loading operational signals...'}</p>
        </header>

        {/* Loading / error */}
        {loading && (
          <div className="dash__loading" aria-live="polite">
            <span className="dash__spinner" aria-hidden="true" />
            Loading command center...
          </div>
        )}
        {error && <p className="dash__error" role="alert">{error}</p>}

        {/* Stat cards */}
        {!loading && !error && summary && (
          <div className="dash__stat-grid">
            {statCards.map((s, i) => (
              <div
                key={s.label}
                className="stat-card"
                style={{ boxShadow: `inset 4px 0 0 ${STAT_STRIPES[i]}` }}
              >
                <p className="stat-card__label">{s.label}</p>
                <p className="stat-card__value">{s.value}</p>
                <p className="stat-card__sub">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {/* Disclaimer */}
        {dashData && (
          <p className="dash__disclaimer">{dashData.disclaimer}</p>
        )}

        {/* Signals */}
        {!loading && !error && dashData && dashData.cards.length > 0 && (
          <>
            <div className="dash__section-header">
              <span className="dash__ml-label">Signals</span>
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
