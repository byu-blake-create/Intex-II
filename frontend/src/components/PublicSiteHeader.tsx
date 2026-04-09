import { Link } from 'react-router-dom'
import { useState } from 'react'
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
  const [isSigningOut, setIsSigningOut] = useState(false)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const accountLabel = user ? formatAccountLabel(user.firstName, user.lastName, user.displayName, user.email) : null
  const showAdmin = Boolean(user?.roles.includes('Admin'))
  const showDonations = Boolean(user?.roles.includes('Donor'))
  const dashboardLink = showAdmin ? { to: '/admin', label: 'Admin' } : showDonations ? { to: '/donations', label: 'Donations' } : null

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await logout()
    } finally {
      setIsSigningOut(false)
    }
  }

  return (
    <header className="home-nav">
      <div className="home-nav__inner">
        <Link className="home-brand" to="/">
          <img src="/logo.png" alt="" className="home-brand__mark" aria-hidden="true" />
          <span>
            <strong>North Star Shelter</strong>
            <small>Safety-led care and measurable impact</small>
          </span>
        </Link>

        <nav className="home-nav__links" aria-label="Primary">
          <Link to="/">Home</Link>
          <Link to="/impact">Impact</Link>
          <Link to="/contact">Contact</Link>
          {dashboardLink ? <Link to={dashboardLink.to}>{dashboardLink.label}</Link> : null}
          <Link to="/donate">Donate</Link>
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
              <span className="home-nav__account-email">{accountLabel}</span>
              <button
                type="button"
                className="home-nav__logout"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          ) : (
            <Link className="home-nav__cta" to="/login">
              Sign In
            </Link>
          )}
        </div>
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
