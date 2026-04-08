import { useEffect, useState } from 'react'
import { fetchMyDonations, type MyDonationsResponse } from '../../lib/donationsApi'
import PublicSiteFooter from '../../components/PublicSiteFooter'
import PublicSiteHeader from '../../components/PublicSiteHeader'
import { usePublicTheme } from '../../lib/usePublicTheme'
import './HomePage.css'
import './DonationsPage.css'

export default function DonationsPage() {
  const { theme, setTheme } = usePublicTheme()
  const [data, setData] = useState<MyDonationsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetchMyDonations()
      .then(result => {
        if (mounted) setData(result)
      })
      .catch(() => {
        if (mounted) setError('Could not load your donation history right now.')
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return (
    <div className="public-site donations-page" data-theme={theme}>
      <PublicSiteHeader theme={theme} setTheme={setTheme} />

      <main
        style={{
          width: 'min(1180px, 100%)',
          margin: '0 auto',
          padding: '42px 24px 48px',
        }}
      >
        <section
          style={{
            display: 'grid',
            gap: '1rem',
            padding: '34px',
            borderRadius: '32px',
            border: '1px solid var(--page-line)',
            background: 'var(--page-panel)',
            boxShadow: '0 18px 60px rgba(61, 36, 20, 0.08)',
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
            Donations
          </p>
          <h1 style={{ margin: 0, maxWidth: '14ch' }}>
            {data ? `Welcome back, ${data.displayName}.` : 'Your donor dashboard'}
          </h1>
          <p style={{ margin: 0, lineHeight: 1.8 }}>
            This page now pulls your donor record from the live database and shows the donations
            currently associated with your account.
          </p>
        </section>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
            marginTop: '1.25rem',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          }}
        >
          <div
            style={{
              padding: '1.2rem',
              borderRadius: '24px',
              border: '1px solid var(--page-line)',
              background: 'var(--page-panel)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--page-muted)', fontSize: '0.85rem' }}>Donation count</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '2rem', fontWeight: 800 }}>
              {data?.donationCount ?? 0}
            </p>
          </div>
          <div
            style={{
              padding: '1.2rem',
              borderRadius: '24px',
              border: '1px solid var(--page-line)',
              background: 'var(--page-panel)',
            }}
          >
            <p style={{ margin: 0, color: 'var(--page-muted)', fontSize: '0.85rem' }}>Total donated</p>
            <p style={{ margin: '0.35rem 0 0', fontSize: '2rem', fontWeight: 800 }}>
              ${data?.totalAmount.toLocaleString() ?? '0'}
            </p>
          </div>
        </section>

        <section
          style={{
            display: 'grid',
            gap: '1rem',
            marginTop: '1.25rem',
            padding: '28px',
            borderRadius: '32px',
            border: '1px solid var(--page-line)',
            background: 'var(--page-panel)',
            boxShadow: '0 18px 60px rgba(61, 36, 20, 0.08)',
          }}
        >
          <h2 style={{ margin: 0 }}>Your donation history</h2>
          {loading && <p style={{ margin: 0 }}>Loading your donations...</p>}
          {error && <p style={{ margin: 0, color: 'var(--page-accent)' }}>{error}</p>}
          {!loading && !error && data && data.donations.items.length === 0 && (
            <p style={{ margin: 0, lineHeight: 1.8 }}>
              Your account is active as a donor, but there are no donations linked yet.
            </p>
          )}
          {!loading && !error && data && data.donations.items.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '0.8rem 0.5rem' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '0.8rem 0.5rem' }}>Type</th>
                    <th style={{ textAlign: 'left', padding: '0.8rem 0.5rem' }}>Campaign</th>
                    <th style={{ textAlign: 'right', padding: '0.8rem 0.5rem' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.donations.items.map(donation => (
                    <tr key={donation.donationId}>
                      <td style={{ padding: '0.8rem 0.5rem', borderTop: '1px solid var(--page-line)' }}>
                        {donation.donationDate ?? '—'}
                      </td>
                      <td style={{ padding: '0.8rem 0.5rem', borderTop: '1px solid var(--page-line)' }}>
                        {donation.donationType}
                      </td>
                      <td style={{ padding: '0.8rem 0.5rem', borderTop: '1px solid var(--page-line)' }}>
                        {donation.campaignName ?? '—'}
                      </td>
                      <td style={{ padding: '0.8rem 0.5rem', borderTop: '1px solid var(--page-line)', textAlign: 'right' }}>
                        {donation.amount != null ? `${donation.currencyCode ?? '$'}${donation.amount.toLocaleString()}` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  )
}
