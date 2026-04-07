import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/auth'
import { usePublicTheme } from '../../lib/usePublicTheme'
import './HomePage.css'

const DEMO_ACCOUNTS = [
  {
    label: 'Admin access',
    role: 'Admin workspace',
    email: 'admin@northstarshelter.org',
    password: 'NorthStarAdmin123',
    note: 'Returns to home and unlocks the Admin tab.',
  },
  {
    label: 'Donor access',
    role: 'Donor portal',
    email: 'donor@northstarshelter.org',
    password: 'NorthStarDonor123',
    note: 'Returns to home and unlocks the Donations tab.',
  },
]

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const { theme } = usePublicTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    try {
      await login(email, password)
      navigate('/')
    } catch {
      setError('Invalid email or password.')
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
          <section
            className="login-page__feature-card"
          >
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
            <h1 style={{ margin: 0 }}>Sign in to continue with North Star Shelter</h1>
            <p style={{ margin: 0, lineHeight: 1.8 }}>
              Sign in returns you to the home page and unlocks the tab that matches your role.
              Admin users will see an <strong>Admin</strong> tab. Donor users will see a
              <strong> Donations</strong> tab.
            </p>

            <div
              style={{
                display: 'grid',
                gap: '0.9rem',
                marginTop: '0.25rem',
              }}
            >
              {DEMO_ACCOUNTS.map(account => (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => {
                    setEmail(account.email)
                    setPassword(account.password)
                    setError('')
                  }}
                  style={{
                    display: 'grid',
                    gap: '0.35rem',
                    textAlign: 'left',
                    padding: '1rem 1.1rem',
                    borderRadius: '20px',
                    border: '1px solid var(--page-chip-border)',
                    background: 'var(--page-card-bg)',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontWeight: 800, color: 'var(--page-ink)' }}>{account.label}</span>
                  <span style={{ color: 'var(--page-muted)', fontSize: '0.92rem' }}>{account.role}</span>
                  <span style={{ fontFamily: 'monospace', fontSize: '0.84rem', color: 'var(--page-accent-deep)' }}>
                    {account.email}
                  </span>
                  <span style={{ color: 'var(--page-muted)', fontSize: '0.84rem' }}>{account.note}</span>
                </button>
              ))}
            </div>
          </section>

          <section
            className="login-page__main-card"
          >
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
                Sign In
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Use your account credentials to unlock your role-specific experience.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              style={{
                display: 'grid',
                gap: '1rem',
              }}
            >
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
                  autoComplete="current-password"
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: '14px',
                    border: '1px solid var(--page-chip-border)',
                    background: 'var(--page-card-bg)',
                    color: 'var(--page-ink)',
                  }}
                />
              </label>

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
                {submitting ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div
              style={{
                padding: '1rem 1.1rem',
                borderRadius: '18px',
                border: '1px solid var(--page-chip-border)',
                background: 'var(--page-card-bg)',
              }}
            >
              <p style={{ marginBottom: '0.5rem', fontWeight: 700, color: 'var(--page-ink)' }}>
                How it works
              </p>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                After sign-in, the home page becomes your entry point. You will see either the
                Admin tab or the Donations tab depending on your account role.
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
