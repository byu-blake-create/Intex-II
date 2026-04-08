import { useState } from 'react'
import { useAuth } from '../../contexts/auth'
import { submitPublicDonation } from '../../lib/donationsApi'
import PublicSiteHeader from '../../components/PublicSiteHeader'
import { usePublicTheme } from '../../lib/usePublicTheme'
import './HomePage.css'
import './DonatePage.css'

const presetAmounts = [25, 50, 100, 250, 500]

export default function DonatePage() {
  const { theme, setTheme } = usePublicTheme()
  const { user } = useAuth()

  const [selectedPreset, setSelectedPreset] = useState<number | null>(50)
  const [customAmount, setCustomAmount] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [success, setSuccess] = useState<{ donationId: number; hasExistingAccount: boolean } | null>(null)

  const effectiveAmount = selectedPreset ?? (parseFloat(customAmount) || 0)

  function handlePreset(amount: number) {
    setSelectedPreset(amount)
    setCustomAmount('')
  }

  function handleCustomChange(value: string) {
    setCustomAmount(value)
    setSelectedPreset(null)
  }

  function handleDonateClick(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (effectiveAmount <= 0) {
      setError('Please select or enter a donation amount.')
      return
    }

    if (!user) {
      setShowConfirm(true)
      return
    }

    submitDonation()
  }

  async function submitDonation() {
    setShowConfirm(false)
    setSubmitting(true)
    setError(null)

    try {
      const result = await submitPublicDonation({
        amount: effectiveAmount,
        email: user?.email,
        firstName: user?.firstName,
        lastName: user?.lastName,
      })
      setSuccess(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="public-site donate-page" data-theme={theme}>
      <PublicSiteHeader theme={theme} setTheme={setTheme} />

      <main className="donate-page__main">
        {!success ? (
          <form className="donate-card" onSubmit={handleDonateClick}>
            <div className="donate-card__header">
              <p className="donate-card__eyebrow">Make a difference</p>
              <h1>Your gift changes lives.</h1>
              <p className="donate-card__subtitle">
                Every donation directly funds safety, healing, and education for girls
                recovering from abuse and trafficking.
              </p>
            </div>

            <div className="donate-card__section">
              <label className="donate-card__label">Select an amount</label>
              <div className="donate-amounts">
                {presetAmounts.map(amt => (
                  <button
                    type="button"
                    key={amt}
                    className={`donate-amount-btn ${selectedPreset === amt ? 'donate-amount-btn--active' : ''}`}
                    onClick={() => handlePreset(amt)}
                  >
                    ${amt}
                  </button>
                ))}
                <div className="donate-amount-custom">
                  <span className="donate-amount-custom__symbol">$</span>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="Other"
                    value={customAmount}
                    onChange={e => handleCustomChange(e.target.value)}
                    className={`donate-amount-custom__input ${selectedPreset === null && customAmount ? 'donate-amount-custom__input--active' : ''}`}
                  />
                </div>
              </div>
            </div>

            {error && <p className="donate-card__error">{error}</p>}

            <button
              type="submit"
              className="button button--primary donate-submit"
              disabled={submitting || effectiveAmount <= 0}
            >
              {submitting
                ? 'Processing...'
                : `Donate $${effectiveAmount.toLocaleString()}`}
            </button>

            {!user && (
              <p className="donate-card__login-hint">
                <a href="/login">Sign in or create an account</a> to track your donations
                and see your impact over time.
              </p>
            )}

            {user && (
              <p className="donate-card__logged-in">
                Donating as <strong>{user.displayName || user.email}</strong>
              </p>
            )}
          </form>
        ) : (
          <div className="donate-card donate-success">
            <div className="donate-success__icon">&#10003;</div>
            <h1>Thank you for your generosity!</h1>
            <p className="donate-success__amount">
              Your donation of <strong>${effectiveAmount.toLocaleString()}</strong> has been recorded.
            </p>
            <p className="donate-success__message">
              Your support directly provides safety, counseling, education, and hope
              to girls in need. Every dollar makes a difference.
            </p>

            {!user && (
              <div className="donate-success__cta">
                <p>Create a free account to track your donations and see your impact over time.</p>
                <a className="button button--primary" href="/login">
                  Create Account
                </a>
              </div>
            )}

            {user && (
              <div className="donate-success__cta">
                <a className="button button--primary" href="/donations">
                  View My Donations
                </a>
              </div>
            )}

            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setSuccess(null)
                setCustomAmount('')
                setSelectedPreset(50)
              }}
            >
              Make Another Donation
            </button>
          </div>
        )}

        {showConfirm && (
          <div className="donate-modal-backdrop" onClick={() => setShowConfirm(false)}>
            <div className="donate-modal" onClick={e => e.stopPropagation()}>
              <h2>Want to track your donation?</h2>
              <p>
                With an account you can view your giving history, see your personal
                impact, and receive updates about the girls you're helping.
              </p>
              <div className="donate-modal__actions">
                <a className="button button--primary" href="/login">
                  Log in first
                </a>
                <button
                  type="button"
                  className="button button--ghost"
                  onClick={submitDonation}
                >
                  Donate without an account
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
