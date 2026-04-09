import json
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel


def resolve_model_path(filename: str) -> Path:
    candidates = [
        Path(__file__).parent / "models" / filename,
        Path(__file__).parent.parent / "IS455" / "models" / filename,
    ]
    for path in candidates:
        if path.exists():
            return path
    return candidates[0]


def load_feature_names(meta_path: Path) -> list[str]:
    if meta_path.exists():
        with open(meta_path, encoding="utf-8") as f:
            return json.load(f).get("feature_names", [])
    return []


def build_frame_from_features(row_dict: dict, feature_names: list[str]) -> pd.DataFrame:
    """Build a single-row DataFrame aligned to the model's expected feature columns.

    Numeric columns not supplied default to 0. Categorical columns not supplied
    default to None (handled by the pipeline's SimpleImputer / OHE).
    """
    full_row: dict = {}
    for feat in feature_names:
        val = row_dict.get(feat)
        full_row[feat] = val  # None is fine for categoricals; 0 is fine for numerics
    # Fill numeric NaNs with 0
    for feat, val in full_row.items():
        if val is None and feat not in [
            "supporter_type", "relationship_type", "region", "status",
            "acquisition_channel", "safehouse_id", "case_status", "case_category",
            "reintegration_status", "current_risk_level", "assigned_social_worker",
            "session_type", "emotional_state_observed", "emotional_state_end",
            "family_cooperation_level", "visit_outcome",
        ]:
            full_row[feat] = 0
    return pd.DataFrame([full_row], columns=feature_names)


# ── Social model paths ────────────────────────────────────────────────────────
ENGAGEMENT_MODEL_PATH = resolve_model_path("social_post_performance_gb.pkl")
CLICKS_MODEL_PATH = resolve_model_path("social_click_throughs_gb.pkl")
REACH_MODEL_PATH = resolve_model_path("social_reach_gb.pkl")
IMPRESSIONS_MODEL_PATH = resolve_model_path("social_impressions_gb.pkl")

# ── Donor / case model paths ──────────────────────────────────────────────────
DONOR_RETENTION_MODEL_PATH = resolve_model_path("donor_retention_rf.pkl")
DONOR_RETENTION_META_PATH = resolve_model_path("donor_retention_rf_metadata.json")
DONATION_VALUE_MODEL_PATH = resolve_model_path("donation_value_rf.pkl")
DONATION_VALUE_META_PATH = resolve_model_path("donation_value_rf_metadata.json")
RESIDENT_RISK_MODEL_PATH = resolve_model_path("resident_risk_gb.pkl")
RESIDENT_RISK_META_PATH = resolve_model_path("resident_risk_gb_metadata.json")
REINTEGRATION_MODEL_PATH = resolve_model_path("reintegration_readiness_gb.pkl")
REINTEGRATION_META_PATH = resolve_model_path("reintegration_readiness_gb_metadata.json")

PREDICT_API_KEY = os.getenv("PREDICT_API_KEY", "").strip()

app = FastAPI(title="North Star Predict Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Module-level model state ───────────────────────────────────────────────────
engagement_model = None
clicks_model = None
reach_model = None
impressions_model = None

donor_retention_model = None
donor_retention_features: list[str] = []
donation_value_model = None
donation_value_features: list[str] = []
resident_risk_model = None
resident_risk_features: list[str] = []
reintegration_model = None
reintegration_features: list[str] = []

# ── Platform engagement averages (social context) ─────────────────────────────
PLATFORM_AVERAGES = {
    "Facebook": 0.098,
    "Instagram": 0.112,
    "LinkedIn": 0.085,
    "YouTube": 0.074,
    "TikTok": 0.135,
}

SOCIAL_FEATURE_COLUMNS = [
    "post_hour", "num_hashtags", "mentions_count", "caption_length",
    "has_call_to_action", "features_resident_story", "is_boosted",
    "boost_budget_php", "follower_count_at_post", "month_num", "is_weekend",
    "platform", "day_of_week", "post_type", "media_type", "call_to_action_type",
    "content_topic", "sentiment_tone", "campaign_name",
]


# ── Pydantic models ────────────────────────────────────────────────────────────

class SocialPredictRequest(BaseModel):
    post_hour: int
    num_hashtags: int
    mentions_count: int
    caption_length: int
    has_call_to_action: bool
    features_resident_story: bool
    is_boosted: bool
    boost_budget_php: float = 0.0
    follower_count_at_post: int = 5000
    month_num: int = datetime.now().month
    is_weekend: bool
    platform: str
    day_of_week: str
    post_type: str
    media_type: str
    call_to_action_type: Optional[str] = None
    content_topic: str
    sentiment_tone: str
    campaign_name: Optional[str] = None


class DonorRetentionRequest(BaseModel):
    """Pre-computed supporter-month snapshot features for donor lapse scoring.

    All pivot-column counts (type_*, channel_*, campaign_*) default to 0 and
    can be omitted when not available. The sklearn pipeline handles imputation.

    Endpoint: POST https://northstar-predict.johnreverett.com/predict/donor-retention
    """
    recency_days: float = 0
    donation_count: float = 0
    monetary_total: float = 0
    monetary_avg: float = 0
    monetary_max: float = 0
    recurring_rate: float = 0
    distinct_types: float = 0
    avg_gap_days: float = 0
    std_gap_days: float = 0
    program_area_spread: float = 0
    safehouse_spread: float = 0
    tenure_days: float = 0
    snapshot_month: int = datetime.now().month
    snapshot_year: int = datetime.now().year
    # Pivot counts (optional — default 0)
    type_inkind_count: float = 0
    type_monetary_count: float = 0
    type_skills_count: float = 0
    type_socialmedia_count: float = 0
    type_time_count: float = 0
    channel_campaign_count: float = 0
    channel_direct_count: float = 0
    channel_event_count: float = 0
    channel_partnerreferral_count: float = 0
    channel_socialmedia_count: float = 0
    campaign_summer_of_safety_count: float = 0
    campaign_back_to_school_count: float = 0
    campaign_givingtuesday_count: float = 0
    campaign_year_end_hope_count: float = 0
    # Categorical
    supporter_type: Optional[str] = None
    relationship_type: Optional[str] = None
    region: Optional[str] = None
    status: Optional[str] = None
    acquisition_channel: Optional[str] = None


class DonationValueRequest(BaseModel):
    """Pre-computed supporter-month snapshot features for high-value opportunity scoring.

    Endpoint: POST https://northstar-predict.johnreverett.com/predict/donation-value
    """
    recency_days: float = 0
    donation_count: float = 0
    monetary_count: float = 0
    monetary_total: float = 0
    monetary_avg: float = 0
    monetary_max: float = 0
    recurring_rate: float = 0
    tenure_days: float = 0
    snapshot_month: int = datetime.now().month
    snapshot_year: int = datetime.now().year
    type_inkind_count: float = 0
    type_monetary_count: float = 0
    type_skills_count: float = 0
    type_socialmedia_count: float = 0
    type_time_count: float = 0
    channel_campaign_count: float = 0
    channel_direct_count: float = 0
    channel_event_count: float = 0
    channel_partnerreferral_count: float = 0
    channel_socialmedia_count: float = 0
    campaign_summer_of_safety_count: float = 0
    campaign_back_to_school_count: float = 0
    campaign_givingtuesday_count: float = 0
    campaign_year_end_hope_count: float = 0
    program_area_spread: float = 0
    safehouse_spread: float = 0
    supporter_type: Optional[str] = None
    relationship_type: Optional[str] = None
    region: Optional[str] = None
    status: Optional[str] = None
    acquisition_channel: Optional[str] = None


class ResidentRiskRequest(BaseModel):
    """Pre-computed resident-month snapshot features for support-need triage.

    Endpoint: POST https://northstar-predict.johnreverett.com/predict/resident-risk
    """
    days_since_admission: float = 0
    session_count_total: float = 0
    session_count_30d: float = 0
    concern_rate_90d: float = 0
    referral_rate_90d: float = 0
    session_duration_minutes: float = 0
    plan_count_total: float = 0
    snapshot_month: int = datetime.now().month
    snapshot_year: int = datetime.now().year
    progress_noted: int = 0
    safety_concerns_noted: int = 0
    follow_up_needed: int = 0
    safehouse_id: Optional[str] = None
    case_status: Optional[str] = None
    case_category: Optional[str] = None
    reintegration_status: Optional[str] = None
    current_risk_level: Optional[str] = None
    assigned_social_worker: Optional[str] = None
    session_type: Optional[str] = None
    emotional_state_observed: Optional[str] = None
    emotional_state_end: Optional[str] = None
    family_cooperation_level: Optional[str] = None
    visit_outcome: Optional[str] = None


class ReintegrationRequest(BaseModel):
    """Home visitation features for reintegration readiness scoring.

    Endpoint: POST https://northstar-predict.johnreverett.com/predict/reintegration
    """
    family_cooperation_enc: float = 0
    safety_concerns_bin: int = 0
    follow_up_bin: int = 0
    is_reintegration_visit: int = 0
    is_emergency_visit: int = 0
    visit_month: int = datetime.now().month
    prev_outcome_favorable: int = 0
    days_since_last_visit: float = 0
    days_since_admission: float = 0
    incident_count_prior_90d: float = 0
    edu_attendance_rate: float = 0
    edu_progress_percent: float = 0
    general_health_score: float = 0
    nutrition_score: float = 0
    sleep_quality_score: float = 0
    energy_level_score: float = 0
    safehouse_id: Optional[str] = None


# ── Startup ────────────────────────────────────────────────────────────────────

@app.on_event("startup")
def load_models() -> None:
    global engagement_model, clicks_model, reach_model, impressions_model
    global donor_retention_model, donor_retention_features
    global donation_value_model, donation_value_features
    global resident_risk_model, resident_risk_features
    global reintegration_model, reintegration_features

    # Social models (required — service fails hard if missing)
    for path in [ENGAGEMENT_MODEL_PATH, CLICKS_MODEL_PATH, REACH_MODEL_PATH, IMPRESSIONS_MODEL_PATH]:
        if not path.exists():
            raise RuntimeError(f"Model not found at {path}")

    engagement_model = joblib.load(ENGAGEMENT_MODEL_PATH)
    clicks_model = joblib.load(CLICKS_MODEL_PATH)
    reach_model = joblib.load(REACH_MODEL_PATH)
    impressions_model = joblib.load(IMPRESSIONS_MODEL_PATH)

    # Donor / case models (load if present; endpoints return 503 if missing)
    if DONOR_RETENTION_MODEL_PATH.exists():
        donor_retention_model = joblib.load(DONOR_RETENTION_MODEL_PATH)
        donor_retention_features = load_feature_names(DONOR_RETENTION_META_PATH)

    if DONATION_VALUE_MODEL_PATH.exists():
        donation_value_model = joblib.load(DONATION_VALUE_MODEL_PATH)
        donation_value_features = load_feature_names(DONATION_VALUE_META_PATH)

    if RESIDENT_RISK_MODEL_PATH.exists():
        resident_risk_model = joblib.load(RESIDENT_RISK_MODEL_PATH)
        resident_risk_features = load_feature_names(RESIDENT_RISK_META_PATH)

    if REINTEGRATION_MODEL_PATH.exists():
        reintegration_model = joblib.load(REINTEGRATION_MODEL_PATH)
        reintegration_features = load_feature_names(REINTEGRATION_META_PATH)


# ── Auth helper ────────────────────────────────────────────────────────────────

def require_api_key(x_predict_api_key: Optional[str]) -> None:
    if not PREDICT_API_KEY:
        return
    if x_predict_api_key != PREDICT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid prediction service key")


# ── Social helpers ─────────────────────────────────────────────────────────────

def build_social_frame(req: SocialPredictRequest) -> pd.DataFrame:
    row = {
        "post_hour": req.post_hour,
        "num_hashtags": req.num_hashtags,
        "mentions_count": req.mentions_count,
        "caption_length": req.caption_length,
        "has_call_to_action": int(req.has_call_to_action),
        "features_resident_story": int(req.features_resident_story),
        "is_boosted": int(req.is_boosted),
        "boost_budget_php": req.boost_budget_php,
        "follower_count_at_post": req.follower_count_at_post,
        "month_num": req.month_num,
        "is_weekend": int(req.is_weekend),
        "platform": req.platform,
        "day_of_week": req.day_of_week,
        "post_type": req.post_type,
        "media_type": req.media_type,
        "call_to_action_type": req.call_to_action_type if req.call_to_action_type is not None else np.nan,
        "content_topic": req.content_topic,
        "sentiment_tone": req.sentiment_tone,
        "campaign_name": req.campaign_name if req.campaign_name is not None else np.nan,
    }
    return pd.DataFrame([row], columns=SOCIAL_FEATURE_COLUMNS)


def get_engagement_tier(rate: float) -> tuple[str, str]:
    if rate < 0.07:
        return "Low", "Below average engagement. Try posting at peak hours or adding a call-to-action."
    if rate < 0.15:
        return "Medium", "Decent engagement. Consider featuring a resident story to boost further."
    return "High", "Excellent engagement! This post is performing well above average."


def get_clicks_tier(clicks: int) -> tuple[str, str]:
    if clicks < 50:
        return "Low", "Low click-throughs. Boosting or a stronger CTA may help."
    if clicks < 150:
        return "Medium", "Moderate click-throughs. Good baseline performance."
    return "High", "High click-throughs! This post is driving strong traffic."


def get_reach_tier(reach: int) -> tuple[str, str]:
    if reach < 500:
        return "Low", "Low reach. Try boosting or posting during peak hours."
    if reach < 2000:
        return "Medium", "Moderate reach. Adding hashtags or a resident story may extend it."
    return "High", "Excellent reach! This post is connecting with a wide audience."


def get_impressions_tier(impressions: int) -> tuple[str, str]:
    if impressions < 1000:
        return "Low", "Low impressions. Consider boosting to increase visibility."
    if impressions < 5000:
        return "Medium", "Moderate impressions. Good exposure for an organic post."
    return "High", "High impressions! This post is getting strong visibility."


def build_platform_context(platform: str, predicted_rate: float) -> str:
    platform_avg = PLATFORM_AVERAGES.get(platform, 0.095)
    return (
        f"{platform} posts in your history average ~{platform_avg * 100:.1f}% engagement. "
        f"This post is predicted at {predicted_rate * 100:.1f}%."
    )


def build_tips(req: SocialPredictRequest, predicted_clicks: int) -> list[str]:
    tips: list[str] = []
    if not req.has_call_to_action:
        tips.append("Add a call-to-action to increase clicks.")
    if not req.features_resident_story:
        tips.append("Feature a resident story to humanise your post.")
    if not req.is_boosted and predicted_clicks < 50:
        tips.append("Consider boosting this post to expand reach.")
    if req.num_hashtags < 5 or req.num_hashtags > 15:
        tips.append("Aim for 5–15 hashtags for optimal discoverability.")
    if req.post_hour < 8 or req.post_hour > 21:
        tips.append("Post between 8 AM–9 PM for peak audience activity.")
    if not tips:
        tips.append("Great post setup! Monitor performance after publishing.")
    return tips


# ── Routes ─────────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "status": "ok",
        "socialModels": {
            "engagement": engagement_model is not None,
            "clicks": clicks_model is not None,
            "reach": reach_model is not None,
            "impressions": impressions_model is not None,
        },
        "donorModels": {
            "donorRetention": donor_retention_model is not None,
            "donationValue": donation_value_model is not None,
        },
        "caseModels": {
            "residentRisk": resident_risk_model is not None,
            "reintegration": reintegration_model is not None,
        },
    }


@app.post("/predict")
def predict(req: SocialPredictRequest, x_predict_api_key: Optional[str] = Header(default=None)):
    """Social post performance prediction (engagement, clicks, reach, impressions)."""
    require_api_key(x_predict_api_key)

    if any(m is None for m in [engagement_model, clicks_model, reach_model, impressions_model]):
        raise HTTPException(status_code=503, detail="Social models not loaded")

    df = build_social_frame(req)
    predicted_rate = max(0.0, float(engagement_model.predict(df)[0]))
    predicted_clicks = max(0, round(float(clicks_model.predict(df)[0])))
    predicted_reach = max(0, round(float(reach_model.predict(df)[0])))
    predicted_impressions = max(0, round(float(impressions_model.predict(df)[0])))

    engagement_tier, engagement_desc = get_engagement_tier(predicted_rate)
    clicks_tier, clicks_desc = get_clicks_tier(predicted_clicks)
    reach_tier, reach_desc = get_reach_tier(predicted_reach)
    impressions_tier, impressions_desc = get_impressions_tier(predicted_impressions)

    return {
        "engagementPredictedRate": round(predicted_rate, 4),
        "engagementPredictedPct": f"{predicted_rate * 100:.1f}%",
        "engagementTier": engagement_tier,
        "engagementTierDescription": engagement_desc,
        "clicksPredicted": predicted_clicks,
        "clicksPredictedStr": f"{predicted_clicks:,}",
        "clicksTier": clicks_tier,
        "clicksTierDescription": clicks_desc,
        "reachPredicted": predicted_reach,
        "reachTier": reach_tier,
        "reachTierDescription": reach_desc,
        "impressionsPredicted": predicted_impressions,
        "impressionsTier": impressions_tier,
        "impressionsTierDescription": impressions_desc,
        "platformContext": build_platform_context(req.platform, predicted_rate),
        "modelNote": "Predictions served by the homelab prediction service using gradient boosting models.",
        "tips": build_tips(req, predicted_clicks),
    }


@app.post("/predict/donor-retention")
def predict_donor_retention(
    req: DonorRetentionRequest,
    x_predict_api_key: Optional[str] = Header(default=None),
):
    """Predict 90-day donor lapse probability for a single supporter-month snapshot.

    Trained on a rolling supporter-month panel. Input features are pre-computed
    from historical donation records. Returns a churn probability and risk tier
    used to populate the donor watchlist in the North Star staff portal.

    Deployed model: IS455/models/donor_retention_rf.pkl (RandomForestClassifier)
    Training notebook: IS455/455-Things/ml-pipelines/01-donor-retention.ipynb
    """
    require_api_key(x_predict_api_key)
    if donor_retention_model is None:
        raise HTTPException(status_code=503, detail="Donor retention model not loaded")

    row = req.model_dump()
    # Fix the campaign column name mismatch from Pydantic (hyphen → underscore)
    row["campaign_year-end_hope_count"] = row.pop("campaign_year_end_hope_count", 0)
    df = build_frame_from_features(row, donor_retention_features)

    prob = float(donor_retention_model.predict_proba(df)[0][1])
    tier = "High Risk" if prob >= 0.6 else "Medium Risk" if prob >= 0.35 else "Low Risk"

    return {
        "churnProbability": round(prob, 4),
        "churnProbabilityPct": f"{prob * 100:.1f}%",
        "riskTier": tier,
        "modelNote": "RandomForestClassifier trained on 36-month supporter panel. "
                     "Threshold 0.35 used for watchlist inclusion.",
        "label": "1 if supporter donates again within the next 90 days",
    }


@app.post("/predict/donation-value")
def predict_donation_value(
    req: DonationValueRequest,
    x_predict_api_key: Optional[str] = Header(default=None),
):
    """Predict whether a supporter will become a high-value (≥₱1,000) donor in the next 90 days.

    Returns an opportunity probability and tier used to surface the Top Opportunities
    panel in the North Star donor workbench.

    Deployed model: IS455/models/donation_value_rf.pkl (RandomForestClassifier)
    Training notebook: IS455/455-Things/ml-pipelines/02-donation-value-forecasting.ipynb
    """
    require_api_key(x_predict_api_key)
    if donation_value_model is None:
        raise HTTPException(status_code=503, detail="Donation value model not loaded")

    row = req.model_dump()
    row["campaign_year-end_hope_count"] = row.pop("campaign_year_end_hope_count", 0)
    df = build_frame_from_features(row, donation_value_features)

    prob = float(donation_value_model.predict_proba(df)[0][1])
    tier = "High Opportunity" if prob >= 0.25 else "Standard"

    return {
        "highValueProbability": round(prob, 4),
        "highValueProbabilityPct": f"{prob * 100:.1f}%",
        "opportunityTier": tier,
        "thresholdPhp": 1000.0,
        "modelNote": "RandomForestClassifier trained on 36-month supporter panel. "
                     "High-value threshold: ₱1,000 in the next 90 days.",
        "label": "1 if next 90-day monetary total is at least ₱1,000",
    }


@app.post("/predict/resident-risk")
def predict_resident_risk(
    req: ResidentRiskRequest,
    x_predict_api_key: Optional[str] = Header(default=None),
):
    """Predict whether a resident will have a concern-flagged session in the next 90 days.

    Returns a concern probability and risk level used to populate the resident triage
    watchlist in the North Star caseload management portal.

    Deployed model: IS455/models/resident_risk_gb.pkl (GradientBoostingClassifier)
    Training notebook: IS455/455-Things/ml-pipelines/03-resident-risk-triage.ipynb
    """
    require_api_key(x_predict_api_key)
    if resident_risk_model is None:
        raise HTTPException(status_code=503, detail="Resident risk model not loaded")

    row = req.model_dump()
    df = build_frame_from_features(row, resident_risk_features)

    prob = float(resident_risk_model.predict_proba(df)[0][1])
    tier = "High" if prob >= 0.25 else "Low"

    return {
        "concernProbability": round(prob, 4),
        "concernProbabilityPct": f"{prob * 100:.1f}%",
        "riskLevel": tier,
        "modelNote": "GradientBoostingClassifier trained on resident-month snapshots. "
                     "Decision threshold 0.25 used for triage list inclusion.",
        "label": "1 if any concern-flagged session occurs in the next 90 days",
    }


@app.post("/predict/reintegration")
def predict_reintegration(
    req: ReintegrationRequest,
    x_predict_api_key: Optional[str] = Header(default=None),
):
    """Predict whether a home visitation will result in a favorable reintegration outcome.

    Returns a readiness probability and readiness tier used to support reintegration
    planning in the North Star caseload management portal.

    Deployed model: IS455/models/reintegration_readiness_gb.pkl (GradientBoostingClassifier)
    Training notebook: IS455/455-Things/ml-pipelines/04-reintegration-readiness.ipynb
    """
    require_api_key(x_predict_api_key)
    if reintegration_model is None:
        raise HTTPException(status_code=503, detail="Reintegration model not loaded")

    row = req.model_dump()
    df = build_frame_from_features(row, reintegration_features)

    prob = float(reintegration_model.predict_proba(df)[0][1])
    tier = "Ready" if prob >= 0.5 else "Not Ready"

    return {
        "readinessProbability": round(prob, 4),
        "readinessProbabilityPct": f"{prob * 100:.1f}%",
        "readinessTier": tier,
        "modelNote": "GradientBoostingClassifier trained on home visitation records. "
                     "Decision threshold 0.5 (favorable visit outcome).",
        "label": "1 if visit_outcome is Favorable",
    }
