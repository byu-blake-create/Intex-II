import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PublicSiteFooter from '../../components/PublicSiteFooter'
import { useAuth } from '../../contexts/auth'
import { usePublicTheme } from '../../lib/usePublicTheme'
import { apiUrl } from '../../lib/api'
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
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function destinationFor(user: AuthUser) {
    if (user.roles.includes('Admin')) return '/admin'
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

  function handleGoogleSignIn() {
    const returnUrl = mode === 'register' ? '/donations' : '/donations'
    window.location.href = apiUrl(`/api/auth/google/login?returnUrl=${encodeURIComponent(returnUrl)}`)
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

      <main className="login-page__main">
        <div className="login-page__center">
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
                  ? 'Create a donor account with your first name, last name, email, and a password of at least 10 characters.'
                  : 'Enter the email and password for your North Star Shelter account.'}
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="login-page__form"
            >
              {mode === 'login' && (
                <>
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    style={{
                      padding: '0.95rem 1.2rem',
                      borderRadius: '999px',
                      border: '1px solid var(--page-auth-border)',
                      background: 'var(--page-card-bg)',
                      color: 'var(--page-ink)',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Continue with Google
                  </button>
                  <p style={{ margin: '0.1rem 0', color: 'var(--page-muted)', fontSize: '0.82rem' }}>
                    or sign in with email and password
                  </p>
                </>
              )}

              {mode === 'register' && (
                <div className="login-page__name-grid">
                  <label className="login-page__field">
                    <span>First name</span>
                    <input
                      type="text"
                      value={firstName}
                      onChange={e => setFirstName(e.target.value)}
                      required
                      autoComplete="given-name"
                      className="login-page__input"
                    />
                  </label>

                  <label className="login-page__field">
                    <span>Last name</span>
                    <input
                      type="text"
                      value={lastName}
                      onChange={e => setLastName(e.target.value)}
                      required
                      autoComplete="family-name"
                      className="login-page__input"
                    />
                  </label>
                </div>
              )}

              <label className="login-page__field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="login-page__input"
                />
              </label>

              <label className="login-page__field">
                <span>Password</span>
                <div className="login-page__password-wrap">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    className="login-page__input login-page__input--password"
                  />
                  <button
                    type="button"
                    className="login-page__password-toggle"
                    onClick={() => setShowPassword(v => !v)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </label>

              {mode === 'register' && (
                <label className="login-page__field">
                  <span>Confirm password</span>
                  <div className="login-page__password-wrap">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="login-page__input login-page__input--password"
                    />
                    <button
                      type="button"
                      className="login-page__password-toggle"
                      onClick={() => setShowConfirmPassword(v => !v)}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                      aria-pressed={showConfirmPassword}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
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
      <PublicSiteFooter />
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
