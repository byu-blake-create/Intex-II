import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import PublicSiteFooter from '../../components/PublicSiteFooter'
import PublicSiteHeader from '../../components/PublicSiteHeader'
import { useAuth } from '../../contexts/auth'
import { apiPost } from '../../lib/api'
import { usePublicTheme } from '../../lib/usePublicTheme'
import './HomePage.css'

type MfaSetupPayload = { sharedKey: string; authenticatorUri: string }

type MfaConfirmPayload = { recoveryCodes: string[]; user: unknown }

export default function AccountSecurityPage() {
  const { user, refreshUser } = useAuth()
  const { theme, setTheme } = usePublicTheme()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [setup, setSetup] = useState<MfaSetupPayload | null>(null)
  const [confirmCode, setConfirmCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [disablePassword, setDisablePassword] = useState('')

  async function handleStartSetup() {
    setError('')
    setBusy(true)
    setRecoveryCodes(null)
    try {
      const data = await apiPost<MfaSetupPayload>('/api/auth/mfa/setup', {})
      setSetup(data)
      setConfirmCode('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start authenticator setup.')
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmSetup(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await apiPost<MfaConfirmPayload>('/api/auth/mfa/confirm', { code: confirmCode })
      setRecoveryCodes(data.recoveryCodes)
      setSetup(null)
      setConfirmCode('')
      await refreshUser()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That code was not accepted.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDisable(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await apiPost('/api/auth/mfa/disable', { password: disablePassword || null })
      setDisablePassword('')
      await refreshUser()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not turn off MFA.')
    } finally {
      setBusy(false)
    }
  }

  const mfaOn = user?.twoFactorEnabled ?? false

  return (
    <div className="public-site" data-theme={theme}>
      <PublicSiteHeader theme={theme} setTheme={setTheme} />

      <main
        style={{
          width: 'min(720px, 100%)',
          margin: '0 auto',
          padding: '42px 24px 48px',
        }}
      >
        <p
          style={{
            margin: 0,
            color: 'var(--page-accent-deep)',
            textTransform: 'uppercase',
            letterSpacing: '0.16em',
            fontSize: '0.78rem',
            fontWeight: 800,
          }}
        >
          Account security
        </p>
        <h1 style={{ margin: '0.35rem 0 0.75rem' }}>Authenticator app (TOTP)</h1>
        <p style={{ margin: '0 0 1.25rem', lineHeight: 1.75 }}>
          Add a second step after your password using an app such as Microsoft Authenticator or Google
          Authenticator. Sign-in with Google is unchanged. For grading, leave at least one admin and one
          non-admin account without MFA enabled.
        </p>

        {error && (
          <p role="alert" style={{ color: 'var(--page-accent)', margin: '0 0 1rem' }}>
            {error}
          </p>
        )}

        {recoveryCodes && recoveryCodes.length > 0 && (
          <div
            style={{
              marginBottom: '1.5rem',
              padding: '1rem 1.15rem',
              borderRadius: '16px',
              border: '1px solid var(--page-line)',
              background: 'var(--page-panel)',
            }}
          >
            <p style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Save these recovery codes</p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', lineHeight: 1.6 }}>
              Each code works once if you lose your authenticator device. We cannot show them again.
            </p>
            <ul style={{ margin: 0, paddingLeft: '1.2rem', fontFamily: 'ui-monospace, monospace' }}>
              {recoveryCodes.map(c => (
                <li key={c}>{c}</li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => setRecoveryCodes(null)}
              style={{
                marginTop: '1rem',
                padding: '0.55rem 1rem',
                borderRadius: '999px',
                border: '1px solid var(--page-auth-border)',
                background: 'transparent',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Done
            </button>
          </div>
        )}

        {!mfaOn && !setup && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleStartSetup()}
            style={{
              padding: '0.85rem 1.2rem',
              borderRadius: '999px',
              border: 'none',
              background: 'var(--page-cta-bg)',
              color: 'var(--page-cta-ink)',
              fontWeight: 700,
              cursor: busy ? 'wait' : 'pointer',
            }}
          >
            Set up authenticator
          </button>
        )}

        {setup && (
          <form onSubmit={handleConfirmSetup} style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
            <p style={{ margin: 0, lineHeight: 1.7 }}>
              Scan this setup link on your phone or enter the key manually in your authenticator app.
            </p>
            <p style={{ margin: 0, fontFamily: 'ui-monospace, monospace', wordBreak: 'break-all' }}>
              {setup.sharedKey}
            </p>
            <a href={setup.authenticatorUri} style={{ fontWeight: 600 }}>
              Open in authenticator (otpauth link)
            </a>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>6-digit code</span>
              <input
                value={confirmCode}
                onChange={e => setConfirmCode(e.target.value)}
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                style={{ padding: '0.65rem 0.85rem', borderRadius: '12px', border: '1px solid var(--page-line)' }}
              />
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={busy}
                style={{
                  padding: '0.75rem 1.1rem',
                  borderRadius: '999px',
                  border: 'none',
                  background: 'var(--page-cta-bg)',
                  color: 'var(--page-cta-ink)',
                  fontWeight: 700,
                  cursor: busy ? 'wait' : 'pointer',
                }}
              >
                Confirm and enable
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setSetup(null)
                  setConfirmCode('')
                  setError('')
                }}
                style={{
                  padding: '0.75rem 1.1rem',
                  borderRadius: '999px',
                  border: '1px solid var(--page-auth-border)',
                  background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {mfaOn && (
          <form onSubmit={handleDisable} style={{ marginTop: '2rem', display: 'grid', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Turn off authenticator</h2>
            <p style={{ margin: 0, lineHeight: 1.65, fontSize: '0.95rem' }}>
              If your account has a password, enter it below. If you only use Google sign-in, leave the field
              blank.
            </p>
            <label style={{ display: 'grid', gap: '0.35rem' }}>
              <span>Current password (if any)</span>
              <input
                type="password"
                value={disablePassword}
                onChange={e => setDisablePassword(e.target.value)}
                autoComplete="current-password"
                style={{ padding: '0.65rem 0.85rem', borderRadius: '12px', border: '1px solid var(--page-line)' }}
              />
            </label>
            <button
              type="submit"
              disabled={busy}
              style={{
                justifySelf: 'start',
                padding: '0.75rem 1.1rem',
                borderRadius: '999px',
                border: '1px solid var(--page-accent)',
                background: 'transparent',
                color: 'var(--page-accent)',
                fontWeight: 700,
                cursor: busy ? 'wait' : 'pointer',
              }}
            >
              Disable authenticator MFA
            </button>
          </form>
        )}

        <p style={{ marginTop: '2rem' }}>
          <Link to="/">← Back to home</Link>
        </p>
      </main>
      <PublicSiteFooter />
    </div>
  )
}
