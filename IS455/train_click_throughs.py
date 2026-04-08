"""
Train a GradientBoostingRegressor to predict click_throughs for social media posts.
Uses the same features, preprocessing, and CV strategy as the engagement model.
"""
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GridSearchCV, TimeSeriesSplit
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parent  # IS455/
DATA_PATH = BASE_DIR / "455-Things" / "lighthouse_csv_v7" / "lighthouse_csv_v7" / "social_media_posts.csv"
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_OUT = MODELS_DIR / "social_click_throughs_gb.pkl"
META_OUT  = MODELS_DIR / "social_click_throughs_gb_metadata.json"

RANDOM_SEED = 42

# ── Feature lists ─────────────────────────────────────────────────────────────
NUMERIC_FEATURES = [
    "post_hour", "num_hashtags", "mentions_count", "caption_length",
    "has_call_to_action", "features_resident_story", "is_boosted",
    "boost_budget_php", "follower_count_at_post", "month_num", "is_weekend",
]
CATEGORICAL_FEATURES = [
    "platform", "day_of_week", "post_type", "media_type",
    "call_to_action_type", "content_topic", "sentiment_tone", "campaign_name",
]
ALL_FEATURES = NUMERIC_FEATURES + CATEGORICAL_FEATURES
TARGET = "click_throughs"

# ── Load data ─────────────────────────────────────────────────────────────────
print(f"Loading data from {DATA_PATH} ...")
df = pd.read_csv(DATA_PATH, parse_dates=["created_at"])
print(f"  Rows: {len(df):,}  |  Columns: {df.shape[1]}")

# ── Feature engineering ───────────────────────────────────────────────────────
df["month_num"] = df["created_at"].dt.month
df["is_weekend"] = df["day_of_week"].isin(["Saturday", "Sunday"]).astype(int)
df["has_call_to_action"] = df["has_call_to_action"].astype(int)
df["features_resident_story"] = df["features_resident_story"].astype(int)
df["is_boosted"] = df["is_boosted"].astype(int)

# Drop rows with missing target
df = df.dropna(subset=[TARGET])
df = df.sort_values("created_at").reset_index(drop=True)

print(f"  Target stats — mean: {df[TARGET].mean():.1f}  median: {df[TARGET].median():.1f}  "
      f"min: {df[TARGET].min()}  max: {df[TARGET].max()}")

X = df[ALL_FEATURES]
y = df[TARGET].astype(float)

# ── Time-based 80/20 split ────────────────────────────────────────────────────
split_idx = int(len(df) * 0.8)
X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]
print(f"  Train: {len(X_train):,}  |  Test: {len(X_test):,}")

# ── Preprocessing pipeline ────────────────────────────────────────────────────
numeric_pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="median")),
    ("scaler", StandardScaler()),
])
categorical_pipe = Pipeline([
    ("imputer", SimpleImputer(strategy="most_frequent")),
    ("encoder", OneHotEncoder(handle_unknown="ignore", sparse_output=False)),
])
preprocessor = ColumnTransformer([
    ("num", numeric_pipe, NUMERIC_FEATURES),
    ("cat", categorical_pipe, CATEGORICAL_FEATURES),
])

# ── Model + GridSearchCV ──────────────────────────────────────────────────────
gbr = GradientBoostingRegressor(random_state=RANDOM_SEED)
full_pipeline = Pipeline([
    ("preprocessor", preprocessor),
    ("model", gbr),
])

param_grid = {
    "model__n_estimators": [100, 200],
    "model__max_depth": [3, 5],
    "model__learning_rate": [0.05, 0.1],
    "model__subsample": [0.8, 1.0],
}

tscv = TimeSeriesSplit(n_splits=5)
grid_search = GridSearchCV(
    full_pipeline,
    param_grid,
    cv=tscv,
    scoring="neg_root_mean_squared_error",
    n_jobs=-1,
    verbose=1,
)

print("\nRunning GridSearchCV ...")
grid_search.fit(X_train, y_train)
print(f"  Best params: {grid_search.best_params_}")

# ── Evaluate on holdout ───────────────────────────────────────────────────────
best_model = grid_search.best_estimator_
y_pred = best_model.predict(X_test)
y_pred_clipped = np.maximum(y_pred, 0)

rmse = float(np.sqrt(mean_squared_error(y_test, y_pred_clipped)))
mae  = float(mean_absolute_error(y_test, y_pred_clipped))
r2   = float(r2_score(y_test, y_pred_clipped))

print(f"\nHoldout metrics:")
print(f"  RMSE : {rmse:.4f}")
print(f"  MAE  : {mae:.4f}")
print(f"  R²   : {r2:.4f}")

# ── Refit on ALL data ─────────────────────────────────────────────────────────
print("\nRefitting on full dataset ...")
best_params = {k.replace("model__", ""): v for k, v in grid_search.best_params_.items()}
final_model = Pipeline([
    ("preprocessor", preprocessor),
    ("model", GradientBoostingRegressor(random_state=RANDOM_SEED, **best_params)),
])
final_model.fit(X, y)

# ── Save model ────────────────────────────────────────────────────────────────
joblib.dump(final_model, MODEL_OUT)
print(f"\nModel saved to {MODEL_OUT}")

# ── Save metadata ─────────────────────────────────────────────────────────────
metadata = {
    "name": "social_click_throughs_gb",
    "trained_at": datetime.now(timezone.utc).isoformat(),
    "label_definition": "click_throughs for a social media post",
    "feature_names": ALL_FEATURES,
    "metrics": {"rmse": round(rmse, 4), "mae": round(mae, 4), "r2": round(r2, 4)},
    "random_seed": RANDOM_SEED,
    "model_path": str(MODEL_OUT),
    "model_type": "GradientBoostingRegressor",
}
with open(META_OUT, "w") as f:
    json.dump(metadata, f, indent=2)
print(f"Metadata saved to {META_OUT}")
