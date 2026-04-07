import { useEffect, useState } from 'react'

export type PublicTheme = 'light' | 'dark'

const PUBLIC_THEME_STORAGE_KEY = 'public-theme'

export function usePublicTheme() {
  const [theme, setTheme] = useState<PublicTheme>(() => {
    if (typeof window === 'undefined') return 'light'
    const storedTheme = window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY)
    return storedTheme === 'dark' || storedTheme === 'light' ? storedTheme : 'light'
  })

  useEffect(() => {
    window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, theme)
  }, [theme])

  return { theme, setTheme }
}
