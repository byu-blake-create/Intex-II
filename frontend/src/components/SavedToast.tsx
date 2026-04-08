import { useEffect } from 'react'
import './SavedToast.css'

type Props = {
  message: string | null
  onDismiss: () => void
  durationMs?: number
}

export default function SavedToast({ message, onDismiss, durationMs = 2200 }: Props) {
  useEffect(() => {
    if (!message) return

    const timeoutId = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(timeoutId)
  }, [durationMs, message, onDismiss])

  if (!message) return null

  return (
    <div className="saved-toast" role="status" aria-live="polite">
      {message}
    </div>
  )
}
