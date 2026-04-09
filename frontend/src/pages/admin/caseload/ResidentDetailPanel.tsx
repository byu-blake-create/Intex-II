import type { AdminDashboardCard } from '../../../lib/adminDashboardApi'
import type { DashboardSummary, HomeVisitation, ProcessRecording, Resident } from '../../../types/domain'
import type { DetailTab, InsightLevel, OverdueInfo, ResidentEditField } from './caseloadTypes'
import { daysUntil, statusBadge } from './caseloadUtils'

type Props = {
  selected: Resident | null
  summary: DashboardSummary | null
  triageCard: AdminDashboardCard | null
  safehouseMap: Map<number, string>
  residentRiskLevel: InsightLevel | null
  readinessLevel: InsightLevel | null
  statusSaving: boolean
  statusError: string | null
  onRequestStatusChange: (newStatus: 'Active' | 'Closed') => void
  visitsLoading: boolean
  overdueInfo: OverdueInfo | null
  concernVisits: HomeVisitation[]
  detailTab: DetailTab
  onDetailTabChange: (tab: DetailTab) => void
  editField: ResidentEditField | null
  editValue: string
  editSaving: boolean
  editError: string | null
  onEditValueChange: (value: string) => void
  onStartEdit: (field: ResidentEditField, value: string) => void
  onCancelEdit: () => void
  onSaveField: (field: ResidentEditField) => void
  onOpenVisitModal: () => void
  onOpenNoteModal: () => void
  sortedVisits: HomeVisitation[]
  displayedVisits: HomeVisitation[]
  visitsShowAll: boolean
  onToggleVisitsShowAll: (showAll: boolean) => void
  sessionsLoading: boolean
  sortedSessions: ProcessRecording[]
  displayedSessions: ProcessRecording[]
  sessionsShowAll: boolean
  onToggleSessionsShowAll: (showAll: boolean) => void
}

export default function ResidentDetailPanel({
  selected,
  summary,
  triageCard,
  safehouseMap,
  residentRiskLevel,
  readinessLevel,
  statusSaving,
  statusError,
  onRequestStatusChange,
  visitsLoading,
  overdueInfo,
  concernVisits,
  detailTab,
  onDetailTabChange,
  editField,
  editValue,
  editSaving,
  editError,
  onEditValueChange,
  onStartEdit,
  onCancelEdit,
  onSaveField,
  onOpenVisitModal,
  onOpenNoteModal,
  sortedVisits,
  displayedVisits,
  visitsShowAll,
  onToggleVisitsShowAll,
  sessionsLoading,
  sortedSessions,
  displayedSessions,
  sessionsShowAll,
  onToggleSessionsShowAll,
}: Props) {
  return (
    <div className="cl-detail">
      {summary && summary.upcomingCaseConferences > 0 && (
        <a href="/admin/reports" className="cl-conference-notice">
          &#9889; {summary.upcomingCaseConferences} case conference{summary.upcomingCaseConferences !== 1 ? 's' : ''} scheduled in the next 7 days — review caseloads and prepare documentation.
        </a>
      )}

      {!selected && <div className="cl-detail__empty">Select a resident to view details</div>}
      {selected && (
        <>
          {triageCard && (
            <div className="cl-ml-box">
              <p className="cl-ml-box__label">Resident Signal</p>
              <p>{triageCard.plainLanguage} {triageCard.detail}</p>
            </div>
          )}
          <div className="cl-resident-header">
            <h2>{selected.caseControlNo}</h2>
            {statusBadge(selected.caseStatus)}
            <span style={{ fontSize: '0.85rem', color: 'var(--adm-muted)' }}>
              {safehouseMap.get(selected.safehouseId) ?? `Safehouse ${selected.safehouseId}`}
            </span>
            {selected.caseStatus?.toLowerCase() === 'active' && (
              <button
                className="cl-status-btn cl-status-btn--close"
                onClick={() => onRequestStatusChange('Closed')}
                disabled={statusSaving}
              >
                {statusSaving ? 'Saving…' : 'Close Case'}
              </button>
            )}
            {selected.caseStatus?.toLowerCase() === 'closed' && (
              <button
                className="cl-status-btn cl-status-btn--reopen"
                onClick={() => onRequestStatusChange('Active')}
                disabled={statusSaving}
              >
                {statusSaving ? 'Saving…' : 'Reopen Case'}
              </button>
            )}
          </div>
          {statusError && <p className="admin-error">{statusError}</p>}

          {(residentRiskLevel || readinessLevel) && (
            <div className="cl-signal-row">
              {residentRiskLevel && (
                <div className="cl-signal-strip">
                  <span className="cl-signal-strip__label">Resident Signal</span>
                  <span
                    className="cl-signal-strip__info"
                    data-tip="Likelihood this resident needs increased care or intervention. Low = routine check-ins, Medium = monitor closely, High = proactive support recommended."
                    aria-label="About resident signal"
                    tabIndex={0}
                  >ⓘ</span>
                  <span className={`cl-ml-pill cl-ml-pill--${residentRiskLevel.tone}`}>{residentRiskLevel.label}</span>
                </div>
              )}
              {readinessLevel && (
                <div className="cl-signal-strip">
                  <span className="cl-signal-strip__label">Reintegration</span>
                  <span
                    className="cl-signal-strip__info"
                    data-tip="How ready this resident is to transition out of the shelter. Low = not yet ready, Medium = approaching readiness, High = recommend scheduling a reintegration review."
                    aria-label="About reintegration signal"
                    tabIndex={0}
                  >ⓘ</span>
                  <span className={`cl-ml-pill cl-ml-pill--${readinessLevel.tone}`}>{readinessLevel.label}</span>
                </div>
              )}
            </div>
          )}

          {selected.caseConferenceDate && (() => {
            const days = daysUntil(selected.caseConferenceDate)
            if (days <= 0) {
              return (
                <div className="cl-conference-banner cl-conference-banner--urgent">
                  ⚑ Case conference was {Math.abs(days)} day{Math.abs(days) !== 1 ? 's' : ''} ago — update records immediately.
                </div>
              )
            }
            if (days <= 7) {
              return (
                <div className="cl-conference-banner cl-conference-banner--soon">
                  ⚑ Case conference in {days} day{days !== 1 ? 's' : ''} — {selected.caseConferenceDate}. Prepare documentation.
                </div>
              )
            }
            return null
          })()}

          {!visitsLoading && overdueInfo?.overdue && (
            <div className="cl-overdue-banner">
              {overdueInfo.noRecord
                ? 'No visit on record.'
                : `No recent home visit recorded — last visit was ${overdueInfo.days} day${overdueInfo.days !== 1 ? 's' : ''} ago.`}
            </div>
          )}

          <dl className="cl-fields">
            <div className="cl-field"><dt>Date of Birth</dt><dd>{selected.dateOfBirth ?? '\u2014'}</dd></div>
            <div className="cl-field"><dt>Sex</dt><dd>{selected.sex ?? '\u2014'}</dd></div>
            <div className="cl-field"><dt>Case Category</dt><dd>{selected.caseCategory ?? '\u2014'}</dd></div>
            <div className="cl-field">
              <dt>Social Worker</dt>
              {editField === 'socialWorker' ? (
                <dd>
                  <div className="cl-field__edit-row">
                    <input className="cl-field__edit-input" value={editValue} onChange={event => onEditValueChange(event.target.value)} autoFocus />
                    <button className="cl-field__edit-save" onClick={() => onSaveField('socialWorker')} disabled={editSaving}>&#10003;</button>
                    <button className="cl-field__edit-cancel" onClick={onCancelEdit}>&#10005;</button>
                  </div>
                  {editError && <span className="cl-field__edit-error">{editError}</span>}
                </dd>
              ) : (
                <dd className="cl-field__editable">
                  {selected.assignedSocialWorker ?? '\u2014'}
                  <button className="cl-field__edit-btn" onClick={() => onStartEdit('socialWorker', selected.assignedSocialWorker ?? '')}>&#9998;</button>
                </dd>
              )}
            </div>
            <div className="cl-field"><dt>Internal Code</dt><dd>{selected.internalCode ?? '\u2014'}</dd></div>
            <div className="cl-field"><dt>Safehouse</dt><dd>{safehouseMap.get(selected.safehouseId) ?? String(selected.safehouseId)}</dd></div>
            <div className="cl-field">
              <dt>Case Conference</dt>
              {editField === 'conferenceDate' ? (
                <dd>
                  <div className="cl-field__edit-row">
                    <input type="date" className="cl-field__edit-input" value={editValue} onChange={event => onEditValueChange(event.target.value)} autoFocus />
                    <button className="cl-field__edit-save" onClick={() => onSaveField('conferenceDate')} disabled={editSaving}>&#10003;</button>
                    <button className="cl-field__edit-cancel" onClick={onCancelEdit}>&#10005;</button>
                  </div>
                  {editError && <span className="cl-field__edit-error">{editError}</span>}
                </dd>
              ) : (
                <dd className="cl-field__editable">
                  {selected.caseConferenceDate ?? '\u2014'}
                  <button className="cl-field__edit-btn" onClick={() => onStartEdit('conferenceDate', selected.caseConferenceDate ?? '')}>&#9998;</button>
                </dd>
              )}
            </div>
          </dl>

          <div className="cl-detail-tabs">
            <button className={`cl-detail-tab${detailTab === 'visits' ? ' is-active' : ''}`} onClick={() => onDetailTabChange('visits')}>Visit History</button>
            <button className={`cl-detail-tab${detailTab === 'notes' ? ' is-active' : ''}`} onClick={() => onDetailTabChange('notes')}>Session Notes</button>
          </div>

          {detailTab === 'visits' && (
            <>
              <div className="cl-section-header">
                <p className="section-title" style={{ margin: 0 }}>Visit History</p>
                <button className="cl-add-note-btn" onClick={onOpenVisitModal}>+ Log Visit</button>
              </div>
              {visitsLoading && <div className="inline-loading">Loading visits...</div>}
              {!visitsLoading && concernVisits.length > 0 && (
                <div className="cl-concern-callout">
                  &#9888; {concernVisits.length} visit{concernVisits.length !== 1 ? 's' : ''} flagged with Concern outcome — review observations below.
                </div>
              )}
              {!visitsLoading && sortedVisits.length === 0 && <div className="empty-state">No visit history</div>}
              {!visitsLoading && sortedVisits.length > 0 && (
                <>
                  <div className="cl-timeline">
                    {displayedVisits.map(visit => (
                      <div key={visit.visitationId} className={`cl-timeline-card${visit.visitOutcome?.toLowerCase() === 'concern' ? ' cl-timeline-card--concern' : ''}`}>
                        <div className="cl-timeline-card__header">
                          <span className="cl-timeline-card__date">{visit.visitDate ?? 'No date'}</span>
                          {visit.visitType && <span className="badge badge--blue">{visit.visitType}</span>}
                          {visit.visitOutcome && <span className={`badge ${visit.visitOutcome.toLowerCase() === 'positive' ? 'badge--green' : visit.visitOutcome.toLowerCase() === 'concern' ? 'badge--red' : 'badge--gray'}`}>{visit.visitOutcome}</span>}
                          <span className="cl-timeline-card__worker">{visit.socialWorker}</span>
                        </div>
                        {visit.observations && <p className="cl-timeline-card__text">{visit.observations}</p>}
                      </div>
                    ))}
                  </div>
                  {sortedVisits.length > 10 && (
                    !visitsShowAll
                      ? <button className="cl-show-more" onClick={() => onToggleVisitsShowAll(true)}>Show {sortedVisits.length - 10} more visits</button>
                      : <button className="cl-show-more" onClick={() => onToggleVisitsShowAll(false)}>Show less</button>
                  )}
                </>
              )}
            </>
          )}

          {detailTab === 'notes' && (
            <>
              <div className="cl-section-header">
                <p className="section-title" style={{ margin: 0 }}>Session Notes</p>
                <button className="cl-add-note-btn" onClick={onOpenNoteModal}>+ Add Note</button>
              </div>
              {sessionsLoading && <div className="inline-loading">Loading sessions...</div>}
              {!sessionsLoading && sortedSessions.length === 0 && <div className="empty-state">No session notes</div>}
              {!sessionsLoading && sortedSessions.length > 0 && (
                <>
                  <div className="cl-timeline">
                    {displayedSessions.map(session => (
                      <div key={session.recordingId} className="cl-timeline-card">
                        <div className="cl-timeline-card__header">
                          <span className="cl-timeline-card__date">{session.sessionDate ?? 'No date'}</span>
                          {session.sessionType && <span className="badge badge--purple">{session.sessionType}</span>}
                          {session.notesRestricted === 'Y' && <span className="badge badge--red">Restricted</span>}
                          <span className="cl-timeline-card__worker">{session.socialWorker}</span>
                        </div>
                        <p className="cl-timeline-card__text">{session.sessionNarrative || <em>No narrative recorded</em>}</p>
                      </div>
                    ))}
                  </div>
                  {sortedSessions.length > 10 && (
                    !sessionsShowAll
                      ? <button className="cl-show-more" onClick={() => onToggleSessionsShowAll(true)}>Show {sortedSessions.length - 10} more sessions</button>
                      : <button className="cl-show-more" onClick={() => onToggleSessionsShowAll(false)}>Show less</button>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}
