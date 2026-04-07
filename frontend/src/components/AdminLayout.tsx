import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import './AdminLayout.css'

const primaryLinks = [
  { to: '/staff', label: 'Dashboard' },
  { to: '/staff/reports', label: 'Reports' },
  { to: '/staff/social', label: 'Social Suite' },
]

const workbenchLabels: Record<string, string> = {
  '/staff/donors': 'Donors',
  '/staff/caseload': 'Caseload',
  '/staff/process-recording': 'Process recording',
  '/staff/visitations': 'Visitations',
}

type AdminTheme = 'dark' | 'light'

const ADMIN_THEME_STORAGE_KEY = 'admin-theme'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const [theme, setTheme] = useState<AdminTheme>(() => {
    if (typeof window === 'undefined') return 'dark'

    const storedTheme = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark'
  })

  useEffect(() => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme)
  }, [theme])

  const workbenchLabel = workbenchLabels[pathname]

  return (
    <div className="admin-layout" data-theme={theme}>
      <header className="admin-layout__header">
        <Link to="/staff" className="admin-layout__brand" aria-label="North Star Shelter dashboard">
          <span className="admin-layout__brand-mark">N</span>
          <span className="admin-layout__brand-copy">
            <strong>North Star Shelter</strong>
            <small>Safety-led care and measurable impact</small>
          </span>
        </Link>

        <nav className="admin-layout__nav" aria-label="Staff workspace">
          {primaryLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/staff'}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-layout__actions">
          {workbenchLabel && (
            <div className="admin-layout__context">
              <span className="admin-layout__context-label">Workbench</span>
              <span className="admin-layout__context-value">{workbenchLabel}</span>
              <Link to="/staff" className="admin-layout__context-link">
                Back to dashboard
              </Link>
            </div>
          )}

          <div className="admin-layout__theme-switch" role="group" aria-label="Color theme">
            <button
              type="button"
              className={theme === 'light' ? 'is-active' : undefined}
              onClick={() => setTheme('light')}
              aria-pressed={theme === 'light'}
            >
              Light
            </button>
            <button
              type="button"
              className={theme === 'dark' ? 'is-active' : undefined}
              onClick={() => setTheme('dark')}
              aria-pressed={theme === 'dark'}
            >
              Dark
            </button>
          </div>

          <div className="admin-layout__user">
            <span className="admin-layout__email">{user?.email}</span>
            <button type="button" className="admin-layout__logout" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <div className="admin-layout__body">{children}</div>
    </div>
  )
}
