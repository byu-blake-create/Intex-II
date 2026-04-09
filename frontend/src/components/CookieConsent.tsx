import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import {
  CONSENT_EVENT,
  getConsentDecision,
  isPreferencesPanelRequested,
  setConsentDecision,
  syncOptionalAnalytics,
  type ConsentEventDetail,
} from '../lib/cookieConsent'
import './CookieConsent.css'

function readConsentEventDetail(event?: Event): ConsentEventDetail | undefined {
  if (!event || typeof event !== 'object' || !('detail' in event)) return undefined
  return (event as CustomEvent<ConsentEventDetail>).detail
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(
    () => getConsentDecision() === null || isPreferencesPanelRequested(),
  )

  useEffect(() => {
    const sync = (event?: Event) => {
      const detail = readConsentEventDetail(event)
      const forceOpen = detail?.forceOpen === true
      setVisible(forceOpen || getConsentDecision() === null || isPreferencesPanelRequested())
      syncOptionalAnalytics()
    }

    sync()
    window.addEventListener(CONSENT_EVENT, sync)

    return () => {
      window.removeEventListener(CONSENT_EVENT, sync)
    }
  }, [])

  const accept = useCallback(() => {
    setConsentDecision('accepted')
    setVisible(false)
  }, [])

  const decline = useCallback(() => {
    setConsentDecision('declined')
    setVisible(false)
  }, [])

  if (!visible || typeof document === 'undefined' || !document.body) return null

  return createPortal(
    <div
      className="cookie-consent"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
    >
      <div
        className="cookie-consent__inner"
        onPointerDown={e => e.stopPropagation()}
        onClick={e => e.stopPropagation()}
      >
        <h2 id="cookie-consent-title">Cookies &amp; analytics</h2>
        <p>
          We use essential cookies for sign-in. With your consent we may load privacy-friendly analytics to understand how
          our public pages are used. If you do not choose an option, default cookie settings remain in effect while you
          continue using the site. You can update your preference anytime from the site footer or Privacy Policy page. See our{' '}
          <Link to="/privacy" className="cookie-consent__policy-link">
            Privacy Policy
          </Link>{' '}
          for details (GDPR).
        </p>
        <div className="cookie-consent__actions">
          <button
            type="button"
            className="cookie-consent__primary"
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              accept()
            }}
          >
            Accept
          </button>
          <button
            type="button"
            className="cookie-consent__secondary"
            onClick={e => {
              e.preventDefault()
              e.stopPropagation()
              decline()
            }}
          >
            Decline non-essential
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
