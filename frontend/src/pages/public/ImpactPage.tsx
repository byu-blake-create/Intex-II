import { useEffect, useState } from 'react'
import PublicSiteFooter from '../../components/PublicSiteFooter'
import PublicSiteHeader from '../../components/PublicSiteHeader'
import { fetchPublishedSnapshots } from '../../lib/snapshotsApi'
import { usePublicTheme } from '../../lib/usePublicTheme'
import type { PublicImpactSnapshot } from '../../types/domain'
import './ImpactPage.css'

export default function ImpactPage() {
  const { theme, setTheme } = usePublicTheme()
  const [items, setItems] = useState<PublicImpactSnapshot[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPublishedSnapshots(1, 50)
      .then(r => setItems(r.items))
      .catch(() => setError('Impact stories are temporarily unavailable.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="public-site impact-site" data-theme={theme}>
      <PublicSiteHeader theme={theme} setTheme={setTheme} />
      <main className="impact-page">
        <header className="impact-page__header">
          <h1>Our impact</h1>
          <p>Published highlights from North Star Shelter&apos;s public impact snapshots.</p>
        </header>
        {loading && <p>Loading…</p>}
        {error && <p className="impact-page__error">{error}</p>}
        <div className="impact-page__grid">
          {items.map(s => (
            <article key={s.snapshotId} className="impact-card">
              <p className="impact-card__date">
                {s.snapshotDate ?? s.publishedAt?.slice(0, 10) ?? '—'}
              </p>
              <h2>{s.headline ?? 'Update'}</h2>
              <p>{s.summaryText}</p>
            </article>
          ))}
        </div>
      </main>
      <PublicSiteFooter />
    </div>
  )
}
