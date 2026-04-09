import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import AdminLayout from '../../components/AdminLayout'
import { fetchSummary, fetchDonationsByMonth } from '../../lib/reportsApi'
import { fetchAdminDashboard, type AdminDashboardData } from '../../lib/adminDashboardApi'
import type { DashboardSummary } from '../../types/domain'
import './ReportsPage.css'

const TONE_LABELS: Record<string, string> = {
  alert: 'Urgent',
  opportunity: 'Opportunity',
  care: 'Care',
  progress: 'Progress',
  forecast: 'Forecast',
  outreach: 'Outreach',
}

const STAT_STRIPES = ['var(--adm-accent)', '#4e9fdc', '#2ab87e', '#9b6ecf']

export default function ReportsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [series, setSeries] = useState<{ month: string; total: number }[]>([])
  const [dashData, setDashData] = useState<AdminDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    Promise.all([fetchSummary(), fetchDonationsByMonth(12), fetchAdminDashboard()])
      .then(([s, d, ml]) => {
        if (mounted) { setSummary(s); setSeries(d); setDashData(ml) }
      })
      .catch(() => { if (mounted) setError('Failed to load reports data.') })
      .finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const statCards = summary
    ? [
        { label: 'Active Residents', value: String(summary.activeResidents), sub: 'Currently in shelter' },
        { label: 'Donations (This Month)', value: String(summary.totalDonationsLast30Days), sub: 'Transaction count' },
        { label: 'Amount (This Month)', value: `$${summary.donationAmountLast30Days.toLocaleString()}`, sub: 'Total received' },
        { label: 'Case Conferences', value: String(summary.upcomingCaseConferences), sub: 'Upcoming' },
      ]
    : []

  return (
    <AdminLayout>
      <div className="rp">
        <header className="page-header">
          <h1>Reports &amp; Analytics</h1>
          <p>Operational metrics, donation trends, and deployed ML-backed signals</p>
        </header>

        {loading && <div className="inline-loading">Loading reports...</div>}
        {error && <p className="admin-error">{error}</p>}

        {!loading && !error && summary && (
          <div className="rp__stat-grid">
            {statCards.map((s, i) => (
              <div key={s.label} className="stat-card" style={{ boxShadow: `inset 4px 0 0 ${STAT_STRIPES[i]}` }}>
                <p className="stat-card__label">{s.label}</p>
                <p className="stat-card__value">{s.value}</p>
                <p className="stat-card__sub">{s.sub}</p>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && series.length > 0 && (
          <>
            <p className="section-title">Donation Trends &mdash; Last 12 Months</p>
            <div className="rp__chart-wrap">
              <div className="rp__chart-inner">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={series} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#8b8480' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#8b8480' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ background: '#1c2130', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#e6ddd6' }} />
                    <Line type="monotone" dataKey="total" stroke="#e07048" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#e07048' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {!loading && !error && dashData && (
          <>
            <p className="section-title">Signal Details</p>
            <div className="rp__model-grid">
              {dashData.cards.map(card => (
                <div key={card.id} className="rp__model-card">
                  <span className="rp__model-name">{card.model.name}</span>
                  <span className="rp__model-version">{card.model.version}</span>
                  <div className="rp__model-meta">
                    <span className={`badge ${card.tone === 'progress' || card.tone === 'forecast' ? 'badge--blue' : 'badge--green'}`}>
                      {card.model.metricLabel}: {card.model.metricValue}
                    </span>
                    <span className={`badge rp__tone-badge rp__tone-badge--${card.tone}`}>
                      {TONE_LABELS[card.tone] ?? card.tone}
                    </span>
                  </div>
                  <span className="rp__model-trained">Refreshed: {card.model.trainedAt}</span>
                  {card.model.topFactor && <span className="rp__model-factor">{card.model.topFactor}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
