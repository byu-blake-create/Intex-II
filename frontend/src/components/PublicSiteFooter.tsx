import { Link } from 'react-router-dom'
import { openConsentPreferences } from '../lib/cookieConsent'
import './PublicSiteFooter.css'

const socials = [
  { label: 'Instagram', icon: <InstagramIcon /> },
  { label: 'Facebook', icon: <FacebookIcon /> },
  { label: 'LinkedIn', icon: <LinkedInIcon /> },
  { label: 'YouTube', icon: <YouTubeIcon /> },
]

export default function PublicSiteFooter() {
  return (
    <footer className="public-footer">
      <div className="public-footer__inner">
        <div className="public-footer__top">
          <div className="public-footer__brand">
            <img src="/logo.png" alt="" aria-hidden="true" className="public-footer__logo" />
            <div>
              <p className="public-footer__eyebrow">North Star Shelter</p>
              <h2>Safety, healing, and a path forward.</h2>
              <p className="public-footer__summary">
                We support girls rebuilding their futures through shelter, recovery care, and measurable long-term progress.
              </p>
            </div>
          </div>

          <section className="public-footer__section" aria-labelledby="footer-community">
            <p className="public-footer__section-label" id="footer-community">Community</p>
            <div className="public-footer__socials" aria-label="Social channels">
              {socials.map(social => (
                <a
                  key={social.label}
                  className="public-footer__social-link"
                  href="#"
                  aria-label={social.label}
                  title={social.label}
                  onClick={event => event.preventDefault()}
                >
                  {social.icon}
                </a>
              ))}
            </div>
            <p className="public-footer__section-copy">
              Follow our work and upcoming community updates across social channels.
            </p>
          </section>

          <section className="public-footer__section" aria-labelledby="footer-contact">
            <p className="public-footer__section-label" id="footer-contact">Contact</p>
            <a className="public-footer__text-link" href="mailto:privacy@northstarshelter.org">
              privacy@northstarshelter.org
            </a>
            <p className="public-footer__section-copy">
              Questions about privacy, consent, or data handling can be sent to our team directly.
            </p>
          </section>
        </div>

        <div className="public-footer__bottom">
          <p className="public-footer__legal">
            &copy; {new Date().getFullYear()} North Star Shelter. All rights reserved.
          </p>

          <div className="public-footer__legal-links">
            <Link className="public-footer__text-link" to="/privacy">
              Privacy statement
            </Link>
            <button type="button" className="public-footer__text-button" onClick={handleManageCookies}>
              Cookie preferences
            </button>
          </div>
        </div>
      </div>
    </footer>
  )
}

function handleManageCookies() {
  openConsentPreferences()
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
      <path
        d="M13.2 20v-6.2h2.3l.3-2.6h-2.6V9.5c0-.8.2-1.3 1.4-1.3H16V5.8c-.2 0-.9-.1-1.8-.1-1.8 0-3.1 1.1-3.1 3.3v2.2H9v2.6h2.1V20h2.1Z"
        fill="currentColor"
      />
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6.4 8.3a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3ZM5.1 18.8V9.7h2.6v9.1H5.1Zm4.3 0V9.7h2.5V11c.4-.8 1.4-1.5 2.9-1.5 3.1 0 3.6 2 3.6 4.7v4.6h-2.6v-4.1c0-1-.1-2.3-1.7-2.3s-2 1.1-2 2.2v4.2H9.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M21.2 8.4a3 3 0 0 0-2.1-2.1C17.2 5.8 12 5.8 12 5.8s-5.2 0-7.1.5A3 3 0 0 0 2.8 8.4c-.5 1.9-.5 3.6-.5 3.6s0 1.7.5 3.6a3 3 0 0 0 2.1 2.1c1.9.5 7.1.5 7.1.5s5.2 0 7.1-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-3.6.5-3.6s0-1.7-.5-3.6ZM10.3 15.5v-7l6 3.5-6 3.5Z"
        fill="currentColor"
      />
    </svg>
  )
}
