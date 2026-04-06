# Admin Page Checklist

This checklist is the execution companion to [ML-Website-Implementation-Map.md](/Users/johne/Documents/Coding/BYU/Intex-II/IS455/ML-Website-Implementation-Map.md).

Use this file when building the staff-facing product pages so the ML work becomes real workflows instead of isolated model outputs.

## How To Use This Checklist

- treat each page as a workbench, not just a reporting surface
- connect every ML feature to a user action
- include model credibility details where staff need trust
- prefer interactive tools over passive charts whenever possible
- keep public-facing storytelling separate from internal admin decision tools

## Shared Admin Requirements

Apply these to every admin page that uses ML:

- Add loading, error, and empty states
- Show model score in plain language, not just raw numbers
- Show `Model Info` with training date, version, and key metric
- Show top factor / top drivers where available
- Include a clear human-review disclaimer
- Support filtering and sorting where ranked outputs are shown
- Make the page responsive for desktop and tablet at minimum
- Add API integration notes in code comments or page-level docs as needed

## `/admin`

File:
- [AdminDashboard.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/AdminDashboard.tsx)

Goal:
- make this the command center
- summarize what needs attention today
- route staff into deeper work pages

Checklist:
- Add summary cards for donor retention watchlist count
- Add summary cards for top donor opportunities count
- Add summary cards for resident triage count
- Add summary cards for reintegration-ready residents count
- Add summary cards for safehouse forecast highlights
- Add summary cards for outreach/content planner highlights
- Add “View all” links into the matching workbench pages
- Do not overload this page with detailed tables

Recommended ML references:
- donor retention
- donation value / high-value opportunity
- resident risk
- reintegration readiness
- safehouse forecasting
- social post performance

Recommended endpoints:
- `GET /api/ml/watchlist/donors`
- `GET /api/ml/top-opportunities`
- `GET /api/ml/watchlist/residents`
- `GET /api/ml/reintegration`
- `GET /api/ml/safehouse-forecast`
- `GET /api/ml/social-post-performance`

## `/admin/donors`

File:
- [DonorsPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/DonorsPage.tsx)

Goal:
- make this the donor operations workbench
- help admins retain donors and target likely high-value donors

Checklist:
- Add a ranked `Donors to Contact This Week` list
- Add a ranked `Top Opportunities` list
- Let staff switch between retention risk and opportunity ranking
- Add filters for donor type, region, acquisition channel, and risk/opportunity tier
- Add a donor detail side panel or drawer
- In the drawer show:
- donor score
- top factor
- recent history summary
- model info
- suggested next action
- Add action logging UI:
- email sent
- phone call completed
- follow-up scheduled
- no action needed
- Consider a blended priority view combining retention risk and high-value probability

Recommended ML references:
- donor retention
- high-value donation opportunity
- future donor upgrade / recurring-gift propensity later

Recommended endpoints:
- `GET /api/ml/watchlist/donors`
- `GET /api/ml/top-opportunities`

Interactive requirement:
- this page should be a queue staff can work through
- not just a static table or chart

## `/admin/caseload`

File:
- [CaseloadPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/CaseloadPage.tsx)

Goal:
- make this the resident triage workbench
- help supervisors prioritize who needs review

Checklist:
- Add a ranked resident triage queue
- Show risk level badge and probability
- Show top factor for each resident
- Add filters for safehouse, case status, and current risk level
- Add resident detail panel with:
- latest relevant context
- recent concern trend
- latest visit/support indicators
- action buttons:
- flag for human review
- open process recording history
- assign follow-up
- mark reviewed

Recommended ML references:
- resident risk triage

Recommended endpoints:
- `GET /api/ml/watchlist/residents`

Interactive requirement:
- the triage list should drive case-management action, not just show scores

## `/admin/process-recording`

File:
- [ProcessRecordingPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/ProcessRecordingPage.tsx)

Goal:
- support session documentation
- optionally surface risk context where helpful

Checklist:
- Keep this page focused on recording and reviewing counseling sessions
- Optionally show a small resident risk summary banner when a resident is selected
- Link back into `/admin/caseload` for full triage workflow
- Do not turn this whole page into an ML dashboard

Recommended ML references:
- resident risk summary only

Recommended endpoints:
- optional reuse of `GET /api/ml/watchlist/residents` or resident-specific ML detail endpoint later

## `/admin/visitations`

File:
- [VisitationsPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/VisitationsPage.tsx)

Goal:
- make this the reintegration planning workbench
- support scenario analysis before case decisions

Checklist:
- Show current reintegration readiness probability for the selected resident
- Show top supportive and limiting factors
- Add a what-if simulator form with adjustable inputs:
- family cooperation level
- days since last visit
- follow-up completion
- visit type or other supported fields
- Show current vs simulated probability side by side
- Show a clear disclaimer that the tool is assistive, not deterministic
- Add a way to reset the scenario back to current values
- Add a way to save or note scenario insights in staff workflow later

Recommended ML references:
- reintegration readiness

Recommended endpoints:
- `GET /api/ml/reintegration`
- `POST /api/ml/reintegration/what-if`

Interactive requirement:
- this page should be one of the strongest interactive ML experiences in the product

## `/admin/reports`

File:
- [ReportsPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/ReportsPage.tsx)

Goal:
- central place for analytics, monitoring, and model credibility

Checklist:
- Add safehouse forecasting section
- Add model performance summary cards
- Add actual vs predicted sections where useful
- Add feature importance / coefficient summaries
- Add social post performance analytics summary
- Add model health / freshness indicators
- Keep this page focused on monitoring and analysis
- Avoid making this the only place people can interact with ML

Recommended ML references:
- safehouse forecasting
- social post performance analytics
- model credibility summaries for all active pipelines

Recommended endpoints:
- `GET /api/ml/safehouse-forecast`
- `GET /api/ml/social-post-performance`
- optional `GET /api/ml/models`

## New Page: `/admin/outreach`

Status:
- recommended to add

Goal:
- make this the outreach/content planning workbench

Checklist:
- Add a social post performance planner form
- Add recent post monitor with actual vs predicted engagement
- Add recommendation panel for:
- best platform
- best media type
- best time window
- best content topic
- Add ability to compare draft post setups
- Add model info and top factor display
- Add campaign-level filtering

Recommended ML references:
- social post performance
- future campaign response propensity
- future outreach recommendation assistant

Recommended endpoints:
- `GET /api/ml/social-post-performance`
- `POST /api/ml/social-post-performance`

Interactive requirement:
- this should not be a dashboard-only page
- it should actively help admins answer:
- will this post likely do well?
- what should we change?
- what kind of social content should we be posting more often?

## Optional New Page: `/admin/models`

Status:
- optional

Goal:
- give the team one place for model transparency

Checklist:
- Show model list
- Show training date
- Show last refresh
- Show key metric
- Show linked page/workflow using each model
- Show status / health note

Recommended endpoints:
- `GET /api/ml/models`

## Recommended Build Order

Use this order when implementing the admin-side ML experiences:

1. `/admin`
2. `/admin/donors`
3. `/admin/caseload`
4. `/admin/visitations`
5. `/admin/reports`
6. `/admin/outreach`
7. optional `/admin/models`

## Quick Build Priorities

If the team needs the shortest high-value path:

1. Build `/admin/donors` as the donor workbench
2. Build `/admin/caseload` as the resident triage workbench
3. Build `/admin/visitations` with the reintegration what-if simulator
4. Build `/admin/outreach` with the social content planner
5. Use `/admin/reports` for monitoring and credibility

## Donor/Admin Pipeline Ideas To Keep In Mind

These fit the admin product especially well later:

- donor conversion propensity
- recurring-gift enrollment propensity
- donor upgrade propensity
- campaign response propensity
- next-best-action recommender
- impact story response pipeline

See [ML-Website-Implementation-Map.md](/Users/johne/Documents/Coding/BYU/Intex-II/IS455/ML-Website-Implementation-Map.md) for the broader product and route strategy around these additions.
