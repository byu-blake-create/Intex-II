type Props = {
  visitDate: string
  visitType: string
  visitSocialWorker: string
  visitObservations: string
  visitOutcome: string
  visitSaving: boolean
  visitError: string | null
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
  onVisitDateChange: (value: string) => void
  onVisitTypeChange: (value: string) => void
  onVisitSocialWorkerChange: (value: string) => void
  onVisitObservationsChange: (value: string) => void
  onVisitOutcomeChange: (value: string) => void
}

export default function ResidentVisitModal({
  visitDate,
  visitType,
  visitSocialWorker,
  visitObservations,
  visitOutcome,
  visitSaving,
  visitError,
  onClose,
  onSubmit,
  onVisitDateChange,
  onVisitTypeChange,
  onVisitSocialWorkerChange,
  onVisitObservationsChange,
  onVisitOutcomeChange,
}: Props) {
  return (
    <div className="cl-modal-overlay" onClick={onClose}>
      <div className="cl-modal" onClick={event => event.stopPropagation()}>
        <p className="cl-modal__title">Log Visit</p>
        <form onSubmit={onSubmit} className="cl-modal__form">
          <label className="cl-modal__label">
            Date
            <input type="date" value={visitDate} onChange={event => onVisitDateChange(event.target.value)} required className="cl-modal__input" />
          </label>
          <label className="cl-modal__label">
            Visit Type
            <select value={visitType} onChange={event => onVisitTypeChange(event.target.value)} className="cl-modal__input">
              <option>Home Visit</option>
              <option>Follow-up</option>
              <option>Initial</option>
            </select>
          </label>
          <label className="cl-modal__label">
            Social Worker
            <input type="text" value={visitSocialWorker} onChange={event => onVisitSocialWorkerChange(event.target.value)} placeholder="Social worker name" className="cl-modal__input" />
          </label>
          <label className="cl-modal__label">
            Observations
            <textarea rows={4} value={visitObservations} onChange={event => onVisitObservationsChange(event.target.value)} placeholder="Observations..." className="cl-modal__input cl-modal__textarea" />
          </label>
          <label className="cl-modal__label">
            Outcome
            <select value={visitOutcome} onChange={event => onVisitOutcomeChange(event.target.value)} className="cl-modal__input">
              <option>Positive</option>
              <option>Concern</option>
              <option>Neutral</option>
            </select>
          </label>
          {visitError && <p className="cl-modal__error">{visitError}</p>}
          <div className="cl-modal__actions">
            <button type="submit" className="cl-modal__save" disabled={visitSaving}>{visitSaving ? 'Saving…' : 'Save Visit'}</button>
            <button type="button" className="cl-modal__cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
