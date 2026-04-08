from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import joblib
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime

MODELS_DIR = Path(__file__).parent.parent / "IS455" / "models"
ENGAGEMENT_MODEL_PATH = MODELS_DIR / "social_post_performance_gb.pkl"
CLICKS_MODEL_PATH = MODELS_DIR / "social_click_throughs_gb.pkl"

app = FastAPI(title="Social Post Performance ML Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

model = None
clicks_model = None
model_r2 = 0.7521
clicks_r2 = 0.4684

PLATFORM_AVERAGES = {
    "Facebook": 0.098,
    "Instagram": 0.112,
    "LinkedIn": 0.085,
    "YouTube": 0.074,
    "TikTok": 0.135,
}


@app.on_event("startup")
def load_model():
    global model, clicks_model
    if not ENGAGEMENT_MODEL_PATH.exists():
        raise RuntimeError(f"Engagement model not found at {ENGAGEMENT_MODEL_PATH}")
    model = joblib.load(ENGAGEMENT_MODEL_PATH)
    if not CLICKS_MODEL_PATH.exists():
        raise RuntimeError(f"Click-through model not found at {CLICKS_MODEL_PATH}")
    clicks_model = joblib.load(CLICKS_MODEL_PATH)


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


def get_engagement_tier(rate: float) -> tuple[str, str]:
    if rate < 0.07:
        return "Low", "This post is predicted to perform below average for your audience."
    elif rate <= 0.15:
        return "Medium", "This post is predicted to perform around average for your audience."
    else:
        return "High", "This post is predicted to perform above average for your audience."


def get_clicks_tier(clicks: int) -> tuple[str, str]:
    if clicks < 50:
        return "Low", "Below average click-through for your post history."
    elif clicks <= 150:
        return "Medium", "About average click-through performance."
    else:
        return "High", "Strong click-through — above average for your audience."


def build_tips(req: PredictRequest, predicted_engagement: float, predicted_clicks: int) -> list[str]:
    tips = []

    if req.post_hour >= 22 or req.post_hour <= 6:
        tips.append(
            "Consider posting during peak hours (9am or 3pm) to maximize reach, engagement, and click-throughs."
        )

    if not req.has_call_to_action:
        tips.append(
            "Adding a clear call-to-action (e.g., 'Share your story', 'Donate now') typically boosts both engagement and clicks."
        )

    if not req.features_resident_story:
        tips.append(
            "Posts featuring resident stories tend to average higher engagement — consider incorporating a personal narrative."
        )

    if not req.is_boosted and predicted_engagement < 0.07:
        tips.append(
            "This post is predicted to have low organic reach. Boosting it with even a small budget could significantly increase visibility and clicks."
        )

    if req.platform == "LinkedIn" and req.media_type == "text":
        tips.append(
            "LinkedIn posts with an image or graphic typically outperform text-only posts — try adding a visual."
        )

    if predicted_clicks < 10 and req.has_call_to_action:
        tips.append(
            "Click-throughs look low — try linking directly to a landing page or campaign URL in your post."
        )

    if len(tips) == 0:
        tips.append(
            f"Great setup! Your combination of {req.platform} + {req.post_type} looks strong. Keep engaging with your audience consistently."
        )

    return tips[:3]


@app.get("/health")
def health():
    return {
        "status": "ok",
        "engagement_model_loaded": model is not None,
        "clicks_model_loaded": clicks_model is not None,
    }


@app.post("/predict")
def predict(req: PredictRequest):
    if model is None or clicks_model is None:
        raise HTTPException(status_code=503, detail="Models not loaded")

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

    df = pd.DataFrame([row], columns=FEATURE_COLUMNS)

    # Engagement prediction
    predicted_rate = float(model.predict(df)[0])
    predicted_rate = max(0.0, predicted_rate)
    engagement_tier, engagement_tier_description = get_engagement_tier(predicted_rate)
    pct_str = f"{predicted_rate * 100:.1f}%"

    # Click-through prediction
    raw_clicks = float(clicks_model.predict(df)[0])
    predicted_clicks = max(0, round(raw_clicks))
    clicks_tier, clicks_tier_description = get_clicks_tier(predicted_clicks)
    clicks_str = f"{predicted_clicks} click{'s' if predicted_clicks != 1 else ''}"

    platform_avg = PLATFORM_AVERAGES.get(req.platform, 0.095)
    platform_context = (
        f"{req.platform} posts in your history average ~{platform_avg * 100:.1f}% engagement. "
        f"This post is predicted at {predicted_rate * 100:.1f}%."
    )

    tips = build_tips(req, predicted_rate, predicted_clicks)

    return {
        # Engagement
        "engagement_predicted_rate": round(predicted_rate, 4),
        "engagement_predicted_pct": pct_str,
        "engagement_tier": engagement_tier,
        "engagement_tier_description": engagement_tier_description,
        # Click-throughs
        "clicks_predicted": predicted_clicks,
        "clicks_predicted_str": clicks_str,
        "clicks_tier": clicks_tier,
        "clicks_tier_description": clicks_tier_description,
        # Context
        "platform_context": platform_context,
        "model_note": f"Based on models with R\u00b2={model_r2} (engagement) and R\u00b2={clicks_r2} (clicks) trained on 812 posts",
        "tips": tips,
        # Backward-compatible fields
        "predicted_engagement_rate": round(predicted_rate, 4),
        "predicted_pct": pct_str,
        "tier": engagement_tier,
        "tier_description": engagement_tier_description,
        "model_r2": model_r2,
    }
