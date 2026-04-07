import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchResidents } from '../../lib/residentsApi'
import { fetchVisitations } from '../../lib/visitationsApi'
import { fetchAdminDashboard, type AdminDashboardCard } from '../../lib/adminDashboardApi'
import type { Resident, HomeVisitation } from '../../types/domain'
import './VisitationsPage.css'

function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="badge badge--gray">Unknown</span>
  return status.toLowerCase() === 'active'
    ? <span className="badge badge--green">Active</span>
    : <span className="badge badge--gray">{status}</span>
}

function visitTypeBadge(t: string | null | undefined) {
  if (!t) return null
  const lower = t.toLowerCase()
  if (lower.includes('home')) return <span className="badge badge--blue">{t}</span>
  if (lower.includes('follow')) return <span className="badge badge--green">{t}</span>
  if (lower.includes('initial')) return <span className="badge badge--purple">{t}</span>
  return <span className="badge badge--blue">{t}</span>
}

function outcomeBadge(o: string | null | undefined) {
  if (!o) return null
  const lower = o.toLowerCase()
  if (lower === 'positive') return <span className="badge badge--green">{o}</span>
  if (lower === 'concern') return <span className="badge badge--red">{o}</span>
  return <span className="badge badge--gray">{o}</span>
}

export default function VisitationsPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Resident | null>(null)
  const [visits, setVisits] = useState<HomeVisitation[]>([])
  const [visitsLoading, setVisitsLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [reintCard, setReintCard] = useState<AdminDashboardCard | null>(null)

  useEffect(() => {
    fetchResidents({ pageSize: 200 })
      .then(r => setResidents(r.items))
      .catch(() => {})
      .finally(() => setListLoading(false))
    fetchAdminDashboard().then(d => {
      setReintCard(d.cards.find(c => c.id === 'reintegration-ready') ?? null)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!selected) { setVisits([]); return }
    setVisitsLoading(true)
    fetchVisitations(selected.residentId)
      .then(r => setVisits(r.items))
      .catch(() => setVisits([]))
      .finally(() => setVisitsLoading(false))
  }, [selected])

  const filtered = search
    ? residents.filter(r => r.caseControlNo.toLowerCase().includes(search.toLowerCase()))
    : residents

  return (
    <AdminLayout>
      <div className="vs-layout">
        <div className="vs-sidebar">
          <div className="vs-sidebar__header">
            <input className="vs-search" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="vs-list">
            {listLoading && <div className="inline-loading">Loading...</div>}
            {!listLoading && filtered.length === 0 && <div className="empty-state">No residents found.</div>}
            {!listLoading && filtered.map(r => (
              <button key={r.residentId} className={`vs-row${selected?.residentId === r.residentId ? ' is-selected' : ''}`} onClick={() => setSelected(r)}>
                <span className="vs-row__id">{r.caseControlNo}</span>
                <span className="vs-row__meta">{statusBadge(r.caseStatus)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="vs-detail">
          {!selected && <div className="vs-detail__empty">Select a resident to view visit history</div>}
          {selected && (
            <>
              <div className="vs-resident-header">
                <h2>{selected.caseControlNo}</h2>
                {statusBadge(selected.caseStatus)}
              </div>

              {reintCard && (
                <div className="vs-ml-box">
                  <p className="vs-ml-box__label">Reintegration Readiness</p>
                  <p>{reintCard.plainLanguage} {reintCard.detail}</p>
                </div>
              )}

              <p className="section-title">Visit Timeline</p>
              {visitsLoading && <div className="inline-loading">Loading visits...</div>}
              {!visitsLoading && visits.length === 0 && <div className="empty-state">No visits recorded</div>}
              {!visitsLoading && visits.length > 0 && (
                <div className="vs-timeline">
                  {visits.map(v => (
                    <div key={v.visitationId} className="vs-card">
                      <div className="vs-card__header">
                        <span className="vs-card__date">{v.visitDate ?? 'No date'}</span>
                        {visitTypeBadge(v.visitType)}
                        {outcomeBadge(v.visitOutcome)}
                        <span className="vs-card__worker">{v.socialWorker}</span>
                      </div>
                      {v.observations && <p className="vs-card__text">{v.observations}</p>}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
