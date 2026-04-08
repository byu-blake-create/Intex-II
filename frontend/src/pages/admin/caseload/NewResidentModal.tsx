import type { Safehouse } from '../../../types/domain'

type Props = {
  safehouses: Safehouse[]
  caseControlNo: string
  internalCode: string
  safehouseId: string
  status: string
  category: string
  socialWorker: string
  dateOfBirth: string
  sex: string
  conferenceDate: string
  saving: boolean
  error: string | null
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
  onCaseControlNoChange: (value: string) => void
  onInternalCodeChange: (value: string) => void
  onSafehouseIdChange: (value: string) => void
  onStatusChange: (value: string) => void
  onCategoryChange: (value: string) => void
  onSocialWorkerChange: (value: string) => void
  onDateOfBirthChange: (value: string) => void
  onSexChange: (value: string) => void
  onConferenceDateChange: (value: string) => void
}

export default function NewResidentModal({
  safehouses,
  caseControlNo,
  internalCode,
  safehouseId,
  status,
  category,
  socialWorker,
  dateOfBirth,
  sex,
  conferenceDate,
  saving,
  error,
  onClose,
  onSubmit,
  onCaseControlNoChange,
  onInternalCodeChange,
  onSafehouseIdChange,
  onStatusChange,
  onCategoryChange,
  onSocialWorkerChange,
  onDateOfBirthChange,
  onSexChange,
  onConferenceDateChange,
}: Props) {
  return (
    <div className="cl-modal-overlay" onClick={onClose}>
      <div className="cl-modal" onClick={event => event.stopPropagation()}>
        <p className="cl-modal__title">Add New Resident</p>
        <form onSubmit={onSubmit} className="cl-modal__form">
          <label className="cl-modal__label">
            Case Control Number
            <input
              type="text"
              value={caseControlNo}
              onChange={event => onCaseControlNoChange(event.target.value)}
              required
              className="cl-modal__input"
              placeholder="Case control number"
            />
          </label>
          <label className="cl-modal__label">
            Safehouse
            <select value={safehouseId} onChange={event => onSafehouseIdChange(event.target.value)} required className="cl-modal__input">
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
              value={internalCode}
              onChange={event => onInternalCodeChange(event.target.value)}
              className="cl-modal__input"
              placeholder="Optional internal code"
            />
          </label>
          <label className="cl-modal__label">
            Status
            <select value={status} onChange={event => onStatusChange(event.target.value)} className="cl-modal__input">
              <option>Active</option>
              <option>Closed</option>
            </select>
          </label>
          <label className="cl-modal__label">
            Case Category
            <input
              type="text"
              value={category}
              onChange={event => onCategoryChange(event.target.value)}
              className="cl-modal__input"
              placeholder="Case category"
            />
          </label>
          <label className="cl-modal__label">
            Social Worker
            <input
              type="text"
              value={socialWorker}
              onChange={event => onSocialWorkerChange(event.target.value)}
              className="cl-modal__input"
              placeholder="Assigned social worker"
            />
          </label>
          <label className="cl-modal__label">
            Date of Birth
            <input type="date" value={dateOfBirth} onChange={event => onDateOfBirthChange(event.target.value)} className="cl-modal__input" />
          </label>
          <label className="cl-modal__label">
            Sex
            <select value={sex} onChange={event => onSexChange(event.target.value)} className="cl-modal__input">
              <option value="">Not set</option>
              <option value="Female">Female</option>
              <option value="Male">Male</option>
            </select>
          </label>
          <label className="cl-modal__label">
            Case Conference Date
            <input type="date" value={conferenceDate} onChange={event => onConferenceDateChange(event.target.value)} className="cl-modal__input" />
          </label>
          {error && <p className="cl-modal__error">{error}</p>}
          <div className="cl-modal__actions">
            <button type="submit" className="cl-modal__save" disabled={saving}>
              {saving ? 'Saving…' : 'Create Resident'}
            </button>
            <button type="button" className="cl-modal__cancel" onClick={onClose} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
