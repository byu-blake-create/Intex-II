import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth'
import { usePublicTheme } from '../../lib/usePublicTheme'
import type { AuthUser } from '../../contexts/auth'
import './HomePage.css'

export default function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const { theme } = usePublicTheme()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function destinationFor(user: AuthUser) {
    if (user.roles.includes('Staff') || user.roles.includes('Admin')) return '/staff'
    if (user.roles.includes('Donor')) return '/donations'
    return '/'
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      if (mode === 'register') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match.')
        }

        const user = await register(email, password, firstName, lastName)
        navigate(destinationFor(user))
      } else {
        const user = await login(email, password)
        navigate(destinationFor(user))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="public-site login-page" data-theme={theme}>
      <Link
        to="/"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.45rem',
          position: 'fixed',
          top: '1.25rem',
          left: '1.25rem',
          color: 'var(--page-ink)',
          textDecoration: 'none',
          fontWeight: 700,
          padding: '0.7rem 1rem',
          borderRadius: '999px',
          border: '1px solid var(--page-auth-border)',
          background: 'var(--page-auth-bg)',
          boxShadow: 'var(--page-shadow)',
          backdropFilter: 'blur(12px)',
          zIndex: 10,
        }}
      >
        <span aria-hidden="true">←</span>
        Back to home
      </Link>

      <main
        style={{
          maxWidth: 1040,
          margin: '0 auto',
          padding: '4.5rem 1.25rem 5rem',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.05fr) minmax(320px, 0.95fr)',
            gap: '1.5rem',
            alignItems: 'start',
          }}
        >
          <section className="login-page__feature-card">
            <p
              style={{
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '0.14em',
                fontSize: '0.78rem',
                color: 'var(--page-accent-deep)',
                fontWeight: 800,
              }}
            >
              Account access
            </p>
            <h1 style={{ margin: 0 }}>
              {mode === 'register'
                ? 'Create your North Star Shelter donor account'
                : 'Sign in with your North Star Shelter account'}
            </h1>
            <p style={{ margin: 0, lineHeight: 1.8 }}>
              {mode === 'register'
                ? 'New accounts are created in the live database and automatically receive the donor role.'
                : 'This sign-in now uses the production database account store. Staff and admin users unlock the staff workspace after authentication.'}
            </p>

            <div
              style={{
                padding: '1rem 1.1rem',
                borderRadius: '18px',
                border: '1px solid var(--page-chip-border)',
                background: 'var(--page-card-bg)',
                display: 'grid',
                gap: '0.5rem',
              }}
            >
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--page-ink)' }}>
                What changed
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Accounts now live in the real SQL-backed identity store. Donor accounts are linked
                to supporter records so their personal donation history can load after sign-in.
              </p>
            </div>
          </section>

          <section className="login-page__main-card">
            <div
              style={{
                display: 'inline-flex',
                gap: '0.5rem',
                padding: '0.35rem',
                borderRadius: '999px',
                background: 'var(--page-auth-bg)',
                border: '1px solid var(--page-auth-border)',
                width: 'fit-content',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setMode('login')
                  setError('')
                }}
                style={{
                  padding: '0.55rem 0.95rem',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'login' ? 'var(--page-cta-bg)' : 'transparent',
                  color: mode === 'login' ? 'var(--page-cta-ink)' : 'var(--page-ink)',
                  fontWeight: 700,
                }}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register')
                  setError('')
                }}
                style={{
                  padding: '0.55rem 0.95rem',
                  borderRadius: '999px',
                  border: 'none',
                  cursor: 'pointer',
                  background: mode === 'register' ? 'var(--page-cta-bg)' : 'transparent',
                  color: mode === 'register' ? 'var(--page-cta-ink)' : 'var(--page-ink)',
                  fontWeight: 700,
                }}
              >
                Register
              </button>
            </div>

            <div style={{ display: 'grid', gap: '0.35rem' }}>
              <p
                style={{
                  margin: 0,
                  textTransform: 'uppercase',
                  letterSpacing: '0.14em',
                  fontSize: '0.76rem',
                  color: 'var(--page-accent-deep)',
                  fontWeight: 800,
                }}
              >
                {mode === 'register' ? 'Register' : 'Sign In'}
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                {mode === 'register'
                  ? 'Create a donor account with your name, email, and a password of at least 10 characters.'
                  : 'Enter the email and password for your North Star Shelter account.'}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: 'grid',
                gap: '1rem',
              }}
            >
              {mode === 'register' && (
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                  <label style={{ display: 'grid', gap: '0.45rem', textAlign: 'left' }}>
                    <span>First name</span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                      style={{
                        padding: '0.9rem 1rem',
                        borderRadius: '14px',
                        border: '1px solid var(--page-chip-border)',
                        background: 'var(--page-card-bg)',
                        color: 'var(--page-ink)',
                      }}
                    />
                  </label>

                  <label style={{ display: 'grid', gap: '0.45rem', textAlign: 'left' }}>
                    <span>Last name</span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      required
                      autoComplete="family-name"
                      style={{
                        padding: '0.9rem 1rem',
                        borderRadius: '14px',
                        border: '1px solid var(--page-chip-border)',
                        background: 'var(--page-card-bg)',
                        color: 'var(--page-ink)',
                      }}
                    />
                  </label>
                </div>
              )}

              <label style={{ display: 'grid', gap: '0.45rem', textAlign: 'left' }}>
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '14px',
                    border: '1px solid var(--page-chip-border)',
                    background: 'var(--page-card-bg)',
                    color: 'var(--page-ink)',
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.45rem', textAlign: 'left' }}>
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '14px',
                    border: '1px solid var(--page-chip-border)',
                    background: 'var(--page-card-bg)',
                    color: 'var(--page-ink)',
                  }}
                />
              </label>

              {mode === 'register' && (
                <label style={{ display: 'grid', gap: '0.45rem', textAlign: 'left' }}>
                  <span>Confirm password</span>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    style={{
                      padding: '0.9rem 1rem',
                      borderRadius: '14px',
                      border: '1px solid var(--page-chip-border)',
                      background: 'var(--page-card-bg)',
                      color: 'var(--page-ink)',
                    }}
                  />
                </label>
              )}

              {error && (
                <p role="alert" style={{ margin: 0, color: 'var(--page-accent)' }}>
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                style={{
                  padding: '0.95rem 1.2rem',
                  border: 'none',
                  borderRadius: '999px',
                  background: 'var(--page-cta-bg)',
                  color: 'var(--page-cta-ink)',
                  fontWeight: 700,
                  cursor: submitting ? 'progress' : 'pointer',
                  opacity: submitting ? 0.78 : 1,
                }}
              >
                {submitting
                  ? (mode === 'register' ? 'Creating account...' : 'Signing in...')
                  : (mode === 'register' ? 'Create Account' : 'Sign In')}
              </button>
            </form>
          </section>
        </div>
      </main>
    </div>
  )
}
