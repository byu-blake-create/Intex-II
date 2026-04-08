# Handoff

## Current State
- Branch: `admin-dashboard`
- Scope since the last merged PR: resident intake, safehouse reassignment, resident actions/show-more, workbench restructuring, case conference wiring
- Main status: donor contact logging works; several resident-related write flows are currently blocked by backend model validation

## What Needs To Be Done Next
1. Fix backend model binding/validation so write endpoints accept the payloads the frontend is actually sending.
   - `POST /api/residents` currently rejects frontend payloads because `Resident.Safehouse` is required.
   - `PUT /api/residents/{id}` has the same problem, which likely breaks close/reopen, inline edits, and safehouse reassignment.
   - `POST /api/processrecordings` currently rejects frontend payloads because `ProcessRecording.Resident` is required.
   - `POST /api/homevisitations` currently rejects frontend payloads because `HomeVisitation.Resident` is required.
2. Fix the resident creation modal UX.
   - The modal is too tall and does not scroll correctly.
   - Scrolling currently moves the page behind the modal instead of the modal content.
3. Clean up frontend build/lint blockers.
   - Remove unused imports in [App.tsx](/Users/noahblake/Desktop/Intex/frontend/src/App.tsx#L19) and [App.tsx](/Users/noahblake/Desktop/Intex/frontend/src/App.tsx#L20).
   - Address `react-hooks/set-state-in-effect` lint errors in [SafehousesPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/SafehousesPage.tsx#L41), [SafehousesPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/SafehousesPage.tsx#L76), and [SafehousesPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/SafehousesPage.tsx#L86).
4. After fixes, rerun resident workflow testing end-to-end.
   - New resident
   - Close case / reopen case
   - Edit social worker
   - Edit case conference date
   - Log visit
   - Add session note
   - Reassign safehouse

## Tests Run

### Automated Checks
- `dotnet build /Users/noahblake/Desktop/Intex/NorthStarShelter.slnx`
  - Result: passed
- `npm run build` in `frontend/`
  - Result: failed
  - Cause: unused imports in [App.tsx](/Users/noahblake/Desktop/Intex/frontend/src/App.tsx#L19) and [App.tsx](/Users/noahblake/Desktop/Intex/frontend/src/App.tsx#L20)
- `npm run lint` in `frontend/`
  - Result: failed
  - Causes:
    - unused imports in [App.tsx](/Users/noahblake/Desktop/Intex/frontend/src/App.tsx#L19) and [App.tsx](/Users/noahblake/Desktop/Intex/frontend/src/App.tsx#L20)
    - `react-hooks/set-state-in-effect` in [SafehousesPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/SafehousesPage.tsx#L41), [SafehousesPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/SafehousesPage.tsx#L76), [SafehousesPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/SafehousesPage.tsx#L86)

### API Smoke Tests I Ran
- Logged in to a disposable local admin instance
  - Result: passed
- Created supporter contact via `/api/supporters/{id}/contacts`
  - Result: passed
- Listed supporter contacts
  - Result: passed
- Created resident using the same scalar-only shape the frontend sends in [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L340)
  - Result: failed with `Safehouse field is required`
- Updated resident using the same shape the frontend sends in [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L205) and [SafehousesPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/SafehousesPage.tsx#L126)
  - Result: failed with `Safehouse field is required`
- Created process recording using the same shape the frontend sends in [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L237)
  - Result: failed with `Resident field is required`
- Created home visitation using the same shape the frontend sends in [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L286)
  - Result: failed with `Resident field is required`

### Browser Smoke Tests I Ran
- Local frontend dev server boot
  - Result: passed
- Cookie consent flow
  - Result: works
- Donor contact logging through the UI
  - Result: passed
- New resident flow through the UI
  - Result: reproduces backend `Safehouse` validation error

## My Findings
- Resident create is broken because frontend payloads omit nested `safehouse`, while backend validation currently requires `Resident.Safehouse` in [Resident.cs](/Users/noahblake/Desktop/Intex/backend/NorthStarShelter.API/Models/Resident.cs#L59).
- Resident update is likely broken for the same reason, affecting:
  - close/reopen in [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L216)
  - inline field saves in [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L200)
  - safehouse reassignment in [SafehousesPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/SafehousesPage.tsx#L120)
- Process recording create is broken because backend validation currently requires `ProcessRecording.Resident` in [ProcessRecording.cs](/Users/noahblake/Desktop/Intex/backend/NorthStarShelter.API/Models/ProcessRecording.cs#L21).
- Home visitation create is broken because backend validation currently requires `HomeVisitation.Resident` in [HomeVisitation.cs](/Users/noahblake/Desktop/Intex/backend/NorthStarShelter.API/Models/HomeVisitation.cs#L20).
- Donor contact logging is working and persisted correctly in both API and browser smoke tests.

## Your Findings
- `{"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status":400,"errors":{"Safehouse":["The Safehouse field is required."]},"traceId":"00-a37551b57a211ca453645e0032c7f68d-b84b0273bfb0ef1c-00"}`
  - Comes when trying to make new resident
- Close case / reopen case do nothing
- New resident creation popout is too big and does not scroll properly
  - Scrolling scrolls behind it
- `{"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status":400,"errors":{"Resident":["The Resident field is required."]},"traceId":"00-061538902669d821ffa3e886c5b3be7b-93762ae2d4868efa-00"}`
  - Comes when trying to log a new visit
- `{"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status":400,"errors":{"Resident":["The Resident field is required."]},"traceId":"00-af43ced9f71d5fa4a34b0719964284f2-b2b99ba871681422-00"}`
  - Comes when trying to log a new session note
- `{"type":"https://tools.ietf.org/html/rfc9110#section-15.5.1","title":"One or more validation errors occurred.","status":400,"errors":{"Safehouse":["The Safehouse field is required."]},"traceId":"00-d82712c53c37965e325e900a2d215418-2d86fab699716cf8-00"}`
  - Comes when trying to reassign a new safehouse
- Donor contact logging works and persists
- Safehouse workbench appears to be real data
- Resident portal search works, banner comes up
- Cookie works

## Likely Fix Area
- Frontend payloads:
  - [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L340)
  - [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L205)
  - [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L237)
  - [CaseloadPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/CaseloadPage.tsx#L286)
  - [SafehousesPage.tsx](/Users/noahblake/Desktop/Intex/frontend/src/pages/admin/SafehousesPage.tsx#L120)
- Backend model binding requirements:
  - [Resident.cs](/Users/noahblake/Desktop/Intex/backend/NorthStarShelter.API/Models/Resident.cs#L59)
  - [ProcessRecording.cs](/Users/noahblake/Desktop/Intex/backend/NorthStarShelter.API/Models/ProcessRecording.cs#L21)
  - [HomeVisitation.cs](/Users/noahblake/Desktop/Intex/backend/NorthStarShelter.API/Models/HomeVisitation.cs#L20)

## Recommended Retest Order After Fixes
1. New resident creation
2. Close case / reopen case
3. Safehouse reassignment
4. Add session note
5. Log visit
6. Resident modal scrolling
7. Full frontend build and lint
