import { useEffect, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import { fetchResidents } from '../../lib/residentsApi'
import { fetchProcessRecordings } from '../../lib/processRecordingsApi'
import type { Resident, ProcessRecording } from '../../types/domain'
import './ProcessRecordingPage.css'

const PAGE_SIZE = 30

function statusBadge(status: string | null | undefined) {
  if (!status) return <span className="badge badge--gray">Unknown</span>
  return status.toLowerCase() === 'active'
    ? <span className="badge badge--green">Active</span>
    : <span className="badge badge--gray">{status}</span>
}

export default function ProcessRecordingPage() {
  const [residents, setResidents] = useState<Resident[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageNum, setPageNum] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Resident | null>(null)
  const [sessions, setSessions] = useState<ProcessRecording[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetchResidents({ pageNum, pageSize: PAGE_SIZE, search: search || undefined })
      .then(r => {
        if (mounted) {
          setResidents(r.items)
          setTotalCount(r.totalCount)
        }
      })
      .catch(() => {
        if (mounted) setListError('Failed to load residents.')
      })
      .finally(() => {
        if (mounted) setListLoading(false)
      })
    return () => { mounted = false }
  }, [pageNum, search])

  useEffect(() => {
    if (!selected) return
    fetchProcessRecordings(selected.residentId)
      .then(r => setSessions(r.items))
      .catch(() => setSessions([]))
      .finally(() => setSessionsLoading(false))
  }, [selected])

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  return (
    <AdminLayout>
      <div className="pr-layout">
        <div className="pr-sidebar">
          <div className="pr-sidebar__header">
            <input
              className="pr-search"
              placeholder="Search residents..."
              value={search}
              onChange={e => {
                setSearch(e.target.value)
                setPageNum(1)
              }}
            />
          </div>
          <div className="pr-list">
            {listLoading && <div className="inline-loading">Loading...</div>}
            {listError && <p className="admin-error" style={{ padding: '1rem' }}>{listError}</p>}
            {!listLoading && !listError && residents.length === 0 && <div className="empty-state">No residents found.</div>}
            {!listLoading && !listError && residents.map(r => (
              <button
                key={r.residentId}
                className={`pr-row${selected?.residentId === r.residentId ? ' is-selected' : ''}`}
                onClick={() => {
                  setSelected(r)
                  setSessions([])
                  setSessionsLoading(true)
                }}
              >
                <span className="pr-row__id">{r.caseControlNo}</span>
                <span className="pr-row__meta">{statusBadge(r.caseStatus)}</span>
              </button>
            ))}
          </div>
          <div className="pr-pager">
            <span className="pr-pager__info">Page {pageNum} of {totalPages}, {totalCount} records</span>
            <button className="pr-pager__btn" disabled={pageNum <= 1} onClick={() => setPageNum(p => p - 1)}>Prev</button>
            <button className="pr-pager__btn" disabled={pageNum >= totalPages} onClick={() => setPageNum(p => p + 1)}>Next</button>
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
