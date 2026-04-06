# ML Website Implementation Map

This document is the concrete reference for how Northstar Shelters' machine-learning pipelines should connect to the website.

It is intentionally product-focused, not just model-focused:
- which existing pages should host which ML features
- which new pages/routes should be added
- which backend endpoints will be needed
- which experiences should be interactive rather than passive dashboards
- which future donor/admin pipelines would fit the product well

## Current Website Base

The current route shell already exists in [App.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/App.tsx):

- Public:
  - `/`
  - `/impact`
  - `/login`
  - `/privacy`
- Admin:
  - `/admin`
  - `/admin/donors`
  - `/admin/caseload`
  - `/admin/process-recording`
  - `/admin/visitations`
  - `/admin/reports`

Current reality:
- the page skeleton exists
- most admin/public pages are still placeholders
- the backend currently only exposes auth endpoints
- ML integration will require both frontend page work and new backend API endpoints

## Product Principle

Not every pipeline should become “a chart on a dashboard.”

We should build:
- summary cards where summaries make sense
- ranked queues where staff need prioritization
- interactive planners and simulators where staff need decision support
- public-facing ML-informed storytelling only where it helps donor conversion or trust

The right pattern is:
- dashboards for overview
- workbenches for action

## Existing Pages To Use

### `/admin`

Use [AdminDashboard.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/AdminDashboard.tsx) as the command center.

Good ML uses here:
- donor retention watchlist count
- high-value donor opportunity count
- residents flagged for review
- reintegration-ready residents count
- safehouse forecast summary
- social-post planner summary

This page should stay summary-oriented.
It should link staff into deeper tools, not try to hold the whole workflow.

### `/admin/donors`

Use [DonorsPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/DonorsPage.tsx) as the main donor ML workbench.

Best fits:
- Donors to Contact This Week
- Top High-Value Opportunities
- donor-level model info / top factors
- suggested next action
- donor segmentation / filters

This should be more than a table:
- ranked donor queue
- donor detail side panel
- action logging
- filters by probability, donor type, region, acquisition channel, campaign history

### `/admin/caseload`

Use [CaseloadPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/CaseloadPage.tsx) as the main resident triage workbench.

Best fits:
- resident risk-ranked triage list
- risk level + top factor
- filter by safehouse / case status / current risk level
- open resident detail and see why flagged

This page should support action:
- “flag for human review”
- “schedule follow-up”
- “open most recent session”

### `/admin/visitations`

Use [VisitationsPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/VisitationsPage.tsx) for reintegration readiness.

Best fits:
- reintegration probability
- what-if simulator
- latest supportive factors / barriers
- compare “current” vs “adjusted” scenario

This is one of the best places for an interactive ML feature.

### `/admin/reports`

Use [ReportsPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/admin/ReportsPage.tsx) for analytics and model credibility.

Best fits:
- safehouse forecasting
- social post performance analytics
- model comparison cards
- feature importance summaries
- “actual vs predicted” monitoring

This page should hold:
- trends
- model performance
- batch outputs
- monitoring

It should not be the only place staff interact with ML.

### `/impact`

Use [ImpactPage.tsx](/Users/johne/Documents/Coding/BYU/Intex-II/frontend/src/pages/public/ImpactPage.tsx) for public, donor-safe aggregate outputs only.

Good fits:
- anonymized impact metrics
- aggregate content-performance learnings
- donation impact summaries
- trend storytelling

Do not put internal risk lists or staff triage outputs here.

## New Pages To Add

### `/admin/outreach`

Recommended new page.

Purpose:
- home for pipeline 6 and future donor-acquisition/content pipelines

Core features:
- social post performance planner
- recent post performance monitor
- content recommendations by platform/media/time/topic
- campaign planning support

Why it deserves its own page:
- outreach/content planning is a real workflow
- pipeline 6 wants an interactive tool, not just a report tile

### `/donate` or `/support`

Recommended public page.

Purpose:
- main donor conversion page
- later home for conversion-focused experimentation and ML-informed personalization

Potential future ML uses:
- donor conversion funnel optimization
- dynamic recommended giving levels
- better CTA and storytelling alignment

### `/admin/models`

Optional but useful.

Purpose:
- internal “Model Center”
- show model version, training date, metric, status, refresh cadence

This is useful if you want one trustworthy place for:
- model credibility
- auditability
- deployment notes

## Pipeline To Page Map

## Pipeline 1: Donor Retention

Primary page:
- `/admin/donors`

Secondary surfaces:
- `/admin`
- `/admin/reports`

Best UX:
- ranked queue: “Donors to Contact This Week”
- filters: high/medium/low risk
- donor detail drawer:
  - churn probability
  - top factor
  - model info
  - suggested action

Recommended endpoint:
- `GET /api/ml/watchlist/donors`

## Pipeline 2: High-Value Donation Opportunity

Primary page:
- `/admin/donors`

Secondary surfaces:
- `/admin`

Best UX:
- “Top Opportunities” ranked list
- sort by high-value probability
- compare donor retention risk vs high-value opportunity
- suggested ask tier / outreach priority

Recommended endpoint:
- `GET /api/ml/top-opportunities`

## Pipeline 3: Resident Risk Triage

Primary page:
- `/admin/caseload`

Secondary surfaces:
- `/admin`

Best UX:
- triage queue by resident
- risk tier badges
- top factor
- fast filter by safehouse
- action shortcuts:
  - flag for human review
  - open session history
  - assign supervisor follow-up

Recommended endpoint:
- `GET /api/ml/watchlist/residents`

## Pipeline 4: Reintegration Readiness

Primary page:
- `/admin/visitations`

Secondary surfaces:
- `/admin/caseload`

Best UX:
- resident-specific readiness card
- what-if simulator
- latest visit context
- highlighted supportive and limiting factors

Recommended endpoints:
- `GET /api/ml/reintegration`
- `POST /api/ml/reintegration/what-if`

## Pipeline 5: Safehouse Forecasting

Primary page:
- `/admin/reports`

Secondary surfaces:
- `/admin`

Best UX:
- forecast panel by safehouse and month
- confidence band / interval
- staffing / supply interpretation

Recommended endpoint:
- `GET /api/ml/safehouse-forecast`

## Pipeline 6: Social Post Performance

Primary page:
- `/admin/outreach`

Secondary surfaces:
- `/admin/reports`
- `/admin`

Best UX:
- interactive content planner
- recent-post monitor
- actual vs predicted engagement
- recommendation panel

Recommended endpoints:
- `GET /api/ml/social-post-performance`
- `POST /api/ml/social-post-performance`

## Interactive Tools To Build

These are the highest-value interactive experiences.

## 1. Donor Action Queue

Page:
- `/admin/donors`

Combines:
- donor retention
- high-value opportunity

Interaction:
- sort by one score or a blended priority score
- open donor side panel
- mark action taken
- assign owner
- log contact method

Why it matters:
- this turns ML into fundraising operations, not a passive score list

## 2. Reintegration What-If Simulator

Page:
- `/admin/visitations`

Interaction:
- adjust family cooperation
- adjust follow-up completion
- adjust days since last visit
- compare current vs simulated outcome probability

Why it matters:
- helps staff think with the model
- increases trust and interpretability
- supports planning, not automation

## 3. Social Content Planner

Page:
- `/admin/outreach`

This should be one of the most interactive ML features on the site.

Inputs:
- platform
- post type
- media type
- content topic
- caption length
- hashtag count
- CTA type
- post hour
- campaign flag
- resident story toggle
- boost budget

Outputs:
- predicted engagement rate
- performance tier
- top factor
- “better alternatives” suggestions

Important:
- this should not just say “score = 0.11”
- it should help the admin answer:
  - should we post this on Facebook or Instagram?
  - should this be a Reel instead of a Photo?
  - is this better as an impact story or campaign ask?
  - is this a bad posting hour?

## 4. Outreach Recommendation Assistant

Page:
- `/admin/outreach`
- optionally reuse in `/admin/donors`

Interaction:
- choose campaign goal:
  - awareness
  - donor acquisition
  - donor retention
  - event promotion
- system recommends:
  - best content topic
  - best media type
  - best platform
  - best posting window

This can start as rules + pipeline 6 outputs.

## 5. Donor Opportunity Scenario View

Page:
- `/admin/donors`

Interaction:
- filter by acquisition channel, region, donor type
- compare “all donors” vs “likely high-value donors” vs “at-risk donors”
- see which campaign/history patterns are associated with stronger opportunity

This makes pipeline 2 much more useful to admins than a static ranked table.

## Concrete Backend Plan

The current backend only has auth, so ML needs a new controller layer.

Recommended controller:
- `MlController.cs`

Recommended endpoint groups:

- `GET /api/ml/watchlist/donors`
- `GET /api/ml/top-opportunities`
- `GET /api/ml/watchlist/residents`
- `GET /api/ml/reintegration`
- `POST /api/ml/reintegration/what-if`
- `GET /api/ml/safehouse-forecast`
- `GET /api/ml/social-post-performance`
- `POST /api/ml/social-post-performance`
- optional: `GET /api/ml/models`

Implementation pattern:
- phase 1:
  - read prediction JSON artifacts from `IS455/models`
  - return normalized API responses
- phase 2:
  - add live scoring endpoints for interactive tools
  - load serialized models and metadata
  - validate input and return score + factors

## Model Credibility UI

Every ML surface should include:
- model name
- training date
- key metric
- top factor
- disclaimer

Recommended shared UI pattern:
- small “Model Info” tooltip or expandable panel

This should live on:
- donor queue items
- resident triage cards
- reintegration simulator
- social content planner results

## Additional Pipelines That Fit The Website Well

These are the best donor/admin-focused additions beyond the current six.

## Best Fits

### Donor Conversion Propensity

Goal:
- predict which potential supporters are most likely to become first-time donors

Best page fit:
- `/donate`
- `/admin/donors`
- `/admin/outreach`

Why it fits:
- directly supports potential donors becoming real donors

### Recurring-Gift Enrollment Propensity

Goal:
- predict which one-time donors are most likely to become monthly donors

Best page fit:
- `/admin/donors`

Why it fits:
- strong retention and revenue value

### Donor Upgrade Propensity

Goal:
- predict which current donors are most likely to increase their giving tier

Best page fit:
- `/admin/donors`

Why it fits:
- very actionable for development staff

### Campaign Response Propensity

Goal:
- predict which donors are likely to respond to a campaign or ask type

Best page fit:
- `/admin/outreach`
- `/admin/donors`

Why it fits:
- supports smarter segmentation

### Next-Best-Action Recommender

Goal:
- recommend whether staff should call, email, invite, steward, or wait

Best page fit:
- `/admin/donors`

Why it fits:
- turns probabilities into next-step guidance

### Impact Story Response Pipeline

Goal:
- estimate which kinds of stories/content are most associated with donor interest

Best page fit:
- `/admin/outreach`
- `/impact`

Why it fits:
- ties public storytelling to donor strategy

## Good Later Fits

These become stronger once the website tracks more user behavior.

### Page-to-Donor Conversion Model

Needs:
- pageview and conversion analytics

Pages:
- `/`
- `/impact`
- `/donate`

### Volunteer-to-Donor Conversion Model

Needs:
- volunteer form and later giving records

Pages:
- `/support`
- `/admin/donors`

### CTA / Landing Page Uplift Model

Needs:
- experiments or A/B test data

Pages:
- `/donate`
- campaign landing pages

### Donor Lifetime Value Model

Needs:
- more time history and cleaner donor-value tracking

Pages:
- `/admin/donors`
- `/admin/reports`

## Recommended Build Order

If we want a realistic implementation sequence:

1. Use existing routes first:
- `/admin`
- `/admin/donors`
- `/admin/caseload`
- `/admin/visitations`
- `/admin/reports`

2. Add these backend endpoints first:
- donor watchlist
- donor top opportunities
- resident watchlist
- reintegration batch results
- safehouse forecast

3. Add the first interactive tool:
- reintegration what-if simulator

4. Add the next dedicated page:
- `/admin/outreach`

5. Build the most product-worthy interactive donor/admin tool:
- social content planner

6. Add public donor-conversion surface:
- `/donate`

## Short Version

The right website architecture is:

- summary on `/admin`
- donor workbench on `/admin/donors`
- resident triage on `/admin/caseload`
- reintegration simulation on `/admin/visitations`
- analytics and monitoring on `/admin/reports`
- outreach/content planning on `/admin/outreach`
- donor conversion on `/donate`

The right ML product strategy is:

- don’t turn every pipeline into a dashboard
- turn the best ones into interactive decision tools
- especially for:
  - donor prioritization
  - reintegration scenario planning
  - social content planning
