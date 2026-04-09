import PublicSiteFooter from '../../components/PublicSiteFooter'
import PublicSiteHeader from '../../components/PublicSiteHeader'
import { usePublicTheme } from '../../lib/usePublicTheme'
import './HomePage.css'
import './ImpactPage.css'

const storyMilestones = [
  {
    title: 'The first night',
    copy:
      'She arrived exhausted, guarded, and unsure whether any room could feel safe. What mattered most in that first hour was not a speech. It was a locked door, a warm meal, clean clothes, and adults who did not ask her to earn care.',
  },
  {
    title: 'The slow return',
    copy:
      'In the weeks that followed, trust came back in fragments. A longer answer. A steadier breath. The courage to sleep through the night. Counseling, routine, and patient care helped her begin to imagine a life that was not defined by what had happened to her.',
  },
  {
    title: 'The future opening',
    copy:
      'Now she talks about school again. She laughs more easily. She has favorite songs, favorite snacks, and plans for what comes next. Healing is not instant, but hope has become something she can hold with both hands.',
  },
]

const supportMoments = [
  {
    label: 'Safety',
    value: '24/7',
    detail: 'Supervised shelter, daily care, and consistent protection.',
  },
  {
    label: 'Care',
    value: '1:1',
    detail: 'Trauma-informed counseling and individualized case support.',
  },
  {
    label: 'Future',
    value: 'New start',
    detail: 'Education, stability, and a path back toward possibility.',
  },
]

export default function ImpactPage() {
  const { theme, setTheme } = usePublicTheme()

  return (
    <div className="public-site impact-story-page" data-theme={theme}>
      <PublicSiteHeader theme={theme} setTheme={setTheme} />

      <main className="impact-story-page__main">
        <div className="impact-story">
          <section className="impact-story__hero">
            <div className="impact-story__hero-copy">
              <p className="eyebrow">A story of restoration</p>
              <h1>She arrived carrying fear. She is learning how to carry hope.</h1>
              <p className="impact-story__lede">
                To protect privacy, this page shares a representative story inspired by
                the kind of healing journeys North Star Shelter helps make possible every day.
              </p>

              <div className="impact-story__hero-actions">
                <a className="button button--primary" href="/donate">
                  Help write the next chapter
                </a>
                <a className="button button--ghost" href="#story-journey">
                  Read her story
                </a>
              </div>
            </div>

            <div className="impact-story__hero-visual">
              <div className="impact-story__image-frame">
                <img
                  src="/Girl-Sunlight.jpg"
                  alt="A young woman standing in warm sunlight"
                />
              </div>

              <aside className="impact-story__quote-card">
                <p>
                  “For the first time in a long time, she is beginning to believe
                  that tomorrow could be gentle.”
                </p>
                <span>North Star Shelter care team</span>
              </aside>
            </div>
          </section>

          <section className="impact-story__panel impact-story__panel--intro">
            <div>
              <p className="eyebrow">What changed</p>
              <h2>This is what your support looks like when it becomes personal.</h2>
            </div>
            <p>
              Behind every donation is a room prepared before she arrives, a counselor
              ready to listen, a school plan waiting to be rebuilt, and a future that
              no longer feels impossibly far away.
            </p>
          </section>

          <section className="impact-story__journey" id="story-journey">
            {storyMilestones.map((milestone, index) => (
              <article key={milestone.title} className="impact-story__chapter">
                <span className="impact-story__chapter-index">0{index + 1}</span>
                <div>
                  <h3>{milestone.title}</h3>
                  <p>{milestone.copy}</p>
                </div>
              </article>
            ))}
          </section>

          <section className="impact-story__support">
            <div className="impact-story__support-copy">
              <p className="eyebrow">What your gift makes possible</p>
              <h2>Healing is built from steady, tangible acts of care.</h2>
              <p>
                Donations do not disappear into abstraction here. They become meals,
                medicine, school supplies, counseling sessions, transportation, safe
                shelter, and the kind of consistency that helps a young life begin
                again with dignity.
              </p>
            </div>

            <div className="impact-story__support-grid">
              {supportMoments.map(item => (
                <article key={item.label} className="impact-story__support-card">
                  <p>{item.label}</p>
                  <strong>{item.value}</strong>
                  <span>{item.detail}</span>
                </article>
              ))}
            </div>
          </section>

          <section className="impact-story__panel impact-story__panel--closing">
            <div>
              <p className="eyebrow">Stand with her</p>
              <h2>Every safer night, every calmer breath, every new beginning starts with someone choosing to care.</h2>
            </div>
            <div className="impact-story__closing-actions">
              <a className="button button--primary" href="/donate">
                Donate now
              </a>
              <p>
                Your support helps more girls move from crisis toward safety,
                restoration, and a future they can imagine for themselves.
              </p>
            </div>
          </section>
        </div>
      </main>

      <PublicSiteFooter />
    </div>
  )
}
