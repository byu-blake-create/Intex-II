import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchSupporters } from '../../lib/supportersApi'
import { fetchDonations } from '../../lib/donationsApi'
import { fetchAdminDashboard, type AdminDashboardCard } from '../../lib/adminDashboardApi'
import type { Supporter, Donation } from '../../types/domain'
import './DonorsPage.css'

const PAGE_SIZE = 50

function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="badge badge--gray">Unknown</span>
  return status.toLowerCase() === 'active'
    ? <span className="badge badge--green">Active</span>
    : <span className="badge badge--gray">{status}</span>
}

function typeBadge(t: string) {
  return <span className="badge badge--blue">{t}</span>
}

export default function DonorsPage() {
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selected, setSelected] = useState<Supporter | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [donLoading, setDonLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [watchlistCard, setWatchlistCard] = useState<AdminDashboardCard | null>(null)

  useEffect(() => {
    fetchAdminDashboard().then(d => {
      setWatchlistCard(d.cards.find(c => c.id === 'donor-watchlist') ?? null)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    let mounted = true
    fetchSupporters({
      pageNum,
      pageSize: PAGE_SIZE,
      search: search || undefined,
      supporterType: typeFilter || undefined,
    })
      .then(r => { if (mounted) { setSupporters(r.items); setTotalCount(r.totalCount) } })
      .catch(() => { if (mounted) setListError('Failed to load supporters.') })
      .finally(() => { if (mounted) setListLoading(false) })
    return () => { mounted = false }
  }, [pageNum, search, typeFilter])

  useEffect(() => {
    if (!selected) return
    fetchDonations({ supporterId: selected.supporterId, pageSize: 200 })
      .then(r => setDonations(r.items))
      .catch(() => setDonations([]))
      .finally(() => setDonLoading(false))
  }, [selected])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  const donationTotal = donations.reduce((sum, d) => sum + (d.amount ?? 0), 0)

  return (
    <AdminLayout>
      <div className="dn-layout">
        <div className="dn-sidebar">
          <div className="dn-sidebar__header">
            <input
              className="dn-search"
              placeholder="Search donors..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPageNum(1)
              }}
            />
            <div className="dn-filters">
              <select
                value={typeFilter}
                onChange={e => {
                  setTypeFilter(e.target.value)
                  setPageNum(1)
                }}
              >
                <option value="">All types</option>
                <option value="Individual">Individual</option>
                <option value="Organization">Organization</option>
              </select>
            </div>
          </div>
          <div className="dn-list">
            {listLoading && <div className="inline-loading">Loading...</div>}
            {listError && <p className="admin-error" style={{ padding: '1rem' }}>{listError}</p>}
            {!listLoading && !listError && supporters.length === 0 && <div className="empty-state">No supporters found.</div>}
            {!listLoading && !listError && supporters.map(s => (
              <button
                key={s.supporterId}
                className={`dn-row${selected?.supporterId === s.supporterId ? ' is-selected' : ''}`}
                onClick={() => {
                  setSelected(s)
                  setDonations([])
                  setDonLoading(true)
                }}
              >
                <span className="dn-row__name">{s.displayName}</span>
                <span className="dn-row__meta">
                  {typeBadge(s.supporterType)}
                  {statusBadge(s.status)}
                </span>
                {s.organizationName && <span className="dn-row__org">{s.organizationName}</span>}
                {s.email && <span className="dn-row__email">{s.email}</span>}
              </button>
            ))}
          </div>
          <div className="dn-pager">
            <span className="dn-pager__info">Page {pageNum} of {totalPages}, {totalCount} records</span>
            <button
              className="dn-pager__btn"
              disabled={pageNum <= 1}
              onClick={() => {
                setPageNum(p => p - 1)
              }}
            >Prev</button>
            <button
              className="dn-pager__btn"
              disabled={pageNum >= totalPages}
              onClick={() => {
                setPageNum(p => p + 1)
              }}
            >Next</button>
          </div>
        </div>

        <div className="dn-detail">
          {!selected && <div className="dn-detail__empty">Select a supporter to view details</div>}
          {selected && (
            <>
              <div className="dn-header">
                <h2>{selected.displayName}</h2>
                {selected.organizationName && <span className="dn-header__org">{selected.organizationName}</span>}
                {selected.email && <span className="dn-header__email">{selected.email}</span>}
                <div className="dn-header__badges">
                  {typeBadge(selected.supporterType)}
                  {statusBadge(selected.status)}
                </div>
              </div>

              {watchlistCard && (
                <div className="dn-ml-box">
                  <p className="dn-ml-box__label">Donor Signal</p>
                  <p>{watchlistCard.plainLanguage} {watchlistCard.detail}</p>
                </div>
              )}

              <p className="section-title">Donation History</p>
              {donLoading && <div className="inline-loading">Loading donations...</div>}
              {!donLoading && donations.length === 0 && <div className="empty-state">No donations recorded</div>}
              {!donLoading && donations.length > 0 && (
                <>
                  <div className="admin-table-wrap">
                    <table className="admin-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Type</th>
                          <th>Amount</th>
                          <th>Campaign</th>
                        </tr>
                      </thead>
                      <tbody>
                        {donations
                          .sort((a, b) => (b.donationDate ?? '').localeCompare(a.donationDate ?? ''))
                          .map(d => (
                          <tr key={d.donationId}>
                            <td>{d.donationDate ?? '\u2014'}</td>
                            <td>{d.donationType}</td>
                            <td>{d.amount != null ? `${d.currencyCode ?? '$'}${d.amount.toLocaleString()}` : '\u2014'}</td>
                            <td>{d.campaignName ?? '\u2014'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="dn-summary">{donations.length} donations &middot; Total: ${donationTotal.toLocaleString()}</p>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
