import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchDonations } from '../../lib/donationsApi'
import { fetchSupporters } from '../../lib/supportersApi'
import type { Donation, Supporter } from '../../types/domain'

export default function DonorsPage() {
  const [supporters, setSupporters] = useState<Supporter[]>([])
  const [supTotal, setSupTotal] = useState(0)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [donations, setDonations] = useState<Donation[]>([])
  const [donTotal, setDonTotal] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetchSupporters({ pageNum: 1, pageSize: 100 })
      .then(r => {
        setSupporters(r.items)
        setSupTotal(r.totalCount)
        if (r.items.length && selectedId == null) setSelectedId(r.items[0].supporterId)
      })
      .catch(() => setError('Unable to load supporters.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedId == null) return
    fetchDonations({ supporterId: selectedId, pageNum: 1, pageSize: 100 })
      .then(r => {
        setDonations(r.items)
        setDonTotal(r.totalCount)
      })
      .catch(() => setError('Unable to load donations for this supporter.'))
  }, [selectedId])

  return (
    <AdminLayout>
      <section className="admin-panel">
        <h1>Donors &amp; contributions</h1>
        <p style={{ color: 'var(--base-muted)' }}>
          Select a supporter to view their donation history ({supTotal} supporters).
        </p>
        {loading && <p>Loading…</p>}
        {error && <p className="admin-error">{error}</p>}
        {!loading && (
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px,1fr) minmax(0,2fr)', gap: '1.5rem' }}>
            <div>
              <h2 style={{ fontSize: '1rem', marginTop: 0 }}>Supporters</h2>
              <div className="admin-table-wrap" style={{ maxHeight: 420, overflow: 'auto' }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supporters.map(s => (
                      <tr
                        key={s.supporterId}
                        onClick={() => setSelectedId(s.supporterId)}
                        style={{
                          cursor: 'pointer',
                          background: selectedId === s.supporterId ? 'rgba(187,95,60,0.12)' : undefined,
                        }}
                      >
                        <td>{s.displayName}</td>
                        <td>{s.supporterType}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h2 style={{ fontSize: '1rem', marginTop: 0 }}>
                Donations {selectedId != null ? `(ID ${selectedId})` : ''}
              </h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--base-muted)' }}>{donTotal} records</p>
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
                    {donations.map((d: Donation) => (
                      <tr key={d.donationId}>
                        <td>{d.donationDate ?? '—'}</td>
                        <td>{d.donationType}</td>
                        <td>
                          {d.amount != null
                            ? `${d.currencyCode ?? ''} ${d.amount.toLocaleString()}`.trim()
                            : '—'}
                        </td>
                        <td>{d.campaignName ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </section>
    </AdminLayout>
  )
}
