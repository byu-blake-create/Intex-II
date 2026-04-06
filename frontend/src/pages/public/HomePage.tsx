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
  return (
    <div className="home-page">
      <header className="home-nav">
        <a className="home-brand" href="#top" aria-label="North Star Shelter home">
          <span className="home-brand__mark">N</span>
          <span>
            <strong>North Star Shelter</strong>
            <small>Safety-led care and measurable impact</small>
          </span>
        </a>

        <nav className="home-nav__links" aria-label="Primary">
          <a href="#mission">Mission</a>
          <a href="#services">Services</a>
          <a href="#pathway">Pathway</a>
          <a href="/privacy">Privacy</a>
        </nav>

        <a className="home-nav__cta" href="/login">
          Staff Sign In
        </a>
      </header>

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
              <a className="button button--ghost" href="#mission">
                Our Mission
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
