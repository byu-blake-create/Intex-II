import { useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal'
import SavedToast from '../../components/SavedToast'
import { fetchAdminDashboard, type AdminDashboardCard } from '../../lib/adminDashboardApi'
import { apiPost, apiPut } from '../../lib/api'
import { fetchProcessRecordings } from '../../lib/processRecordingsApi'
import { fetchSummary } from '../../lib/reportsApi'
import { fetchResidents } from '../../lib/residentsApi'
import { fetchSafehouses } from '../../lib/safehousesApi'
import { fetchVisitations } from '../../lib/visitationsApi'
import type {
  DashboardSummary,
  HomeVisitation,
  HomeVisitationUpsertInput,
  ProcessRecording,
  ProcessRecordingUpsertInput,
  Resident,
  Safehouse,
} from '../../types/domain'
import CaseloadSidebar from './caseload/CaseloadSidebar'
import type { DetailTab, ResidentEditField } from './caseload/caseloadTypes'
import { daysSince, residentToUpsertInput, todayStr } from './caseload/caseloadUtils'
import NewResidentModal from './caseload/NewResidentModal'
import ResidentDetailPanel from './caseload/ResidentDetailPanel'
import ResidentNoteModal from './caseload/ResidentNoteModal'
import ResidentVisitModal from './caseload/ResidentVisitModal'
import './CaseloadPage.css'

const PAGE_SIZE = 30

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])

  return debounced
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
  const [residentReloadToken, setResidentReloadToken] = useState(0)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  const [detailTab, setDetailTab] = useState<DetailTab>('visits')
  const [visitsShowAll, setVisitsShowAll] = useState(false)
  const [sessionsShowAll, setSessionsShowAll] = useState(false)

  const [editField, setEditField] = useState<ResidentEditField | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  const [pendingStatusChange, setPendingStatusChange] = useState<'Active' | 'Closed' | null>(null)
  const [statusSaving, setStatusSaving] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteDate, setNoteDate] = useState(todayStr())
  const [noteType, setNoteType] = useState('Individual')
  const [noteSocialWorker, setNoteSocialWorker] = useState('')
  const [noteNarrative, setNoteNarrative] = useState('')
  const [noteRestricted, setNoteRestricted] = useState(false)
  const [noteSaving, setNoteSaving] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  const [showVisitModal, setShowVisitModal] = useState(false)
  const [visitDate, setVisitDate] = useState(todayStr())
  const [visitType, setVisitType] = useState('Home Visit')
  const [visitSocialWorker, setVisitSocialWorker] = useState('')
  const [visitObservations, setVisitObservations] = useState('')
  const [visitOutcome, setVisitOutcome] = useState('Positive')
  const [visitSaving, setVisitSaving] = useState(false)
  const [visitError, setVisitError] = useState<string | null>(null)

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

  const debouncedSearch = useDebounce(search, 350)

  useEffect(() => {
    fetchSafehouses().then(response => setSafehouses(response.items)).catch(() => {})
    fetchAdminDashboard().then(data => {
      const card = data.cards.find(item => item.id === 'resident-triage') ?? null
      setTriageCard(card)
    }).catch(() => {})
    fetchSummary().then(data => setSummary(data)).catch(() => {})
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
      .then(response => {
        if (!mounted) return
        setResidents(response.items)
        setTotalCount(response.totalCount)
      })
      .catch(() => {
        if (mounted) setListError('Failed to load residents.')
      })
      .finally(() => {
        if (mounted) setListLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [pageNum, debouncedSearch, safehouseFilter, statusFilter, residentReloadToken])

  useEffect(() => {
    if (!selected) return

    setVisitsLoading(true)
    setSessionsLoading(true)

    fetchVisitations(selected.residentId)
      .then(response => setVisits(response.items))
      .catch(() => setVisits([]))
      .finally(() => setVisitsLoading(false))

    fetchProcessRecordings(selected.residentId)
      .then(response => setSessions(response.items))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false))
  }, [selected])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const safehouseMap = useMemo(() => {
    const map = new Map<number, string>()
    safehouses.forEach(safehouse => map.set(safehouse.safehouseId, safehouse.name))
    return map
  }, [safehouses])

  const overdueInfo = useMemo(() => {
    if (visitsLoading) return null
    if (visits.length === 0) return { overdue: true, noRecord: true, days: null }

    const sorted = [...visits]
      .filter(visit => visit.visitDate)
      .sort((left, right) => new Date(right.visitDate!).getTime() - new Date(left.visitDate!).getTime())

    if (sorted.length === 0) return { overdue: true, noRecord: true, days: null }

    const days = daysSince(sorted[0].visitDate!)
    return { overdue: days > 30, noRecord: false, days }
  }, [visits, visitsLoading])

  const concernVisits = useMemo(
    () => visits.filter(visit => visit.visitOutcome?.toLowerCase() === 'concern'),
    [visits],
  )

  const sortedVisits = useMemo(
    () => [...visits].sort((left, right) => (right.visitDate ?? '').localeCompare(left.visitDate ?? '')),
    [visits],
  )
  const displayedVisits = visitsShowAll ? sortedVisits : sortedVisits.slice(0, 10)

  const sortedSessions = useMemo(
    () => [...sessions].sort((left, right) => (right.sessionDate ?? '').localeCompare(left.sessionDate ?? '')),
    [sessions],
  )
  const displayedSessions = sessionsShowAll ? sortedSessions : sortedSessions.slice(0, 10)

  function flashSaved(message = 'Changes saved') {
    setSavedMessage(message)
  }

  function prepareResidentView(resident: Resident | null) {
    setStatusError(null)
    setSelected(resident)
    setVisits([])
    setSessions([])
    setVisitsLoading(Boolean(resident))
    setSessionsLoading(Boolean(resident))
    setDetailTab('visits')
    setVisitsShowAll(false)
    setSessionsShowAll(false)
    setEditField(null)
    setEditError(null)
    setPendingStatusChange(null)
  }

  async function handleSaveField(field: ResidentEditField) {
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
      setResidents(previous => previous.map(resident => resident.residentId === updated.residentId ? updated : resident))
      setResidentReloadToken(token => token + 1)
      setEditField(null)
      flashSaved()
    } catch (error) {
      setEditError(error instanceof Error ? error.message : 'Failed to save. Try again.')
    } finally {
      setEditSaving(false)
    }
  }

  async function commitStatusChange(newStatus: 'Active' | 'Closed') {
    if (!selected) return

    setStatusSaving(true)
    setStatusError(null)

    try {
      const updated: Resident = { ...selected, caseStatus: newStatus }
      await apiPut(`/api/residents/${selected.residentId}`, residentToUpsertInput(updated))

      if (statusFilter && statusFilter !== newStatus) {
        prepareResidentView(null)
      } else {
        setSelected(updated)
      }

      setResidents(previous => previous.map(resident => resident.residentId === updated.residentId ? updated : resident))
      setResidentReloadToken(token => token + 1)
      setPendingStatusChange(null)
      flashSaved()
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : 'Failed to update resident status.')
    } finally {
      setStatusSaving(false)
    }
  }

  async function handleSaveNote(event: React.FormEvent) {
    event.preventDefault()
    if (!selected) return

    setNoteSaving(true)
    setNoteError(null)

    try {
      const payload: ProcessRecordingUpsertInput = {
        residentId: selected.residentId,
        sessionDate: noteDate,
        sessionType: noteType,
        socialWorker: noteSocialWorker,
        sessionNarrative: noteNarrative,
        notesRestricted: noteRestricted ? 'Y' : 'N',
      }

      await apiPost('/api/processrecordings', payload)
      const updated = await fetchProcessRecordings(selected.residentId)
      setSessions(updated.items)
      setShowNoteModal(false)
      setNoteDate(todayStr())
      setNoteType('Individual')
      setNoteSocialWorker('')
      setNoteNarrative('')
      setNoteRestricted(false)
      flashSaved()
    } catch (error) {
      setNoteError(error instanceof Error ? error.message : 'Failed to save note.')
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

  function closeNoteModal() {
    if (noteSaving) return
    setShowNoteModal(false)
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

  function closeVisitModal() {
    if (visitSaving) return
    setShowVisitModal(false)
  }

  async function handleSaveVisit(event: React.FormEvent) {
    event.preventDefault()
    if (!selected) return

    setVisitSaving(true)
    setVisitError(null)

    try {
      const payload: HomeVisitationUpsertInput = {
        residentId: selected.residentId,
        visitDate,
        visitType,
        socialWorker: visitSocialWorker,
        observations: visitObservations,
        visitOutcome,
      }

      await apiPost('/api/homevisitations', payload)
      const response = await fetchVisitations(selected.residentId)
      setVisits(response.items)
      setShowVisitModal(false)
      setVisitDate(todayStr())
      setVisitType('Home Visit')
      setVisitSocialWorker('')
      setVisitObservations('')
      setVisitOutcome('Positive')
      flashSaved()
    } catch (error) {
      setVisitError(error instanceof Error ? error.message : 'Failed to save visit.')
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

  async function handleCreateResident(event: React.FormEvent) {
    event.preventDefault()
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

      prepareResidentView(created)
      setShowNewResidentModal(false)
      setListLoading(true)
      setListError(null)
      setResidentReloadToken(token => token + 1)
      flashSaved('Resident created')
    } catch (error) {
      setNewResidentError(error instanceof Error ? error.message : 'Failed to create resident.')
    } finally {
      setNewResidentSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="cl-layout">
        <CaseloadSidebar
          residents={residents}
          safehouses={safehouses}
          selectedResidentId={selected?.residentId ?? null}
          search={search}
          safehouseFilter={safehouseFilter}
          statusFilter={statusFilter}
          listLoading={listLoading}
          listError={listError}
          pageNum={pageNum}
          totalPages={totalPages}
          totalCount={totalCount}
          onOpenNewResident={openNewResidentModal}
          onSearchChange={value => {
            setSearch(value)
            setPageNum(1)
            setListLoading(true)
            setListError(null)
          }}
          onSafehouseFilterChange={value => {
            setSafehouseFilter(value)
            setPageNum(1)
            setListLoading(true)
            setListError(null)
          }}
          onStatusFilterChange={value => {
            setStatusFilter(value)
            setPageNum(1)
            setListLoading(true)
            setListError(null)
          }}
          onSelectResident={resident => prepareResidentView(resident)}
          onPrevPage={() => {
            setPageNum(previous => previous - 1)
            setListLoading(true)
            setListError(null)
          }}
          onNextPage={() => {
            setPageNum(previous => previous + 1)
            setListLoading(true)
            setListError(null)
          }}
        />

        <ResidentDetailPanel
          selected={selected}
          summary={summary}
          triageCard={triageCard}
          safehouseMap={safehouseMap}
          statusSaving={statusSaving}
          statusError={statusError}
          onRequestStatusChange={newStatus => setPendingStatusChange(newStatus)}
          visitsLoading={visitsLoading}
          overdueInfo={overdueInfo}
          concernVisits={concernVisits}
          detailTab={detailTab}
          onDetailTabChange={setDetailTab}
          editField={editField}
          editValue={editValue}
          editSaving={editSaving}
          editError={editError}
          onEditValueChange={setEditValue}
          onStartEdit={(field, value) => {
            setEditField(field)
            setEditValue(value)
            setEditError(null)
          }}
          onCancelEdit={() => {
            setEditField(null)
            setEditError(null)
          }}
          onSaveField={handleSaveField}
          onOpenVisitModal={openVisitModal}
          onOpenNoteModal={openNoteModal}
          sortedVisits={sortedVisits}
          displayedVisits={displayedVisits}
          visitsShowAll={visitsShowAll}
          onToggleVisitsShowAll={setVisitsShowAll}
          sessionsLoading={sessionsLoading}
          sortedSessions={sortedSessions}
          displayedSessions={displayedSessions}
          sessionsShowAll={sessionsShowAll}
          onToggleSessionsShowAll={setSessionsShowAll}
        />
      </div>

      {showNoteModal && (
        <ResidentNoteModal
          noteDate={noteDate}
          noteType={noteType}
          noteSocialWorker={noteSocialWorker}
          noteNarrative={noteNarrative}
          noteRestricted={noteRestricted}
          noteSaving={noteSaving}
          noteError={noteError}
          onClose={closeNoteModal}
          onSubmit={handleSaveNote}
          onNoteDateChange={setNoteDate}
          onNoteTypeChange={setNoteType}
          onNoteSocialWorkerChange={setNoteSocialWorker}
          onNoteNarrativeChange={setNoteNarrative}
          onNoteRestrictedChange={setNoteRestricted}
        />
      )}

      {showVisitModal && (
        <ResidentVisitModal
          visitDate={visitDate}
          visitType={visitType}
          visitSocialWorker={visitSocialWorker}
          visitObservations={visitObservations}
          visitOutcome={visitOutcome}
          visitSaving={visitSaving}
          visitError={visitError}
          onClose={closeVisitModal}
          onSubmit={handleSaveVisit}
          onVisitDateChange={setVisitDate}
          onVisitTypeChange={setVisitType}
          onVisitSocialWorkerChange={setVisitSocialWorker}
          onVisitObservationsChange={setVisitObservations}
          onVisitOutcomeChange={setVisitOutcome}
        />
      )}

      {showNewResidentModal && (
        <NewResidentModal
          safehouses={safehouses}
          caseControlNo={newResidentCaseControlNo}
          internalCode={newResidentInternalCode}
          safehouseId={newResidentSafehouseId}
          status={newResidentStatus}
          category={newResidentCategory}
          socialWorker={newResidentSocialWorker}
          dateOfBirth={newResidentDob}
          sex={newResidentSex}
          conferenceDate={newResidentConferenceDate}
          saving={newResidentSaving}
          error={newResidentError}
          onClose={closeNewResidentModal}
          onSubmit={handleCreateResident}
          onCaseControlNoChange={setNewResidentCaseControlNo}
          onInternalCodeChange={setNewResidentInternalCode}
          onSafehouseIdChange={setNewResidentSafehouseId}
          onStatusChange={setNewResidentStatus}
          onCategoryChange={setNewResidentCategory}
          onSocialWorkerChange={setNewResidentSocialWorker}
          onDateOfBirthChange={setNewResidentDob}
          onSexChange={setNewResidentSex}
          onConferenceDateChange={setNewResidentConferenceDate}
        />
      )}

      {selected && pendingStatusChange && (
        <ConfirmDeleteModal
          title={pendingStatusChange === 'Closed' ? 'Close resident case?' : 'Reopen resident case?'}
          description={
            pendingStatusChange === 'Closed'
              ? `${selected.caseControlNo} will be marked Closed immediately. Confirm before updating the case record.`
              : `${selected.caseControlNo} will be moved back to Active status immediately. Confirm before updating the case record.`
          }
          confirmLabel={pendingStatusChange === 'Closed' ? 'Close Case' : 'Reopen Case'}
          confirmTone="accent"
          busy={statusSaving}
          onCancel={() => {
            if (statusSaving) return
            setPendingStatusChange(null)
          }}
          onConfirm={() => void commitStatusChange(pendingStatusChange)}
        />
      )}

      <SavedToast message={savedMessage} onDismiss={() => setSavedMessage(null)} />
    </AdminLayout>
  )
}
