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


ENGAGEMENT_MODEL_PATH = resolve_model_path("social_post_performance_gb.pkl")
CLICKS_MODEL_PATH = resolve_model_path("social_click_throughs_gb.pkl")
REACH_MODEL_PATH = resolve_model_path("social_reach_gb.pkl")
IMPRESSIONS_MODEL_PATH = resolve_model_path("social_impressions_gb.pkl")
PREDICT_API_KEY = os.getenv("PREDICT_API_KEY", "").strip()

app = FastAPI(title="North Star Social Predict Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

engagement_model = None
clicks_model = None
reach_model = None
impressions_model = None

PLATFORM_AVERAGES = {
    "Facebook": 0.098,
    "Instagram": 0.112,
    "LinkedIn": 0.085,
    "YouTube": 0.074,
    "TikTok": 0.135,
}

FEATURE_COLUMNS = [
    "post_hour",
    "num_hashtags",
    "mentions_count",
    "caption_length",
    "has_call_to_action",
    "features_resident_story",
    "is_boosted",
    "boost_budget_php",
    "follower_count_at_post",
    "month_num",
    "is_weekend",
    "platform",
    "day_of_week",
    "post_type",
    "media_type",
    "call_to_action_type",
    "content_topic",
    "sentiment_tone",
    "campaign_name",
]


class PredictRequest(BaseModel):
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


@app.on_event("startup")
def load_models() -> None:
    global engagement_model, clicks_model, reach_model, impressions_model

    for path in [
        ENGAGEMENT_MODEL_PATH,
        CLICKS_MODEL_PATH,
        REACH_MODEL_PATH,
        IMPRESSIONS_MODEL_PATH,
    ]:
        if not path.exists():
            raise RuntimeError(f"Model not found at {path}")

    engagement_model = joblib.load(ENGAGEMENT_MODEL_PATH)
    clicks_model = joblib.load(CLICKS_MODEL_PATH)
    reach_model = joblib.load(REACH_MODEL_PATH)
    impressions_model = joblib.load(IMPRESSIONS_MODEL_PATH)


def require_api_key(x_predict_api_key: Optional[str]) -> None:
    if not PREDICT_API_KEY:
        return
    if x_predict_api_key != PREDICT_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid prediction service key")


def build_frame(req: PredictRequest) -> pd.DataFrame:
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
    return pd.DataFrame([row], columns=FEATURE_COLUMNS)


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


def build_tips(req: PredictRequest, predicted_clicks: int) -> list[str]:
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


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engagementModelLoaded": engagement_model is not None,
        "clicksModelLoaded": clicks_model is not None,
        "reachModelLoaded": reach_model is not None,
        "impressionsModelLoaded": impressions_model is not None,
    }


@app.post("/predict")
def predict(req: PredictRequest, x_predict_api_key: Optional[str] = Header(default=None)):
    require_api_key(x_predict_api_key)

    if any(model is None for model in [engagement_model, clicks_model, reach_model, impressions_model]):
        raise HTTPException(status_code=503, detail="Models not loaded")

    df = build_frame(req)

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
