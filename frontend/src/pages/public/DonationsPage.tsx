import PublicSiteHeader from '../../components/PublicSiteHeader'
import { usePublicTheme } from '../../lib/usePublicTheme'
import './HomePage.css'

export default function DonationsPage() {
  const { theme, setTheme } = usePublicTheme()

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
          <h1 style={{ margin: 0, maxWidth: '14ch' }}>Donor tools are coming next.</h1>
          <p style={{ margin: 0, lineHeight: 1.8 }}>
            This page is now the donor destination after sign-in. We can leave it simple for the
            moment, and later turn it into the real donor experience for giving history, saved
            payment options, receipts, and campaign actions.
          </p>
        </section>
      </main>
    </div>
  )
}
