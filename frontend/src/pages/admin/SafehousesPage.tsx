import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchSafehouses } from '../../lib/safehousesApi'
import { fetchResidents } from '../../lib/residentsApi'
import { apiPut } from '../../lib/api'
import type { Safehouse, Resident, ResidentUpsertInput } from '../../types/domain'
import './SafehousesPage.css'

const RESIDENT_PAGE_SIZE = 30

function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="badge badge--gray">Unknown</span>
  const s = status.toLowerCase()
  if (s === 'active') return <span className="badge badge--green">Active</span>
  if (s === 'closed') return <span className="badge badge--gray">Closed</span>
  return <span className="badge badge--blue">{status}</span>
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

export default function SafehousesPage() {
  const [safehouses, setSafehouses] = useState<Safehouse[]>([])
  const [activeCounts, setActiveCounts] = useState<Map<number, number>>(new Map())
  const [listLoading, setListLoading] = useState(true)
  const [countsLoading, setCountsLoading] = useState(true)
  const [selected, setSelected] = useState<Safehouse | null>(null)

  // Detail panel state
  const [residents, setResidents] = useState<Resident[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [allCount, setAllCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [detailLoading, setDetailLoading] = useState(false)
  const [allCountLoading, setAllCountLoading] = useState(false)
  const [reloadToken, setReloadToken] = useState(0)
  const [reassignResident, setReassignResident] = useState<Resident | null>(null)
  const [reassignSafehouseId, setReassignSafehouseId] = useState('')
  const [reassignSaving, setReassignSaving] = useState(false)
  const [reassignError, setReassignError] = useState<string | null>(null)

  // Reuse the same reload token after reassignment so counts and detail panes stay in sync.
  useEffect(() => {
    fetchSafehouses(1, 100)
      .then(r => {
        setSafehouses(r.items)
        setSelected(current => current ? r.items.find(item => item.safehouseId === current.safehouseId) ?? current : current)
        setListLoading(false)
        // Load active resident counts for all safehouses
        if (r.items.length > 0) {
          Promise.all(
            r.items.map(sh =>
              fetchResidents({ safehouseId: sh.safehouseId, caseStatus: 'Active', pageSize: 1, pageNum: 1 })
                .then(res => ({ id: sh.safehouseId, count: res.totalCount }))
                .catch(() => ({ id: sh.safehouseId, count: 0 }))
            )
          ).then(results => {
            const m = new Map<number, number>()
            results.forEach(({ id, count }) => m.set(id, count))
            setActiveCounts(m)
            setCountsLoading(false)
          })
        } else {
          setActiveCounts(new Map())
          setCountsLoading(false)
        }
      })
      .catch(() => {
        setListLoading(false)
        setCountsLoading(false)
      })
  }, [reloadToken])

  // Detail loading is toggled by selection/pagination handlers to avoid effect-lint churn.
  useEffect(() => {
    if (!selected) return
    fetchResidents({ safehouseId: selected.safehouseId, caseStatus: 'Active', pageSize: RESIDENT_PAGE_SIZE, pageNum })
      .then(r => { setResidents(r.items); setTotalCount(r.totalCount) })
      .catch(() => { setResidents([]); setTotalCount(0) })
      .finally(() => setDetailLoading(false))
  }, [selected, pageNum, reloadToken])

  // Load all-residents count for selected safehouse
  useEffect(() => {
    if (!selected) return
    fetchResidents({ safehouseId: selected.safehouseId, pageSize: 1, pageNum: 1 })
      .then(r => setAllCount(r.totalCount))
      .catch(() => setAllCount(0))
      .finally(() => setAllCountLoading(false))
  }, [selected, reloadToken])

  const totalPages = Math.max(1, Math.ceil(totalCount / RESIDENT_PAGE_SIZE))

  function openReassignModal(resident: Resident) {
    const fallbackSafehouse = safehouses.find(safehouse => safehouse.safehouseId !== resident.safehouseId)
    setReassignResident(resident)
    setReassignSafehouseId(fallbackSafehouse ? String(fallbackSafehouse.safehouseId) : '')
    setReassignError(null)
    setReassignSaving(false)
  }

  function closeReassignModal() {
    if (reassignSaving) return
    setReassignResident(null)
    setReassignSafehouseId('')
    setReassignError(null)
  }

  async function handleReassignResident(e: React.FormEvent) {
    e.preventDefault()
    if (!reassignResident || !reassignSafehouseId) {
      setReassignError('Choose a destination safehouse.')
      return
    }

    setReassignSaving(true)
    setReassignError(null)

    try {
      const updatedResident: Resident = {
        ...reassignResident,
        safehouseId: Number(reassignSafehouseId),
      }

      await apiPut(`/api/residents/${reassignResident.residentId}`, residentToUpsertInput(updatedResident))
      setPageNum(1)
      setListLoading(true)
      setDetailLoading(true)
      setAllCountLoading(true)
      setCountsLoading(true)
      setReassignSaving(false)
      setReassignResident(null)
      setReassignSafehouseId('')
      setReassignError(null)
      setReloadToken(token => token + 1)
    } catch (err) {
      setReassignError(err instanceof Error ? err.message : 'Failed to reassign resident.')
      setReassignSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="sh-layout">
        {/* Sidebar */}
        <div className="sh-sidebar">
          <div className="sh-sidebar__header">
            <span className="sh-sidebar__title">Safehouses</span>
          </div>
          <div className="sh-list">
            {listLoading && <div className="inline-loading">Loading...</div>}
            {!listLoading && safehouses.length === 0 && <div className="empty-state">No safehouses found.</div>}
            {!listLoading && safehouses.map(sh => {
              const count = activeCounts.get(sh.safehouseId)
              return (
                <button
                  key={sh.safehouseId}
                  className={`sh-row${selected?.safehouseId === sh.safehouseId ? ' is-selected' : ''}`}
                  onClick={() => {
                    setSelected(sh)
                    setPageNum(1)
                    setDetailLoading(true)
                    setAllCountLoading(true)
                    setResidents([])
                  }}
                >
                  <span className="sh-row__top">
                    <span className="sh-row__name">{sh.name}</span>
                    {!countsLoading && count != null && (
                      <span className="badge badge--green sh-row__count">{count}</span>
                    )}
                  </span>
                  <span className="sh-row__code">{sh.safehouseCode}</span>
                  {(sh.city || sh.region) && (
                    <span className="sh-row__location">
                      {[sh.city, sh.region].filter(Boolean).join(', ')}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="sh-detail">
          {!selected && <div className="sh-detail__empty">Select a safehouse to view residents</div>}
          {selected && (
            <>
              <div className="sh-header">
                <h2>{selected.name}</h2>
                <span className="badge badge--blue sh-header__code">{selected.safehouseCode}</span>
                {(selected.city || selected.region) && (
                  <span className="sh-header__location">
                    {[selected.city, selected.region].filter(Boolean).join(', ')}
                  </span>
                )}
              </div>

              <dl className="cl-fields">
                <div className="cl-field"><dt>Code</dt><dd style={{ fontFamily: 'monospace' }}>{selected.safehouseCode}</dd></div>
                <div className="cl-field"><dt>Region</dt><dd>{selected.region ?? '\u2014'}</dd></div>
                <div className="cl-field"><dt>City</dt><dd>{selected.city ?? '\u2014'}</dd></div>
              </dl>

              <div>
                <p className="section-title">Active Residents</p>
                {detailLoading && <div className="inline-loading">Loading residents...</div>}
                {!detailLoading && residents.length === 0 && <div className="empty-state">No active residents at this safehouse.</div>}
                {!detailLoading && residents.length > 0 && (
                  <>
                    <div className="sh-resident-list">
                      {residents.map(r => (
                        <div key={r.residentId} className="sh-resident-row">
                          <div className="sh-resident-row__top">
                            <span className="sh-resident-row__id">{r.caseControlNo}</span>
                            <button
                              className="sh-reassign-btn"
                              onClick={() => openReassignModal(r)}
                              disabled={safehouses.length < 2}
                            >
                              Reassign
                            </button>
                          </div>
                          <span className="sh-resident-row__meta">
                            {statusBadge(r.caseStatus)}
                            {r.caseCategory && <span className="sh-resident-row__cat">{r.caseCategory}</span>}
                            {r.assignedSocialWorker && (
                              <span className="sh-resident-row__worker">{r.assignedSocialWorker}</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                    {totalPages > 1 && (
                      <div className="sh-pager">
                        <span className="sh-pager__info">Page {pageNum} of {totalPages}, {totalCount} active</span>
                        <button
                          className="sh-pager__btn"
                          disabled={pageNum <= 1}
                          onClick={() => setPageNum(p => p - 1)}
                        >Prev</button>
                        <button
                          className="sh-pager__btn"
                          disabled={pageNum >= totalPages}
                          onClick={() => setPageNum(p => p + 1)}
                        >Next</button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <p className="section-title">All Residents</p>
                {allCountLoading
                  ? <div className="inline-loading">Loading...</div>
                  : (
                    <div className="sh-all-stat">
                      <span className="sh-all-stat__num">{allCount}</span>
                      <span className="sh-all-stat__label">total residents ever placed</span>
                    </div>
                  )
                }
              </div>
            </>
          )}
        </div>
      </div>

      {reassignResident && (
        <div className="sh-modal-overlay" onClick={closeReassignModal}>
          <div className="sh-modal" onClick={e => e.stopPropagation()}>
            <p className="sh-modal__title">Reassign Resident</p>
            <p className="sh-modal__sub">{reassignResident.caseControlNo}</p>
            <form onSubmit={handleReassignResident} className="sh-modal__form">
              <label className="sh-modal__label">
                Destination Safehouse
                <select
                  value={reassignSafehouseId}
                  onChange={e => setReassignSafehouseId(e.target.value)}
                  className="sh-modal__input"
                  required
                >
                  {safehouses
                    .filter(safehouse => safehouse.safehouseId !== reassignResident.safehouseId)
                    .map(safehouse => (
                      <option key={safehouse.safehouseId} value={safehouse.safehouseId}>
                        {safehouse.name}
                      </option>
                    ))}
                </select>
              </label>
              {reassignError && <p className="sh-modal__error">{reassignError}</p>}
              <div className="sh-modal__actions">
                <button type="submit" className="sh-modal__save" disabled={reassignSaving}>
                  {reassignSaving ? 'Saving…' : 'Move Resident'}
                </button>
                <button type="button" className="sh-modal__cancel" onClick={closeReassignModal} disabled={reassignSaving}>
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
