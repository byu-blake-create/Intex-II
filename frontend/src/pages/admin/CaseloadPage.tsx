import { useEffect, useState, useMemo } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchResidents } from '../../lib/residentsApi'
import { fetchSafehouses } from '../../lib/safehousesApi'
import { fetchVisitations } from '../../lib/visitationsApi'
import { fetchProcessRecordings } from '../../lib/processRecordingsApi'
import { fetchAdminDashboard, type AdminDashboardCard } from '../../lib/adminDashboardApi'
import { fetchSummary } from '../../lib/reportsApi'
import { apiPost } from '../../lib/api'
import type { Resident, Safehouse, HomeVisitation, ProcessRecording, DashboardSummary } from '../../types/domain'
import './CaseloadPage.css'

const PAGE_SIZE = 30

function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="badge badge--gray">Unknown</span>
  const s = status.toLowerCase()
  if (s === 'active') return <span className="badge badge--green">Active</span>
  if (s === 'closed') return <span className="badge badge--gray">Closed</span>
  return <span className="badge badge--blue">{status}</span>
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function daysSince(dateStr: string): number {
  const then = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.floor((now - then) / (1000 * 60 * 60 * 24))
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
  const [summary, setSummary] = useState<DashboardSummary | null>(null)

  // Session note modal state
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteDate, setNoteDate] = useState(todayStr())
  const [noteType, setNoteType] = useState('Individual')
  const [noteSocialWorker, setNoteSocialWorker] = useState('')
  const [noteNarrative, setNoteNarrative] = useState('')
  const [noteRestricted, setNoteRestricted] = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  // Debounce text input to avoid an API call per keystroke
  const debouncedSearch = useDebounce(search, 350)

  useEffect(() => {
    fetchSafehouses().then(r => setSafehouses(r.items)).catch(() => {})
    fetchAdminDashboard().then(d => {
      const c = d.cards.find(card => card.id === 'resident-triage') ?? null
      setTriageCard(c)
    }).catch(() => {})
    fetchSummary().then(s => setSummary(s)).catch(() => {})
  }, [])

  useEffect(() => {
    let mounted = true
    fetchResidents({
      pageNum,
      pageSize: PAGE_SIZE,
      safehouseId: safehouseFilter ? Number(safehouseFilter) : undefined,
      caseStatus: statusFilter || undefined,
      search: debouncedSearch || undefined,
    })
      .then(r => { if (mounted) { setResidents(r.items); setTotalCount(r.totalCount) } })
      .catch(() => { if (mounted) setListError('Failed to load residents.') })
      .finally(() => { if (mounted) setListLoading(false) })
    return () => { mounted = false }
  }, [pageNum, debouncedSearch, safehouseFilter, statusFilter])

  useEffect(() => {
    if (!selected) return
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

  // Overdue visit calculation
  const overdueInfo = useMemo(() => {
    if (visitsLoading) return null
    if (visits.length === 0) return { overdue: true, noRecord: true, days: null }
    const sorted = [...visits]
      .filter(v => v.visitDate)
      .sort((a, b) => new Date(b.visitDate!).getTime() - new Date(a.visitDate!).getTime())
    if (sorted.length === 0) return { overdue: true, noRecord: true, days: null }
    const days = daysSince(sorted[0].visitDate!)
    return { overdue: days > 30, noRecord: false, days }
  }, [visits, visitsLoading])

  // Concern visits
  const concernVisits = useMemo(
    () => visits.filter(v => v.visitOutcome?.toLowerCase() === 'concern'),
    [visits]
  )

  async function handleSaveNote(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setNoteSaving(true)
    setNoteError(null)
    try {
      await apiPost('/api/processrecordings', {
        residentId: selected.residentId,
        sessionDate: noteDate,
        sessionType: noteType,
        socialWorker: noteSocialWorker,
        sessionNarrative: noteNarrative,
        notesRestricted: noteRestricted ? 'Y' : 'N',
      })
      const updated = await fetchProcessRecordings(selected.residentId)
      setSessions(updated.items)
      setShowNoteModal(false)
      setNoteDate(todayStr())
      setNoteType('Individual')
      setNoteSocialWorker('')
      setNoteNarrative('')
      setNoteRestricted(false)
    } catch (err) {
      setNoteError(err instanceof Error ? err.message : 'Failed to save note.')
    } finally {
      setNoteSaving(false)
    }
  }

  function openNoteModal() {
    setNoteDate(todayStr())
    setNoteType('Individual')
    setNoteSocialWorker('')
    setNoteNarrative('')
    setNoteRestricted(false)
    setNoteError(null)
    setShowNoteModal(true)
  }

  return (
    <AdminLayout>
      <div className="cl-layout">
        <div className="cl-sidebar">
          <div className="cl-sidebar__header">
            <input
              className="cl-search"
              placeholder="Search residents..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPageNum(1)
                setListLoading(true)
                setListError(null)
              }}
            />
            <div className="cl-filters">
              <select
                value={safehouseFilter}
                onChange={e => {
                  setSafehouseFilter(e.target.value)
                  setPageNum(1)
                  setListLoading(true)
                  setListError(null)
                }}
              >
                <option value="">All safehouses</option>
                {safehouses.map(s => <option key={s.safehouseId} value={s.safehouseId}>{s.name}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={e => {
                  setStatusFilter(e.target.value)
                  setPageNum(1)
                  setListLoading(true)
                  setListError(null)
                }}
              >
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
              <button
                key={r.residentId}
                className={`cl-row${selected?.residentId === r.residentId ? ' is-selected' : ''}`}
                onClick={() => {
                  setSelected(r)
                  setVisits([])
                  setSessions([])
                  setVisitsLoading(true)
                  setSessionsLoading(true)
                }}
              >
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
            <button
              className="cl-pager__btn"
              disabled={pageNum <= 1}
              onClick={() => {
                setPageNum(p => p - 1)
                setListLoading(true)
                setListError(null)
              }}
            >Prev</button>
            <button
              className="cl-pager__btn"
              disabled={pageNum >= totalPages}
              onClick={() => {
                setPageNum(p => p + 1)
                setListLoading(true)
                setListError(null)
              }}
            >Next</button>
          </div>
        </div>

        <div className="cl-detail">
          {/* Case Conference Countdown — always visible when conferences pending */}
          {summary && summary.upcomingCaseConferences > 0 && (
            <a href="/admin/reports" className="cl-conference-notice">
              &#9889; {summary.upcomingCaseConferences} upcoming case conference{summary.upcomingCaseConferences !== 1 ? 's' : ''} scheduled — review caseloads and prepare documentation.
            </a>
          )}

          {!selected && <div className="cl-detail__empty">Select a resident to view details</div>}
          {selected && (
            <>
              {triageCard && (
                <div className="cl-ml-box">
                  <p className="cl-ml-box__label">Resident Signal</p>
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

              {/* Overdue Visit Warning */}
              {!visitsLoading && overdueInfo?.overdue && (
                <div className="cl-overdue-banner">
                  {overdueInfo.noRecord
                    ? 'No visit on record.'
                    : `No recent home visit recorded — last visit was ${overdueInfo.days} day${overdueInfo.days !== 1 ? 's' : ''} ago.`}
                </div>
              )}

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
              {!visitsLoading && concernVisits.length > 0 && (
                <div className="cl-concern-callout">
                  &#9888; {concernVisits.length} visit{concernVisits.length !== 1 ? 's' : ''} flagged with Concern outcome — review observations below.
                </div>
              )}
              {!visitsLoading && visits.length === 0 && <div className="empty-state">No visit history</div>}
              {!visitsLoading && visits.length > 0 && (
                <div className="cl-timeline">
                  {visits.map(v => (
                    <div key={v.visitationId} className={`cl-timeline-card${v.visitOutcome?.toLowerCase() === 'concern' ? ' cl-timeline-card--concern' : ''}`}>
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

              <div className="cl-section-header">
                <p className="section-title" style={{ margin: 0 }}>Session Notes</p>
                <button className="cl-add-note-btn" onClick={openNoteModal}>+ Add Note</button>
              </div>
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

      {/* Add Session Note Modal */}
      {showNoteModal && (
        <div className="cl-modal-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="cl-modal" onClick={e => e.stopPropagation()}>
            <p className="cl-modal__title">Add Session Note</p>
            <form onSubmit={handleSaveNote} className="cl-modal__form">
              <label className="cl-modal__label">
                Date
                <input type="date" value={noteDate} onChange={e => setNoteDate(e.target.value)} required className="cl-modal__input" />
              </label>
              <label className="cl-modal__label">
                Session Type
                <select value={noteType} onChange={e => setNoteType(e.target.value)} className="cl-modal__input">
                  <option>Individual</option>
                  <option>Group</option>
                  <option>Family</option>
                  <option>Crisis</option>
                  <option>Assessment</option>
                  <option>Other</option>
                </select>
              </label>
              <label className="cl-modal__label">
                Social Worker
                <input type="text" value={noteSocialWorker} onChange={e => setNoteSocialWorker(e.target.value)} placeholder="Social worker name" className="cl-modal__input" />
              </label>
              <label className="cl-modal__label">
                Session Narrative
                <textarea rows={4} value={noteNarrative} onChange={e => setNoteNarrative(e.target.value)} placeholder="Session narrative..." className="cl-modal__input cl-modal__textarea" />
              </label>
              <label className="cl-modal__checkbox-row">
                <input type="checkbox" checked={noteRestricted} onChange={e => setNoteRestricted(e.target.checked)} />
                Mark as restricted
              </label>
              {noteError && <p className="cl-modal__error">{noteError}</p>}
              <div className="cl-modal__actions">
                <button type="submit" className="cl-modal__save" disabled={noteSaving}>{noteSaving ? 'Saving…' : 'Save Note'}</button>
                <button type="button" className="cl-modal__cancel" onClick={() => setShowNoteModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
