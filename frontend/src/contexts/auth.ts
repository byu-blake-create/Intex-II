import { createContext, useContext } from 'react'

export interface AuthUser {
  email: string
  displayName: string
  firstName: string
  lastName: string
  supporterId?: number | null
  roles: string[]
  /** True when TOTP authenticator MFA is enabled for password sign-in. */
  twoFactorEnabled: boolean
}

export type LoginResult = { requiresTwoFactor: true } | AuthUser

export interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  completeTwoFactorLogin: (input: {
    authenticatorCode?: string
    recoveryCode?: string
  }) => Promise<AuthUser>
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<AuthUser>
  /** Reloads the signed-in user from `/api/auth/me` (e.g. after MFA enrollment changes). */
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextType | null>(null)

/** Normalizes `/api/auth/me` and login JSON (handles older sessionStorage without twoFactorEnabled). */
export function normalizeAuthUser(data: unknown): AuthUser | null {
  if (!data || typeof data !== 'object') return null
  const u = data as Partial<AuthUser>
  if (typeof u.email !== 'string' || !Array.isArray(u.roles)) return null
  return {
    email: u.email,
    displayName: typeof u.displayName === 'string' ? u.displayName : '',
    firstName: typeof u.firstName === 'string' ? u.firstName : '',
    lastName: typeof u.lastName === 'string' ? u.lastName : '',
    supporterId: u.supporterId,
    roles: u.roles.filter((r): r is string => typeof r === 'string'),
    twoFactorEnabled: Boolean(u.twoFactorEnabled),
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
