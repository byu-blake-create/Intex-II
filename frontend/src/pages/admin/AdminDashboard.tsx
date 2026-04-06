import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchAdminDashboard, type AdminDashboardData, type AdminDashboardCard } from '../../lib/adminDashboardApi'
import './AdminDashboard.css'

const TONE_LABELS: Record<string, string> = {
  alert: 'Urgent',
  opportunity: 'Opportunity',
  care: 'Care',
  progress: 'Progress',
  forecast: 'Forecast',
  outreach: 'Outreach',
}

function SummaryCard({ card }: { card: AdminDashboardCard }) {
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
      </div>

      <div className="dash-card__footer">
        <span className="dash-card__model-meta">
          {card.model.version} &middot;{' '}
          <span className="dash-card__model-metric">
            {card.model.metricLabel}: {card.model.metricValue}
          </span>
        </span>
        <Link to={card.route} className="dash-card__link">
          {card.routeLabel} →
        </Link>
      </div>
    </article>
  )
}

export default function AdminDashboard() {
  const [data, setData] = useState<AdminDashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    fetchAdminDashboard()
      .then(d => { if (mounted) setData(d) })
      .catch(() => { if (mounted) setError('Could not load dashboard metrics.') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  return (
    <AdminLayout>
      <div className="dash">

        {/* ── Page header ── */}
        <header className="dash__header">
          <div className="dash__header-copy">
            <p className="dash__eyebrow">Admin command center</p>
            <h1 className="dash__title">Dashboard</h1>
            <p className="dash__subtitle">
              {data?.summary ?? 'Loading current donor, resident, and reporting signals…'}
            </p>
          </div>
          <div className="dash__header-actions">
            <Link to="/staff/donors" className="dash__btn dash__btn--primary">Donor queue</Link>
            <Link to="/staff/caseload" className="dash__btn dash__btn--ghost">Caseload</Link>
          </div>
        </header>

        {/* ── Snapshot chips ── */}
        {data && (
          <ul className="dash__chips" aria-label="Dashboard signals">
            {data.heroChips.map(chip => (
              <li key={chip} className="dash__chip">{chip}</li>
            ))}
          </ul>
        )}

        {/* ── Disclaimer ── */}
        <p className="dash__disclaimer">
          {data?.disclaimer ?? 'Model scores are assistive — pair with staff judgment before acting.'}
        </p>

        {/* ── Loading / error ── */}
        {loading && (
          <div className="dash__loading" aria-live="polite">
            <span className="dash__spinner" aria-hidden="true" />
            Loading command center snapshot…
          </div>
        )}
        {error && <p className="dash__error" role="alert">{error}</p>}

        {/* ── Summary cards grid ── */}
        {!loading && !error && data && data.cards.length > 0 && (
          <div className="dash__cards">
            {data.cards.map(card => (
              <SummaryCard key={card.id} card={card} />
            ))}
          </div>
        )}

        {!loading && !error && data && data.cards.length === 0 && (
          <div className="dash__empty">
            No ML signals are available yet. Check back once the pipeline runs.
          </div>
        )}

        {/* ── Workbench lane nav cards ── */}
        {!loading && !error && data && (
          <div className="dash__lanes">
            {data.lanes.map(lane => (
              <Link key={lane.title} to={lane.route} className="dash__lane-card">
                <div className="dash__lane-copy">
                  <span className="dash__lane-title">{lane.title}</span>
                  <span className="dash__lane-desc">{lane.description}</span>
                </div>
                <span className="dash__lane-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </div>
        )}

      </div>
    </AdminLayout>
  )
}
