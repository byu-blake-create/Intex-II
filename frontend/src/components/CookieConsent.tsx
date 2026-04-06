import { useCallback, useEffect, useState } from 'react'
import './CookieConsent.css'

const CONSENT_COOKIE = 'nss_cookie_consent'
const ONE_YEAR = 60 * 60 * 24 * 365

function readConsent(): boolean {
  return document.cookie.split(';').some(c => c.trim().startsWith(`${CONSENT_COOKIE}=accepted`))
}

/** Loads optional analytics only after explicit consent (set VITE_ANALYTICS_ID). */
function loadAnalyticsIfConfigured() {
  const id = import.meta.env.VITE_ANALYTICS_ID as string | undefined
  if (!id) return
  const s1 = document.createElement('script')
  s1.async = true
  s1.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.appendChild(s1)
  const s2 = document.createElement('script')
  s2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${id.replace(/'/g, "\\'")}', { anonymize_ip: true });
  `
  document.head.appendChild(s2)
}

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    setVisible(!readConsent())
    if (readConsent() && import.meta.env.VITE_ANALYTICS_ID) loadAnalyticsIfConfigured()
  }, [])

  const accept = useCallback(() => {
    document.cookie = `${CONSENT_COOKIE}=accepted; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`
    setVisible(false)
    if (import.meta.env.VITE_ANALYTICS_ID) loadAnalyticsIfConfigured()
  }, [])

  const decline = useCallback(() => {
    document.cookie = `${CONSENT_COOKIE}=declined; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div className="cookie-consent" role="dialog" aria-labelledby="cookie-consent-title">
      <div className="cookie-consent__inner">
        <h2 id="cookie-consent-title">Cookies &amp; analytics</h2>
        <p>
          We use essential cookies for sign-in. With your consent we may load privacy-friendly analytics to understand how
          our public pages are used. You can change your mind anytime by clearing site cookies. See our{' '}
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
