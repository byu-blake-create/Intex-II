export const CONSENT_COOKIE = 'nss_cookie_consent'
export const CONSENT_EVENT = 'nss:cookie-consent'
const CONSENT_SESSION_KEY = 'nss_cookie_consent_session'
/** Mirrors choice in localStorage so consent survives new tabs / deploy (sessionStorage is tab-scoped). */
const CONSENT_LOCAL_KEY = 'nss_cookie_consent_choice'
const CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 365

const ANALYTICS_SCRIPT_ID = 'nss-analytics-script'
const ANALYTICS_BOOTSTRAP_ID = 'nss-analytics-bootstrap'
const OPTIONAL_ANALYTICS_COOKIE_PREFIXES = ['_ga', '_gid', '_gat']

export type ConsentDecision = 'accepted' | 'declined'
export type ConsentEventDetail = {
  decision: ConsentDecision | null
  forceOpen?: boolean
}

function expireCookie(name: string, domain?: string) {
  const domainAttr = domain ? `; Domain=${domain}` : ''
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${domainAttr}${secure}`
}

function deleteCookieEverywhere(name: string) {
  expireCookie(name)

  const hostname = window.location.hostname
  const parts = hostname.split('.')
  for (let i = 0; i < parts.length - 1; i += 1) {
    expireCookie(name, parts.slice(i).join('.'))
    expireCookie(name, `.${parts.slice(i).join('.')}`)
  }
}

function getAnalyticsId(): string | undefined {
  const id = import.meta.env.VITE_ANALYTICS_ID as string | undefined
  return id?.trim() || undefined
}

function getAnalyticsDisableKey(id: string): string {
  return `ga-disable-${id}`
}

function setAnalyticsDisabled(disabled: boolean) {
  const id = getAnalyticsId()
  if (!id) return
  const windowWithFlags = window as unknown as Record<string, unknown>
  windowWithFlags[getAnalyticsDisableKey(id)] = disabled
}

function removeAnalyticsScript(id: string) {
  document.getElementById(id)?.remove()
}

function clearAnalyticsGlobals() {
  const analyticsWindow = window as unknown as {
    dataLayer?: unknown[]
    gtag?: unknown
    [key: string]: unknown
  }

  analyticsWindow.dataLayer = []
  delete analyticsWindow.gtag
}

function notifyConsentChanged(detail: ConsentEventDetail) {
  window.dispatchEvent(
    new CustomEvent<ConsentEventDetail>(CONSENT_EVENT, { detail, bubbles: true }),
  )
}

function readConsentCookie(): ConsentDecision | null {
  if (typeof document === 'undefined') return null
  const prefix = `${CONSENT_COOKIE}=`
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(prefix)) continue
    const raw = trimmed.slice(prefix.length)
    let value: string
    try {
      value = decodeURIComponent(raw)
    } catch {
      value = raw
    }
    if (value === 'accepted' || value === 'declined') return value
  }
  return null
}

/** Write consent to sessionStorage, localStorage, and a first-party cookie (privacy list + deploy reliability). */
function persistConsentStores(decision: ConsentDecision) {
  window.sessionStorage.setItem(CONSENT_SESSION_KEY, decision)
  window.localStorage.setItem(CONSENT_LOCAL_KEY, decision)
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(decision)}; Path=/; Max-Age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax${secure}`
}

function clearConsentStores() {
  window.sessionStorage.removeItem(CONSENT_SESSION_KEY)
  window.localStorage.removeItem(CONSENT_LOCAL_KEY)
  deleteCookieEverywhere(CONSENT_COOKIE)
}

export function getConsentDecision(): ConsentDecision | null {
  const session = window.sessionStorage.getItem(CONSENT_SESSION_KEY)
  if (session === 'accepted' || session === 'declined') return session

  const local = window.localStorage.getItem(CONSENT_LOCAL_KEY)
  if (local === 'accepted' || local === 'declined') return local

  const fromCookie = readConsentCookie()
  if (fromCookie) {
    // One-time-style sync so older deployments that only set the cookie still work everywhere.
    window.localStorage.setItem(CONSENT_LOCAL_KEY, fromCookie)
    window.sessionStorage.setItem(CONSENT_SESSION_KEY, fromCookie)
    return fromCookie
  }

  return null
}

export function areOptionalAnalyticsConfigured(): boolean {
  return Boolean(getAnalyticsId())
}

export function clearOptionalAnalyticsCookies() {
  const cookieNames = document.cookie
    .split(';')
    .map(cookie => cookie.trim().split('=')[0])
    .filter(Boolean)

  const optionalNames = new Set(
    cookieNames.filter(name =>
      OPTIONAL_ANALYTICS_COOKIE_PREFIXES.some(prefix => name === prefix || name.startsWith(`${prefix}_`)),
    ),
  )

  for (const name of optionalNames) {
    deleteCookieEverywhere(name)
  }
}

export function loadAnalyticsIfConfigured(): boolean {
  const id = getAnalyticsId()
  if (!id) return false

  setAnalyticsDisabled(false)

  if (!document.getElementById(ANALYTICS_SCRIPT_ID)) {
    const script = document.createElement('script')
    script.id = ANALYTICS_SCRIPT_ID
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
    document.head.appendChild(script)
  }

  if (!document.getElementById(ANALYTICS_BOOTSTRAP_ID)) {
    const bootstrap = document.createElement('script')
    bootstrap.id = ANALYTICS_BOOTSTRAP_ID
    bootstrap.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${id.replace(/'/g, "\\'")}', { anonymize_ip: true });
    `
    document.head.appendChild(bootstrap)
  }

  return true
}

export function syncOptionalAnalytics() {
  if (getConsentDecision() === 'accepted') {
    loadAnalyticsIfConfigured()
    return
  }

  setAnalyticsDisabled(true)
  removeAnalyticsScript(ANALYTICS_SCRIPT_ID)
  removeAnalyticsScript(ANALYTICS_BOOTSTRAP_ID)
  clearAnalyticsGlobals()
  clearOptionalAnalyticsCookies()
}

export function setConsentDecision(decision: ConsentDecision) {
  persistConsentStores(decision)

  if (decision === 'accepted') {
    loadAnalyticsIfConfigured()
  } else {
    setAnalyticsDisabled(true)
    removeAnalyticsScript(ANALYTICS_SCRIPT_ID)
    removeAnalyticsScript(ANALYTICS_BOOTSTRAP_ID)
    clearAnalyticsGlobals()
    clearOptionalAnalyticsCookies()
  }

  notifyConsentChanged({ decision })
}

export function openConsentPreferences() {
  notifyConsentChanged({ decision: getConsentDecision(), forceOpen: true })
}

export function resetConsentDecision() {
  clearConsentStores()
  setAnalyticsDisabled(true)
  removeAnalyticsScript(ANALYTICS_SCRIPT_ID)
  removeAnalyticsScript(ANALYTICS_BOOTSTRAP_ID)
  clearAnalyticsGlobals()
  clearOptionalAnalyticsCookies()
  notifyConsentChanged({ decision: null })
}
