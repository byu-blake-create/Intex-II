import { useEffect, useState } from 'react'
import { AuthContext, type AuthUser } from './auth'
import { apiPost, apiUrl } from '../lib/api'

const SESSION_AUTH_STORAGE_KEY = 'session-auth-user'

function readSessionUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(SESSION_AUTH_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthUser) : null
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
        setUser(data)
        writeSessionUser(data)
      })
      .catch(() => {
        setUser(null)
        writeSessionUser(null)
      })
      .finally(() => setLoading(false))
  }, [initialSessionUser])

  async function login(email: string, password: string) {
    const data = await apiPost<AuthUser>('/api/auth/login', { email, password })
    setUser(data)
    writeSessionUser(data)
    return data
  }

  async function register(email: string, password: string, firstName: string, lastName: string) {
    const data = await apiPost<AuthUser>('/api/auth/register', { email, password, firstName, lastName })
    setUser(data)
    writeSessionUser(data)
    return data
  }

  async function logout() {
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' })
    setUser(null)
    writeSessionUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
