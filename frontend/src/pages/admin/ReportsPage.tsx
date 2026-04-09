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

const SIGNAL_HELP: Record<string, string> = {
  'donor-watchlist':
    'This finding highlights supporters who are most at risk of lapsing soon. Higher counts mean the fundraising team should prioritize retention outreach before those donors disengage.',
  'top-opportunities':
    'This finding highlights supporters who are most likely to respond to a larger ask. It helps the team focus upgrade conversations where the model sees near-term giving potential.',
  'resident-triage':
    'This finding highlights residents whose recent patterns suggest elevated support needs. Higher counts mean case managers should review those residents first and verify whether more intervention is needed.',
  'reintegration-ready':
    'This finding highlights residents with the strongest indicators for a favorable reintegration review. It should support planning and prioritization, not replace staff judgment.',
  'safehouse-forecast':
    'This finding highlights occupancy pressure and forecasted capacity strain. Higher values indicate where staffing, placement, or resource planning may need attention soon.',
  'outreach-highlight':
    'This finding highlights which platform currently shows the strongest click-through behavior in the recorded data. It helps the team decide where outreach effort is most likely to convert into action.',
}

function formatMetricLabel(label: string) {
  return METRIC_LABELS[label.toUpperCase()] ?? label
}

function describeSignal(card: AdminDashboardData['cards'][number]) {
  const metricHelp = METRIC_HELP[card.model.metricLabel.toUpperCase()] ?? 'This is the primary metric or context label shown for the signal.'
  const topFactorLine = card.model.topFactor
    ? ` Top factor: ${card.model.topFactor}.`
    : ''
  const signalHelp = SIGNAL_HELP[card.id] ?? 'This finding summarizes what the pipeline or live signal is surfacing for staff attention.'

  return [
    signalHelp,
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
                  <div className="rp__model-topline">
                    <span className={`badge rp__tone-badge rp__tone-badge--${card.tone}`}>
                      {TONE_LABELS[card.tone] ?? card.tone}
                    </span>
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
                  <span className="rp__model-heading">{card.title}</span>
                  <span className="rp__model-value">{card.value}</span>
                  <p className="rp__model-summary">{card.plainLanguage}</p>
                  <p className="rp__model-detail">{card.detail}</p>
                  <div className="rp__model-meta">
                    <span className={`badge ${card.tone === 'progress' || card.tone === 'forecast' ? 'badge--blue' : 'badge--green'}`}>
                      {formatMetricLabel(card.model.metricLabel)}: {card.model.metricValue}
                    </span>
                    <span className="badge badge--gray">{card.model.name}</span>
                  </div>
                  <div className="rp__model-footer">
                    <span className="rp__model-trained">Refreshed: {card.model.trainedAt}</span>
                    <a href={card.route} className="rp__model-link">{card.routeLabel} →</a>
                  </div>
                  {card.model.topFactor && <span className="rp__model-factor">Top factor: {card.model.topFactor}</span>}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}
