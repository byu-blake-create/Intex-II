"""
Convert the two social media sklearn pipelines to ONNX format.
"""
import joblib
import numpy as np
from pathlib import Path
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType, StringTensorType

MODELS_DIR = Path(__file__).parent / "models"

NUMERIC_FEATURES = [
    "post_hour", "num_hashtags", "mentions_count", "caption_length",
    "has_call_to_action", "features_resident_story", "is_boosted",
    "boost_budget_php", "follower_count_at_post", "month_num", "is_weekend",
]
CATEGORICAL_FEATURES = [
    "platform", "day_of_week", "post_type", "media_type",
    "call_to_action_type", "content_topic", "sentiment_tone", "campaign_name",
]

# Each feature as a separate column (shape [None,1]) to match ColumnTransformer per-column routing
initial_types = (
    [(f, FloatTensorType([None, 1])) for f in NUMERIC_FEATURES] +
    [(f, StringTensorType([None, 1])) for f in CATEGORICAL_FEATURES]
)

for model_name in [
    "social_post_performance_gb",
    "social_click_throughs_gb",
    "social_reach_gb",
    "social_impressions_gb",
]:
    pkl_path = MODELS_DIR / f"{model_name}.pkl"
    onnx_path = MODELS_DIR / f"{model_name}.onnx"

    print(f"\nLoading {pkl_path.name} ...")
    pipeline = joblib.load(pkl_path)

    # skl2onnx requires missing_values="" (not np.nan) for string SimpleImputer
    # Step name differs between models ("pre" vs "preprocessor") — use index
    preprocessor_step = pipeline.steps[0][1]
    cat_pipe = preprocessor_step.transformers_[1][1]
    cat_pipe.named_steps["imputer"].missing_values = ""

    print(f"Converting to ONNX ...")
    onnx_model = convert_sklearn(
        pipeline,
        initial_types=initial_types,
        target_opset=17,
    )

    with open(onnx_path, "wb") as f:
        f.write(onnx_model.SerializeToString())

    size_kb = onnx_path.stat().st_size // 1024
    print(f"Saved {onnx_path.name} ({size_kb} KB)")

print("\nDone.")
