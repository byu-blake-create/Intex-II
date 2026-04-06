import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchProcessRecordings } from '../../lib/processRecordingsApi'
import { fetchResidents } from '../../lib/residentsApi'
import type { ProcessRecording, Resident } from '../../types/domain'

export default function ProcessRecordingPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [residentId, setResidentId] = useState<number | ''>('')
  const [rows, setRows] = useState<ProcessRecording[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchResidents({ pageNum: 1, pageSize: 200 })
      .then(r => {
        setResidents(r.items)
        if (r.items.length && residentId === '') setResidentId(r.items[0].residentId)
      })
      .catch(() => setError('Could not load residents.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (residentId === '') return
    setLoading(true)
    fetchProcessRecordings(Number(residentId))
      .then(r => setRows(r.items))
      .catch(() => setError('Could not load process recordings.'))
      .finally(() => setLoading(false))
  }, [residentId])

  return (
    <AdminLayout>
      <section className="admin-panel">
        <h1>Process recording</h1>
        <p style={{ color: 'var(--base-muted)' }}>Session notes per resident (chronological).</p>

        <div className="admin-toolbar">
          <label>
            Resident
            <select
              value={residentId === '' ? '' : String(residentId)}
              onChange={e => setResidentId(e.target.value ? Number(e.target.value) : '')}
            >
              {residents.map((r: Resident) => (
                <option key={r.residentId} value={r.residentId}>
                  {r.caseControlNo} — {r.caseStatus ?? '—'}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading && <p>Loading…</p>}
        {error && <p className="admin-error">{error}</p>}

        {!loading && !error && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Worker</th>
                  <th>Narrative</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p: ProcessRecording) => (
                  <tr key={p.recordingId}>
                    <td>{p.sessionDate ?? '—'}</td>
                    <td>{p.sessionType ?? '—'}</td>
                    <td>{p.socialWorker ?? '—'}</td>
                    <td style={{ maxWidth: 360 }}>{p.sessionNarrative ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AdminLayout>
  )
}
