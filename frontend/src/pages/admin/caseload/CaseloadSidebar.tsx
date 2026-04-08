import type { Resident, Safehouse } from '../../../types/domain'
import { statusBadge } from './caseloadUtils'

type Props = {
  residents: Resident[]
  safehouses: Safehouse[]
  selectedResidentId: number | null
  search: string
  safehouseFilter: string
  statusFilter: string
  listLoading: boolean
  listError: string | null
  pageNum: number
  totalPages: number
  totalCount: number
  onOpenNewResident: () => void
  onSearchChange: (value: string) => void
  onSafehouseFilterChange: (value: string) => void
  onStatusFilterChange: (value: string) => void
  onSelectResident: (resident: Resident) => void
  onPrevPage: () => void
  onNextPage: () => void
}

export default function CaseloadSidebar({
  residents,
  safehouses,
  selectedResidentId,
  search,
  safehouseFilter,
  statusFilter,
  listLoading,
  listError,
  pageNum,
  totalPages,
  totalCount,
  onOpenNewResident,
  onSearchChange,
  onSafehouseFilterChange,
  onStatusFilterChange,
  onSelectResident,
  onPrevPage,
  onNextPage,
}: Props) {
  return (
    <div className="cl-sidebar">
      <div className="cl-sidebar__header">
        <div className="cl-sidebar__actions">
          <p className="cl-sidebar__title">Residents</p>
          <button className="cl-new-resident-btn" onClick={onOpenNewResident} disabled={safehouses.length === 0}>
            + New Resident
          </button>
        </div>
        <input
          className="cl-search"
          placeholder="Search residents..."
          value={search}
          onChange={event => onSearchChange(event.target.value)}
        />
        <div className="cl-filters">
          <select value={safehouseFilter} onChange={event => onSafehouseFilterChange(event.target.value)}>
            <option value="">All safehouses</option>
            {safehouses.map(safehouse => (
              <option key={safehouse.safehouseId} value={safehouse.safehouseId}>
                {safehouse.name}
              </option>
            ))}
          </select>
          <select value={statusFilter} onChange={event => onStatusFilterChange(event.target.value)}>
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
        {!listLoading && !listError && residents.map(resident => (
          <button
            key={resident.residentId}
            className={`cl-row${selectedResidentId === resident.residentId ? ' is-selected' : ''}`}
            onClick={() => onSelectResident(resident)}
          >
            <span className="cl-row__id">{resident.caseControlNo}</span>
            <span className="cl-row__meta">
              {statusBadge(resident.caseStatus)}
              {resident.caseCategory && <span>{resident.caseCategory}</span>}
              {resident.assignedSocialWorker && <span>{resident.assignedSocialWorker}</span>}
            </span>
          </button>
        ))}
      </div>
      <div className="cl-pager">
        <span className="cl-pager__info">Page {pageNum} of {totalPages}, {totalCount} records</span>
        <button className="cl-pager__btn" disabled={pageNum <= 1} onClick={onPrevPage}>Prev</button>
        <button className="cl-pager__btn" disabled={pageNum >= totalPages} onClick={onNextPage}>Next</button>
      </div>
    </div>
  )
}
