"""
Shared configuration — paths, constants, seeds.
Import this at the top of every pipeline notebook.
"""
from pathlib import Path

# ── Repo root (three levels up from this file) ────────────────────────────────
# config.py lives at IS455/455-Things/ml-pipelines/shared/config.py, so the
# IS455 workspace root is parents[3].
REPO_ROOT = Path(__file__).resolve().parents[3]

# ── Data ──────────────────────────────────────────────────────────────────────
DATA_DIR = REPO_ROOT / "455-Things" / "lighthouse_csv_v7"

# ── Artifacts ─────────────────────────────────────────────────────────────────
MODELS_DIR = REPO_ROOT / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# ── Reproducibility ───────────────────────────────────────────────────────────
RANDOM_SEED = 42

# ── Prediction windows (days) ─────────────────────────────────────────────────
DONOR_CHURN_WINDOW_DAYS    = 90   # Pipeline 1: predict re-donation within 90 days
DONOR_VALUE_WINDOW_DAYS    = 90   # Pipeline 2: predict giving in next 90 days
RESIDENT_RISK_WINDOW_DAYS  = 30   # Pipeline 3: predict incident in next 30 days

# ── Table names (for documentation / error messages) ─────────────────────────
ALL_TABLES = [
    "supporters", "donations", "donation_allocations", "in_kind_donation_items",
    "partners", "partner_assignments", "safehouses",
    "residents", "process_recordings", "home_visitations",
    "education_records", "health_wellbeing_records", "intervention_plans",
    "incident_reports", "safehouse_monthly_metrics",
    "social_media_posts", "public_impact_snapshots",
]
