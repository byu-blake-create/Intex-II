import { useEffect, useState } from 'react'
import { AuthContext, type AuthUser } from './auth'
import { apiPost, apiUrl } from '../lib/api'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(apiUrl('/api/auth/me'), { credentials: 'include' })
      .then(response => (response.ok ? response.json() : null))
      .then(data => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  async function login(email: string, password: string) {
    const data = await apiPost<AuthUser>('/api/auth/login', { email, password })
    setUser(data)
    return data
  }

  async function register(email: string, password: string, firstName: string, lastName: string) {
    const data = await apiPost<AuthUser>('/api/auth/register', { email, password, firstName, lastName })
    setUser(data)
    return data
  }

  async function logout() {
    await fetch(apiUrl('/api/auth/logout'), { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
