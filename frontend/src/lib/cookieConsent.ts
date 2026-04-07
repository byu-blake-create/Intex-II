export const CONSENT_COOKIE = 'nss_cookie_consent'
export const CONSENT_EVENT = 'nss:cookie-consent'

const ONE_YEAR = 60 * 60 * 24 * 365
const ANALYTICS_SCRIPT_ID = 'nss-analytics-script'
const ANALYTICS_BOOTSTRAP_ID = 'nss-analytics-bootstrap'
const OPTIONAL_ANALYTICS_COOKIE_PREFIXES = ['_ga', '_gid', '_gat']

export type ConsentDecision = 'accepted' | 'declined'

function readCookie(name: string): string | null {
  const entry = document.cookie
    .split(';')
    .map(cookie => cookie.trim())
    .find(cookie => cookie.startsWith(`${name}=`))

  return entry ? decodeURIComponent(entry.slice(name.length + 1)) : null
}

function writeCookie(name: string, value: string, maxAge: number) {
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`
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

function notifyConsentChanged(decision: ConsentDecision | null) {
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: { decision } }))
}

export function getConsentDecision(): ConsentDecision | null {
  const value = readCookie(CONSENT_COOKIE)
  if (value === 'accepted' || value === 'declined') return value
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
  clearOptionalAnalyticsCookies()
}

export function setConsentDecision(decision: ConsentDecision) {
  writeCookie(CONSENT_COOKIE, decision, ONE_YEAR)

  if (decision === 'accepted') {
    loadAnalyticsIfConfigured()
  } else {
    setAnalyticsDisabled(true)
    clearOptionalAnalyticsCookies()
  }

  notifyConsentChanged(decision)
}

export function resetConsentDecision() {
  deleteCookieEverywhere(CONSENT_COOKIE)
  setAnalyticsDisabled(true)
  clearOptionalAnalyticsCookies()
  notifyConsentChanged(null)
}
