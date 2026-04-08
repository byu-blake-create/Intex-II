import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/auth'
import './AdminLayout.css'

const WORKBENCH_ROUTES = [
  { to: '/admin/donors', label: 'Donors' },
  { to: '/admin/caseload', label: 'Residents' },
  { to: '/admin/safehouses', label: 'Safehouses' },
]

const WORKBENCH_PATHS = WORKBENCH_ROUTES.map(r => r.to)

type AdminTheme = 'dark' | 'light'

const ADMIN_THEME_STORAGE_KEY = 'admin-theme'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const { user, logout } = useAuth()
  const isAdmin = user?.roles.includes('Admin') ?? false
  const [theme, setTheme] = useState<AdminTheme>(() => {
    if (typeof window === 'undefined') return 'dark'

    const storedTheme = window.localStorage.getItem(ADMIN_THEME_STORAGE_KEY)
    return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'dark'
  })

  useEffect(() => {
    window.localStorage.setItem(ADMIN_THEME_STORAGE_KEY, theme)
  }, [theme])

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
      setIsMenuOpen(false)
    }
  }, [])

  useEffect(() => {
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen, handleClickOutside])

  const isOnWorkbench = WORKBENCH_PATHS.some(p => pathname.startsWith(p))
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const primaryLinks = [
    { to: '/admin', label: 'Dashboard', end: true },
    { to: '/admin/donors', label: 'Workbenches', end: false, matchPrefix: '/admin/donors,/admin/caseload,/admin/process-recording,/admin/visitations,/admin/safehouses' },
    { to: '/admin/social', label: 'Social Suite', end: false },
    { to: '/admin/reports', label: 'Reports', end: false },
    ...(isAdmin ? [{ to: '/admin/database', label: 'Database', end: false }] : []),
  ]

  function isPrimaryLinkActive(link: { to: string; end?: boolean; matchPrefix?: string }) {
    if (link.matchPrefix) return isOnWorkbench
    if (link.end) return pathname === link.to
    return pathname === link.to || pathname.startsWith(`${link.to}/`)
  }

  return (
    <div className="admin-layout" data-theme={theme}>
      <header className="admin-layout__header" ref={headerRef} data-menu-open={isMenuOpen}>
        <Link to="/" className="admin-layout__brand">
          <img src="/logo.png" alt="" className="admin-layout__brand-mark" aria-hidden="true" />
        </Link>

        <button
          type="button"
          className="admin-layout__hamburger"
          onClick={() => setIsMenuOpen(v => !v)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
        >
          <span /><span /><span />
        </button>

        <nav className="admin-layout__nav" aria-label="Admin workspace">
          {primaryLinks.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={() => (isPrimaryLinkActive(link) ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="admin-layout__actions">
          <button
            type="button"
            className="admin-layout__theme-toggle"
            onClick={() => setTheme(nextTheme)}
            aria-label={`Switch to ${nextTheme} mode`}
            title={`Switch to ${nextTheme} mode`}
          >
            <span className="admin-layout__theme-toggle-track" aria-hidden="true">
              <span className="admin-layout__theme-toggle-stars">
                <span />
                <span />
                <span />
              </span>
              <span className="admin-layout__theme-toggle-clouds">
                <span />
                <span />
              </span>
              <span className="admin-layout__theme-toggle-thumb">
                <span className="admin-layout__theme-toggle-sun" />
                <span className="admin-layout__theme-toggle-moon" />
              </span>
            </span>
          </button>

          <div className="admin-layout__user">
            <span className="admin-layout__email">{user?.email}</span>
            <button type="button" className="admin-layout__logout" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      {isOnWorkbench && (
        <nav className="admin-layout__workbench-subnav" aria-label="Workbench">
          {WORKBENCH_ROUTES.map(link => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) => (isActive ? 'is-active' : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}

      <div className="admin-layout__body">{children}</div>
    </div>
  )
}
