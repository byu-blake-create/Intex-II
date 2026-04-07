import { useEffect, useState, useMemo } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchResidents } from '../../lib/residentsApi'
import { fetchSafehouses } from '../../lib/safehousesApi'
import { fetchVisitations } from '../../lib/visitationsApi'
import { fetchProcessRecordings } from '../../lib/processRecordingsApi'
import { fetchAdminDashboard, type AdminDashboardCard } from '../../lib/adminDashboardApi'
import type { Resident, Safehouse, HomeVisitation, ProcessRecording } from '../../types/domain'
import './CaseloadPage.css'

const PAGE_SIZE = 30

function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="badge badge--gray">Unknown</span>
  const s = status.toLowerCase()
  if (s === 'active') return <span className="badge badge--green">Active</span>
  if (s === 'closed') return <span className="badge badge--gray">Closed</span>
  return <span className="badge badge--blue">{status}</span>
}

export default function CaseloadPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [search, setSearch] = useState('')
  const [safehouseFilter, setSafehouseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [selected, setSelected] = useState<Resident | null>(null)
  const [visits, setVisits] = useState<HomeVisitation[]>([])
  const [sessions, setSessions] = useState<ProcessRecording[]>([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [triageCard, setTriageCard] = useState<AdminDashboardCard | null>(null)

  useEffect(() => {
    fetchSafehouses().then(r => setSafehouses(r.items)).catch(() => {})
    fetchAdminDashboard().then(d => {
      const c = d.cards.find(card => card.id === 'resident-triage') ?? null
      setTriageCard(c)
    }).catch(() => {})
  }, [])

  useEffect(() => { setPageNum(1) }, [search, safehouseFilter, statusFilter])

  useEffect(() => {
    let mounted = true
    setListLoading(true)
    setListError(null)
    fetchResidents({
      pageNum,
      pageSize: PAGE_SIZE,
      safehouseId: safehouseFilter ? Number(safehouseFilter) : undefined,
      caseStatus: statusFilter || undefined,
      search: search || undefined,
    })
      .then(r => { if (mounted) { setResidents(r.items); setTotalCount(r.totalCount) } })
      .catch(() => { if (mounted) setListError('Failed to load residents.') })
      .finally(() => { if (mounted) setListLoading(false) })
    return () => { mounted = false }
  }, [pageNum, search, safehouseFilter, statusFilter])

  useEffect(() => {
    if (!selected) { setVisits([]); setSessions([]); return }
    setVisitsLoading(true)
    setSessionsLoading(true)
    fetchVisitations(selected.residentId)
      .then(r => setVisits(r.items))
      .catch(() => setVisits([]))
      .finally(() => setVisitsLoading(false))
    fetchProcessRecordings(selected.residentId)
      .then(r => setSessions(r.items))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false))
  }, [selected])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const safehouseMap = useMemo(() => {
    const m = new Map<number, string>()
    safehouses.forEach(s => m.set(s.safehouseId, s.name))
    return m
  }, [safehouses])

  return (
    <AdminLayout>
      <div className="cl-layout">
        <div className="cl-sidebar">
          <div className="cl-sidebar__header">
            <input className="cl-search" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
            <div className="cl-filters">
              <select value={safehouseFilter} onChange={e => setSafehouseFilter(e.target.value)}>
                <option value="">All safehouses</option>
                {safehouses.map(s => <option key={s.safehouseId} value={s.safehouseId}>{s.name}</option>)}
              </select>
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="">All statuses</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>
            </div>
          </div>
          <div className="cl-list">
            {listLoading && <div className="inline-loading">Loading...</div>}
            {listError && <p className="admin-error" style={{ padding: '1rem' }}>{listError}</p>}
            {!listLoading && !listError && residents.length === 0 && <div className="empty-state">No residents found.</div>}
            {!listLoading && !listError && residents.map(r => (
              <button key={r.residentId} className={`cl-row${selected?.residentId === r.residentId ? ' is-selected' : ''}`} onClick={() => setSelected(r)}>
                <span className="cl-row__id">{r.caseControlNo}</span>
                <span className="cl-row__meta">
                  {statusBadge(r.caseStatus)}
                  {r.caseCategory && <span>{r.caseCategory}</span>}
                  {r.assignedSocialWorker && <span>{r.assignedSocialWorker}</span>}
                </span>
              </button>
            ))}
          </div>
          <div className="cl-pager">
            <span className="cl-pager__info">Page {pageNum} of {totalPages}, {totalCount} records</span>
            <button className="cl-pager__btn" disabled={pageNum <= 1} onClick={() => setPageNum(p => p - 1)}>Prev</button>
            <button className="cl-pager__btn" disabled={pageNum >= totalPages} onClick={() => setPageNum(p => p + 1)}>Next</button>
          </div>
        </div>

        <div className="cl-detail">
          {!selected && <div className="cl-detail__empty">Select a resident to view details</div>}
          {selected && (
            <>
              {triageCard && (
                <div className="cl-ml-box">
                  <p className="cl-ml-box__label">ML Triage Signal</p>
                  <p>{triageCard.plainLanguage} {triageCard.detail}</p>
                </div>
              )}
              <div className="cl-resident-header">
                <h2>{selected.caseControlNo}</h2>
                {statusBadge(selected.caseStatus)}
                <span style={{ fontSize: '0.85rem', color: 'var(--adm-muted)' }}>
                  {safehouseMap.get(selected.safehouseId) ?? `Safehouse ${selected.safehouseId}`}
                </span>
              </div>
              <dl className="cl-fields">
                <div className="cl-field"><dt>Date of Birth</dt><dd>{selected.dateOfBirth ?? '\u2014'}</dd></div>
                <div className="cl-field"><dt>Sex</dt><dd>{selected.sex ?? '\u2014'}</dd></div>
                <div className="cl-field"><dt>Case Category</dt><dd>{selected.caseCategory ?? '\u2014'}</dd></div>
                <div className="cl-field"><dt>Social Worker</dt><dd>{selected.assignedSocialWorker ?? '\u2014'}</dd></div>
                <div className="cl-field"><dt>Internal Code</dt><dd>{selected.internalCode ?? '\u2014'}</dd></div>
                <div className="cl-field"><dt>Safehouse</dt><dd>{safehouseMap.get(selected.safehouseId) ?? String(selected.safehouseId)}</dd></div>
              </dl>

              <p className="section-title">Visit History</p>
              {visitsLoading && <div className="inline-loading">Loading visits...</div>}
              {!visitsLoading && visits.length === 0 && <div className="empty-state">No visit history</div>}
              {!visitsLoading && visits.length > 0 && (
                <div className="cl-timeline">
                  {visits.map(v => (
                    <div key={v.visitationId} className="cl-timeline-card">
                      <div className="cl-timeline-card__header">
                        <span className="cl-timeline-card__date">{v.visitDate ?? 'No date'}</span>
                        {v.visitType && <span className="badge badge--blue">{v.visitType}</span>}
                        {v.visitOutcome && <span className={`badge ${v.visitOutcome.toLowerCase() === 'positive' ? 'badge--green' : v.visitOutcome.toLowerCase() === 'concern' ? 'badge--red' : 'badge--gray'}`}>{v.visitOutcome}</span>}
                        <span className="cl-timeline-card__worker">{v.socialWorker}</span>
                      </div>
                      {v.observations && <p className="cl-timeline-card__text">{v.observations}</p>}
                    </div>
                  ))}
                </div>
              )}

              <p className="section-title">Session Notes</p>
              {sessionsLoading && <div className="inline-loading">Loading sessions...</div>}
              {!sessionsLoading && sessions.length === 0 && <div className="empty-state">No session notes</div>}
              {!sessionsLoading && sessions.length > 0 && (
                <div className="cl-timeline">
                  {sessions.map(s => (
                    <div key={s.recordingId} className="cl-timeline-card">
                      <div className="cl-timeline-card__header">
                        <span className="cl-timeline-card__date">{s.sessionDate ?? 'No date'}</span>
                        {s.sessionType && <span className="badge badge--purple">{s.sessionType}</span>}
                        {s.notesRestricted === 'Y' && <span className="badge badge--red">Restricted</span>}
                        <span className="cl-timeline-card__worker">{s.socialWorker}</span>
                      </div>
                      <p className="cl-timeline-card__text">{s.sessionNarrative || <em>No narrative recorded</em>}</p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
