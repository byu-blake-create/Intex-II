import { useCallback, useEffect, useState } from 'react'
import { CONSENT_EVENT, getConsentDecision, setConsentDecision, syncOptionalAnalytics } from '../lib/cookieConsent'
import './CookieConsent.css'

export default function CookieConsent() {
  const [visible, setVisible] = useState(() => getConsentDecision() === null)

  useEffect(() => {
    const sync = () => {
      setVisible(getConsentDecision() === null)
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
  }, [])

  const decline = useCallback(() => {
    setConsentDecision('declined')
  }, [])

  if (!visible) return null

  return (
    <div className="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent__inner">
        <h2 id="cookie-consent-title">Cookies &amp; analytics</h2>
        <p>
          We use essential cookies for sign-in. With your consent we may load privacy-friendly analytics to understand how
          our public pages are used. If you do not choose an option, default cookie settings remain in effect while you
          continue using the site. You can update your preference anytime from the Privacy Policy page. See our{' '}
          <a href="/privacy">Privacy Policy</a> for details (GDPR).
        </p>
        <div className="cookie-consent__actions">
          <button type="button" className="cookie-consent__primary" onClick={accept}>
            Accept
          </button>
          <button type="button" className="cookie-consent__secondary" onClick={decline}>
            Decline non-essential
          </button>
        </div>
      </div>
    </div>
  )
}
