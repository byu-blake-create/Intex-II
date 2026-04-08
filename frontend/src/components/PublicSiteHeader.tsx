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
  const accountLabel = user ? formatAccountLabel(user.firstName, user.lastName, user.displayName, user.email) : null
  const isWorkspaceUser = Boolean(user?.roles.includes('Staff') || user?.roles.includes('Admin'))

  return (
    <header className="home-nav">
      <Link className="home-brand" to="/" aria-label="North Star Shelter home">
        <img src="/logo.png" alt="" className="home-brand__mark" aria-hidden="true" />
        <span>
          <strong>North Star Shelter</strong>
          <small>Safety-led care and measurable impact</small>
        </span>
      </Link>

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

        {isWorkspaceUser ? (
          <Link className="home-nav__donate home-nav__admin" to="/admin">
            Admin
          </Link>
        ) : (
          <Link className="home-nav__donate" to="/donate">
            Donate
          </Link>
        )}

        {user ? (
          <div className="home-nav__account">
            <span className="home-nav__account-email">{accountLabel}</span>
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

function formatAccountLabel(firstName: string, lastName: string, displayName: string, email: string) {
  const trimmedFirstName = firstName.trim()
  const trimmedLastName = lastName.trim()

  if (trimmedFirstName || trimmedLastName) {
    return `${trimmedFirstName} ${trimmedLastName}`.trim()
  }

  return displayName.trim() || email
}
