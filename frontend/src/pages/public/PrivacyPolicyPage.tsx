import PublicSiteFooter from '../../components/PublicSiteFooter'
import PublicSiteHeader from '../../components/PublicSiteHeader'
import { openConsentPreferences } from '../../lib/cookieConsent'
import { usePublicTheme } from '../../lib/usePublicTheme'
import './HomePage.css'
import './PrivacyPolicyPage.css'

export default function PrivacyPolicyPage() {
  const { theme, setTheme } = usePublicTheme()

  function handleManageCookies() {
    openConsentPreferences()
  }

  return (
    <div className="public-site privacy-site" data-theme={theme}>
      <PublicSiteHeader theme={theme} setTheme={setTheme} />
      <main className="privacy-page">
        <h1>Privacy policy</h1>
        <p className="privacy-page__meta">Last updated: April 7, 2026</p>

        <section>
          <h2>Who we are</h2>
          <p>
            North Star Shelter (&quot;we&quot;, &quot;us&quot;) operates this website and related services in support of
            shelter operations, fundraising, and care coordination. For GDPR purposes we act as a data controller for
            personal data collected through this site and as a processor where we handle information strictly on behalf of
            partner agencies under contract.
          </p>
        </section>

        <section>
          <h2>What we collect</h2>
          <ul>
            <li>
              <strong>Account data:</strong> email address and authentication identifiers when staff or authorized partners
              sign in.
            </li>
            <li>
              <strong>Operational and case data:</strong> information entered into our internal systems by authorized users
              in the course of providing shelter services (this may include highly sensitive data relating to survivors).
            </li>
            <li>
              <strong>Technical data:</strong> server logs, security telemetry, and only if you consent, analytics cookies
              on public pages.
            </li>
          </ul>
        </section>

        <section>
          <h2>Cookies we use</h2>
          <p>
            This site uses a <strong>fully functional</strong> cookie consent banner (not cosmetic only): when it appears,
            you can <strong>accept</strong> or <strong>decline</strong> optional analytics cookies. Your choice is stored in
            this browser (cookie and local storage) so we can respect it on later visits. You may <strong>change your mind
            at any time</strong> using <strong>Cookie preferences</strong> in the footer or <strong>Manage Cookies</strong>{' '}
            below — the same banner reopens and a new choice replaces the previous one.
          </p>
          <div className="privacy-page__cookie-prefs privacy-page__panel">
            <p className="privacy-page__cookie-prefs-text">
              Reopen the cookie banner to accept or decline non-essential cookies again. Your updated choice is saved in
              this browser.
            </p>
            <div className="privacy-page__actions privacy-page__actions--cookie">
              <button type="button" className="privacy-page__cookie-button" onClick={handleManageCookies}>
                Manage Cookies
              </button>
            </div>
          </div>
          <ul>
            <li>
              <strong>northstar.auth:</strong> an essential HttpOnly cookie set after staff sign-in to keep authenticated
              sessions active.
            </li>
            <li>
              <strong>nss_cookie_consent:</strong> remembers whether this browser accepted or declined non-essential
              cookies.
            </li>
            <li>
              <strong>nss_theme_pref:</strong> browser-accessible preference cookie used by React to remember your selected
              light or dark mode.
            </li>
            <li>
              <strong>_ga, _ga_*, and _gid:</strong> Google Analytics cookies that are only allowed when this deployment
              is configured for analytics and you explicitly accept them.
            </li>
          </ul>
        </section>

        <section>
          <h2>Legal bases (GDPR)</h2>
          <p>We process personal data on the following bases where applicable:</p>
          <ul>
            <li>
              <strong>Legitimate interests</strong> in operating a secure website, preventing abuse, and improving
              reliability, balanced against your rights.
            </li>
            <li>
              <strong>Vital interests</strong> and safeguarding duties where necessary to protect individuals at risk.
            </li>
            <li>
              <strong>Legal obligations</strong> where we must retain or disclose information to competent authorities.
            </li>
            <li>
              <strong>Consent</strong> for non-essential cookies and optional analytics on public pages. You may withdraw
              or change consent at any time using <strong>Cookie preferences</strong> in the site footer or{' '}
              <strong>Manage Cookies</strong> on this page, which reopens the same banner so you can accept or decline
              again.
            </li>
          </ul>
        </section>

        <section>
          <h2>Children and special-category data</h2>
          <p>
            Our services may involve information about minors and survivors of abuse. Access is restricted by role, audited
            where feasible, and limited to what is necessary. We do not publish identifiable resident stories without
            appropriate authority and safeguards.
          </p>
        </section>

        <section>
          <h2>Retention</h2>
          <p>
            We retain operational records in line with organizational policy and applicable law. Security logs are kept
            only as long as needed for incident response. Analytics data derived from consented cookies is minimized and
            aggregated where possible.
          </p>
        </section>

        <section>
          <h2>International transfers</h2>
          <p>
            If personal data is processed on infrastructure outside your country, for example cloud hosting, we apply
            appropriate safeguards such as standard contractual clauses where required.
          </p>
        </section>

        <section>
          <h2>Your rights</h2>
          <p>
            Depending on your location, you may have rights to access, rectify, erase, restrict processing, object, or
            port your data, and to lodge a complaint with a supervisory authority. To exercise rights, contact us at{' '}
            <a href="mailto:privacy@northstarshelter.org">privacy@northstarshelter.org</a>. We may need to verify your
            identity before responding.
          </p>
        </section>

        <section>
          <h2>Data breach notification</h2>
          <p>
            In the event of a data breach that poses a risk to your rights and freedoms, we will notify you and the
            relevant authorities within 72 hours.
          </p>
        </section>

        <section>
          <h2>Contact</h2>
          <p>
            For privacy questions or requests, contact our privacy team at{' '}
            <a href="mailto:privacy@northstarshelter.org">privacy@northstarshelter.org</a>.
          </p>
        </section>
      </main>
      <PublicSiteFooter />
    </div>
  )
}
