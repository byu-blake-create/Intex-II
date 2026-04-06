import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
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
      navigate('/staff')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '4rem 1.25rem 5rem' }}>
      <p style={{ marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.14em', fontSize: '0.78rem' }}>
        Staff access
      </p>
      <h1 style={{ marginBottom: '1rem' }}>Sign in to the North Star Shelter staff workspace</h1>
      <p style={{ marginBottom: '2rem', lineHeight: 1.7 }}>
        Staff and admin share the same internal workspace. This is a temporary local sign-in flow
        until Supabase is connected.
      </p>

      <div
        style={{
          marginBottom: '1.5rem',
          padding: '1rem 1.1rem',
          borderRadius: '18px',
          border: '1px solid rgba(82, 60, 47, 0.14)',
          background: 'rgba(255, 250, 244, 0.9)',
        }}
      >
        <p style={{ marginBottom: '0.5rem', fontWeight: 700, color: '#221813' }}>Temporary shared staff login</p>
        <p style={{ marginBottom: '0.35rem', fontFamily: 'monospace' }}>Email: staff@northstarshelter.org</p>
        <p style={{ margin: 0, fontFamily: 'monospace' }}>Password: NorthStarStaff123</p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{
          display: 'grid',
          gap: '1rem',
          padding: '1.5rem',
          borderRadius: '24px',
          background: 'rgba(255, 250, 244, 0.72)',
          border: '1px solid rgba(82, 60, 47, 0.14)',
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
              border: '1px solid rgba(82, 60, 47, 0.16)',
              background: '#fffdf9',
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
              border: '1px solid rgba(82, 60, 47, 0.16)',
              background: '#fffdf9',
            }}
          />
        </label>

        {error && (
          <p role="alert" style={{ margin: 0, color: '#9f2f1f' }}>
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
            background: '#221813',
            color: '#fff9f5',
            fontWeight: 700,
            cursor: submitting ? 'progress' : 'pointer',
            opacity: submitting ? 0.78 : 1,
          }}
        >
          {submitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </main>
  )
}
