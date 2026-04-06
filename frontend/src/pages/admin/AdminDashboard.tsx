import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchSummary } from '../../lib/reportsApi'
import type { DashboardSummary } from '../../types/domain'

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSummary()
      .then(setData)
      .catch(() => setError('Could not load dashboard metrics.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <AdminLayout>
      <section className="admin-panel">
        <h1>Dashboard</h1>
        {loading && <p>Loading…</p>}
        {error && <p className="admin-error">{error}</p>}
        {data && (
          <div className="admin-metrics">
            <div className="admin-metric">
              <strong>{data.activeResidents}</strong>
              <span>Active residents</span>
            </div>
            <div className="admin-metric">
              <strong>{data.totalDonationsLast30Days}</strong>
              <span>Donations (last 30 days)</span>
            </div>
            <div className="admin-metric">
              <strong>
                {data.donationAmountLast30Days.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </strong>
              <span>Donation amount (last 30 days)</span>
            </div>
            <div className="admin-metric">
              <strong>{data.upcomingCaseConferences}</strong>
              <span>Upcoming case conferences (60 days)</span>
            </div>
          </div>
        )}
      </section>
    </AdminLayout>
  )
}
