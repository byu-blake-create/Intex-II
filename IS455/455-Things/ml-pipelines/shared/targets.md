# Pipeline Target Definitions (locked after data audit)

## Pipeline 1 — Donor Retention
- **Unit:** supporter (60 rows)
- **Label:** `label_donated_again` = 1 if supporter donated within 90 days after snapshot_date
- **Positive rate:** ~38.6% (at 2025-01-01 snapshot)
- **Date column:** `donations.donation_date`
- **Snapshot strategy:** use 2024-01-01 as snapshot; label window 2024-01-01 to 2024-04-01
- **Train/test:** time-based — train on donations up to 2024-06-01, test on later

## Pipeline 2 — Donation Value Forecasting
- **Unit:** donation (420 rows)
- **Label:** `amount` (regression) — use `log1p(amount)` as model target, report RMSE on original scale
- **Note:** amounts range $250–$6,482, median $820 — right-skewed, log transform essential
- **Train/test:** time-based split on `donation_date`

## Pipeline 3 — Resident Risk / Concerns Triage
- **Unit:** process_recording session (2,819 rows across 60 residents)
- **Label:** `concerns_flagged` = True (677 positives = 24% — good balance)
- **Frame:** predict whether a session will flag concerns, using prior session + resident context features
- **Alternative label at resident level:** "has any concerns_flagged session in trailing 30 days"
- **Key feature cols:** `emotional_state_observed`, `session_type`, `session_duration_minutes`, `progress_noted`, `interventions_applied`
- **Train/test:** time-based split on `session_date`

## Pipeline 4 — Reintegration Readiness
- **Unit:** home_visitation (1,337 rows, 58 residents)
- **Label:** `label_favorable` = 1 if `visit_outcome == 'Favorable'` (551/1337 = 41%)
- **Focus:** filter to `visit_type == 'Reintegration Assessment'` for explanatory model (316 rows)
- **Key feature cols:** `family_cooperation_level`, `safety_concerns_noted`, `visit_type`, `follow_up_needed`
- **Join:** resident-level features (education, health, incident history) at visit_date snapshot
- **Train/test:** time-based split on `visit_date`

## Pipeline 5 — Safehouse Capacity Forecasting
- **Unit:** safehouse-month panel (450 rows, 9 safehouses × ~50 months)
- **Label:** `active_residents` (regression) — mean=6.7, std=2.2, well-distributed
- **Why not incident_count:** mean=0.22, 75th pct=0 — too sparse for meaningful regression
- **Lag features:** active_residents lag-1, lag-2, lag-3 months per safehouse
- **Train/test:** time-based split on `month_start` (train pre-2026, test 2026+)

## Pipeline 6 — Social Post Performance (conditional)
- **Unit:** social_media_post (812 rows, 7 platforms)
- **Label (regression):** `engagement_rate` (already computed, mean=0.10)
- **Label (classification alt):** binary high_engagement = engagement_rate > median
- **Key feature cols:** `platform`, `likes`, `shares`, `comments`, `impressions`, `reach`
- **Train/test:** time-based split on `created_at`
