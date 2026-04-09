import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
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
  const [menuOpen, setMenuOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  const accountLabel = user
    ? formatAccountLabel(user.firstName, user.lastName, user.displayName, user.email)
    : null
  const showAdmin = Boolean(user?.roles.includes('Admin'))
  const showDonations = Boolean(user?.roles.includes('Donor'))
  const dashboardLink = showAdmin
    ? { to: '/admin', label: 'Admin' }
    : showDonations
      ? { to: '/donations', label: 'Donations' }
      : null

  // Close on Escape
  useEffect(() => {
    if (!menuOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [menuOpen])

  // inert attribute keeps closed panel items out of tab order
  useEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    if (menuOpen) {
      panel.removeAttribute('inert')
    } else {
      panel.setAttribute('inert', '')
    }
  }, [menuOpen])

  async function handleSignOut() {
    if (isSigningOut) return
    setIsSigningOut(true)
    try {
      await logout()
    } finally {
      setIsSigningOut(false)
      setMenuOpen(false)
    }
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  const themeToggle = (
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
  )

  return (
    <header className="home-nav">
      <div className="home-nav__inner">
        <Link
          className="home-brand"
          to="/"
          aria-label="North Star Shelter — home"
          onClick={closeMenu}
        >
          <img src="/logo.png" alt="" aria-hidden="true" className="home-brand__mark" />
          <span className="home-brand__text" aria-hidden="true">
            <strong>North Star Shelter</strong>
            <small>Safety-led care and measurable impact</small>
          </span>
        </Link>

        {/* Desktop nav links */}
        <nav className="home-nav__links" aria-label="Primary navigation">
          <Link to="/">Home</Link>
          <Link to="/impact">Impact</Link>
          <Link to="/contact">Contact</Link>
          {dashboardLink ? <Link to={dashboardLink.to}>{dashboardLink.label}</Link> : null}
          <Link to="/donate">Donate</Link>
        </nav>

        {/* Desktop actions */}
        <div className="home-nav__actions">
          {themeToggle}
          {user ? (
            <div className="home-nav__account">
              <span className="home-nav__account-email">{accountLabel}</span>
              <button
                type="button"
                className="home-nav__logout"
                onClick={() => void handleSignOut()}
                disabled={isSigningOut}
              >
                {isSigningOut ? 'Signing out…' : 'Sign Out'}
              </button>
            </div>
          ) : (
            <Link className="home-nav__cta" to="/login">
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile: theme toggle + hamburger (hidden on desktop) */}
        <div className="home-nav__mobile-controls">
          {themeToggle}
          <button
            type="button"
            className="home-nav__hamburger"
            aria-expanded={menuOpen}
            aria-controls="home-mobile-nav"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen(v => !v)}
          >
            <span
              className={`home-nav__hamburger-bars${menuOpen ? ' is-open' : ''}`}
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile navigation panel */}
      <div
        id="home-mobile-nav"
        ref={panelRef}
        className={`home-nav__mobile-panel${menuOpen ? ' is-open' : ''}`}
        aria-hidden={!menuOpen}
      >
        <nav aria-label="Mobile navigation">
          <Link to="/" onClick={closeMenu}>Home</Link>
          <Link to="/impact" onClick={closeMenu}>Impact</Link>
          <Link to="/contact" onClick={closeMenu}>Contact</Link>
          {dashboardLink ? (
            <Link to={dashboardLink.to} onClick={closeMenu}>{dashboardLink.label}</Link>
          ) : null}
          <Link to="/donate" onClick={closeMenu}>Donate</Link>
          <div className="home-nav__mobile-divider" role="separator" aria-hidden="true" />
          {user ? (
            <button
              type="button"
              className="home-nav__mobile-auth"
              onClick={() => void handleSignOut()}
              disabled={isSigningOut}
            >
              {isSigningOut ? 'Signing out…' : 'Sign Out'}
            </button>
          ) : (
            <Link to="/login" className="home-nav__mobile-auth" onClick={closeMenu}>
              Sign In
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}

function formatAccountLabel(
  firstName: string,
  lastName: string,
  displayName: string,
  email: string,
) {
  const trimmedFirstName = firstName.trim()
  const trimmedLastName = lastName.trim()
  if (trimmedFirstName || trimmedLastName) {
    return `${trimmedFirstName} ${trimmedLastName}`.trim()
  }
  return displayName.trim() || email
}
