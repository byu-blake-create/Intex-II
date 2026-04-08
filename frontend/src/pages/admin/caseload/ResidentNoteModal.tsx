type Props = {
  noteDate: string
  noteType: string
  noteSocialWorker: string
  noteNarrative: string
  noteRestricted: boolean
  noteSaving: boolean
  noteError: string | null
  onClose: () => void
  onSubmit: (event: React.FormEvent) => void
  onNoteDateChange: (value: string) => void
  onNoteTypeChange: (value: string) => void
  onNoteSocialWorkerChange: (value: string) => void
  onNoteNarrativeChange: (value: string) => void
  onNoteRestrictedChange: (value: boolean) => void
}

export default function ResidentNoteModal({
  noteDate,
  noteType,
  noteSocialWorker,
  noteNarrative,
  noteRestricted,
  noteSaving,
  noteError,
  onClose,
  onSubmit,
  onNoteDateChange,
  onNoteTypeChange,
  onNoteSocialWorkerChange,
  onNoteNarrativeChange,
  onNoteRestrictedChange,
}: Props) {
  return (
    <div className="cl-modal-overlay" onClick={onClose}>
      <div className="cl-modal" onClick={event => event.stopPropagation()}>
        <p className="cl-modal__title">Add Session Note</p>
        <form onSubmit={onSubmit} className="cl-modal__form">
          <label className="cl-modal__label">
            Date
            <input type="date" value={noteDate} onChange={event => onNoteDateChange(event.target.value)} required className="cl-modal__input" />
          </label>
          <label className="cl-modal__label">
            Session Type
            <select value={noteType} onChange={event => onNoteTypeChange(event.target.value)} className="cl-modal__input">
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
            <input type="text" value={noteSocialWorker} onChange={event => onNoteSocialWorkerChange(event.target.value)} placeholder="Social worker name" className="cl-modal__input" />
          </label>
          <label className="cl-modal__label">
            Session Narrative
            <textarea rows={4} value={noteNarrative} onChange={event => onNoteNarrativeChange(event.target.value)} placeholder="Session narrative..." className="cl-modal__input cl-modal__textarea" />
          </label>
          <label className="cl-modal__checkbox-row">
            <input type="checkbox" checked={noteRestricted} onChange={event => onNoteRestrictedChange(event.target.checked)} />
            Mark as restricted
          </label>
          {noteError && <p className="cl-modal__error">{noteError}</p>}
          <div className="cl-modal__actions">
            <button type="submit" className="cl-modal__save" disabled={noteSaving}>{noteSaving ? 'Saving…' : 'Save Note'}</button>
            <button type="button" className="cl-modal__cancel" onClick={onClose}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
