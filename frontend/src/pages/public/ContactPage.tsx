import { Link } from 'react-router-dom'
import PublicSiteFooter from '../../components/PublicSiteFooter'
import PublicSiteHeader from '../../components/PublicSiteHeader'
import { usePublicTheme } from '../../lib/usePublicTheme'
import './HomePage.css'
import './ContactPage.css'

const contactChannels = [
  {
    label: 'General Inquiries',
    value: 'info@northstarshelter.org',
    href: 'mailto:info@northstarshelter.org',
    description: 'Questions about our programs, services, or how to get involved with our work.',
    icon: <EnvelopeIcon />,
  },
  {
    label: 'Donations & Giving',
    value: 'giving@northstarshelter.org',
    href: 'mailto:giving@northstarshelter.org',
    description: 'Learn about ways to support our mission financially or through volunteer contributions.',
    icon: <HeartIcon />,
  },
  {
    label: 'Privacy & Data',
    value: 'privacy@northstarshelter.org',
    href: 'mailto:privacy@northstarshelter.org',
    description: 'Questions about how we handle your personal information or consent preferences.',
    icon: <ShieldIcon />,
  },
]

const socials = [
  { label: 'Instagram', icon: <InstagramIcon /> },
  { label: 'Facebook', icon: <FacebookIcon /> },
  { label: 'LinkedIn', icon: <LinkedInIcon /> },
  { label: 'YouTube', icon: <YouTubeIcon /> },
]

export default function ContactPage() {
  const { theme, setTheme } = usePublicTheme()

  return (
    <div className="public-site contact-site" data-theme={theme}>
      <PublicSiteHeader theme={theme} setTheme={setTheme} />

      <main className="contact-page">

        {/* Hero */}
        <header className="contact-hero">
          <p className="contact-hero__eyebrow">North Star Shelter</p>
          <h1>Get in touch</h1>
          <p className="contact-hero__sub">
            We're here to answer questions, connect volunteers, and welcome supporters.
            Reach out through any of the channels below.
          </p>
        </header>

        {/* Contact cards */}
        <section className="contact-channels" aria-label="Contact options">
          {contactChannels.map(ch => (
            <article key={ch.label} className="contact-card">
              <div className="contact-card__icon" aria-hidden="true">{ch.icon}</div>
              <p className="contact-card__label">{ch.label}</p>
              <a className="contact-card__value" href={ch.href}>{ch.value}</a>
              <p className="contact-card__desc">{ch.description}</p>
            </article>
          ))}
        </section>

        {/* Social */}
        <section className="contact-social" aria-labelledby="contact-social-label">
          <p className="contact-social__eyebrow" id="contact-social-label">Follow our work</p>
          <h2>Stay connected</h2>
          <p className="contact-social__copy">
            Follow us on social media for updates on our programs, events, and community impact.
          </p>
          <div className="contact-social__icons" aria-label="Social channels">
            {socials.map(s => (
              <a
                key={s.label}
                className="contact-social__icon-link"
                href="#"
                aria-label={s.label}
                title={s.label}
                onClick={e => e.preventDefault()}
              >
                {s.icon}
              </a>
            ))}
          </div>
        </section>

        {/* Safety note */}
        <section className="contact-safety">
          <SafetyIcon />
          <p>
            For the safety of our residents, we do not list a physical address publicly.
            If you or someone you know needs immediate shelter assistance, please contact
            our general line at the address above.
          </p>
        </section>

        {/* Breadcrumb back */}
        <div className="contact-back">
          <Link to="/" className="contact-back__link">← Back to home</Link>
        </div>

      </main>

      <PublicSiteFooter />
    </div>
  )
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="3" />
      <path d="M2 8l10 6 10-6" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 21C12 21 3 14.5 3 8.5a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 6-9 12.5-9 12.5Z" />
    </svg>
  )
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M12 2L4 6v6c0 5 3.8 9.3 8 10.5C16.2 21.3 20 17 20 12V6l-8-4Z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  )
}

function SafetyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M13.2 20v-6.2h2.3l.3-2.6h-2.6V9.5c0-.8.2-1.3 1.4-1.3H16V5.8c-.2 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.3v2.2H9v2.6h2.1V20h2.1Z" fill="currentColor" />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6.4 8.3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM5.1 18.8V9.7h2.6v9.1H5.1Zm4.3 0V9.7h2.5V11c.4-.8 1.4-1.5 2.9-1.5 3.1 0 3.6 2 3.6 4.7v4.6h-2.6v-4.1c0-1-.1-2.3-1.7-2.3s-2 1.1-2 2.2v4.2H9.4Z" fill="currentColor" />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M21.2 8.4a3 3 0 0 0-2.1-2.1C17.2 5.8 12 5.8 12 5.8s-5.2 0-7.1.5A3 3 0 0 0 2.8 8.4c-.5 1.9-.5 3.6-.5 3.6s0 1.7.5 3.6a3 3 0 0 0 2.1 2.1c1.9.5 7.1.5 7.1.5s5.2 0 7.1-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-3.6.5-3.6s0-1.7-.5-3.6ZM10.3 15.5v-7l6 3.5-6 3.5Z" fill="currentColor" />
    </svg>
  )
}
