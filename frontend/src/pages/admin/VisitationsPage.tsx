import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchVisitations } from '../../lib/visitationsApi'
import { fetchResidents } from '../../lib/residentsApi'
import type { HomeVisitation, Resident } from '../../types/domain'

export default function VisitationsPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [residentId, setResidentId] = useState<number | ''>('')
  const [rows, setRows] = useState<HomeVisitation[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResidents({ pageNum: 1, pageSize: 200 })
      .then(r => {
        setResidents(r.items)
        if (r.items.length && residentId === '') setResidentId(r.items[0].residentId)
      })
      .catch(() => setError('Could not load residents.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (residentId === '') return
    setLoading(true)
    fetchVisitations(Number(residentId))
      .then(r => setRows(r.items))
      .catch(() => setError('Could not load visitations.'))
      .finally(() => setLoading(false))
  }, [residentId])

  return (
    <AdminLayout>
      <section className="admin-panel">
        <h1>Home visitations</h1>
        <p style={{ color: 'var(--base-muted)' }}>Visits and follow-up per resident.</p>

        <div className="admin-toolbar">
          <label>
            Resident
            <select
              value={residentId === '' ? '' : String(residentId)}
              onChange={e => setResidentId(e.target.value ? Number(e.target.value) : '')}
            >
              {residents.map((r: Resident) => (
                <option key={r.residentId} value={r.residentId}>
                  {r.caseControlNo} — {r.caseStatus ?? '—'}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && <p>Loading…</p>}
        {error && <p className="admin-error">{error}</p>}

        {!loading && !error && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Worker</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((v: HomeVisitation) => (
                  <tr key={v.visitationId}>
                    <td>{v.visitDate ?? '—'}</td>
                    <td>{v.visitType ?? '—'}</td>
                    <td>{v.socialWorker ?? '—'}</td>
                    <td>{v.visitOutcome ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  )
}
