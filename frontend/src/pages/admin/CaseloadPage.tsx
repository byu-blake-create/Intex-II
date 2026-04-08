import { useEffect, useState, useMemo } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchResidents } from '../../lib/residentsApi'
import { fetchSafehouses } from '../../lib/safehousesApi'
import { fetchVisitations } from '../../lib/visitationsApi'
import { fetchProcessRecordings } from '../../lib/processRecordingsApi'
import { fetchSummary } from '../../lib/reportsApi'
import { apiPost, apiPut } from '../../lib/api'
import { fetchResidentWatchlist, type ResidentInsight, fetchReintegrationPredictions, type ReintegrationInsight } from '../../lib/mlApi'
import type { Resident, ResidentUpsertInput, Safehouse, HomeVisitation, ProcessRecording, DashboardSummary } from '../../types/domain'
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

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr).getTime()
  const now = Date.now()
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24))
}

function residentToUpsertInput(resident: Resident): ResidentUpsertInput {
  return {
    caseControlNo: resident.caseControlNo.trim(),
    internalCode: resident.internalCode ?? null,
    safehouseId: resident.safehouseId,
    caseStatus: resident.caseStatus ?? null,
    sex: resident.sex ?? null,
    dateOfBirth: resident.dateOfBirth ?? null,
    caseCategory: resident.caseCategory ?? null,
    assignedSocialWorker: resident.assignedSocialWorker ?? null,
    caseConferenceDate: resident.caseConferenceDate ?? null,
  }
}

function getRiskLevel(level: string | null | undefined, probability: number) {
  const normalized = level?.toLowerCase()
  if (normalized === 'high' || probability >= 0.75) return { label: 'High', tone: 'high' as const }
  if (normalized === 'medium' || probability >= 0.4) return { label: 'Medium', tone: 'medium' as const }
  return { label: 'Low', tone: 'low' as const }
}

function getReadinessLevel(level: string | null | undefined, probability: number) {
  const normalized = level?.toLowerCase()
  if (normalized === 'high' || probability >= 0.75) return { label: 'High', tone: 'high' as const }
  if (normalized === 'medium' || probability >= 0.4) return { label: 'Medium', tone: 'medium' as const }
  return { label: 'Low', tone: 'low' as const }
}

export default function CaseloadPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [search, setSearch] = useState('')
  const [safehouseFilter, setSafehouseFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [signalFilter, setSignalFilter] = useState('')
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [selected, setSelected] = useState<Resident | null>(null)
  const [visits, setVisits] = useState<HomeVisitation[]>([])
  const [sessions, setSessions] = useState<ProcessRecording[]>([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [residentInsights, setResidentInsights] = useState<Record<number, ResidentInsight>>({})
  const [reintegrationInsights, setReintegrationInsights] = useState<Record<number, ReintegrationInsight>>({})
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [residentReloadToken, setResidentReloadToken] = useState(0)

  // Detail tab state
  const [detailTab, setDetailTab] = useState<'visits' | 'notes'>('visits')

  // Show more state
  const [visitsShowAll, setVisitsShowAll] = useState(false)
  const [sessionsShowAll, setSessionsShowAll] = useState(false)

  // Inline edit state
  const [editField, setEditField] = useState<'socialWorker' | 'conferenceDate' | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Status save state
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  // Session note modal state
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteDate, setNoteDate] = useState(todayStr())
  const [noteType, setNoteType] = useState('Individual')
  const [noteSocialWorker, setNoteSocialWorker] = useState('')
  const [noteNarrative, setNoteNarrative] = useState('')
  const [noteRestricted, setNoteRestricted] = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  // Visit modal state
  const [showVisitModal, setShowVisitModal] = useState(false)
  const [visitDate, setVisitDate] = useState(todayStr())
  const [visitType, setVisitType] = useState('Home Visit')
  const [visitSocialWorker, setVisitSocialWorker] = useState('')
  const [visitObservations, setVisitObservations] = useState('')
  const [visitOutcome, setVisitOutcome] = useState('Positive')
  const [visitSaving, setVisitSaving] = useState(false)
  const [visitError, setVisitError] = useState<string | null>(null)

  // New resident modal state
  const [showNewResidentModal, setShowNewResidentModal] = useState(false)
  const [newResidentCaseControlNo, setNewResidentCaseControlNo] = useState('')
  const [newResidentInternalCode, setNewResidentInternalCode] = useState('')
  const [newResidentSafehouseId, setNewResidentSafehouseId] = useState('')
  const [newResidentStatus, setNewResidentStatus] = useState('Active')
  const [newResidentCategory, setNewResidentCategory] = useState('')
  const [newResidentSocialWorker, setNewResidentSocialWorker] = useState('')
  const [newResidentDob, setNewResidentDob] = useState('')
  const [newResidentSex, setNewResidentSex] = useState('')
  const [newResidentConferenceDate, setNewResidentConferenceDate] = useState('')
  const [newResidentSaving, setNewResidentSaving] = useState(false)
  const [newResidentError, setNewResidentError] = useState<string | null>(null)

  // Debounce text input to avoid an API call per keystroke
  const debouncedSearch = useDebounce(search, 350)

  useEffect(() => {
    fetchSafehouses().then(r => setSafehouses(r.items)).catch(() => {})
    fetchResidentWatchlist()
      .then(items => setResidentInsights(Object.fromEntries(items.map(item => [item.residentId, item]))))
      .catch(() => {})
    fetchReintegrationPredictions()
      .then(items => setReintegrationInsights(Object.fromEntries(items.map(item => [item.residentId, item]))))
      .catch(() => {})
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
  }, [pageNum, debouncedSearch, safehouseFilter, statusFilter, residentReloadToken])

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
  const filteredResidents = signalFilter
    ? residents.filter(r => {
        if (signalFilter.startsWith('risk-')) {
          const level = signalFilter.slice(5)
          const insight = residentInsights[r.residentId]
          if (!insight) return false
          return getRiskLevel(insight.riskLevel, insight.concernProbability).label.toLowerCase() === level
        }
        if (signalFilter.startsWith('reint-')) {
          const level = signalFilter.slice(6)
          const insight = reintegrationInsights[r.residentId]
          if (!insight) return false
          return getReadinessLevel(insight.readinessLevel, insight.favorableProbability).label.toLowerCase() === level
        }
        return true
      })
    : residents
  const selectedResidentInsight = selected ? residentInsights[selected.residentId] : undefined
  const residentRiskLevel = selectedResidentInsight
    ? getRiskLevel(selectedResidentInsight.riskLevel, selectedResidentInsight.concernProbability)
    : null
  const selectedReintegrationInsight = selected ? reintegrationInsights[selected.residentId] : undefined
  const readinessLevel = selectedReintegrationInsight
    ? getReadinessLevel(selectedReintegrationInsight.readinessLevel, selectedReintegrationInsight.favorableProbability)
    : null

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

  // Sorted visits and sessions for display
  const sortedVisits = useMemo(
    () => [...visits].sort((a, b) => (b.visitDate ?? '').localeCompare(a.visitDate ?? '')),
    [visits]
  )
  const displayedVisits = visitsShowAll ? sortedVisits : sortedVisits.slice(0, 10)

  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => (b.sessionDate ?? '').localeCompare(a.sessionDate ?? '')),
    [sessions]
  )
  const displayedSessions = sessionsShowAll ? sortedSessions : sortedSessions.slice(0, 10)

  async function handleSaveField(field: 'socialWorker' | 'conferenceDate') {
    if (!selected) return
    setEditSaving(true)
    setEditError(null)
    try {
      const updated: Resident = {
        ...selected,
        ...(field === 'socialWorker' ? { assignedSocialWorker: editValue || undefined } : {}),
        ...(field === 'conferenceDate' ? { caseConferenceDate: editValue || undefined } : {}),
      }
      await apiPut(`/api/residents/${selected.residentId}`, residentToUpsertInput(updated))
      setSelected(updated)
      setResidents(prev => prev.map(r => r.residentId === updated.residentId ? updated : r))
      setResidentReloadToken(token => token + 1)
      setEditField(null)
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to save. Try again.')
    } finally {
      setEditSaving(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    if (!selected) return
    setStatusSaving(true)
    setStatusError(null)
    try {
      const updated: Resident = { ...selected, caseStatus: newStatus }
      await apiPut(`/api/residents/${selected.residentId}`, residentToUpsertInput(updated))
      if (statusFilter && statusFilter !== newStatus) {
        setSelected(null)
        setVisits([])
        setSessions([])
      } else {
        setSelected(updated)
      }
      setResidents(prev => prev.map(r => r.residentId === updated.residentId ? updated : r))
      setResidentReloadToken(token => token + 1)
    } catch (err) {
      setStatusError(err instanceof Error ? err.message : 'Failed to update resident status.')
    } finally {
      setStatusSaving(false)
    }
  }

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

  function openVisitModal() {
    setVisitDate(todayStr())
    setVisitType('Home Visit')
    setVisitSocialWorker('')
    setVisitObservations('')
    setVisitOutcome('Positive')
    setVisitError(null)
    setShowVisitModal(true)
  }

  async function handleSaveVisit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setVisitSaving(true)
    setVisitError(null)
    try {
      await apiPost('/api/homevisitations', {
        residentId: selected.residentId,
        visitDate: visitDate,
        visitType,
        socialWorker: visitSocialWorker,
        observations: visitObservations,
        visitOutcome,
      })
      const r = await fetchVisitations(selected.residentId)
      setVisits(r.items)
      setShowVisitModal(false)
      setVisitDate(todayStr())
      setVisitType('Home Visit')
      setVisitSocialWorker('')
      setVisitObservations('')
      setVisitOutcome('Positive')
    } catch (err) {
      setVisitError(err instanceof Error ? err.message : 'Failed to save visit.')
    } finally {
      setVisitSaving(false)
    }
  }

  function openNewResidentModal() {
    setNewResidentCaseControlNo('')
    setNewResidentInternalCode('')
    setNewResidentSafehouseId(safehouses[0] ? String(safehouses[0].safehouseId) : '')
    setNewResidentStatus('Active')
    setNewResidentCategory('')
    setNewResidentSocialWorker('')
    setNewResidentDob('')
    setNewResidentSex('')
    setNewResidentConferenceDate('')
    setNewResidentError(null)
    setNewResidentSaving(false)
    setShowNewResidentModal(true)
  }

  function closeNewResidentModal() {
    if (newResidentSaving) return
    setShowNewResidentModal(false)
  }

  async function handleCreateResident(e: React.FormEvent) {
    e.preventDefault()
    if (!newResidentSafehouseId) {
      setNewResidentError('Select a safehouse before creating a resident.')
      return
    }

    setNewResidentSaving(true)
    setNewResidentError(null)

    try {
      const created = await apiPost<Resident>('/api/residents', {
        caseControlNo: newResidentCaseControlNo.trim(),
        internalCode: newResidentInternalCode.trim() || null,
        safehouseId: Number(newResidentSafehouseId),
        caseStatus: newResidentStatus,
        sex: newResidentSex || null,
        dateOfBirth: newResidentDob || null,
        caseCategory: newResidentCategory.trim() || null,
        assignedSocialWorker: newResidentSocialWorker.trim() || null,
        caseConferenceDate: newResidentConferenceDate || null,
      })

      setSelected(created)
      setStatusError(null)
      setVisits([])
      setSessions([])
      setVisitsLoading(true)
      setSessionsLoading(true)
      setDetailTab('visits')
      setVisitsShowAll(false)
      setSessionsShowAll(false)
      setEditField(null)
      setShowNewResidentModal(false)
      setListLoading(true)
      setListError(null)
      setResidentReloadToken(token => token + 1)
    } catch (err) {
      setNewResidentError(err instanceof Error ? err.message : 'Failed to create resident.')
    } finally {
      setNewResidentSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="cl-layout">
        <div className="cl-sidebar">
          <div className="cl-sidebar__header">
            <div className="cl-sidebar__actions">
              <p className="cl-sidebar__title">Residents</p>
              <button className="cl-new-resident-btn" onClick={openNewResidentModal} disabled={safehouses.length === 0}>
                + New Resident
              </button>
            </div>
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
              <div className="cl-filters__row">
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
                <select
                  value={signalFilter}
                  onChange={e => setSignalFilter(e.target.value)}
                >
                  <option value="">All signals</option>
                  <optgroup label="Support Need">
                    <option value="risk-high">High support need</option>
                    <option value="risk-medium">Medium support need</option>
                    <option value="risk-low">Low support need</option>
                  </optgroup>
                  <optgroup label="Reintegration">
                    <option value="reint-high">High readiness</option>
                    <option value="reint-medium">Medium readiness</option>
                    <option value="reint-low">Low readiness</option>
                  </optgroup>
                </select>
              </div>
            </div>
          </div>
          <div className="cl-list">
            {listLoading && <div className="inline-loading">Loading...</div>}
            {listError && <p className="admin-error" style={{ padding: '1rem' }}>{listError}</p>}
            {!listLoading && !listError && filteredResidents.length === 0 && <div className="empty-state">No residents found.</div>}
            {!listLoading && !listError && filteredResidents.map(r => (
              <button
                key={r.residentId}
                className={`cl-row${selected?.residentId === r.residentId ? ' is-selected' : ''}`}
                onClick={() => {
                  setStatusError(null)
                  setSelected(r)
                  setVisits([])
                  setSessions([])
                  setVisitsLoading(true)
                  setSessionsLoading(true)
                  setDetailTab('visits')
                  setVisitsShowAll(false)
                  setSessionsShowAll(false)
                  setEditField(null)
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
              <div className="cl-resident-header">
                <h2>{selected.caseControlNo}</h2>
                {statusBadge(selected.caseStatus)}
                <span style={{ fontSize: '0.85rem', color: 'var(--adm-muted)' }}>
                  {safehouseMap.get(selected.safehouseId) ?? `Safehouse ${selected.safehouseId}`}
                </span>
                {selected.caseStatus?.toLowerCase() === 'active' && (
                  <button className="cl-status-btn cl-status-btn--close" onClick={() => handleStatusChange('Closed')} disabled={statusSaving}>
                    {statusSaving ? 'Saving\u2026' : 'Close Case'}
                  </button>
                )}
                {selected.caseStatus?.toLowerCase() === 'closed' && (
                  <button className="cl-status-btn cl-status-btn--reopen" onClick={() => handleStatusChange('Active')} disabled={statusSaving}>
                    {statusSaving ? 'Saving\u2026' : 'Reopen Case'}
                  </button>
                )}
              </div>
              {statusError && <p className="admin-error">{statusError}</p>}

              {(residentRiskLevel || readinessLevel) && (
                <div className="cl-signal-row">
                  {residentRiskLevel && (
                    <div className="cl-signal-strip">
                      <span className="cl-signal-strip__label">Resident Signal</span>
                      <span
                        className="cl-signal-strip__info"
                        data-tip="Likelihood this resident needs increased care or intervention. Low = routine check-ins, Medium = monitor closely, High = proactive support recommended."
                        aria-label="About resident signal"
                        tabIndex={0}
                      >ⓘ</span>
                      <span className={`cl-ml-pill cl-ml-pill--${residentRiskLevel.tone}`}>{residentRiskLevel.label}</span>
                    </div>
                  )}
                  {readinessLevel && (
                    <div className="cl-signal-strip">
                      <span className="cl-signal-strip__label">Reintegration</span>
                      <span
                        className="cl-signal-strip__info"
                        data-tip="How ready this resident is to transition out of the shelter. Low = not yet ready, Medium = approaching readiness, High = recommend scheduling a reintegration review."
                        aria-label="About reintegration signal"
                        tabIndex={0}
                      >ⓘ</span>
                      <span className={`cl-ml-pill cl-ml-pill--${readinessLevel.tone}`}>{readinessLevel.label}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Per-Resident Case Conference Countdown */}
              {selected.caseConferenceDate && (() => {
                const d = daysUntil(selected.caseConferenceDate)
                if (d <= 0) return (
                  <div className="cl-conference-banner cl-conference-banner--urgent">
                    ⚑ Case conference was {Math.abs(d)} day{Math.abs(d) !== 1 ? 's' : ''} ago — update records immediately.
                  </div>
                )
                if (d <= 7) return (
                  <div className="cl-conference-banner cl-conference-banner--soon">
                    ⚑ Case conference in {d} day{d !== 1 ? 's' : ''} — {selected.caseConferenceDate}. Prepare documentation.
                  </div>
                )
                return null
              })()}

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
                <div className="cl-field">
                  <dt>Social Worker</dt>
                  {editField === 'socialWorker' ? (
                    <dd>
                      <div className="cl-field__edit-row">
                        <input className="cl-field__edit-input" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                        <button className="cl-field__edit-save" onClick={() => handleSaveField('socialWorker')} disabled={editSaving}>&#10003;</button>
                        <button className="cl-field__edit-cancel" onClick={() => setEditField(null)}>&#10005;</button>
                      </div>
                      {editError && <span className="cl-field__edit-error">{editError}</span>}
                    </dd>
                  ) : (
                    <dd className="cl-field__editable">
                      {selected.assignedSocialWorker ?? '\u2014'}
                      <button className="cl-field__edit-btn" onClick={() => { setEditField('socialWorker'); setEditValue(selected.assignedSocialWorker ?? ''); setEditError(null) }}>&#9998;</button>
                    </dd>
                  )}
                </div>
                <div className="cl-field"><dt>Internal Code</dt><dd>{selected.internalCode ?? '\u2014'}</dd></div>
                <div className="cl-field"><dt>Safehouse</dt><dd>{safehouseMap.get(selected.safehouseId) ?? String(selected.safehouseId)}</dd></div>
                <div className="cl-field">
                  <dt>Case Conference</dt>
                  {editField === 'conferenceDate' ? (
                    <dd>
                      <div className="cl-field__edit-row">
                        <input type="date" className="cl-field__edit-input" value={editValue} onChange={e => setEditValue(e.target.value)} autoFocus />
                        <button className="cl-field__edit-save" onClick={() => handleSaveField('conferenceDate')} disabled={editSaving}>&#10003;</button>
                        <button className="cl-field__edit-cancel" onClick={() => setEditField(null)}>&#10005;</button>
                      </div>
                      {editError && <span className="cl-field__edit-error">{editError}</span>}
                    </dd>
                  ) : (
                    <dd className="cl-field__editable">
                      {selected.caseConferenceDate ?? '\u2014'}
                      <button className="cl-field__edit-btn" onClick={() => { setEditField('conferenceDate'); setEditValue(selected.caseConferenceDate ?? ''); setEditError(null) }}>&#9998;</button>
                    </dd>
                  )}
                </div>
              </dl>

              <div className="cl-detail-tabs">
                <button
                  className={`cl-detail-tab${detailTab === 'visits' ? ' is-active' : ''}`}
                  onClick={() => setDetailTab('visits')}
                >Visit History</button>
                <button
                  className={`cl-detail-tab${detailTab === 'notes' ? ' is-active' : ''}`}
                  onClick={() => setDetailTab('notes')}
                >Session Notes</button>
              </div>

              {detailTab === 'visits' && (
                <>
                  <div className="cl-section-header">
                    <p className="section-title" style={{ margin: 0 }}>Visit History</p>
                    <button className="cl-add-note-btn" onClick={openVisitModal}>+ Log Visit</button>
                  </div>
                  {visitsLoading && <div className="inline-loading">Loading visits...</div>}
                  {!visitsLoading && concernVisits.length > 0 && (
                    <div className="cl-concern-callout">
                      &#9888; {concernVisits.length} visit{concernVisits.length !== 1 ? 's' : ''} flagged with Concern outcome — review observations below.
                    </div>
                  )}
                  {!visitsLoading && sortedVisits.length === 0 && <div className="empty-state">No visit history</div>}
                  {!visitsLoading && sortedVisits.length > 0 && (
                    <>
                      <div className="cl-timeline">
                        {displayedVisits.map(v => (
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
                      {sortedVisits.length > 10 && (
                        !visitsShowAll
                          ? <button className="cl-show-more" onClick={() => setVisitsShowAll(true)}>Show {sortedVisits.length - 10} more visits</button>
                          : <button className="cl-show-more" onClick={() => setVisitsShowAll(false)}>Show less</button>
                      )}
                    </>
                  )}
                </>
              )}

              {detailTab === 'notes' && (
                <>
                  <div className="cl-section-header">
                    <p className="section-title" style={{ margin: 0 }}>Session Notes</p>
                    <button className="cl-add-note-btn" onClick={openNoteModal}>+ Add Note</button>
                  </div>
                  {sessionsLoading && <div className="inline-loading">Loading sessions...</div>}
                  {!sessionsLoading && sortedSessions.length === 0 && <div className="empty-state">No session notes</div>}
                  {!sessionsLoading && sortedSessions.length > 0 && (
                    <>
                      <div className="cl-timeline">
                        {displayedSessions.map(s => (
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
                      {sortedSessions.length > 10 && (
                        !sessionsShowAll
                          ? <button className="cl-show-more" onClick={() => setSessionsShowAll(true)}>Show {sortedSessions.length - 10} more sessions</button>
                          : <button className="cl-show-more" onClick={() => setSessionsShowAll(false)}>Show less</button>
                      )}
                    </>
                  )}
                </>
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
                <button type="submit" className="cl-modal__save" disabled={noteSaving}>{noteSaving ? 'Saving\u2026' : 'Save Note'}</button>
                <button type="button" className="cl-modal__cancel" onClick={() => setShowNoteModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Visit Modal */}
      {showVisitModal && (
        <div className="cl-modal-overlay" onClick={() => setShowVisitModal(false)}>
          <div className="cl-modal" onClick={e => e.stopPropagation()}>
            <p className="cl-modal__title">Log Visit</p>
            <form onSubmit={handleSaveVisit} className="cl-modal__form">
              <label className="cl-modal__label">
                Date
                <input type="date" value={visitDate} onChange={e => setVisitDate(e.target.value)} required className="cl-modal__input" />
              </label>
              <label className="cl-modal__label">
                Visit Type
                <select value={visitType} onChange={e => setVisitType(e.target.value)} className="cl-modal__input">
                  <option>Home Visit</option>
                  <option>Follow-up</option>
                  <option>Initial</option>
                </select>
              </label>
              <label className="cl-modal__label">
                Social Worker
                <input type="text" value={visitSocialWorker} onChange={e => setVisitSocialWorker(e.target.value)} placeholder="Social worker name" className="cl-modal__input" />
              </label>
              <label className="cl-modal__label">
                Observations
                <textarea rows={4} value={visitObservations} onChange={e => setVisitObservations(e.target.value)} placeholder="Observations..." className="cl-modal__input cl-modal__textarea" />
              </label>
              <label className="cl-modal__label">
                Outcome
                <select value={visitOutcome} onChange={e => setVisitOutcome(e.target.value)} className="cl-modal__input">
                  <option>Positive</option>
                  <option>Concern</option>
                  <option>Neutral</option>
                </select>
              </label>
              {visitError && <p className="cl-modal__error">{visitError}</p>}
              <div className="cl-modal__actions">
                <button type="submit" className="cl-modal__save" disabled={visitSaving}>{visitSaving ? 'Saving\u2026' : 'Save Visit'}</button>
                <button type="button" className="cl-modal__cancel" onClick={() => setShowVisitModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showNewResidentModal && (
        <div className="cl-modal-overlay" onClick={closeNewResidentModal}>
          <div className="cl-modal" onClick={e => e.stopPropagation()}>
            <p className="cl-modal__title">Add New Resident</p>
            <form onSubmit={handleCreateResident} className="cl-modal__form">
              <label className="cl-modal__label">
                Case Control Number
                <input
                  type="text"
                  value={newResidentCaseControlNo}
                  onChange={e => setNewResidentCaseControlNo(e.target.value)}
                  required
                  className="cl-modal__input"
                  placeholder="Case control number"
                />
              </label>
              <label className="cl-modal__label">
                Safehouse
                <select
                  value={newResidentSafehouseId}
                  onChange={e => setNewResidentSafehouseId(e.target.value)}
                  required
                  className="cl-modal__input"
                >
                  {safehouses.map(safehouse => (
                    <option key={safehouse.safehouseId} value={safehouse.safehouseId}>
                      {safehouse.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="cl-modal__label">
                Internal Code
                <input
                  type="text"
                  value={newResidentInternalCode}
                  onChange={e => setNewResidentInternalCode(e.target.value)}
                  className="cl-modal__input"
                  placeholder="Optional internal code"
                />
              </label>
              <label className="cl-modal__label">
                Status
                <select value={newResidentStatus} onChange={e => setNewResidentStatus(e.target.value)} className="cl-modal__input">
                  <option>Active</option>
                  <option>Closed</option>
                </select>
              </label>
              <label className="cl-modal__label">
                Case Category
                <input
                  type="text"
                  value={newResidentCategory}
                  onChange={e => setNewResidentCategory(e.target.value)}
                  className="cl-modal__input"
                  placeholder="Case category"
                />
              </label>
              <label className="cl-modal__label">
                Social Worker
                <input
                  type="text"
                  value={newResidentSocialWorker}
                  onChange={e => setNewResidentSocialWorker(e.target.value)}
                  className="cl-modal__input"
                  placeholder="Assigned social worker"
                />
              </label>
              <label className="cl-modal__label">
                Date of Birth
                <input type="date" value={newResidentDob} onChange={e => setNewResidentDob(e.target.value)} className="cl-modal__input" />
              </label>
              <label className="cl-modal__label">
                Sex
                <select value={newResidentSex} onChange={e => setNewResidentSex(e.target.value)} className="cl-modal__input">
                  <option value="">Not set</option>
                  <option value="Female">Female</option>
                  <option value="Male">Male</option>
                </select>
              </label>
              <label className="cl-modal__label">
                Case Conference Date
                <input
                  type="date"
                  value={newResidentConferenceDate}
                  onChange={e => setNewResidentConferenceDate(e.target.value)}
                  className="cl-modal__input"
                />
              </label>
              {newResidentError && <p className="cl-modal__error">{newResidentError}</p>}
              <div className="cl-modal__actions">
                <button type="submit" className="cl-modal__save" disabled={newResidentSaving}>
                  {newResidentSaving ? 'Saving\u2026' : 'Create Resident'}
                </button>
                <button type="button" className="cl-modal__cancel" onClick={closeNewResidentModal} disabled={newResidentSaving}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
