import { useEffect, useState } from 'react'
import { apiPost, apiUrl } from '../lib/api'
import { AuthContext, normalizeAuthUser, type AuthUser, type LoginResult } from './auth'

const SESSION_AUTH_STORAGE_KEY = 'session-auth-user'

function readSessionUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(SESSION_AUTH_STORAGE_KEY)
    return raw ? normalizeAuthUser(JSON.parse(raw) as unknown) : null
  } catch {
    return null
  }
}

function writeSessionUser(user: AuthUser | null) {
  if (typeof window === 'undefined') return
  if (user) {
    window.sessionStorage.setItem(SESSION_AUTH_STORAGE_KEY, JSON.stringify(user))
  } else {
    window.sessionStorage.removeItem(SESSION_AUTH_STORAGE_KEY)
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const initialSessionUser = readSessionUser()
  const [user, setUser] = useState<AuthUser | null>(initialSessionUser)
  const [loading, setLoading] = useState(!initialSessionUser)

  useEffect(() => {
    if (initialSessionUser) return

    fetch(apiUrl('/api/auth/me'), { credentials: 'include' })
      .then(response => (response.ok ? response.json() : null))
      .then(data => {
        const u = normalizeAuthUser(data)
        setUser(u)
        writeSessionUser(u)
      })
      .catch(() => {
        setUser(null)
        writeSessionUser(null)
      })
      .finally(() => setLoading(false))
  }, [initialSessionUser])

  async function login(email: string, password: string): Promise<LoginResult> {
    const response = await fetch(apiUrl('/api/auth/login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const msg =
        data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string'
          ? (data as { message: string }).message
          : `${response.status} ${response.statusText}`
      throw new Error(msg)
    }
    if (
      data &&
      typeof data === 'object' &&
      'requiresTwoFactor' in data &&
      (data as { requiresTwoFactor?: boolean }).requiresTwoFactor === true
    ) {
      return { requiresTwoFactor: true }
    }
    const parsed = normalizeAuthUser(data)
    if (!parsed) throw new Error('Invalid sign-in response.')
    setUser(parsed)
    writeSessionUser(parsed)
    setLoading(false)
    return parsed
  }

  async function completeTwoFactorLogin(input: {
    authenticatorCode?: string
    recoveryCode?: string
  }): Promise<AuthUser> {
    const recovery = (input.recoveryCode ?? '').trim()
    const body =
      recovery.length > 0
        ? { recoveryCode: recovery }
        : { authenticatorCode: (input.authenticatorCode ?? '').replace(/\s/g, '').trim() }
    const response = await fetch(apiUrl('/api/auth/login/2fa'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const msg =
        data && typeof data === 'object' && typeof (data as { message?: unknown }).message === 'string'
          ? (data as { message: string }).message
          : `${response.status} ${response.statusText}`
      throw new Error(msg)
    }
    const parsed = normalizeAuthUser(data)
    if (!parsed) throw new Error('Invalid sign-in response.')
    setUser(parsed)
    writeSessionUser(parsed)
    setLoading(false)
    return parsed
  }

  async function register(email: string, password: string, firstName: string, lastName: string) {
    const raw = await apiPost<unknown>('/api/auth/register', {
      email,
      password,
      firstName,
      lastName,
    })
    const parsed = normalizeAuthUser(raw)
    if (!parsed) throw new Error('Invalid registration response.')
    setUser(parsed)
    writeSessionUser(parsed)
    setLoading(false)
    return parsed
  }

  async function refreshUser() {
    const response = await fetch(apiUrl('/api/auth/me'), { credentials: 'include' })
    if (!response.ok) {
      setUser(null)
      writeSessionUser(null)
      return
    }
    const data: unknown = await response.json().catch(() => null)
    const u = normalizeAuthUser(data)
    setUser(u)
    writeSessionUser(u)
  }

  async function logout() {
    setUser(null)
    writeSessionUser(null)
    setLoading(false)
    try {
      await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' })
    } catch {
      // Keep client-side sign-out responsive even if network is flaky.
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        completeTwoFactorLogin,
        register,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
