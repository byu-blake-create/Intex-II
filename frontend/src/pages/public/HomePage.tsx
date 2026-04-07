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

const carePillars = [
  {
    number: '01',
    title: 'Safety',
    description:
      'We provide immediate refuge, consistent care, and a secure environment where women and children can begin to breathe again.',
  },
  {
    number: '02',
    title: 'Healing',
    description:
      'Once someone knows they are safe, healing can begin through counseling, daily support, and compassionate rehabilitation.',
  },
  {
    number: '03',
    title: 'Justice',
    description:
      'We support each survivor as they pursue the protection, advocacy, and legal follow-up that is right for their situation.',
  },
  {
    number: '04',
    title: 'Empowerment',
    description:
      'Our goal is to help survivors move from fear and victimhood toward strength, dignity, leadership, and lasting hope.',
  },
]

const services = [
  {
    title: 'Safe shelter and daily care',
    description:
      'We create a stable home environment with trained caregivers, protection, routine, nourishment, and the dignity of being cared for well.',
  },
  {
    title: 'Rehabilitation and counseling',
    description:
      'Trauma-informed support helps each resident process what they have endured and begin rebuilding trust, confidence, and emotional stability.',
  },
  {
    title: 'Education, life skills, and reintegration',
    description:
      'We work toward restored futures through education, practical life preparation, family coordination, and reintegration into society when it is safe.',
  },
  {
    title: 'Health and wellbeing support',
    description:
      'Care includes attention to physical, biological, psychological, social, and spiritual wellbeing so healing is holistic rather than partial.',
  },
  {
    title: 'Justice and advocacy support',
    description:
      'When survivors seek justice, we stand beside them with encouragement, transportation, follow-up, and safe adult support.',
  },
  {
    title: 'Love, belonging, and community',
    description:
      'We want every resident to be seen, heard, and loved so recovery is not just clinical, but deeply human.',
  },
]

const carePathway = [
  {
    title: 'Protection and refuge',
    description:
      'Women and children in crisis need immediate safety, trusted adults, and a place where harm no longer defines the day.',
  },
  {
    title: 'Healing and restoration',
    description:
      'Recovery takes time. We provide the kind of steady support that helps survivors regain trust, health, and stability.',
  },
  {
    title: 'Growth and reintegration',
    description:
      'The long-term goal is not simply rescue, but a future marked by education, dignity, connection, and renewed possibility.',
  },
]

const principles = [
  'We treat each person like family, where they are seen, heard, and loved.',
  'We protect privacy because safety and dignity are inseparable.',
  'We measure success by restored lives, not just completed tasks.',
]

const heroPromises = [
  { value: 'Refuge', label: 'for those escaping abuse, exploitation, and unsafe conditions' },
  { value: 'Care', label: 'through shelter, healing services, education, and daily support' },
  { value: 'Hope', label: 'through justice, belonging, and a path toward reintegration' },
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
  const latestMonthLabel = impactDashboard
    ? formatImpactMonth(latestMetrics?.month ?? impactDashboard.latest.snapshot.snapshotDate)
    : null
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
          <div className="hero-copy">
            <p className="eyebrow">A sanctuary-centered mission inspired by Lighthouse Sanctuary</p>
            <h1>Protecting women and children with safety, healing, and hope.</h1>
            <p className="hero-lede">
              North Star Shelter exists to provide refuge and rehabilitation for women and children
              who have experienced abuse, exploitation, and trafficking. We offer a safe place to
              recover, trusted people to walk beside them, and a long-term path toward justice,
              restoration, and reintegration.
            </p>

            <div className="hero-actions">
              <a className="button button--primary" href="#services">
                What We Do
              </a>
              <a className="button button--ghost" href="#impact-dashboard">
                View Impact
              </a>
            </div>

            <div className="hero-notes" aria-label="Key trust signals">
              <span>Safe shelter</span>
              <span>Trauma-informed care</span>
              <span>Reintegration support</span>
            </div>
          </div>

          <div className="hero-panel" aria-hidden="true">
            <div className="signal-card">
              <div className="signal-card__halo" />
              <div className="signal-card__frame">
                <p className="signal-card__label">North Star Shelter</p>
                <h2>A safe haven where recovery can begin and a future can be rebuilt.</h2>
                <div className="signal-card__chips">
                  <span>safety</span>
                  <span>healing</span>
                  <span>justice</span>
                  <span>empowerment</span>
                  <span>family support</span>
                  <span>new beginnings</span>
                </div>
              </div>
            </div>

            <div className="hero-metrics">
              {heroPromises.map(metric => (
                <article className="metric-card" key={metric.label}>
                  <strong>{metric.value}</strong>
                  <span>{metric.label}</span>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mission-band" id="mission">
          <p className="mission-band__intro">What should never get lost</p>
          <div className="mission-band__grid">
            <blockquote>
              North Star Shelter exists to meet the needs of women and children who need a safe
              haven, professional rehabilitation services, and a meaningful chance to reenter life
              with dignity.
            </blockquote>
            <p>
              Our model is shaped by the same priorities visible in Lighthouse Sanctuary’s public
              mission: safety first, healing that is patient and holistic, justice that honors each
              survivor’s choices, and empowerment that helps people move from survival toward
              strength and belonging.
            </p>
          </div>
        </section>

        <section className="impact-dashboard-section" id="impact-dashboard">
          <div className="section-heading impact-dashboard-section__heading">
            <div>
              <p className="eyebrow">Impact dashboard</p>
              <h2>Anonymous public reporting that shows outcomes, progress, and support levels.</h2>
            </div>
            <p className="impact-dashboard-section__lede">
              This section uses published monthly snapshots only. It stays aggregated and
              anonymized so visitors can understand momentum without exposing resident-level data.
            </p>
          </div>

          {impactLoading && (
            <div className="impact-dashboard-section__status">
              Loading the latest public impact snapshot…
            </div>
          )}

          {!impactLoading && impactError && (
            <div className="impact-dashboard-section__status impact-dashboard-section__status--error">
              {impactError}
            </div>
          )}

          {!impactLoading && !impactError && impactDashboard && (
            <div className="impact-dashboard">
              <article className="impact-dashboard__spotlight">
                <p className="impact-dashboard__meta">
                  Latest meaningful snapshot
                  {latestMonthLabel ? ` · ${latestMonthLabel}` : ''}
                </p>
                <h3>{impactDashboard.latest.snapshot.headline ?? 'Public impact update'}</h3>
                <p className="impact-dashboard__summary">
                  {impactDashboard.latest.snapshot.summaryText ??
                    'Published monthly impact data for North Star Shelter.'}
                </p>
              </article>

              <div className="impact-dashboard__kpis">
                <article className="impact-kpi-card">
                  <p className="impact-kpi-card__label">Residents supported</p>
                  <strong>{formatImpactNumber(latestMetrics?.totalResidents ?? 0)}</strong>
                  <p className="impact-kpi-card__detail">
                    Active residents represented in the latest published snapshot.
                  </p>
                </article>

                <article className="impact-kpi-card">
                  <p className="impact-kpi-card__label">Average health score</p>
                  <strong>{formatImpactNumber(latestMetrics?.avgHealthScore ?? 0, 2)} / 5</strong>
                  <p className="impact-kpi-card__detail">
                    Monthly average of residents&apos; general health score on a 1 to 5 scale.
                  </p>
                  <p className="impact-kpi-card__detail impact-kpi-card__detail--secondary">
                    {healthDelta == null || !previousMonthLabel
                      ? 'No prior published comparison available.'
                      : `${healthDelta >= 0 ? '+' : ''}${formatImpactNumber(healthDelta, 2)} vs ${previousMonthLabel}`}
                  </p>
                </article>

                <article className="impact-kpi-card">
                  <p className="impact-kpi-card__label">Education progress</p>
                  <strong>{formatImpactNumber(latestMetrics?.avgEducationProgress ?? 0, 1)}%</strong>
                  <p className="impact-kpi-card__detail">
                    Average education-plan completion across residents&apos; active education records.
                  </p>
                  <p className="impact-kpi-card__detail impact-kpi-card__detail--secondary">
                    {educationDelta == null || !previousMonthLabel
                      ? 'No prior published comparison available.'
                      : `${educationDelta >= 0 ? '+' : ''}${formatImpactNumber(educationDelta, 1)} pts vs ${previousMonthLabel}`}
                  </p>
                </article>

                <article className="impact-kpi-card">
                  <p className="impact-kpi-card__label">Reported donation total</p>
                  <strong>{formatImpactNumber(latestMetrics?.donationsTotalForMonth ?? 0)}</strong>
                  <p className="impact-kpi-card__detail">
                    {donationDelta == null || !previousMonthLabel
                      ? 'Monthly funding reported in the snapshot.'
                      : `${donationDelta >= 0 ? '+' : ''}${formatImpactNumber(donationDelta, 0)} vs ${previousMonthLabel}`}
                  </p>
                </article>
              </div>

              <div className="impact-dashboard__insights">
                <article className="impact-insight-card">
                  <p className="impact-insight-card__label">Progress over the recent window</p>
                  <h3>
                    {impactDashboard.educationDelta == null
                      ? 'Tracking now'
                      : `${impactDashboard.educationDelta >= 0 ? '+' : ''}${formatImpactNumber(impactDashboard.educationDelta, 1)} pts in education progress`}
                  </h3>
                  <p>
                    The dashboard compares the latest meaningful snapshot against the oldest one in
                    the recent six-snapshot window.
                  </p>
                </article>

                <article className="impact-insight-card">
                  <p className="impact-insight-card__label">Recent support level</p>
                  <h3>{formatImpactNumber(impactDashboard.sixMonthDonations)} reported across six snapshots</h3>
                  <p>
                    Recent public updates show how much support was recorded while care outcomes
                    continued to move forward.
                  </p>
                </article>

                <article className="impact-insight-card">
                  <p className="impact-insight-card__label">Support per resident</p>
                  <h3>
                    {impactDashboard.supportPerResident == null
                      ? 'Not available'
                      : `${formatImpactNumber(impactDashboard.supportPerResident)} per active resident`}
                  </h3>
                  <p>
                    A simple anonymous funding-density signal based on the latest published
                    donation total and active resident count.
                  </p>
                </article>
              </div>

              <div className="impact-trend-panel">
                <div className="impact-trend-panel__copy">
                  <p className="impact-kpi-card__label">Six-snapshot trend</p>
                  <h3>Progress stays visible month by month.</h3>
                  <p>
                    The bar shows average education-plan completion on a 0 to 100 scale. The
                    health value is a separate 1 to 5 average from monthly wellbeing records.
                  </p>
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
                        aria-label={`Average education progress for ${point.label}`}
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

              <div className="impact-dashboard__method">
                <p className="impact-kpi-card__label">How to read this</p>
                <p>
                  Health score is the mean general health score from monthly health and wellbeing
                  records on a 1.0 to 5.0 scale. Education progress is the mean progress percent
                  from education records on a 0 to 100 scale, so the bars show how far residents
                  are on average through their current education plans.
                </p>
              </div>

              <div className="impact-dashboard__footer">
                <a className="button button--ghost" href="/impact">
                  Browse published impact updates
                </a>
              </div>
            </div>
          )}

          {!impactLoading && !impactError && !impactDashboard && (
            <div className="impact-dashboard-section__status">
              No published impact snapshots are available yet. Check back after the next public
              reporting cycle.
            </div>
          )}
        </section>

        <section className="pillars-section">
          <div className="section-heading">
            <p className="eyebrow">Care pillars</p>
            <h2>Four commitments that shape every workflow.</h2>
          </div>

          <div className="pillars-grid">
            {carePillars.map(pillar => (
              <article className="pillar-card" key={pillar.title}>
                <span className="pillar-card__number">{pillar.number}</span>
                <h3>{pillar.title}</h3>
                <p>{pillar.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="systems-section" id="services">
          <div className="section-heading">
            <p className="eyebrow">What we do</p>
            <h2>Services built around protection, restoration, and a future beyond crisis.</h2>
          </div>

          <div className="systems-grid">
            {services.map(item => (
              <article className="system-card" key={item.title}>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="pathway-section" id="pathway">
          <div className="section-heading">
            <p className="eyebrow">Our pathway of care</p>
            <h2>We aim to protect first, restore carefully, and empower for the long term.</h2>
          </div>

          <div className="pathway-list">
            {carePathway.map((step, index) => (
              <article className="pathway-step" key={step.title}>
                <span>{`0${index + 1}`}</span>
                <div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="principles-section">
          <div className="principles-copy">
            <p className="eyebrow">How we serve</p>
            <h2>Everything we offer is grounded in dignity, consistency, and love.</h2>
          </div>

          <div className="principles-list">
            {principles.map(principle => (
              <article className="principle-card" key={principle}>
                <p>{principle}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="cta-section">
          <div>
            <p className="eyebrow">Stand with survivors</p>
            <h2>North Star Shelter exists to make safety, healing, and new beginnings possible.</h2>
          </div>
          <div className="cta-section__actions">
            <a className="button button--primary" href="#services">
              Explore our services
            </a>
            <a className="button button--ghost" href="/privacy">
              Read our privacy commitment
            </a>
          </div>
        </section>
      </main>
    </div>
  )
}
