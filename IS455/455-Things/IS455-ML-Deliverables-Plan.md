# IS 455 – ML Deliverables Plan (Final — CCG Synthesized)

**Due: Friday April 10 @ 10:00 AM**
**Weight: 1/5 of overall INTEX grade (20 pts rubric)**
**Today: Monday April 6 — 4 days remaining**

*Synthesized from: Claude analysis of full IS455 requirements + Codex technical review + Gemini UX/demo review*

---

## What IS 455 graders actually care about

From the rubric, each pipeline is scored on **5 stages**:

| Stage | What they look for |
|---|---|
| Problem Framing | Business problem clearly stated; predictive vs. explanatory explicitly justified |
| Data Acq/Prep/Exploration | Thorough EDA; feature engineering documented; reproducible pipeline; joins explained |
| Modeling & Feature Selection | Right tool for goal; multiple approaches compared; baseline model included; feature selection justified |
| Evaluation & Interpretation | Appropriate metrics; proper validation (time-based splits where applicable); results in **business terms**; FP/FN consequences |
| Deployment & Integration | Model live in app; meaningful to end users; not just a notebook |

**Critical rules:**
- Each pipeline needs both a **predictive model** AND an **explanatory model**
- Every notebook needs a **baseline model** for comparison (e.g., LogisticRegression before CatBoost)
- Every notebook needs an explicit **leakage check** section
- Use **time-based train/test splits** for anything time-ordered (donations, monthly metrics) — random splits overstate performance
- Notebooks must be **self-contained and runnable top-to-bottom**
- Each notebook needs **6 written sections** (prose, not just code)
- Anything not shown in the IS455 video **doesn't exist** to graders
- The prediction vs. explanation distinction is the **#1 thing graders check** — state it explicitly per pipeline

---

## Priority: 5 Pipelines + 1 Conditional

| # | Notebook | Domain | Predictive model | Explanatory model | Risk |
|---|---|---|---|---|---|
| 1 | `01-donor-retention.ipynb` | Donor | CatBoostClassifier | Logistic Regression (odds ratios) | Low — clear label |
| 2 | `02-donation-value-forecasting.ipynb` | Donor | CatBoostRegressor on log1p(amount) | GammaRegressor / Elastic Net | Low — reuses Pipeline 1 features |
| 3 | `03-resident-risk-triage.ipynb` | Case Mgmt | CatBoostClassifier (class-weighted) | Logistic Regression or GAM | Medium — label + leakage careful |
| 4 | `04-reintegration-readiness.ipynb` | Case Mgmt | Logistic / CatBoost on snapshots | Logistic Regression w/ causal caveats | Medium — check label exists first |
| 5 | `05-safehouse-forecasting.ipynb` | Operations | Lagged boosted trees / SARIMAX | Panel regression / mixed effects | Medium — check history length |
| 6* | `06-social-post-performance.ipynb` *(conditional)* | Outreach | Elastic Net / Poisson model | Negative Binomial GLM | Low — but check row count first |

**Deprioritized (fold into other notebooks as supporting analysis, not primary pipelines):**
- Donor segmentation clustering — doesn't satisfy predictive+explanatory rubric cleanly; fold into Pipeline 1 as EDA
- Counseling effectiveness — likely weak labels + strong confounding by case severity
- NLP from narratives — use as feature-engineering module inside Pipeline 3, not standalone
- Social-to-donation attribution — not defensible without explicit campaign linkage data
- Anomaly detection — weak rubric fit unless paired with supervised outcome

---

## Data files

All 17 CSVs in `455-Things/lighthouse_csv_v7/lighthouse_csv_v7/`:

**Donor/Support:** `supporters`, `donations`, `donation_allocations`, `in_kind_donation_items`, `partners`, `partner_assignments`, `safehouses`

**Case Management:** `residents`, `process_recordings`, `home_visitations`, `education_records`, `health_wellbeing_records`, `intervention_plans`, `incident_reports`, `safehouse_monthly_metrics`

**Outreach:** `social_media_posts`, `public_impact_snapshots`

**First thing to do: data audit.** Before building any pipeline, build three reusable snapshot tables:
- `donor_snapshot` — entity: supporter; time key: month; features: RFM + channel + allocations
- `resident_snapshot` — entity: resident; time key: observation date; features: incidents, health, education, visitations
- `safehouse_monthly` — entity: safehouse; time key: month; features: occupancy, incidents, metrics

---

## Build order (day by day)

### Monday (today) — Foundation + Pipeline 1
1. Create `ml-pipelines/` folder + `shared/` module in repo
2. Build `shared/data_loader.py` — load all CSVs, build the three snapshot tables, leakage rules
3. Run data audit: row counts, nulls, dtypes, key distributions across all tables (`00-data-exploration.ipynb`)
4. Define target labels + prediction windows for all 5 pipelines before writing any model code
5. Build Pipeline 1 (Donor Retention) — all 6 sections including baseline model + leakage check

### Tuesday — Pipelines 2 + 3
6. Build Pipeline 2 (Donation Value Forecasting) — reuses donor feature pipeline from P1
7. Build Pipeline 3 (Resident Risk Triage) — all 6 sections; extra care on leakage + ethics note

### Wednesday — Pipelines 4 + 5 + app integration
8. Inspect data: does `home_visitations` have a clean outcome label for reintegration? If yes → P4; if no → swap to social post performance
9. Build Pipeline 4 (Reintegration Readiness OR Social Post Performance)
10. Build Pipeline 5 (Safehouse Forecasting — check row history; if too short, use Social Post instead)
11. Wire up Triage Wizard in app (Pipeline 3 → risk-ranked resident list → action checklist)
12. Wire up What-if Simulator on resident profile (Pipeline 3 or 4 → adjust inputs → see predicted change)

### Thursday — Polish + video prep
13. Build Pipeline 6 if time allows
14. Run ALL notebooks top-to-bottom; fix paths and dependencies
15. Verify all 6 written sections are prose (not just code) in each notebook
16. Add model credibility signals to app UI (see below)
17. Rehearse IS455 video (see script)

### Friday morning — Submit by 10:00 AM

---

## Repo structure

```
ml-pipelines/
  00-data-exploration.ipynb         ← shared EDA (not a scored pipeline)
  01-donor-retention.ipynb
  02-donation-value-forecasting.ipynb
  03-resident-risk-triage.ipynb
  04-reintegration-readiness.ipynb
  05-safehouse-forecasting.ipynb
  06-social-post-performance.ipynb  ← conditional
  shared/
    data_loader.py                  ← load + join CSVs, snapshot tables, leakage rules
    model_utils.py                  ← serialize/load models, metrics helpers
models/
  donor_retention_catboost.pkl
  donation_value_catboost.pkl
  resident_risk_catboost.pkl
  reintegration_catboost.pkl
  safehouse_forecast_model.pkl
```

---

## Required 6 sections per notebook (use these exact headings)

1. **Problem Framing** — business question, who cares, why it matters. Explicitly state: "This is a **predictive** model" OR "This is an **explanatory** model" and justify. Include baseline model description.
2. **Data Acquisition, Preparation & Exploration** — load data, EDA (visuals + stats), feature engineering with explanation, join logic, **leakage check** (what features could leak the outcome and how you prevented it), reproducible pipeline.
3. **Modeling & Feature Selection** — baseline model first, then improved model, feature selection justified (not "throw everything in"), hyperparameter tuning, multiple approaches compared.
4. **Evaluation & Interpretation** — metrics in business terms (not just R²/accuracy), FP/FN consequences for THIS org, time-based train/test split for temporal data.
5. **Causal and Relationship Analysis** — which features matter and why, are causal claims defensible, explicitly discuss correlation vs causation. Address prediction vs. explanation distinction at depth.
6. **Deployment Notes** — how it's deployed (API endpoint, dashboard component), link to integration code, ethics/privacy note for resident pipelines.

---

## Per-pipeline specifics

### Pipeline 1: Donor Retention
**Business question:** Which donors are at risk of lapsing, and what drives retention?

**Tables:** `supporters`, `donations`, `donation_allocations`

**Target:** Binary — donated again within next 90 days (engineer "churned" flag; snapshot at month `t`, outcome in `t+90d`)

**Leakage risk:** Don't include any donation data after the snapshot date when building features.

**Features to engineer:**
- Recency (days since last donation at snapshot)
- Frequency (total donation count up to snapshot)
- Monetary (avg + total donation value)
- Donation channel / type (one-hot)
- Tenure (days since first donation)
- Allocation spread (# distinct programs funded)

**Baseline:** `DummyClassifier(strategy='most_frequent')`
**Predictive:** `CatBoostClassifier` (handles class imbalance with `class_weights='balanced'`)
**Explanatory:** Regularized `LogisticRegression` with odds ratios → "donors who give monthly are X× more likely to be retained"

**App integration:** Batch-scored weekly → "Donors to contact this week" list with churn probability + top driver per donor

---

### Pipeline 2: Donation Value Forecasting
**Business question:** How much is a donor likely to give in the next period, and what drives higher giving?

**Tables:** `supporters`, `donations`, `donation_allocations`

**Target:** Next donation amount (or next-90-day total) — use `log1p(amount)` as target (right-skewed)

**Leakage risk:** Same time-snapshot discipline as P1. Use time-based train/test split.

**Features:** Reuse donor feature pipeline from P1 + add historical avg donation amount, max donation, number of in-kind vs monetary donations

**Baseline:** `ElasticNet` on log-transformed target
**Predictive:** `CatBoostRegressor` on `log1p(amount)`; evaluate with RMSE on original scale
**Explanatory:** `GammaRegressor` or `TweedieRegressor` — coefficients directly interpretable as multiplicative effects on donation amount

**App integration:** Fundraising forecast page + "Top opportunities" list (donors predicted to give >$X if asked)

---

### Pipeline 3: Resident Risk Triage
**Business question:** Which residents are at risk of a serious incident in the next 30 days?

**Tables:** `residents`, `incident_reports`, `education_records`, `health_wellbeing_records`, `home_visitations`, `process_recordings`, `intervention_plans`

**Target:** Binary — had a serious incident in next 30 days (concrete label from `incident_reports` timestamps)

**Leakage risk (high):** Features must only use data recorded BEFORE the outcome window. Do not include interventions or process recordings from after the snapshot date. Missingness in records may reflect case severity — document this.

**Features to engineer:**
- Days since last home visitation
- Incident count in trailing 30/60/90 days
- Education progress delta (improving vs declining)
- Most recent emotional state from `process_recordings`
- Intervention plan recency
- Safehouse occupancy load at snapshot

**Baseline:** `DummyClassifier` + class-frequency baseline
**Predictive:** `CatBoostClassifier(class_weight='balanced')` — optimize recall (missing high-risk girl = costly FN)
**Explanatory:** `LogisticRegression` with odds ratios; or GAM if non-linear relationships found

**Ethics/Privacy note in Deployment section:** Model augments caseworker judgment; never deterministic. All predictions must include "Flag for Human Review" button. Use softer language: "profile aligns with patterns indicating higher support need" — never "will relapse."

**App integration:** Triage Wizard — select safehouse → risk-ranked resident list → drill into resident → top 3 risk drivers → action checklist

---

### Pipeline 4: Reintegration Readiness
**Business question:** How ready is a resident for reintegration, and which factors correlate with readiness?

**Tables:** `home_visitations`, `process_recordings`, `education_records`, `health_wellbeing_records`, `incident_reports`

**Target (check data first):** Favorable visitation outcome, discharge status, or sustained stability (X days without incident). If a clean binary label cannot be constructed, swap this pipeline for social post performance.

**Features to engineer:**
- Home environment score (from visitation)
- Family cooperation level
- Incident count (recent trailing window)
- Education progress trend
- Health/wellbeing trend
- Counseling session frequency

**Baseline:** `LogisticRegression` with no feature engineering
**Predictive:** `CatBoostClassifier` or `DecisionTreeClassifier` (interpretable; max_depth tuned via CV)
**Explanatory:** `LogisticRegression` with explicit causal caveats ("more services may indicate higher severity — these are correlations, not causal estimates")

**App integration:** What-if Simulator — adjust controllable inputs on resident profile → predicted readiness changes. Must include explicit disclaimer: "This is a predictive sensitivity tool; it does not prove causality."

---

### Pipeline 5: Safehouse Forecasting
**Business question:** What operational load is each safehouse likely to face next month?

**Tables:** `safehouses`, `safehouse_monthly_metrics`, `incident_reports`

**Target:** Monthly incident count, or occupancy/capacity ratio — pick one concrete metric

**Check first:** How many months of history exist per safehouse? If fewer than 12 months, use a pooled panel model across all safehouses (not per-safehouse models).

**Features to engineer:**
- Lagged target (t-1, t-2, t-3 months)
- Month-of-year (seasonality)
- Safehouse capacity
- Resident count at start of period
- Cumulative incidents trailing

**Baseline:** Seasonal naive (predict same month last year, or trailing average)
**Predictive:** Lagged `CatBoostRegressor` or `GradientBoostingRegressor` on pooled panel; `SARIMAX` only if history is long
**Explanatory:** Panel regression with fixed effects; `SARIMAX` with interpretable seasonal components

**App integration:** Leadership planning page — forecast next month's load per safehouse + risk flags for overloaded safehouses

---

### Pipeline 6 (Conditional): Social Post Performance
**Business question:** What post characteristics drive engagement, and what should we change?

**Tables:** `social_media_posts`

**Check first:** How many rows? If under ~100 posts, results will be too noisy to be meaningful.

**Target:** Engagement rate (regression) or binary high/low engagement (classification)

**Features to engineer:**
- Platform (one-hot)
- Post length (character count)
- Day of week / hour posted
- Presence of image, hashtags, links (parsed from text)
- Time since account creation (seasonality proxy)

**Baseline:** `DummyRegressor(strategy='mean')`
**Predictive:** `ElasticNet` or `CatBoostRegressor`
**Explanatory:** OLS or `PoissonRegressor` — coefficients directly inform strategy ("posts with images have X% higher engagement")

**App integration:** Draft Post Evaluator — paste draft → predicted engagement tier + top 3 improvement suggestions

---

## Deployed app integrations (3 integrations, prioritized)

### 1. Triage Wizard (Pipeline 3) — highest demo impact
Step-by-step: Select safehouse → risk-ranked resident list → drill into resident → top 3 risk drivers → action checklist.
Batch-scored nightly; app reads from `ml_predictions` table in DB.

### 2. What-if Simulator (Pipeline 3 or 4) — strongest "demo pop"
User adjusts controllable inputs (counseling frequency, days since visitation) → predicted score updates.
Shows graders the model is live and responding to input — clearly ML-backed.
Must include explicit "not causal" disclaimer on the UI.

### 3. Donor Outreach List (Pipeline 1) — high utility, low implementation cost
Batch-scored weekly → ranked list of at-risk donors with churn probability + top driver per donor.
Displayed on admin dashboard as a watchlist.

### Model credibility signals in the UI (per Gemini)
Show these next to every prediction:
- **Top Factors** list: "Risk +15% due to recent incident" (feature importances in plain English)
- **Model Info tooltip:** last training date + F1-score or RMSE
- **"Flag for Human Review"** button on every prediction (especially resident risk)
- **Confidence %** alongside score (use predicted probability from classifier)

### Why not the Decision Assistant chatbot?
A constrained chatbot is hard to distinguish from a programmed decision tree or an OpenAI API call in a 5-minute video. The What-if Simulator achieves the same "interactive ML" effect with zero ambiguity about what's driving the output.

---

## Backend serving (recommended pattern)

**Batch scoring (for most features):**
- Nightly job rescores all residents + donors → writes to `ml_predictions` DB table → app reads from DB
- No real-time inference needed for Triage Wizard or Donor Watchlist

**Real-time endpoint (only for What-if Simulator + Draft Post Evaluator):**
```
POST /api/ml/resident-risk          ← real-time score for what-if simulator
POST /api/ml/social-post-evaluate   ← score a draft post
GET  /api/ml/watchlist/residents    ← batch results: top N at-risk residents
GET  /api/ml/watchlist/donors       ← batch results: top N at-churn donors
GET  /api/ml/safehouse-forecast     ← next month predictions per safehouse
```

**Serving pattern:** Python FastAPI microservice loads pickled models at startup; .NET backend proxies to it. OR run batch scoring script, write results to DB, skip microservice entirely for most features.

---

## IS455 video script (keep under 10 min)

1. **(30 sec)** GitHub → open `ml-pipelines/` → show all 5 notebooks listed
2. **(90 sec) Pipeline 1 in depth:**
   - Problem Framing: read first 2 sentences
   - Show 2 EDA plots (distribution + correlation)
   - Show baseline vs CatBoost comparison table
   - Say evaluation result in business terms: "We correctly identify X% of lapsing donors"
   - Show Causal Analysis key finding
   - Show Deployment Notes → mention batch scoring endpoint
3. **(90 sec) Pipeline 3 in depth** (resident risk — most impressive to graders)
   - Same structure; emphasize FP/FN: "a false negative means a girl at risk goes unnoticed"
   - Show ethics/privacy note
4. **(20 sec each × 3)** Pipelines 2, 4, 5 — just show notebook exists, has all 6 sections, mention algorithm used
5. **(3 min) Live app:**
   - Open Triage Wizard → select safehouse → show risk-ranked list → drill into resident → show top 3 drivers + action checklist
   - Open What-if Simulator → adjust counseling frequency slider → show predicted readiness change
   - Open Donor Watchlist → show top 10 at-risk donors with churn probability
   - Show "Model Info" tooltip (training date + F1)
6. **(10 sec close):** "5 complete pipelines, all deployed and integrated. Notebooks are runnable top-to-bottom."

**Demo data note:** Use anonymized/synthetic names in the video. Don't show anything that looks like real PII for minors.

---

## Algorithm quick reference

For **hundreds to low thousands of rows** — no deep learning.

| Task | Baseline | Predictive | Explanatory |
|---|---|---|---|
| Classification | `LogisticRegression` | `CatBoostClassifier` | Regularized LogReg + odds ratios |
| Regression (normal target) | `ElasticNet` | `CatBoostRegressor` | OLS |
| Regression (skewed/positive target) | `ElasticNet` on log1p | `CatBoostRegressor` on log1p | `GammaRegressor` / `TweedieRegressor` |
| Count outcomes | `DummyRegressor` | `CatBoostRegressor` | `PoissonRegressor` / Negative Binomial GLM |
| Forecasting | Seasonal naive | Lagged `GradientBoostingRegressor` | Panel regression / `SARIMAX` |
| Text features | TF-IDF + `LogisticRegression` | TF-IDF + boosted model | TF-IDF + LogReg coefficients |

---

## What changed across plan revisions

| Original Cursor plan | This final plan |
|---|---|
| 11 pipelines | 5 core + 1 conditional (quality-first) |
| Donor Segmentation as Pipeline 4 | Replaced with Donation Value Forecasting (better rubric fit; clustering ≠ predictive+explanatory) |
| Random Forest throughout | CatBoostClassifier/Regressor (handles small data + categoricals better) |
| No baseline models | Baseline model required in every notebook |
| No leakage guidance | Explicit leakage check required in every notebook |
| Random train/test splits | Time-based splits for temporal pipelines |
| 5 integrations | 3 integrations done well; chatbot dropped (hard to prove ML-backed) |
| No video script | Explicit timed script |
| No ethics guidance | Ethics/privacy note required in resident pipeline deployment sections |
| No algorithm guidance for data size | Specific algorithms sized for small nonprofit datasets |
