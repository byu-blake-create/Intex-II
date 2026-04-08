# Handoff — Admin Portal Session 2

## Project
North Star Sanctuary — a shelter management app for at-risk youth (girls). The admin portal is used by staff to track residents, manage donors, and log casework. Frontend: React + TypeScript + Vite at `frontend/`. Backend: .NET at `backend/`. Deployed on Vercel. Database: SQL Server via Entity Framework Core.

## Branch & PR
Branch: `admin-dashboard` — PR #31 open against `main` (byu-blake-create/Intex-II#31).
All changes are committed and pushed. Working tree is clean.

---

## What Was Built This Session

### Nav (AdminLayout.tsx + AdminLayout.css)
Two-level navigation:
- **Top nav**: Dashboard · Workbenches · Social Suite · Database
- **Workbench subnav tab bar** (appears on workbench routes): Donors · Residents · Safehouses
- `/admin/process-recording` and `/admin/visitations` redirect to `/admin/caseload` (no longer in nav)

### Donors Workbench (`DonorsPage.tsx` / `DonorsPage.css`)
- **30-day goal bar**: Computed per-donor — last month's total × 1.1, floor at $10
- **History toggle**: "Donation History" | "Contact History" tabs under the donor signal
- **Contact History**: Fetches from `GET /api/supporters/{id}/contacts` (backend added this session)
- **Log Contact modal**: POSTs to `POST /api/supporters/{id}/contacts`
- **Lapsed donor flag**: Amber badge if last donation > 180 days ago

### Residents Workbench (`CaseloadPage.tsx` / `CaseloadPage.css`)
Route: `/admin/caseload`, label: "Residents"
- **Detail panel tabs**: Visit History | Session Notes (no more scrolling)
- **Visit History tab**: sorted most-recent-first, capped at 10 with Show more/less
- **Session Notes tab**: same sorting and cap
- **Log Visit modal**: POST to `/api/homevisitations` (fields: date, type, socialWorker, observations, outcome)
- **Add Session Note modal**: POST to `/api/processrecordings`
- **Close Case / Reopen Case**: button in resident header, PUTs full resident object to `PUT /api/residents/{id}`
- **Inline edit**: Social Worker and Case Conference Date fields have pencil-edit with save/cancel (same PUT)
- **Safety features**: Overdue visit warning (30d), Concern visit callout + red border, case conference countdown banner
- **Per-resident conference banner**: Red if past, amber if within 7 days

### Safehouses Workbench (`SafehousesPage.tsx` / `SafehousesPage.css`)
Route: `/admin/safehouses`
- Lists all safehouses with live active-resident count badges (loaded via Promise.all)
- Detail panel: safehouse metadata + paginated active residents list

### Dashboard (`AdminDashboard.tsx` / `AdminDashboard.css`)
- Safety Alerts strip (caseload/visitations alert-tone ML cards only)
- Needs Attention inbox (donor/outreach alert cards + case conference count)
- Donation velocity trend arrow on Amount (30d) stat card

---

## Key Files
| File | Purpose |
|------|---------|
| `frontend/src/components/AdminLayout.tsx` | Shell, nav, workbench subnav |
| `frontend/src/components/AdminLayout.css` | All admin theme tokens + shared utility classes |
| `frontend/src/pages/admin/AdminDashboard.tsx` | Command center |
| `frontend/src/pages/admin/DonorsPage.tsx` | Donor management |
| `frontend/src/pages/admin/CaseloadPage.tsx` | Resident management (main workbench) |
| `frontend/src/pages/admin/SafehousesPage.tsx` | Safehouse locations workbench |
| `frontend/src/lib/api.ts` | `apiGet`, `apiPost`, `apiPut`, `apiDelete` — all use `credentials: include` |
| `frontend/src/lib/supporterContactsApi.ts` | `fetchSupporterContacts(id)` → GET /api/supporters/{id}/contacts |
| `frontend/src/lib/residentsApi.ts` | `fetchResidents(params)` |
| `frontend/src/lib/visitationsApi.ts` | `fetchVisitations(residentId)` |
| `frontend/src/lib/processRecordingsApi.ts` | `fetchProcessRecordings(residentId)` |
| `frontend/src/types/domain.ts` | All shared TypeScript types |
| `frontend/src/App.tsx` | Route definitions |
| `backend/.../Controllers/SupportersController.cs` | Includes GET + POST /api/supporters/{id}/contacts |
| `backend/.../Controllers/ResidentsController.cs` | Includes PUT /api/residents/{id} |
| `backend/.../Models/SupporterContact.cs` | SupporterContact model |
| `backend/.../Data/DatabaseInitializer.cs` | Auto-creates SupporterContacts table + CaseConferenceDate column on startup |

## CSS Token Reference (used everywhere)
`--adm-accent`, `--adm-accent-dim`, `--adm-card`, `--adm-border`, `--adm-ink`, `--adm-muted`, `--adm-bg`, `--adm-surface`, `--adm-shadow-soft`, `--adm-danger-bg`, `--adm-danger-border`, `--adm-danger-ink`

Shared utility classes (defined in `AdminLayout.css`, available globally):
`.badge`, `.badge--red/amber/green/blue/purple/gray`, `.stat-card`, `.section-title`, `.empty-state`, `.inline-loading`, `.page-header`, `.admin-table`, `.admin-table-wrap`

---

## Known Gaps / Potential Next Steps
1. **No way to add a new resident** — there's a `POST /api/residents` endpoint but no UI for it. Could add a "+ New Resident" button on the Residents workbench.
2. **Safehouses workbench is read-only** — can view residents per safehouse but can't edit safehouse info or reassign a resident to a different safehouse.
3. **Donor contact history has no "outcome" field** — the `SupporterContact` model has `ContactDate`, `ContactType`, `Notes` but no success/outcome indicator. Could add a `Outcome` field (e.g. "Pledged", "Not interested", "Follow up") to the model, migration, and UI.
4. **No toast/notification system** — errors and successes are shown inline. A global toast would be cleaner.
5. **Social Suite workbench** (`/admin/social`) hasn't been touched — still the original page.
6. **Reports page** (`/admin/reports`) exists but isn't in the top nav — only reachable via URL or the case conference link on Caseload.

## How to Run
```bash
cd frontend && npm run dev    # frontend on localhost:5173
# backend runs separately — see backend/ for .NET setup
```

## Agent Instructions
You have full read/write access to the codebase. Start by reading this file and any specific page you're working on. The TypeScript check is `npx tsc --noEmit` from `frontend/`. Always run it before committing. Commit messages should follow the existing style (imperative, concise summary line + bullet details).
