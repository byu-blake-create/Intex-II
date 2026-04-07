import { Fragment, useState } from 'react'
import PublicSiteHeader from '../../components/PublicSiteHeader'
import { usePublicTheme } from '../../lib/usePublicTheme'
import './HomePage.css'
import './DonationsPage.css'

type DonationRow = {
  donationId: number
  date: string
  amount: number
  frequency: 'One-time' | 'Monthly' | 'Corporate Match'
  campaign: string
  paymentMethod: string
  receiptId: string
  note: string
}

const demoDonations: DonationRow[] = [
  {
    donationId: 90214,
    date: '2026-04-01',
    amount: 150,
    frequency: 'Monthly',
    campaign: 'Monthly Hope Fund',
    paymentMethod: 'Visa ending in 8241',
    receiptId: 'NS-2026-APR-90214',
    note: 'Recurring contribution supporting shelter meals and care kits.',
  },
  {
    donationId: 89103,
    date: '2026-03-12',
    amount: 250,
    frequency: 'One-time',
    campaign: 'Emergency Shelter Support',
    paymentMethod: 'Apple Pay',
    receiptId: 'NS-2026-MAR-89103',
    note: 'Directed to emergency housing and immediate safety resources.',
  },
  {
    donationId: 87455,
    date: '2025-12-02',
    amount: 300,
    frequency: 'One-time',
    campaign: 'Holiday Family Support',
    paymentMethod: 'Mastercard ending in 4102',
    receiptId: 'NS-2025-DEC-87455',
    note: 'Holiday response giving for winter shelter capacity.',
  },
  {
    donationId: 86220,
    date: '2025-10-19',
    amount: 125,
    frequency: 'Corporate Match',
    campaign: 'Community Match Week',
    paymentMethod: 'Employer Match',
    receiptId: 'NS-2025-OCT-86220',
    note: 'Employer-matched contribution from a workplace giving program.',
  },
]

export default function DonationsPage() {
  const { theme, setTheme } = usePublicTheme()
  const [expandedRows, setExpandedRows] = useState<Record<number, boolean>>({})

  const totalGiving = demoDonations.reduce((sum, donation) => sum + donation.amount, 0)

  function toggleExpanded(id: number) {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="public-site donations-page" data-theme={theme}>
      <PublicSiteHeader theme={theme} setTheme={setTheme} />
      <main className="donations-page__main">
        <section className="donations-card">
          <p className="donations-card__eyebrow">Donations</p>
          <h1>Your donation history</h1>
          <p className="donations-card__subtext">
            Thanks for your support. This testing view uses demo data to preview the donor table
            experience in the new website layout.
          </p>

          <div className="donations-metrics">
            <article>
              <span>Total donations</span>
              <strong>{demoDonations.length}</strong>
            </article>
            <article>
              <span>Total given</span>
              <strong>${totalGiving.toLocaleString()}</strong>
            </article>
          </div>

          <div className="donations-table-wrap">
            <table className="donations-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {demoDonations.map(donation => {
                  const isExpanded = !!expandedRows[donation.donationId]
                  return (
                    <Fragment key={donation.donationId}>
                      <tr>
                        <td>{donation.date}</td>
                        <td>${donation.amount.toLocaleString()}</td>
                        <td className="donations-table__actions">
                          <button type="button" onClick={() => toggleExpanded(donation.donationId)}>
                            {isExpanded ? 'See less' : 'See more'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="donations-table__details">
                          <td colSpan={3}>
                            <div className="donation-details-grid">
                              <p><strong>Donation ID:</strong> {donation.donationId}</p>
                              <p><strong>Frequency:</strong> {donation.frequency}</p>
                              <p><strong>Campaign:</strong> {donation.campaign}</p>
                              <p><strong>Payment method:</strong> {donation.paymentMethod}</p>
                              <p><strong>Receipt:</strong> {donation.receiptId}</p>
                              <p><strong>Note:</strong> {donation.note}</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}
