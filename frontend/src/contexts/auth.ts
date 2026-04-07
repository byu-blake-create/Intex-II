import { createContext, useContext } from 'react'

export interface AuthUser {
  email: string
  displayName: string
  firstName: string
  lastName: string
  supporterId?: number | null
  roles: string[]
}

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<AuthUser>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
