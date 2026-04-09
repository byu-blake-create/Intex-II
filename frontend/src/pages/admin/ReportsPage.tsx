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

const METRIC_LABELS: Record<string, string> = {
  'F1': 'F1 score',
  'ROC-AUC': 'ROC-AUC',
  'RMSE': 'RMSE',
  'MAE': 'MAE',
  'R2': 'R²',
  'ACCURACY': 'Accuracy',
  'PRECISION': 'Precision',
  'RECALL': 'Recall',
  'WINDOW': 'Window',
  'STATUS': 'Status',
  'SOURCE': 'Source',
  'SCOPE': 'Scope',
  'POSTS SAMPLED': 'Posts sampled',
}

const METRIC_HELP: Record<string, string> = {
  'F1': 'F1 score balances precision and recall. Higher is better.',
  'ROC-AUC': 'ROC-AUC shows how well the model separates positive and negative cases. Higher is better.',
  'RMSE': 'RMSE measures average prediction error size. Lower is better.',
  'MAE': 'MAE measures the average absolute prediction error. Lower is better.',
  'R2': 'R² shows how much variation the model explains. Higher is better.',
  'ACCURACY': 'Accuracy is the share of predictions the model gets right overall. Higher is better.',
  'PRECISION': 'Precision shows how often positive flags are correct. Higher is better.',
  'RECALL': 'Recall shows how many true positive cases were successfully found. Higher is better.',
  'WINDOW': 'This is a live reporting window rather than a model-performance metric.',
  'STATUS': 'This is a live operational status rather than a model-performance metric.',
  'SOURCE': 'This card is driven from live application data rather than a trained model metric.',
  'SCOPE': 'This describes what the forecast or signal is measuring.',
  'POSTS SAMPLED': 'This is the number of historical posts contributing to the current platform signal.',
}

function formatMetricLabel(label: string) {
  return METRIC_LABELS[label.toUpperCase()] ?? label
}

function describeSignal(card: AdminDashboardData['cards'][number]) {
  const metricHelp = METRIC_HELP[card.model.metricLabel.toUpperCase()] ?? 'This is the primary metric or context label shown for the signal.'
  const topFactorLine = card.model.topFactor
    ? ` Top factor: ${card.model.topFactor}.`
    : ''

  return [
    `What it is: ${card.plainLanguage}`,
    `What this card means: ${card.detail}`,
    `Metric: ${formatMetricLabel(card.model.metricLabel)} ${card.model.metricValue}. ${metricHelp}`,
    `Tone: ${TONE_LABELS[card.tone] ?? card.tone}.`,
    `Updated: ${card.model.trainedAt}.${topFactorLine}`,
  ].join(' ')
}

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
        { label: 'Case Conferences', value: String(summary.upcomingCaseConferences), sub: 'Next 7 days' },
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
                  <div className="rp__model-header">
                    <span className="rp__model-name">{card.model.name}</span>
                    <span
                      className="rp__info"
                      tabIndex={0}
                      aria-label={describeSignal(card)}
                    >
                      <span className="rp__info-icon" aria-hidden="true">i</span>
                      <span className="rp__info-tooltip" aria-hidden="true">
                        {describeSignal(card)}
                      </span>
                    </span>
                  </div>
                  <span className="rp__model-version">{card.model.version}</span>
                  <div className="rp__model-meta">
                    <span className={`badge ${card.tone === 'progress' || card.tone === 'forecast' ? 'badge--blue' : 'badge--green'}`}>
                      {formatMetricLabel(card.model.metricLabel)}: {card.model.metricValue}
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
