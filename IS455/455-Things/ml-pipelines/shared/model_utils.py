"""
Model serialization, metadata logging, and metrics helpers.
Used by every pipeline notebook and by backend inference.
"""
import json
import joblib
from datetime import datetime, timezone
from pathlib import Path

from .config import MODELS_DIR, RANDOM_SEED


# ── Save / Load ───────────────────────────────────────────────────────────────

def utc_now_iso() -> str:
    """Return a timezone-aware UTC timestamp for artifacts."""
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def save_model(
    pipeline,
    name: str,
    metrics: dict,
    feature_names: list,
    label_definition: str,
    extra_metadata: dict | None = None,
):
    """
    Serialize a fitted sklearn Pipeline + write metadata JSON.

    Parameters
    ----------
    pipeline       : fitted sklearn Pipeline
    name           : slug, e.g. 'donor_retention'
    metrics        : dict of evaluation metrics, e.g. {'roc_auc': 0.82, 'f1': 0.71}
    feature_names  : list of feature column names used at fit time
    label_definition : human-readable description of the target variable
    extra_metadata : optional extra fields to persist alongside standard metadata
    """
    model_path = MODELS_DIR / f"{name}.pkl"
    meta_path  = MODELS_DIR / f"{name}_metadata.json"

    joblib.dump(pipeline, model_path)

    metadata = {
        "name": name,
        "trained_at": utc_now_iso(),
        "label_definition": label_definition,
        "feature_names": feature_names,
        "metrics": metrics,
        "random_seed": RANDOM_SEED,
        "model_path": str(model_path),
    }
    if extra_metadata:
        metadata.update(extra_metadata)

    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[save_model] Saved → {model_path}")
    print(f"[save_model] Metadata → {meta_path}")
    return model_path, meta_path


def load_model(name: str):
    """Load a serialized pipeline by slug name."""
    model_path = MODELS_DIR / f"{name}.pkl"
    if not model_path.exists():
        raise FileNotFoundError(f"No model artifact found at {model_path}")
    return joblib.load(model_path)


def load_metadata(name: str) -> dict:
    """Load model metadata JSON by slug name."""
    meta_path = MODELS_DIR / f"{name}_metadata.json"
    with open(meta_path, encoding="utf-8") as f:
        return json.load(f)


def save_predictions(
    name: str,
    predictions: list[dict],
    model_version: str,
    extra_payload: dict | None = None,
):
    """Write a standard top-level payload for prediction artifacts."""
    pred_path = MODELS_DIR / f"{name}_predictions.json"
    payload = {
        "generated_at": utc_now_iso(),
        "model_version": model_version,
        "predictions": predictions,
    }
    if extra_payload:
        payload.update(extra_payload)

    with open(pred_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"[save_predictions] Saved → {pred_path}")
    return pred_path, payload


# ── Metrics helpers ───────────────────────────────────────────────────────────

def classification_summary(y_test, y_pred, y_prob=None) -> dict:
    """Return a dict of standard classification metrics."""
    from sklearn.metrics import (
        accuracy_score, f1_score, roc_auc_score,
        precision_score, recall_score
    )
    out = {
        "accuracy":  round(accuracy_score(y_test, y_pred), 4),
        "f1":        round(f1_score(y_test, y_pred, zero_division=0), 4),
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall":    round(recall_score(y_test, y_pred, zero_division=0), 4),
    }
    if y_prob is not None:
        out["roc_auc"] = round(roc_auc_score(y_test, y_prob), 4)
    return out


def regression_summary(y_test, y_pred) -> dict:
    """Return a dict of standard regression metrics."""
    import numpy as np
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    rmse = float(mean_squared_error(y_test, y_pred) ** 0.5)
    return {
        "rmse": round(rmse, 4),
        "mae":  round(float(mean_absolute_error(y_test, y_pred)), 4),
        "r2":   round(float(r2_score(y_test, y_pred)), 4),
    }


def baseline_majority_class(y_train, y_test) -> dict:
    """Dummy baseline: always predict majority class."""
    import numpy as np
    from sklearn.metrics import accuracy_score, f1_score
    majority = y_train.value_counts().idxmax()
    y_dummy  = [majority] * len(y_test)
    return {
        "majority_class": majority,
        "accuracy": round(accuracy_score(y_test, y_dummy), 4),
        "f1":       round(f1_score(y_test, y_dummy, zero_division=0), 4),
    }


def baseline_mean_regression(y_train, y_test) -> dict:
    """Dummy baseline: always predict training mean."""
    import numpy as np
    from sklearn.metrics import mean_squared_error, mean_absolute_error
    mean_val = float(y_train.mean())
    y_dummy  = [mean_val] * len(y_test)
    rmse = float(mean_squared_error(y_test, y_dummy) ** 0.5)
    return {
        "mean_prediction": round(mean_val, 4),
        "rmse": round(rmse, 4),
        "mae":  round(float(mean_absolute_error(y_test, y_dummy)), 4),
    }
