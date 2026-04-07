# Handoff — Admin Dashboard Session

## Project
North Star Sanctuary — a shelter management app for at-risk youth. The admin portal is used by staff to track residents (kids), manage donors, and log casework. The frontend is a React + TypeScript + Vite app at `frontend/`. The backend is .NET at `backend/`. Deployed on Vercel.

## Current Branch
`admin-dashboard` — PR #31 open against `main` (byu-blake-create/Intex-II#31).

## What Was Built This Session

### 1. Nav Redesign — `frontend/src/components/AdminLayout.tsx` + `AdminLayout.css`
Two-level navigation:
- **Top nav**: Dashboard · Workbenches · Social Suite · Database (Database only visible to Admin role)
- **Workbench subnav**: Underline tab bar (Donors · Caseload · Process Recording · Visitations) that appears whenever the user is on any workbench route. "Workbenches" in the top nav highlights as active on any workbench route.
- Removed the old single-line workbench contextual bar that said "Workbench: Donors / Back to dashboard"

### 2. Dashboard Enhancements — `frontend/src/pages/admin/AdminDashboard.tsx` + `AdminDashboard.css`
- **Safety Alerts strip**: Red-tinted strip at the top showing only ML `alert`-tone cards whose `route` contains `caseload` or `visitations`. Resident/child safety only. Hidden if none exist.
- **Donation velocity trend**: The "Amount (30d)" stat card shows a ↑/↓ arrow with % change vs the prior month using `fetchDonationsByMonth(2)`.
- **Needs Attention inbox**: Amber-tinted section showing upcoming case conferences (linked to `/admin/caseload`) + any `alert`-tone ML cards routed to donors/outreach (non-safety). Shows green "All clear" if nothing is pending.

### 3. Donors Enhancements — `frontend/src/pages/admin/DonorsPage.tsx` + `DonorsPage.css`
- **Lapsed donor flag**: In detail panel header — amber "Lapsed – Last gift 180d+" badge if most recent donation > 180 days ago; gray "No donations on record" if no donations. Only shown after donations load.
- **Log Contact modal**: "Log Contact" button in detail header opens modal (contactDate, contactType select, notes textarea). POSTs to `/api/supporters/{id}/contacts`. Shows 3-second success then closes. Error shown inline. **Note: this backend endpoint may not exist yet — needs to be wired up.**
- **30-day goal progress bar**: Shows sum of selected supporter's donations in the last 30 days vs `MONTHLY_GOAL = 10000` (const at top of file — change as needed). Only shown when donations exist.

### 4. Caseload Enhancements — `frontend/src/pages/admin/CaseloadPage.tsx` + `CaseloadPage.css`
- **Case conference countdown**: Amber notice bar at top of detail panel (always visible) when `summary.upcomingCaseConferences > 0`. Links to `/admin/reports`. Loads `fetchSummary()` on mount.
- **Overdue visit warning**: Red danger banner in resident detail if last visit > 30 days ago, or no visits on record. Only shown after visits load.
- **Concern visit callout**: Amber banner above visit timeline if any visit has `visitOutcome === 'concern'`. Individual concern cards get `cl-timeline-card--concern` class (red left border + tinted bg).
- **Add Session Note modal**: "+ Add Note" button next to Session Notes section title. Modal fields: sessionDate, sessionType (select), socialWorker, sessionNarrative (textarea), notesRestricted (checkbox). POSTs to `/api/processrecordings`. On success, re-fetches and refreshes the session list.

## Known Gaps / Follow-up Items
1. **`/api/supporters/{id}/contacts` endpoint does not exist** — the Log Contact button on DonorsPage will fail gracefully (shows error) until the backend implements this. A `SupporterContacts` table and controller endpoint need to be added.
2. **Per-resident case conference date** — the caseload page shows a global upcoming conference count, not per-resident. The `Resident` type has no `caseConferenceDate` field. If you want per-resident countdown, add the field to the DB, the type, and the API.
3. **Overdue visit indicator in the sidebar list** — currently the overdue warning only shows in the detail panel after a resident is selected. Showing it in the list (left sidebar) would require loading visit data for all residents upfront or adding a backend filter. Not done yet.
4. **Lapsed donor filter in sidebar** — same issue as above; lapsed flag only shows in detail panel. A backend filter param on `fetchSupporters` would be needed for list-level filtering.

## Key Files
| File | What it does |
|------|-------------|
| `frontend/src/components/AdminLayout.tsx` | Shell, nav, workbench subnav |
| `frontend/src/components/AdminLayout.css` | All admin theme tokens + shared utility classes |
| `frontend/src/pages/admin/AdminDashboard.tsx` | Command center — stats, signals, alerts |
| `frontend/src/pages/admin/DonorsPage.tsx` | Supporter list + detail, contact log, goal bar |
| `frontend/src/pages/admin/CaseloadPage.tsx` | Resident list + detail, visits, session notes |
| `frontend/src/lib/api.ts` | `apiGet`, `apiPost`, `apiPut`, `apiDelete` — all use `credentials: include` |
| `frontend/src/lib/adminDashboardApi.ts` | `fetchAdminDashboard()` → `/api/reports/command-center` |
| `frontend/src/lib/reportsApi.ts` | `fetchSummary()`, `fetchDonationsByMonth(n)` |
| `frontend/src/types/domain.ts` | All shared TypeScript types |

## Database
You have access to the same Supabase database. The project is connected — check `.env` or Vercel env vars for `VITE_API_BASE_URL` and backend connection strings.

## How to Run
```bash
cd frontend && npm run dev   # frontend on localhost:5173
# backend runs separately — see backend/ for .NET setup
```
