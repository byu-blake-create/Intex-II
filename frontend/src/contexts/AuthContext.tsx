import { useEffect, useState } from 'react'
import { AuthContext, type AuthUser } from './auth'

const API = import.meta.env.VITE_API_BASE_URL ?? ''
const USE_MOCK = import.meta.env.VITE_MOCK === 'true'
const IS_DEV = import.meta.env.DEV
const MOCK_AUTH_STORAGE_KEY = 'mock-auth-user'
const SESSION_AUTH_STORAGE_KEY = 'session-auth-user'
const DEV_TEST_DONOR = {
  email: 'demo.donor@northstarshelter.org',
  password: 'TestDonor123!',
  user: { email: 'demo.donor@northstarshelter.org', roles: ['Donor'] as string[] },
}
const MOCK_USERS: Record<string, { password: string; user: AuthUser }> = {
  'admin@northstarshelter.org': {
    password: 'NorthStarAdmin123',
    user: { email: 'admin@northstarshelter.org', roles: ['Admin', 'Staff'] },
  },
  'donor@northstarshelter.org': {
    password: 'NorthStarDonor123',
    user: { email: 'donor@northstarshelter.org', roles: ['Donor'] },
  },
}

function readMockUser(): AuthUser | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(MOCK_AUTH_STORAGE_KEY)
    return raw ? JSON.parse(raw) as AuthUser : null
  } catch {
    return null
  }
}

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
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (initialSessionUser) return initialSessionUser
    return USE_MOCK ? readMockUser() : null
  })
  const [loading, setLoading] = useState(!USE_MOCK && !initialSessionUser)

  useEffect(() => {
    if (USE_MOCK) return
    if (initialSessionUser) return
    // Restore an existing cookie session when the app first loads.
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
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
    const normalizedEmail = email.trim().toLowerCase()

    // Dev-only donor fallback so donations page can be tested without backend auth.
    if (IS_DEV && normalizedEmail === DEV_TEST_DONOR.email && password === DEV_TEST_DONOR.password) {
      setUser(DEV_TEST_DONOR.user)
      window.localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(DEV_TEST_DONOR.user))
      writeSessionUser(DEV_TEST_DONOR.user)
      return
    }

    if (USE_MOCK) {
      const entry = MOCK_USERS[normalizedEmail]
      if (!entry || entry.password !== password) throw new Error('Invalid credentials')
      setUser(entry.user)
      window.localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(entry.user))
      writeSessionUser(entry.user)
      return
    }
    const r = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (!r.ok) throw new Error('Invalid credentials')
    const data = await r.json()
    setUser(data)
    writeSessionUser(data as AuthUser)
  }

  async function logout() {
    if (USE_MOCK) {
      setUser(null)
      window.localStorage.removeItem(MOCK_AUTH_STORAGE_KEY)
      writeSessionUser(null)
      return
    }
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
    writeSessionUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
