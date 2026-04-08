import './ConfirmDeleteModal.css'

type Props = {
  title: string
  description?: string
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  confirmLabel?: string
  cancelLabel?: string
  confirmTone?: 'danger' | 'accent'
  busy?: boolean
}

/** Shared confirmation dialog for high-impact admin actions. */
export default function ConfirmDeleteModal({
  title,
  description,
  onCancel,
  onConfirm,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  confirmTone = 'danger',
  busy = false,
}: Props) {
  return (
    <div className="confirm-delete-overlay" role="presentation" onClick={onCancel}>
      <div
        className="confirm-delete-dialog"
        role="dialog"
        aria-modal="true"
        onClick={e => e.stopPropagation()}
      >
        <h2>{title}</h2>
        {description ? <p>{description}</p> : null}
        <div className="confirm-delete-actions">
          <button type="button" className="confirm-delete-cancel" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-delete-ok${confirmTone === 'accent' ? ' confirm-delete-ok--accent' : ''}`}
            disabled={busy}
            onClick={() => {
              void onConfirm()
            }}
          >
            {busy ? 'Saving…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
