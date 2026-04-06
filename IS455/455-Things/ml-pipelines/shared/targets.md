# Pipeline Target Definitions (locked after data audit)

## Pipeline 1 — Donor Retention
- **Unit:** supporter-month snapshot (2,160 rows)
- **Label:** `label_donated_again` = 1 if supporter donated within 90 days after snapshot_date
- **Positive rate:** ~39% overall in the monthly panel
- **Date column:** `donations.donation_date`
- **Snapshot strategy:** one leakage-safe monthly snapshot per supporter
- **Key feature cols:** `recency_days`, `donation_count`, `monetary_total`, `monetary_avg`, `recurring_rate`, donation-type mix, channel mix, campaign-history counts, `avg_gap_days`, program/safehouse spread, supporter profile fields
- **Train/test:** time-based — hold out the latest 4 monthly snapshots

## Pipeline 2 — Donation Value Forecasting
- **Unit:** supporter-month snapshot (2,160 rows)
- **Label:** `label_high_value` = 1 if next 90-day monetary total is at least `1000 PHP`
- **Note:** exact future amount was too noisy on holdout, so the predictive framing was revised to a high-value opportunity classification problem
- **Key feature cols:** same leakage-safe donor-month features as Pipeline 1
- **Train/test:** time-based — hold out the latest 6 monthly snapshots

## Pipeline 3 — Resident Risk / Concerns Triage
- **Unit:** resident-month snapshot
- **Label:** `label_next90d_concern` = 1 if the resident has any future session with `concerns_flagged = True` in the next 90 days
- **Frame:** predict resident-level support need for triage, using recent session/visit/plan context
- **Key feature cols:** `concern_rate_90d`, `session_count_30d`, `session_duration_minutes`, `emotional_state_observed`, `family_cooperation_level`, `visit_outcome`, `current_risk_level`, `plan_count_total`
- **Train/test:** time-based — hold out the latest 6 resident-month snapshots

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
- **Key feature cols:** `platform`, `post_type`, `media_type`, `post_hour`, `num_hashtags`, `mentions_count`, `caption_length`, `call_to_action_type`, `content_topic`, `sentiment_tone`, `features_resident_story`, `is_boosted`, `boost_budget_php`, `follower_count_at_post`
- **Leakage rule:** exclude post-outcome metrics such as `impressions`, `reach`, `likes`, `comments`, `shares`, `saves`, `click_throughs`, `video_views`, `donation_referrals`, and `estimated_donation_value_php`
- **Train/test:** time-based split on `created_at`
