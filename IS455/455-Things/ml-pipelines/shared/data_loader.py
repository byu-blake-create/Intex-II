"""
Shared data loader — load all 17 CSVs, build reusable snapshot tables.

Usage (in any notebook):
    import sys; sys.path.insert(0, '..')
    from shared.data_loader import load_all, build_donor_snapshot, build_resident_snapshot, build_safehouse_monthly

Design rules (leakage prevention):
    - All snapshot builders take a `snapshot_date` parameter.
    - Features are computed ONLY from data on or before snapshot_date.
    - Outcome labels are computed from data AFTER snapshot_date.
    - Never call .fit() on preprocessors before the train/test split.
"""

import pandas as pd
import numpy as np
from pathlib import Path
from .config import DATA_DIR


# ── Raw loaders ───────────────────────────────────────────────────────────────

def load_all() -> dict[str, pd.DataFrame]:
    """Load all 17 CSVs into a dict keyed by table name."""
    tables = {}
    for f in DATA_DIR.glob("*.csv"):
        df = pd.read_csv(f, low_memory=False)
        # Standardise column names: lowercase + strip spaces
        df.columns = df.columns.str.lower().str.strip().str.replace(" ", "_")
        tables[f.stem] = df
    print(f"[load_all] Loaded {len(tables)} tables: {sorted(tables.keys())}")
    return tables


def parse_dates(df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
    """Parse a list of columns to datetime, coercing errors."""
    for c in cols:
        if c in df.columns:
            df[c] = pd.to_datetime(df[c], errors="coerce")
    return df


# ── Donor snapshot ────────────────────────────────────────────────────────────

def build_donor_snapshot(
    tables: dict,
    snapshot_date: pd.Timestamp,
    outcome_window_days: int = 90,
) -> pd.DataFrame:
    """
    Build one row per supporter with RFM-style features up to snapshot_date
    and a binary outcome label (donated again within outcome_window_days).

    Leakage rule: features use donations WHERE date <= snapshot_date.
                  label uses donations WHERE date > snapshot_date
                  AND date <= snapshot_date + outcome_window_days.

    Returns
    -------
    pd.DataFrame with columns:
        supporter_id, recency_days, frequency, monetary_total, monetary_avg,
        monetary_max, tenure_days, allocation_spread,
        [+ supporter demographic cols],
        label_donated_again  (1 = donated in window, 0 = did not)
    """
    supporters = tables["supporters"].copy()
    donations  = tables["donations"].copy()
    allocs     = tables["donation_allocations"].copy()

    donations = parse_dates(donations, ["donation_date"])

    # Identify the date column (handle possible naming variants)
    date_col = _find_date_col(donations, ["donation_date", "date"])

    # ── Feature window: on/before snapshot ───────────────────────────────────
    hist = donations[donations[date_col] <= snapshot_date].copy()

    # RFM aggregations per supporter
    agg = (
        hist.groupby("supporter_id")
        .agg(
            last_donation_date=(date_col, "max"),
            frequency=(date_col, "count"),
            monetary_total=("amount", "sum"),
            monetary_avg=("amount", "mean"),
            monetary_max=("amount", "max"),
        )
        .reset_index()
    )
    agg["recency_days"] = (snapshot_date - agg["last_donation_date"]).dt.days

    # Allocation spread (distinct programs funded)
    if "donation_id" in donations.columns and "program" in allocs.columns:
        hist_ids = hist["donation_id"].unique()
        spread = (
            allocs[allocs["donation_id"].isin(hist_ids)]
            .merge(hist[["donation_id", "supporter_id"]], on="donation_id", how="left")
            .groupby("supporter_id")["program"]
            .nunique()
            .reset_index()
            .rename(columns={"program": "allocation_spread"})
        )
        agg = agg.merge(spread, on="supporter_id", how="left")
    agg["allocation_spread"] = agg.get("allocation_spread", pd.Series(0)).fillna(0)

    # Merge supporter metadata
    supporters = parse_dates(supporters, ["created_at", "first_donation_date", "join_date"])
    join_col = _find_date_col(supporters, ["created_at", "first_donation_date", "join_date"], required=False)
    if join_col:
        supporters["tenure_days"] = (snapshot_date - supporters[join_col]).dt.days

    snap = supporters.merge(agg, on="supporter_id", how="left")
    snap["frequency"]      = snap["frequency"].fillna(0)
    snap["monetary_total"] = snap["monetary_total"].fillna(0)
    snap["monetary_avg"]   = snap["monetary_avg"].fillna(0)
    snap["monetary_max"]   = snap["monetary_max"].fillna(0)
    snap["recency_days"]   = snap["recency_days"].fillna(9999)  # never donated = large recency

    # ── Outcome window: after snapshot ───────────────────────────────────────
    outcome_end = snapshot_date + pd.Timedelta(days=outcome_window_days)
    future = donations[
        (donations[date_col] > snapshot_date) &
        (donations[date_col] <= outcome_end)
    ]
    donated_again = set(future["supporter_id"].unique())
    snap["label_donated_again"] = snap["supporter_id"].isin(donated_again).astype(int)

    print(
        f"[donor_snapshot] {len(snap)} supporters | "
        f"label=1: {snap['label_donated_again'].sum()} "
        f"({snap['label_donated_again'].mean():.1%})"
    )
    return snap


# ── Resident snapshot ─────────────────────────────────────────────────────────

def build_resident_snapshot(
    tables: dict,
    snapshot_date: pd.Timestamp,
    outcome_window_days: int = 30,
) -> pd.DataFrame:
    """
    Build one row per resident with case-management features up to snapshot_date
    and a binary outcome label (serious incident in next outcome_window_days).

    Leakage rule: ALL feature data must be on/before snapshot_date.
                  Interventions or notes recorded AFTER snapshot_date are excluded.

    Returns
    -------
    pd.DataFrame with columns:
        resident_id, days_since_last_visitation, incident_count_30d,
        incident_count_90d, incident_count_total, education_progress_delta,
        last_emotional_state, intervention_recency_days, safehouse_occupancy,
        label_incident  (1 = serious incident in window, 0 = none)
    """
    residents  = tables["residents"].copy()
    incidents  = tables["incident_reports"].copy()
    visits     = tables["home_visitations"].copy()
    education  = tables["education_records"].copy()
    health     = tables["health_wellbeing_records"].copy()
    process    = tables["process_recordings"].copy()
    plans      = tables["intervention_plans"].copy()
    safehouses = tables["safehouses"].copy()

    incidents = parse_dates(incidents, ["incident_date", "date", "created_at"])
    visits    = parse_dates(visits,    ["visit_date", "date", "visitation_date"])
    process   = parse_dates(process,   ["session_date", "date", "recording_date"])
    plans     = parse_dates(plans,     ["target_date", "created_at", "plan_date", "date"])
    education = parse_dates(education, ["record_date", "date", "created_at"])

    inc_date  = _find_date_col(incidents, ["incident_date", "date", "created_at"])
    vis_date  = _find_date_col(visits,    ["visit_date", "date", "visitation_date"])
    proc_date = _find_date_col(process,   ["session_date", "date", "recording_date"])
    plan_date = _find_date_col(plans,     ["target_date", "created_at", "plan_date", "date"])

    snap = residents[["resident_id"]].copy() if "resident_id" in residents.columns else residents[["id"]].copy().rename(columns={"id": "resident_id"})

    # ── Days since last home visitation ──────────────────────────────────────
    if vis_date:
        past_visits = visits[visits[vis_date] <= snapshot_date]
        last_visit  = past_visits.groupby("resident_id")[vis_date].max().reset_index()
        last_visit["days_since_last_visitation"] = (snapshot_date - last_visit[vis_date]).dt.days
        snap = snap.merge(last_visit[["resident_id", "days_since_last_visitation"]], on="resident_id", how="left")
    snap["days_since_last_visitation"] = snap.get("days_since_last_visitation", pd.Series(999)).fillna(999)

    # ── Incident counts (trailing windows) ───────────────────────────────────
    if inc_date:
        past_inc = incidents[incidents[inc_date] <= snapshot_date]
        for window, col in [(30, "incident_count_30d"), (90, "incident_count_90d"), (None, "incident_count_total")]:
            cutoff = snapshot_date - pd.Timedelta(days=window) if window else pd.Timestamp("1900-01-01")
            filtered = past_inc[past_inc[inc_date] >= cutoff] if window else past_inc
            counts = filtered.groupby("resident_id").size().reset_index(name=col)
            snap = snap.merge(counts, on="resident_id", how="left")
    for c in ["incident_count_30d", "incident_count_90d", "incident_count_total"]:
        snap[c] = snap.get(c, pd.Series(0)).fillna(0)

    # ── Last emotional state from process recordings ──────────────────────────
    emo_col = _find_id_col(process, ["emotional_state_observed", "emotional_state"])
    if proc_date and emo_col:
        past_proc = process[process[proc_date] <= snapshot_date]
        latest = past_proc.sort_values(proc_date).groupby("resident_id").last().reset_index()
        snap = snap.merge(latest[["resident_id", emo_col]].rename(columns={emo_col: "last_emotional_state"}), on="resident_id", how="left")

    # ── Intervention plan recency ─────────────────────────────────────────────
    if plan_date:
        past_plans = plans[plans[plan_date] <= snapshot_date]
        last_plan  = past_plans.groupby("resident_id")[plan_date].max().reset_index()
        last_plan["intervention_recency_days"] = (snapshot_date - last_plan[plan_date]).dt.days
        snap = snap.merge(last_plan[["resident_id", "intervention_recency_days"]], on="resident_id", how="left")
    snap["intervention_recency_days"] = snap.get("intervention_recency_days", pd.Series(999)).fillna(999)

    # ── Outcome label ─────────────────────────────────────────────────────────
    if inc_date:
        outcome_end = snapshot_date + pd.Timedelta(days=outcome_window_days)
        future_inc  = incidents[
            (incidents[inc_date] > snapshot_date) &
            (incidents[inc_date] <= outcome_end)
        ]
        had_incident = set(future_inc["resident_id"].unique())
        snap["label_incident"] = snap["resident_id"].isin(had_incident).astype(int)
    else:
        snap["label_incident"] = np.nan
        print("[resident_snapshot] WARNING: could not find incident date column — label not set")

    print(
        f"[resident_snapshot] {len(snap)} residents | "
        f"label=1: {snap['label_incident'].sum() if 'label_incident' in snap else 'N/A'}"
    )
    return snap


# ── Safehouse monthly snapshot ────────────────────────────────────────────────

def build_safehouse_monthly(tables: dict) -> pd.DataFrame:
    """
    Build a panel table: one row per (safehouse_id, month).
    Adds lagged features for forecasting.

    Returns
    -------
    pd.DataFrame with columns:
        safehouse_id, year, month, [metric cols], lag_1, lag_2, lag_3
    """
    metrics = tables["safehouse_monthly_metrics"].copy()
    metrics = parse_dates(metrics, ["month_start", "month_end"])
    date_col = "month_start"

    metrics["year"]       = metrics[date_col].dt.year
    metrics["month_num"]  = metrics[date_col].dt.month

    # Primary forecast target: active_residents (well-distributed; incident_count is too sparse)
    target  = "active_residents"
    sid_col = "safehouse_id"
    metrics = metrics.sort_values([sid_col, date_col])

    # Lag features (per safehouse to avoid cross-house leakage)
    for lag in [1, 2, 3]:
        metrics[f"{target}_lag{lag}"] = metrics.groupby(sid_col)[target].shift(lag)

    # Rolling 3-month mean per safehouse
    metrics[f"{target}_roll3"] = (
        metrics.groupby(sid_col)[target]
        .transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())
    )

    print(f"[safehouse_monthly] {len(metrics)} rows | {metrics[sid_col].nunique()} safehouses | target='{target}'")
    return metrics


# ── Pipeline 3: Session-level features for concerns triage ───────────────────

def build_session_features(tables: dict) -> pd.DataFrame:
    """
    Build one row per process_recording session with label = concerns_flagged.
    Uses within-resident lag features to avoid leakage across residents.

    Returns
    -------
    pd.DataFrame with session-level features + label_concerns_flagged (int)
    """
    proc = tables["process_recordings"].copy()
    proc = parse_dates(proc, ["session_date"])
    proc = proc.sort_values(["resident_id", "session_date"]).reset_index(drop=True)

    # Label
    proc["label_concerns_flagged"] = proc["concerns_flagged"].astype(int)

    # Lag features (prior session per resident — leakage-safe)
    for col in ["concerns_flagged", "progress_noted", "emotional_state_observed", "emotional_state_end"]:
        if col in proc.columns:
            proc[f"prev_{col}"] = proc.groupby("resident_id")[col].shift(1)

    # Rolling session count per resident
    proc["session_count_to_date"] = proc.groupby("resident_id").cumcount()

    # Days since prior session
    proc["days_since_last_session"] = (
        proc.groupby("resident_id")["session_date"]
        .diff()
        .dt.days
    )

    # Encode session_type
    if "session_type" in proc.columns:
        proc["is_group_session"] = (proc["session_type"].str.lower() == "group").astype(int)

    print(f"[session_features] {len(proc)} sessions | label=1: {proc['label_concerns_flagged'].sum()} ({proc['label_concerns_flagged'].mean():.1%})")
    return proc


# ── Pipeline 4: Visitation-level features for reintegration readiness ─────────

def build_visitation_features(tables: dict) -> pd.DataFrame:
    """
    Build one row per home_visitation with label = visit_outcome == 'Favorable'.
    Joins resident-level context at visit_date (leakage-safe).

    Returns
    -------
    pd.DataFrame with visitation features + label_favorable (int)
    """
    vis = tables["home_visitations"].copy()
    vis = parse_dates(vis, ["visit_date"])

    # Label
    vis["label_favorable"] = (vis["visit_outcome"] == "Favorable").astype(int)

    # Encode categoricals
    if "family_cooperation_level" in vis.columns:
        coop_map = {"High": 3, "Moderate": 2, "Low": 1, "None": 0}
        vis["family_cooperation_enc"] = vis["family_cooperation_level"].map(coop_map)

    if "safety_concerns_noted" in vis.columns:
        vis["safety_concerns_bin"] = vis["safety_concerns_noted"].astype(int) if vis["safety_concerns_noted"].dtype == bool else (vis["safety_concerns_noted"].str.lower() == "true").astype(int)

    if "follow_up_needed" in vis.columns:
        vis["follow_up_bin"] = vis["follow_up_needed"].astype(int) if vis["follow_up_needed"].dtype == bool else (vis["follow_up_needed"].str.lower() == "true").astype(int)

    # Visit type encoding
    if "visit_type" in vis.columns:
        vis["is_reintegration_visit"] = (vis["visit_type"] == "Reintegration Assessment").astype(int)
        vis["is_emergency_visit"]      = (vis["visit_type"] == "Emergency").astype(int)

    # Days since prior visit per resident
    vis = vis.sort_values(["resident_id", "visit_date"])
    vis["days_since_last_visit"] = vis.groupby("resident_id")["visit_date"].diff().dt.days

    # Prior outcome (lag-1 per resident, leakage-safe)
    vis["prev_outcome_favorable"] = (
        vis.groupby("resident_id")["label_favorable"].shift(1)
    )

    print(f"[visitation_features] {len(vis)} visits | label=1: {vis['label_favorable'].sum()} ({vis['label_favorable'].mean():.1%})")
    return vis


# ── Helpers ───────────────────────────────────────────────────────────────────

def _find_date_col(df: pd.DataFrame, candidates: list[str], required: bool = True) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    if required:
        raise KeyError(f"Could not find a date column. Tried: {candidates}. Available: {list(df.columns)}")
    return None


def _find_id_col(df: pd.DataFrame, candidates: list[str]) -> str | None:
    for c in candidates:
        if c in df.columns:
            return c
    return None
