# IS455 Workspace Guide

This `AGENTS.md` applies to everything under `IS455/`.

## Role & Intent

This folder is the IS455 machine learning deliverable workspace for the INTEX project. The main job here is to build, refine, verify, and package reproducible ML pipelines plus the artifacts and app-facing outputs they depend on.

Work from the assumption that this subtree is the source of truth for:
- notebook-based pipeline development
- shared ML preprocessing / snapshot logic
- serialized model artifacts and prediction JSON outputs
- short-horizon deliverable readiness for the IS455 grading rubric

## Active Layout

- `455-Things/ml-pipelines/` — primary notebooks and shared ML utilities
- `455-Things/ml-pipelines/shared/config.py` — canonical data/model paths and constants
- `455-Things/ml-pipelines/shared/data_loader.py` — shared CSV loading and snapshot builders
- `455-Things/ml-pipelines/shared/model_utils.py` — artifact serialization, metadata, metrics helpers
- `455-Things/ml-pipelines/shared/targets.md` — locked target definitions
- `455-Things/IS455-ML-Deliverables-Plan.md` — grading-driven pipeline plan and notebook section requirements
- `models/` — serialized models, metadata, and prediction JSONs for app/backend consumption
- `455-Things/lighthouse_csv_v7/lighthouse_csv_v7/` — raw CSV source data

## Current Status Snapshot

At the start of this guide, Day 1 pipeline work is complete:
- five scored notebooks exist and were reported clean
- shared infrastructure exists under `ml-pipelines/shared/`
- model artifacts and prediction JSONs exist under `models/`

Treat the current notebooks and artifacts as working assets to preserve unless there is a verified reason to change them.

## Working Rules

- Keep changes focused inside `IS455/` unless the task explicitly requires app integration work in `backend/` or `frontend/`.
- Prefer reusing shared helpers in `ml-pipelines/shared/` over duplicating feature engineering inside notebooks.
- Do not add new dependencies unless the user explicitly asks for them.
- Keep diffs small, reviewable, and reversible.
- Preserve notebook reproducibility: notebooks should run top-to-bottom in a clean session.
- Preserve the six required notebook sections from the deliverables plan when editing scored notebooks.
- Preserve the predictive vs. explanatory distinction in each pipeline.
- Preserve baseline-model comparisons and explicit leakage-check discussion in notebook content.
- Use time-based splits for temporal pipelines unless there is a documented, data-backed reason not to.
- When changing artifact schemas, filenames, or metadata fields, verify downstream consumers and update them in the same task.
- Prefer writing reusable logic in `.py` modules and keeping notebooks as orchestration, analysis, and presentation layers.

## Artifact Contract

Assume these outputs are intended for downstream loading and demo use:
- `*_predictions.json` files in `models/`
- `*_metadata.json` files in `models/`
- serialized `*.pkl` model files in `models/`

Before changing any artifact-writing logic:
- confirm the filename contract still matches existing consumers
- keep metadata fields stable unless a coordinated update is made
- avoid silent breaking changes to prediction JSON structure

## Verification Standard

Verify before declaring work complete.

For notebook changes:
- rerun the affected notebook cleanly when feasible
- confirm required artifacts are regenerated in `models/` when expected
- confirm imports resolve from `shared/` without path hacks

For shared-module changes:
- run the smallest realistic validation that exercises the changed path
- verify artifact output paths still point at `IS455/models/`

For integration work that consumes these outputs:
- verify the consuming code can still read the existing JSON and metadata shape

Final reports for IS455 work should include:
- changed files
- what was simplified or stabilized
- verification performed
- remaining risks or unverified edges

## Current Priorities

Unless the user redirects, the next likely priorities are:
1. Wire the Triage Wizard to `models/resident_risk_predictions.json`
2. Wire the What-if Simulator to live resident-risk inference
3. Wire the Donor Watchlist to `models/donor_retention_predictions.json`
4. Add UI credibility signals such as model info and top factors
5. Re-run all five notebooks in a clean session to confirm reproducibility before submission

## Escalation

Pause and ask only when a change is destructive, materially branching, or would invalidate the deliverable contract. Otherwise, proceed autonomously and verify the result.
