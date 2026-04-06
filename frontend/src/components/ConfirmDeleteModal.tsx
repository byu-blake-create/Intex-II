import './ConfirmDeleteModal.css'

type Props = {
  title: string
  description?: string
  onCancel: () => void
  onConfirm: () => void | Promise<void>
}

/** Pattern for delete flows: backend requires `?confirm=true`. */
export default function ConfirmDeleteModal({ title, description, onCancel, onConfirm }: Props) {
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
          <button type="button" className="confirm-delete-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="confirm-delete-ok"
            onClick={() => {
              void onConfirm()
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
