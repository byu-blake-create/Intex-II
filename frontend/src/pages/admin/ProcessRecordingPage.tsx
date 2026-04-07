import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchResidents } from '../../lib/residentsApi'
import { fetchProcessRecordings } from '../../lib/processRecordingsApi'
import type { Resident, ProcessRecording } from '../../types/domain'
import './ProcessRecordingPage.css'

function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="badge badge--gray">Unknown</span>
  return status.toLowerCase() === 'active'
    ? <span className="badge badge--green">Active</span>
    : <span className="badge badge--gray">{status}</span>
}

export default function ProcessRecordingPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Resident | null>(null)
  const [sessions, setSessions] = useState<ProcessRecording[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)

  useEffect(() => {
    fetchResidents({ pageSize: 200 })
      .then(r => setResidents(r.items))
      .catch(() => {})
      .finally(() => setListLoading(false))
  }, [])

  useEffect(() => {
    if (!selected) { setSessions([]); return }
    setSessionsLoading(true)
    fetchProcessRecordings(selected.residentId)
      .then(r => setSessions(r.items))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false))
  }, [selected])

  const filtered = search
    ? residents.filter(r => r.caseControlNo.toLowerCase().includes(search.toLowerCase()))
    : residents

  return (
    <AdminLayout>
      <div className="pr-layout">
        <div className="pr-sidebar">
          <div className="pr-sidebar__header">
            <input className="pr-search" placeholder="Search residents..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="pr-list">
            {listLoading && <div className="inline-loading">Loading...</div>}
            {!listLoading && filtered.length === 0 && <div className="empty-state">No residents found.</div>}
            {!listLoading && filtered.map(r => (
              <button key={r.residentId} className={`pr-row${selected?.residentId === r.residentId ? ' is-selected' : ''}`} onClick={() => setSelected(r)}>
                <span className="pr-row__id">{r.caseControlNo}</span>
                <span className="pr-row__meta">{statusBadge(r.caseStatus)}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="pr-detail">
          {!selected && <div className="pr-detail__empty">Select a resident to view session notes</div>}
          {selected && (
            <>
              <header className="page-header">
                <h1 style={{ fontFamily: 'monospace' }}>{selected.caseControlNo}</h1>
                <p>Session journal</p>
              </header>

              <p className="section-title">Sessions</p>
              {sessionsLoading && <div className="inline-loading">Loading sessions...</div>}
              {!sessionsLoading && sessions.length === 0 && <div className="empty-state">No sessions recorded</div>}
              {!sessionsLoading && sessions.length > 0 && (
                <div className="pr-journal">
                  {sessions.map(s => (
                    <div key={s.recordingId} className="pr-card">
                      <div className="pr-card__header">
                        <span className="pr-card__date">{s.sessionDate ?? 'No date'}</span>
                        {s.sessionType && <span className="badge badge--purple">{s.sessionType}</span>}
                        {s.notesRestricted === 'Y' && <span className="badge badge--red">Restricted</span>}
                        <span className="pr-card__worker">{s.socialWorker}</span>
                      </div>
                      {s.sessionNarrative ? (
                        <p className="pr-card__narrative">{s.sessionNarrative}</p>
                      ) : (
                        <p className="pr-card__narrative pr-card__narrative--empty">No narrative recorded</p>
                      )}
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
