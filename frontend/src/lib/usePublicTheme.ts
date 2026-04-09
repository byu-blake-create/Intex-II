import { useEffect, useState } from 'react'

export type PublicTheme = 'light' | 'dark'

const THEME_COOKIE_NAME = 'nss_theme_pref'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365

export function usePublicTheme() {
  const [theme, setTheme] = useState<PublicTheme>(() => {
    return getThemePreference()
  })

  useEffect(() => {
    setThemePreference(theme)
  }, [theme])

  return { theme, setTheme }
}

function getThemePreference(): PublicTheme {
  if (typeof document === 'undefined') return 'light'
  const raw = readCookie(THEME_COOKIE_NAME)
  return raw === 'dark' ? 'dark' : 'light'
}

function setThemePreference(theme: PublicTheme) {
  if (typeof document === 'undefined') return
  document.cookie = `${THEME_COOKIE_NAME}=${encodeURIComponent(theme)}; Max-Age=${ONE_YEAR_SECONDS}; Path=/; SameSite=Lax`
}

function readCookie(name: string) {
  if (typeof document === 'undefined') return null

  const encoded = `${encodeURIComponent(name)}=`
  const parts = document.cookie ? document.cookie.split(';') : []
  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed.startsWith(encoded)) continue
    return decodeURIComponent(trimmed.slice(encoded.length))
  }

  return null
}
