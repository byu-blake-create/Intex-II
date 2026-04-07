import { useEffect, useState } from 'react'
import { AuthContext, type AuthUser } from './auth'

const API = import.meta.env.VITE_API_BASE_URL ?? ''
const USE_MOCK = import.meta.env.VITE_MOCK === 'true'
const MOCK_AUTH_STORAGE_KEY = 'mock-auth-user'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(USE_MOCK ? readMockUser() : null)
  const [loading, setLoading] = useState(!USE_MOCK)

  useEffect(() => {
    if (USE_MOCK) return
    // Restore an existing cookie session when the app first loads.
    fetch(`${API}/api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    if (USE_MOCK) {
      const entry = MOCK_USERS[email.trim().toLowerCase()]
      if (!entry || entry.password !== password) throw new Error('Invalid credentials')
      setUser(entry.user)
      window.localStorage.setItem(MOCK_AUTH_STORAGE_KEY, JSON.stringify(entry.user))
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
  }

  async function logout() {
    if (USE_MOCK) {
      setUser(null)
      window.localStorage.removeItem(MOCK_AUTH_STORAGE_KEY)
      return
    }
    await fetch(`${API}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
