import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/auth'
import type { PublicTheme } from '../lib/usePublicTheme'

export default function PublicSiteHeader({
  theme,
  setTheme,
}: {
  theme: PublicTheme
  setTheme: (theme: PublicTheme) => void
}) {
  const { user, logout } = useAuth()
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const hasAdminAccess = Boolean(user && (user.roles.includes('Staff') || user.roles.includes('Admin')))
  const roleLink = hasAdminAccess
    ? { label: 'Admin', to: '/admin' }
    : user?.roles.includes('Donor')
      ? { label: 'Donations', to: '/donations' }
      : null

  return (
    <header className="home-nav">
      <Link className="home-brand" to="/" aria-label="North Star Shelter home">
        <img src="/logo.png" alt="" className="home-brand__mark" aria-hidden="true" />
        <span>
          <strong>North Star Shelter</strong>
          <small>Safety-led care and measurable impact</small>
        </span>
      </Link>

      <nav className="home-nav__links" aria-label="Primary">
        <Link to={{ pathname: '/', hash: '#impact-dashboard' }}>Impact</Link>
        <Link to={{ pathname: '/', hash: '#services' }}>What We Do</Link>
        <Link to="/privacy">Privacy</Link>
        {roleLink && (
          <Link to={roleLink.to}>{roleLink.label}</Link>
        )}
      </nav>

      <div className="home-nav__actions">
        <button
          type="button"
          className="home-nav__theme-toggle"
          onClick={() => setTheme(nextTheme)}
          aria-label={`Switch to ${nextTheme} mode`}
          title={`Switch to ${nextTheme} mode`}
        >
          <span className="home-nav__theme-toggle-track" aria-hidden="true">
            <span className="home-nav__theme-toggle-stars">
              <span />
              <span />
              <span />
            </span>
            <span className="home-nav__theme-toggle-clouds">
              <span />
              <span />
            </span>
            <span className="home-nav__theme-toggle-thumb">
              <span className="home-nav__theme-toggle-sun" />
              <span className="home-nav__theme-toggle-moon" />
            </span>
          </span>
        </button>

        {user ? (
          <div className="home-nav__account">
            <span className="home-nav__account-email">{user.email}</span>
            <button type="button" className="home-nav__logout" onClick={() => void logout()}>
              Sign Out
            </button>
          </div>
        ) : (
          <Link className="home-nav__cta" to="/login">
            Sign In
          </Link>
        )}
      </div>
    </header>
  )
}
