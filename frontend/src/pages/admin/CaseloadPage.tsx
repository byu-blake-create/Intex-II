import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchResidents } from '../../lib/residentsApi'
import { fetchSafehouses } from '../../lib/safehousesApi'
import type { Resident, Safehouse } from '../../types/domain'

export default function CaseloadPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [total, setTotal] = useState(0)
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [safehouseId, setSafehouseId] = useState<string>('')
  const [caseStatus, setCaseStatus] = useState('')
  const [caseCategory, setCaseCategory] = useState('')
  const [search, setSearch] = useState('')
  const [pageNum, setPageNum] = useState(1)
  const pageSize = 20
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const filters = useMemo(
    () => ({
      pageNum,
      pageSize,
      safehouseId: safehouseId ? Number(safehouseId) : undefined,
      caseStatus: caseStatus || undefined,
      caseCategory: caseCategory || undefined,
      search: search.trim() || undefined,
    }),
    [pageNum, safehouseId, caseStatus, caseCategory, search],
  )

  useEffect(() => {
    fetchSafehouses(1, 200)
      .then(r => setSafehouses(r.items))
      .catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    fetchResidents(filters)
      .then(r => {
        setResidents(r.items)
        setTotal(r.totalCount)
      })
      .catch(() => setError('Unable to load residents.'))
      .finally(() => setLoading(false))
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <AdminLayout>
      <section className="admin-panel">
        <h1>Caseload</h1>
        <p style={{ color: 'var(--base-muted)' }}>
          Resident inventory with filters. Restricted notes are omitted unless your role allows them.
        </p>

        <div className="admin-toolbar">
          <label>
            Safehouse
            <select value={safehouseId} onChange={e => { setPageNum(1); setSafehouseId(e.target.value) }}>
              <option value="">All</option>
              {safehouses.map(s => (
                <option key={s.safehouseId} value={s.safehouseId}>
                  {s.safehouseCode} — {s.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Case status
            <input
              value={caseStatus}
              onChange={e => { setPageNum(1); setCaseStatus(e.target.value) }}
              placeholder="e.g. Active"
            />
          </label>
          <label>
            Case category
            <input
              value={caseCategory}
              onChange={e => { setPageNum(1); setCaseCategory(e.target.value) }}
              placeholder="e.g. Neglected"
            />
          </label>
          <label>
            Search
            <input
              value={search}
              onChange={e => { setPageNum(1); setSearch(e.target.value) }}
              placeholder="Control #, code, social worker"
            />
          </label>
        </div>

        {loading && <p>Loading…</p>}
        {error && <p className="admin-error">{error}</p>}

        {!loading && !error && (
          <>
            <p style={{ fontSize: '0.9rem', color: 'var(--base-muted)' }}>
              Showing {residents.length} of {total} residents (page {pageNum} of {totalPages})
            </p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Control #</th>
                    <th>Safehouse</th>
                    <th>Status</th>
                    <th>Category</th>
                    <th>Social worker</th>
                  </tr>
                </thead>
                <tbody>
                  {residents.map((r: Resident) => (
                    <tr key={r.residentId}>
                      <td>{r.caseControlNo}</td>
                      <td>{r.safehouseId}</td>
                      <td>{r.caseStatus ?? '—'}</td>
                      <td>{r.caseCategory ?? '—'}</td>
                      <td>{r.assignedSocialWorker ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                type="button"
                disabled={pageNum <= 1}
                onClick={() => setPageNum(p => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={pageNum >= totalPages}
                onClick={() => setPageNum(p => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </>
        )}
      </section>
    </AdminLayout>
  )
}
