import { useEffect, useState } from 'react'
import PublicSiteHeader from '../../components/PublicSiteHeader'
import {
  buildImpactDashboardModel,
  formatImpactMonth,
  formatImpactNumber,
} from '../../lib/publicImpact'
import { fetchPublishedSnapshots } from '../../lib/snapshotsApi'
import { usePublicTheme } from '../../lib/usePublicTheme'
import type { PublicImpactSnapshot } from '../../types/domain'
import './HomePage.css'

const services = [
  {
    title: 'Safe shelter and daily care',
    description:
      'A stable home with trained caregivers, protection, routine, nourishment, and the dignity of being cared for well.',
  },
  {
    title: 'Rehabilitation and counseling',
    description:
      'Trauma-informed support that helps each resident rebuild trust, confidence, and emotional stability.',
  },
  {
    title: 'Education and reintegration',
    description:
      'Restored futures through education, life preparation, family coordination, and safe reintegration into society.',
  },
  {
    title: 'Health and wellbeing',
    description:
      'Holistic care spanning physical, psychological, and social wellbeing so recovery addresses the whole person.',
  },
]

export default function HomePage() {
  const { theme, setTheme } = usePublicTheme()
  const [snapshots, setSnapshots] = useState<PublicImpactSnapshot[]>([])
  const [impactLoading, setImpactLoading] = useState(true)
  const [impactError, setImpactError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetchPublishedSnapshots(1, 50)
      .then(result => {
        if (!cancelled) {
          setSnapshots(result.items)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setImpactError('The public impact dashboard is temporarily unavailable.')
        }
      })
      .finally(() => {
        if (!cancelled) {
          setImpactLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  const impactDashboard = buildImpactDashboardModel(snapshots)
  const latestMetrics = impactDashboard?.latest.metrics
  const previousMetrics = impactDashboard?.previous?.metrics
  const previousMonthLabel = impactDashboard?.previous
    ? formatImpactMonth(previousMetrics?.month ?? impactDashboard.previous.snapshot.snapshotDate)
    : null
  const healthDelta =
    latestMetrics?.avgHealthScore != null && previousMetrics?.avgHealthScore != null
      ? latestMetrics.avgHealthScore - previousMetrics.avgHealthScore
      : null
  const educationDelta =
    latestMetrics?.avgEducationProgress != null && previousMetrics?.avgEducationProgress != null
      ? latestMetrics.avgEducationProgress - previousMetrics.avgEducationProgress
      : null
  const donationDelta =
    latestMetrics?.donationsTotalForMonth != null && previousMetrics?.donationsTotalForMonth != null
      ? latestMetrics.donationsTotalForMonth - previousMetrics.donationsTotalForMonth
      : null

  return (
    <div className="public-site home-page" data-theme={theme}>
      <PublicSiteHeader theme={theme} setTheme={setTheme} />

      <main id="top">
        <section className="hero-section">
          <img
            className="hero-bg"
            src="/GirlSunsetExtended.png"
            alt=""
            aria-hidden="true"
          />
          <div className="hero-overlay" />
          <div className="hero-copy">
            <p className="eyebrow">North Star Shelter</p>
            <h1>Providing safety, healing, and hope to girls in need.</h1>
            <p className="hero-lede">
              Helping survivors of abuse and trafficking heal and rebuild a brighter future.
            </p>

            <div className="hero-actions">
              <a className="button button--primary" href="/donate">
                Donate Now
              </a>
              <a className="button button--ghost" href="#impact-dashboard">
                See Our Impact
              </a>
            </div>
          </div>
        </section>

        <section className="impact-dashboard-section" id="impact-dashboard">
          <div className="impact-dashboard-section__header">
            <p className="eyebrow">Impact dashboard</p>
            <h2>How your support is changing lives.</h2>
            {!impactLoading && !impactError && impactDashboard && (
              <p className="impact-dashboard-section__subtitle">
                {impactDashboard.latest.snapshot.headline ?? 'Public impact update'}
              </p>
            )}
          </div>

          {impactLoading && (
            <div className="impact-dashboard-section__status">
              Loading the latest impact data&hellip;
            </div>
          )}

          {!impactLoading && impactError && (
            <div className="impact-dashboard-section__status impact-dashboard-section__status--error">
              {impactError}
            </div>
          )}

          {!impactLoading && !impactError && impactDashboard && (
            <div className="impact-dashboard">
              <div className="impact-dashboard__kpis">
                <article className="impact-kpi-card">
                  <p className="impact-kpi-card__label">Active residents</p>
                  <strong>{formatImpactNumber(latestMetrics?.totalResidents ?? 0)}</strong>
                </article>

                <article className="impact-kpi-card">
                  <p className="impact-kpi-card__label">Wellbeing score</p>
                  <strong>{formatImpactNumber(latestMetrics?.avgHealthScore ?? 0, 2)} / 5</strong>
                  <p className="impact-kpi-card__delta">
                    {healthDelta == null || !previousMonthLabel
                      ? '\u00A0'
                      : `${healthDelta >= 0 ? '+' : ''}${formatImpactNumber(healthDelta, 2)} vs ${previousMonthLabel}`}
                  </p>
                </article>

                <article className="impact-kpi-card">
                  <p className="impact-kpi-card__label">Education progress</p>
                  <strong>{formatImpactNumber(latestMetrics?.avgEducationProgress ?? 0, 1)}%</strong>
                  <p className="impact-kpi-card__delta">
                    {educationDelta == null || !previousMonthLabel
                      ? '\u00A0'
                      : `${educationDelta >= 0 ? '+' : ''}${formatImpactNumber(educationDelta, 1)} pts vs ${previousMonthLabel}`}
                  </p>
                </article>

                <article className="impact-kpi-card">
                  <p className="impact-kpi-card__label">Funded this month</p>
                  <strong>{formatImpactNumber(latestMetrics?.donationsTotalForMonth ?? 0)}</strong>
                  <p className="impact-kpi-card__delta">
                    {donationDelta == null || !previousMonthLabel
                      ? '\u00A0'
                      : `${donationDelta >= 0 ? '+' : ''}${formatImpactNumber(donationDelta, 0)} vs ${previousMonthLabel}`}
                  </p>
                </article>
              </div>

              <div className="impact-dashboard__highlights">
                <article className="impact-highlight">
                  <p className="impact-kpi-card__label">Education improvement</p>
                  <strong>
                    {impactDashboard.educationDelta == null
                      ? 'Tracking'
                      : `${impactDashboard.educationDelta >= 0 ? '+' : ''}${formatImpactNumber(impactDashboard.educationDelta, 1)} pts`}
                  </strong>
                </article>
                <article className="impact-highlight">
                  <p className="impact-kpi-card__label">Total raised recently</p>
                  <strong>{formatImpactNumber(impactDashboard.sixMonthDonations)}</strong>
                </article>
                <article className="impact-highlight">
                  <p className="impact-kpi-card__label">Support per resident</p>
                  <strong>
                    {impactDashboard.supportPerResident == null
                      ? 'N/A'
                      : formatImpactNumber(impactDashboard.supportPerResident)}
                  </strong>
                </article>
              </div>

              <div className="impact-trend-panel">
                <div className="impact-trend-panel__copy">
                  <p className="impact-kpi-card__label">Six-month snapshot</p>
                  <h3>Monthly Progress</h3>
                </div>

                <div className="impact-trend-grid">
                  {impactDashboard.trend.map(point => (
                    <article className="impact-trend-card" key={point.id}>
                      <div className="impact-trend-card__header">
                        <p>{point.label}</p>
                        <strong>{formatImpactNumber(point.educationProgress, 1)}%</strong>
                      </div>

                      <div
                        className="impact-trend-card__meter"
                        aria-label={`Education progress for ${point.label}`}
                      >
                        <span style={{ width: `${Math.max(0, Math.min(point.educationProgress, 100))}%` }} />
                      </div>
                      <p className="impact-trend-card__caption">
                        Education-plan completion average for the month.
                      </p>

                      <dl className="impact-trend-card__stats">
                        <div>
                          <dt>Health</dt>
                          <dd>{formatImpactNumber(point.healthScore, 2)} / 5</dd>
                        </div>
                        <div>
                          <dt>Residents</dt>
                          <dd>{formatImpactNumber(point.residents)}</dd>
                        </div>
                        <div>
                          <dt>Funding</dt>
                          <dd>{formatImpactNumber(point.donations)}</dd>
                        </div>
                      </dl>
                    </article>
                  ))}
                </div>
              </div>

              <div className="impact-dashboard__footer">
                <a className="button button--ghost" href="/impact">
                  View full impact history
                </a>
              </div>
            </div>
          )}

          {!impactLoading && !impactError && !impactDashboard && (
            <div className="impact-dashboard-section__status">
              No published impact data yet. Check back after the next reporting cycle.
            </div>
          )}
        </section>

        <section className="systems-section" id="services">
          <div className="systems-section__body">
            <div className="systems-section__image">
              <img src="/Girl-Sunlight.jpg" alt="A young woman silhouetted against golden sunlight" />
            </div>

            <div className="systems-section__content">
              <div className="systems-section__heading">
                <p className="eyebrow">Where your support goes</p>
                <h2>Every donation directly funds protection, restoration, and a future beyond crisis.</h2>
              </div>

              <div className="systems-grid">
                {services.map((item, i) => (
                  <article className="system-card" key={item.title} data-accent={i}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div>
            <p className="eyebrow">Stand with survivors</p>
            <h2>Your donation provides safety, healing, and new beginnings.</h2>
          </div>
          <div className="cta-section__actions">
            <a className="button button--primary" href="/donate">
              Donate Now
            </a>
            <a className="button button--ghost" href="#impact-dashboard">
              See our impact
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
