# Social Post Performance ML Service

FastAPI microservice that serves the social post performance gradient-boosting model.

## Setup & Run

```bash
cd ml_service
pip install -r requirements.txt
uvicorn main:app --port 8001 --reload
```

The service starts on `http://localhost:8001`.

## Model Path

The model is loaded from a path relative to this file:

```
../IS455/models/social_post_performance_gb.pkl
```

Resolved at runtime using:

```python
pathlib.Path(__file__).parent.parent / "IS455" / "models" / "social_post_performance_gb.pkl"
```

This means the service can be started from any working directory as long as the repo structure is intact.

## Endpoints

### `GET /health`

Returns `{ "status": "ok", "model_loaded": true }`.

### `POST /predict`

Accepts a JSON body with 19 features and returns:

```json
{
  "predicted_engagement_rate": 0.142,
  "predicted_pct": "14.2%",
  "tier": "High",
  "tier_description": "This post is predicted to perform above average for your audience.",
  "platform_context": "Facebook posts in your history average ~9.8% engagement. This post is predicted at 14.2%.",
  "model_r2": 0.7521,
  "tips": ["..."]
}
```

Tier thresholds: **Low** < 7%, **Medium** 7–15%, **High** > 15%.
