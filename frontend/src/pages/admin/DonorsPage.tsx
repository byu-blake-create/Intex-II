import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchSupporters } from '../../lib/supportersApi'
import { fetchDonations } from '../../lib/donationsApi'
import { apiPost } from '../../lib/api'
import { fetchSupporterContacts, type SupporterContact } from '../../lib/supporterContactsApi'
import { fetchDonorWatchlist, fetchTopOpportunities, type DonorInsight } from '../../lib/mlApi'
import type { Supporter, Donation } from '../../types/domain'
import './DonorsPage.css'

const PAGE_SIZE = 50

function getLastMonthRange(): { start: string; end: string } {
  const now = new Date()
  const firstOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastOfLastMonth = new Date(firstOfThisMonth.getTime() - 1)
  const firstOfLastMonth = new Date(lastOfLastMonth.getFullYear(), lastOfLastMonth.getMonth(), 1)
  return {
    start: firstOfLastMonth.toISOString().slice(0, 10),
    end: lastOfLastMonth.toISOString().slice(0, 10),
  }
}

function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="badge badge--gray">Unknown</span>
  return status.toLowerCase() === 'active'
    ? <span className="badge badge--green">Active</span>
    : <span className="badge badge--gray">{status}</span>
}

function typeBadge(t: string) {
  return <span className="badge badge--blue">{t}</span>
}

function getRiskLevel(probability: number) {
  if (probability >= 0.75) return { label: 'High', tone: 'high' as const }
  if (probability >= 0.4) return { label: 'Medium', tone: 'medium' as const }
  return { label: 'Low', tone: 'low' as const }
}

export default function DonorsPage() {
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [signalFilter, setSignalFilter] = useState('')
  const [selected, setSelected] = useState<Supporter | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [donLoading, setDonLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)
  const [donorInsights, setDonorInsights] = useState<Record<number, DonorInsight>>({})
  const [opportunityInsights, setOpportunityInsights] = useState<Record<number, DonorInsight>>({})

  // Contact modal state
  const [showContactModal, setShowContactModal] = useState(false)
  const [contactDate, setContactDate] = useState('')
  const [contactType, setContactType] = useState('Phone call')
  const [contactOutcome, setContactOutcome] = useState('Follow up needed')
  const [contactNotes, setContactNotes] = useState('')
  const [contactSaving, setContactSaving] = useState(false)
  const [contactSuccess, setContactSuccess] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)

  // History tab state
  const [historyTab, setHistoryTab] = useState<'donations' | 'contacts'>('donations')
  const [contacts, setContacts] = useState<SupporterContact[]>([])
  const [contactsLoading, setContactsLoading] = useState(false)

  useEffect(() => {
    fetchDonorWatchlist()
      .then(items => setDonorInsights(Object.fromEntries(items.map(item => [item.supporterId, item]))))
      .catch(() => {})
    fetchTopOpportunities()
      .then(items => setOpportunityInsights(Object.fromEntries(items.map(item => [item.supporterId, item]))))
      .catch(() => {})
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
  const filteredSupporters = signalFilter
    ? supporters.filter(s => {
        if (signalFilter.startsWith('churn-')) {
          const level = signalFilter.slice(6)
          const insight = donorInsights[s.supporterId]
          if (!insight) return false
          return getRiskLevel(insight.churnProbability).label.toLowerCase() === level
        }
        if (signalFilter.startsWith('gift-')) {
          const tier = signalFilter.slice(5)
          const insight = opportunityInsights[s.supporterId]
          if (!insight) return false
          return (insight.opportunityTier?.toLowerCase() ?? 'standard') === tier
        }
        return true
      })
    : supporters

  const donationTotal = donations.reduce((sum, d) => sum + (d.amount ?? 0), 0)
  const selectedDonorInsight = selected ? donorInsights[selected.supporterId] : undefined
  const selectedOpportunityInsight = selected ? opportunityInsights[selected.supporterId] : undefined
  const donorRiskLevel = selectedDonorInsight ? getRiskLevel(selectedDonorInsight.churnProbability) : null

  // Lapsed donor logic
  const isLapsed = (() => {
    if (donations.length === 0) return false
    const mostRecent = donations
      .map(d => d.donationDate)
      .filter(Boolean)
      .sort()
      .reverse()[0]
    if (!mostRecent) return false
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - 180)
    return mostRecent < cutoff.toISOString().slice(0, 10)
  })()

  // 30-day goal computation
  const thirtyDaysAgo = (() => {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d.toISOString().slice(0, 10)
  })()
  const last30Donations = donations.filter(d => d.donationDate != null && d.donationDate >= thirtyDaysAgo)
  const donorLast30 = last30Donations.reduce((sum, d) => sum + (d.amount ?? 0), 0)
  const { start, end } = getLastMonthRange()
  const lastMonthTotal = donations
    .filter(d => d.donationDate && d.donationDate >= start && d.donationDate <= end)
    .reduce((sum, d) => sum + (d.amount ?? 0), 0)
  const dynamicGoal = Math.max(10, Math.round(lastMonthTotal * 1.1))
  const goalPct = Math.min(100, Math.round((donorLast30 / dynamicGoal) * 100))

  function openContactModal() {
    const today = new Date().toISOString().slice(0, 10)
    setContactDate(today)
    setContactType('Phone call')
    setContactOutcome('Follow up needed')
    setContactNotes('')
    setContactSaving(false)
    setContactSuccess(false)
    setContactError(null)
    setShowContactModal(true)
  }

  function closeContactModal() {
    setShowContactModal(false)
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setContactSaving(true)
    setContactError(null)
    try {
      await apiPost(`/api/supporters/${selected.supporterId}/contacts`, {
        contactDate,
        contactType,
        outcome: contactOutcome.trim() || null,
        notes: contactNotes,
      })
      setContactSuccess(true)
      // Reload contacts so the history tab reflects the new entry
      fetchSupporterContacts(selected.supporterId)
        .then(r => setContacts(r))
        .catch(() => {})
      setTimeout(() => {
        setShowContactModal(false)
        setContactSuccess(false)
      }, 3000)
    } catch {
      setContactError('Failed to save contact. Please try again.')
    } finally {
      setContactSaving(false)
    }
  }

  return (
    <AdminLayout>
      <div className="dn-layout" data-detail-open={selected !== null ? 'true' : undefined}>
        <div className="dn-sidebar">
          <div className="dn-sidebar__header">
            <input
              className="dn-search"
              placeholder="Search donors..."
              aria-label="Search donors"
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPageNum(1)
              }}
            />
            <div className="dn-filters">
              <select
                aria-label="Filter donors by supporter type"
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
              <select
                aria-label="Filter donors by insight signal"
                value={signalFilter}
                onChange={e => setSignalFilter(e.target.value)}
              >
                <option value="">All signals</option>
                <optgroup label="Churn Risk">
                  <option value="churn-high">High churn risk</option>
                  <option value="churn-medium">Medium churn risk</option>
                  <option value="churn-low">Low churn risk</option>
                </optgroup>
                <optgroup label="Gift Opportunity">
                  <option value="gift-major">Major donor potential</option>
                  <option value="gift-mid">Mid-range upgrade</option>
                  <option value="gift-standard">Standard gift level</option>
                </optgroup>
              </select>
            </div>
          </div>
          <div className="dn-list">
            {listLoading && <div className="inline-loading">Loading...</div>}
            {listError && <p className="admin-error" style={{ padding: '1rem' }}>{listError}</p>}
            {!listLoading && !listError && filteredSupporters.length === 0 && <div className="empty-state">No supporters found.</div>}
            {!listLoading && !listError && filteredSupporters.map(s => (
              <button
                key={s.supporterId}
                className={`dn-row${selected?.supporterId === s.supporterId ? ' is-selected' : ''}`}
                onClick={() => {
                  setSelected(s)
                  setDonations([])
                  setDonLoading(true)
                  setHistoryTab('donations')
                  setContacts([])
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
              <button
                type="button"
                className="dn-back-btn"
                onClick={() => setSelected(null)}
              >
                &larr; Back
              </button>
              <div className="dn-header">
                <div className="dn-header__top">
                  <div className="dn-header__info">
                    <h2>{selected.displayName}</h2>
                    {selected.organizationName && <span className="dn-header__org">{selected.organizationName}</span>}
                    {selected.email && <span className="dn-header__email">{selected.email}</span>}
                  </div>
                  <button className="dn-log-contact-btn" onClick={openContactModal}>Log Contact</button>
                </div>
                <div className="dn-header__badges">
                  {typeBadge(selected.supporterType)}
                  {statusBadge(selected.status)}
                  {!donLoading && donations.length === 0 && (
                    <span className="badge badge--gray">No donations on record</span>
                  )}
                  {!donLoading && isLapsed && (
                    <span className="badge badge--amber">Lapsed &#8211; Last gift 180d+ ago</span>
                  )}
                </div>
              </div>

              {(selectedDonorInsight || selectedOpportunityInsight) && (
                <div className="dn-signal-row">
                  {donorRiskLevel && (
                    <div className="dn-signal-strip">
                      <span className="dn-signal-strip__label">Donor Signal</span>
                      <span
                        className="dn-signal-strip__info"
                        data-tip="Likelihood this donor stops giving. Low = retain normally, Medium = consider outreach, High = prioritize contact."
                        aria-label="About donor signal"
                        tabIndex={0}
                      >ⓘ</span>
                      <span className={`dn-ml-pill dn-ml-pill--${donorRiskLevel.tone}`}>{donorRiskLevel.label}</span>
                    </div>
                  )}
                  {selectedOpportunityInsight && (
                    <div className="dn-signal-strip">
                      <span className="dn-signal-strip__label">Gift Opportunity</span>
                      <span
                        className="dn-signal-strip__info"
                        data-tip="Suggested tier for a larger ask based on this donor's giving history. Standard = typical gift level, Mid = mid-range upgrade, Major = major donor potential."
                        aria-label="About gift opportunity"
                        tabIndex={0}
                      >ⓘ</span>
                      <span className={`dn-ml-pill dn-ml-pill--${selectedOpportunityInsight.opportunityTier?.toLowerCase() === 'major' ? 'high' : selectedOpportunityInsight.opportunityTier?.toLowerCase() === 'mid' ? 'medium' : 'low'}`}>
                        {selectedOpportunityInsight.opportunityTier ?? 'Standard'}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {selected && !donLoading && donations.length > 0 && (
                <div className="dn-goal">
                  <p className="section-title" style={{ margin: 0 }}>Donation Goal</p>
                  <p className="dn-goal__label">30-Day Goal Progress</p>
                  <div className="dn-goal__bar-wrap">
                    <div className="dn-goal__bar" style={{ width: `${goalPct}%` }} />
                  </div>
                  <p className="dn-goal__text">
                    ${donorLast30.toLocaleString()} of ${dynamicGoal.toLocaleString()} goal (based on last month) ({last30Donations.length} donation{last30Donations.length !== 1 ? 's' : ''})
                  </p>
                </div>
              )}

              <div className="dn-history-toggle">
                <button
                  className={`dn-history-tab${historyTab === 'donations' ? ' is-active' : ''}`}
                  onClick={() => setHistoryTab('donations')}
                >Donation History</button>
                <button
                  className={`dn-history-tab${historyTab === 'contacts' ? ' is-active' : ''}`}
                  onClick={() => {
                    setHistoryTab('contacts')
                    if (contacts.length === 0 && !contactsLoading && selected) {
                      setContactsLoading(true)
                      fetchSupporterContacts(selected.supporterId)
                        .then(r => setContacts(r))
                        .catch(() => setContacts([]))
                        .finally(() => setContactsLoading(false))
                    }
                  }}
                >Contact History</button>
              </div>

              {historyTab === 'donations' && (
                <>
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

              {historyTab === 'contacts' && (
                <>
                  {contactsLoading && <div className="inline-loading">Loading contacts...</div>}
                  {!contactsLoading && contacts.length === 0 && <div className="empty-state">No contacts logged yet</div>}
                  {!contactsLoading && contacts.length > 0 && (
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Outcome</th>
                            <th>Notes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contacts.map(c => (
                            <tr key={c.supporterContactId}>
                              <td>{c.contactDate}</td>
                              <td>{c.contactType}</td>
                              <td>{c.outcome ?? '\u2014'}</td>
                              <td>{c.notes ?? '\u2014'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>

      {showContactModal && selected && (
        <div className="dn-modal-overlay" onClick={closeContactModal}>
          <div className="dn-modal" onClick={e => e.stopPropagation()}>
            <p className="dn-modal__title">Log Contact</p>
            <p className="dn-modal__sub">{selected.displayName}</p>
            {contactSuccess ? (
              <p className="dn-modal__success">Contact logged</p>
            ) : (
              <form onSubmit={handleContactSubmit} className="dn-modal__form">
                <label className="dn-modal__label">
                  Date
                  <input
                    type="date"
                    className="dn-modal__input"
                    value={contactDate}
                    onChange={e => setContactDate(e.target.value)}
                    required
                  />
                </label>
                <label className="dn-modal__label">
                  Contact Type
                  <select
                    className="dn-modal__input"
                    value={contactType}
                    onChange={e => setContactType(e.target.value)}
                  >
                    <option>Phone call</option>
                    <option>Email</option>
                    <option>Meeting</option>
                    <option>Letter</option>
                    <option>Other</option>
                  </select>
                </label>
                <label className="dn-modal__label">
                  Outcome / Result
                  <input
                    type="text"
                    className="dn-modal__input"
                    placeholder="Pledged, follow up, not interested..."
                    value={contactOutcome}
                    onChange={e => setContactOutcome(e.target.value)}
                  />
                </label>
                <label className="dn-modal__label">
                  Notes
                  <textarea
                    className="dn-modal__textarea"
                    placeholder="Brief summary of the contact..."
                    value={contactNotes}
                    onChange={e => setContactNotes(e.target.value)}
                    rows={4}
                  />
                </label>
                {contactError && <p className="dn-modal__error">{contactError}</p>}
                <div className="dn-modal__actions">
                  <button type="submit" className="dn-modal__save" disabled={contactSaving}>
                    {contactSaving ? 'Saving...' : 'Save Contact'}
                  </button>
                  <button type="button" className="dn-modal__cancel" onClick={closeContactModal} disabled={contactSaving}>
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  )
}
