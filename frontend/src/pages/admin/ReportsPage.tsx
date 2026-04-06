import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import AdminLayout from '../../components/AdminLayout'
import { fetchDonationsByMonth, fetchSummary } from '../../lib/reportsApi'
import type { DashboardSummary } from '../../types/domain'

export default function ReportsPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [series, setSeries] = useState<{ month: string; total: number }[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([fetchSummary(), fetchDonationsByMonth(12)])
      .then(([s, m]) => {
        setSummary(s)
        setSeries(m)
      })
      .catch(() => setError('Could not load reports.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <section className="admin-panel">
        <h1>Reports &amp; analytics</h1>
        {loading && <p>Loading…</p>}
        {error && <p className="admin-error">{error}</p>}
        {summary && (
          <div className="admin-metrics" style={{ marginBottom: '1.5rem' }}>
            <div className="admin-metric">
              <strong>{summary.activeResidents}</strong>
              <span>Active residents</span>
            </div>
            <div className="admin-metric">
              <strong>{summary.totalDonationsLast30Days}</strong>
              <span>Donations (30d)</span>
            </div>
            <div className="admin-metric">
              <strong>
                {summary.donationAmountLast30Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </strong>
              <span>Amount (30d)</span>
            </div>
          </div>
        )}
        {series.length > 0 && (
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(82,60,47,0.15)" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke="#bb5f3c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
        <p style={{ fontSize: '0.85rem', color: 'var(--base-muted)', marginTop: '1rem' }}>
          Monthly donation totals are aggregated from recorded gift amounts (public summary endpoint).
        </p>
      </section>
    </AdminLayout>
  )
}
