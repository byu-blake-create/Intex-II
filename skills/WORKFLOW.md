# INTEX Web App Workflow v2 (STRICT)

This document is **normative**. An agent with access to this repo’s **Cursor skills** (under `.cursor/skills/`) and optional **plugins / MCP servers** MUST follow it **in order** unless the **user explicitly overrides** a step in the same conversation thread.

**If anything in this workflow conflicts with a one-line user request, STOP and ask the user to confirm precedence.** Do not silently substitute frameworks or hosting.

---

## §0. Agent contract (read before any code)

### MUST

1. **Read the full `SKILL.md`** (not only the description header) for every skill listed in **§2–§6** before implementing that phase. Skill roots relative to repo root:
   - `.cursor/skills/crisp-dm-pipeline/SKILL.md`
   - `.cursor/skills/researcher/SKILL.md`
   - `.cursor/skills/full-stack-react-dotnet/SKILL.md`
   - `.cursor/skills/full-stack-react-dotnet/security-baseline.md` (read with the full-stack skill)
   - `.cursor/skills/frontend-design/SKILL.md`
   - `.cursor/skills/ui-ux-pro-max/SKILL.md`
   - `.cursor/skills/webapp-testing/SKILL.md`
2. **Run the intake / interview steps** required by each skill **before** large scaffolds (CRISP-DM intake + full-stack **Project brief** + researcher discovery where applicable).
3. **Produce exhaustive CRISP-DM deliverables** per the crisp-dm skill: phased analysis, **no leakage in preprocessing**, baseline vs model, **executive summary** at `lab/<project_slug>/reports/executive_summary.md`, saved **model pipeline artifact** suitable for integration, plus notebook **or** script per user/stakeholder choice captured in intake.
4. **Use the researcher skill** during **modeling and evaluation** to iteratively improve the candidate model (see **§2.3**). Do not ship the first acceptable model without a documented optimization pass unless the user explicitly caps effort.
5. **Scaffold and implement** the web app **strictly** per **full-stack-react-dotnet** (`frontend/` + `backend/` .NET 10 API layout, interview-first, CORS and security baseline).
6. **Apply cybersecurity** using **`security-baseline.md`** (CORS, HTTPS, secrets, validation, EF parameterized access, auth posture per interview).
7. **Apply design** using **frontend-design** and **ui-ux-pro-max** together (typography, palette, layout, component discipline—not generic “AI slop” UI).
8. **Test** the site with **webapp-testing** (Playwright: critical flows, API integration, regression notes).
9. **Supabase (database)** per **§5.1**: **provision and configure for the user** (project, schema/migrations, keys, connection string) so the app can use real Postgres **while developing locally**. If tools/MCP are missing, **stop** and walk the user through setup—do not defer Supabase until production-only.
10. **Local-first delivery**: the full stack MUST run **entirely on the developer machine** (Vite + ASP.NET per the full-stack skill—two processes, documented README) **without** deploying the frontend to Vercel or the API to Azure. **Do not** start **§5.4–§5.7** (Azure/Vercel) until **§5.3** (user sign-off) is complete.
11. **Deploy Azure + Vercel** per **§5.4–§5.7** **only after §5.3**: the user has **explicitly confirmed** they are happy with the web app **and** that it **works** in local testing. If **Vercel or Azure** plugins/MCP/tools are **not** available, **do not skip**: **stop, tell the user**, and **walk them through** enabling access or manual steps with copy-ready commands/screens.
12. **Stakeholder deck**: produce a **native `.pptx`** that summarizes CRISP-DM findings **and** the web app solution, using the **pptx-plugin / PptxGenJS** workflow consistent with your slide-making conventions (structured builds, readable fonts, mandatory slide hygiene from the pptx skill pack if present in the user’s environment).

### MUST NOT

1. Replace the **ASP.NET Core** backend with **Python serverless**, **Node-only BFF**, or **“database-only backend”** unless the user **explicitly** approves that exception in writing in-thread.
2. Collapse “backend” into Supabase **except** as the **managed Postgres** (+ optional Auth/RLS): **business logic and model serving APIs remain on .NET on Azure** unless the user explicitly approves otherwise.
3. Skip **Supabase setup** or **Azure/Vercel deployment** by assuming lack of MCP access without **documenting** the gap and **engaging the user** (see **§5**).
4. Deploy to **Azure** or **Vercel** before **§5.3** (user sign-off) completes.
5. Skip tests because “it looks fine.”

### Skill equivalents (plugins)

If **Claude/Code plugins** are named in runbooks but unavailable in Cursor, the agent MUST still follow the **same `SKILL.md` files** under `.cursor/skills/`. Plugin install commands are for humans; they do not replace reading skills.

---

## §1. Repository & naming

- **CRISP-DM / ML lab:** `lab/<project_slug>/` exactly as in **crisp-dm-pipeline** (data, notebooks, src, jobs, artifacts, reports, logs).
- **Researcher telemetry:** Maintain **`.lab/`** per **researcher** skill (`config`, `log.md`, `results.tsv`, etc.) for experiment runs during optimization. **Promote** the final chosen run (metrics + hyperparameters + artifact pointers) into `lab/<project_slug>/artifacts/runs/` so full-stack integration has one canonical “production candidate” record.
- **Application:** `frontend/` (Vite React TS) and `backend/<ProjectName>.API/` per **full-stack-react-dotnet**.

---

## §2. Phase A — Analytics & modeling (CRISP-DM + data skills + researcher)

### §2.1 CRISP-DM pipeline — **MUST**

Follow **`.cursor/skills/crisp-dm-pipeline/SKILL.md` end-to-end**:

1. **Intake interview** (business question, data access, target, positive class, metrics, leakage constraints, output notebook vs script, **operationalization = Yes** for app integration).
2. **Lab tree** under `lab/<project_slug>/` with `README.md`, `requirements.txt` or `pyproject.toml`, `data/`, `src/`, `jobs/`, `artifacts/`, `reports/`.
3. All **five CRISP-DM phases** in the primary artifact (notebook and/or script) with **documented decisions**, not only code.
4. **Rules:** preprocessing **inside** `sklearn.Pipeline` + `ColumnTransformer`; **stratify** or time-split per problem; **baseline** reported; **test set touched once** for final metrics.
5. **Deliverables:**
   - `reports/executive_summary.md` (mandatory per skill).
   - Saved **full pipeline** (e.g. `joblib`) under `artifacts/models/` plus `model_metadata.json` / `metrics.json` as applicable.
   - Figures/tables under `reports/` where they support Phase 2–5.

### §2.2 Data skills — **MUST where relevant**

Use **`.cursor/skills/*/SKILL.md`** as needed so EDA, SQL, QA, and visuals are rigorous:

| Need | Skill(s) (read `SKILL.md`) |
|------|----------------------------|
| New dataset profiling | `explore-data` |
| Ad hoc analysis / metric questions | `analyze` |
| Warehouse SQL | `sql-queries`, `write-query` |
| Distributions / tests | `statistical-analysis` |
| Charts for notebook, deck, or embedded UI copy | `data-visualization`, `create-viz` |
| Multi-chart internal report | `build-dashboard` (if a static HTML artifact helps reviewers) |
| Pre-release QA of numbers | `validate-data` |

**Rule:** If you show a quantitative claim in the deck or UI, trace it to a reproducible artifact (notebook cell, job output, or report file path) and run **`validate-data`** if stakeholders will rely on it.

### §2.3 Researcher — iterative model optimization — **MUST**

1. After initial CRISP-DM **Phase 4** candidates exist, enter **researcher** mode per **`.cursor/skills/researcher/SKILL.md`**:
   - **Primary metric:** aligned with CRISP-DM Phase 1 (e.g. ROC-AUC, PR-AUC, F1 at a business-chosen operating point—document choice).
   - **Run command:** must invoke training/evaluation on **train/CV only** for comparisons; final holdout unchanged until convergence story is documented.
2. Run a **deliberate** experiment loop (feature sets, class weights, algorithms, hyperparameters, calibration) until **diminishing returns** are documented or user calls stop.
3. **Log** experiments under `.lab/`; **copy or reference** the winning entry into `lab/<slug>/artifacts/runs/` and update `executive_summary.md` with the **final** go/no-go and risks.
4. The **optimized artifact** consumed by .NET MUST be the one promoted from this phase (path + version recorded in backend config/README).

---

## §3. Phase B — Full-stack application (.NET + React)

### §3.1 Full-stack skill — **STRICT**

Follow **`.cursor/skills/full-stack-react-dotnet/SKILL.md`**:

1. **Interview** → **Project brief** (vision, pages, auth, data, deployment hints). **Confirm with user** before skeleton.
2. **Skeleton:** solution layout, `frontend/` + `backend/<ProjectName>.API/`, ports, CORS, Swagger in dev.
3. **Implement** APIs and UI from the brief; **integrate the optimized model**:
   - Preferred: approach documented in Project brief (e.g. ONNX + ML.NET, persisted coefficients, dedicated inference project, or documented **internal** call pattern). The API contract MUST be stable for the React app.
4. **Persistence:** Target **Supabase Postgres** for the real database. The agent MUST **set up Supabase for the user** per **§5.1** so **local** `backend/` uses the Supabase connection string (User Secrets / `appsettings.Development.json` excluded from git). Use SQLite **only** if the Project brief explicitly allows a temporary local DB; default path is **Supabase from first working integration onward**.

### §3.2 Cybersecurity — **MUST**

Implement **`.cursor/skills/full-stack-react-dotnet/security-baseline.md`** completely for the chosen auth story (including no `AllowAnyOrigin` with credentials, correct middleware order, secrets not in git, input validation).

### §3.3 Design — **MUST**

1. Read and apply **`.cursor/skills/frontend-design/SKILL.md`** (bold aesthetic direction, distinctive typography, cohesive motion/spacing).
2. Read and apply **`.cursor/skills/ui-ux-pro-max/SKILL.md`** (use its scripts/data as referenced in that skill for stack-appropriate choices).
3. Data-heavy screens MUST use clear visuals; reuse outputs from **§2.2** where appropriate (export chart assets or drive dynamic charts consistently with the design system).

### §3.4 Quality assurance — **MUST**

1. Follow **`.cursor/skills/webapp-testing/SKILL.md`** using Playwright (or the skill’s prescribed harness): **API** contracts used by the SPA, **happy path** and at least one **failure path**, model/scoring endpoint if exposed.
2. File or reference test artifacts under the repo (e.g. `frontend/e2e/` or path the skill recommends). **Do not declare “done”** without a executed pass or documented blocker.

---

## §4. Phase C — Stakeholder deck (pptx)

### MUST

1. Generate a **PowerPoint** (`.pptx`) that includes at minimum:
   - **Cover** — product name, problem, team/date if known.
   - **Business & success criteria** — from CRISP-DM Phase 1.
   - **Data & methodology** — scope, leakage safeguards, key charts (from data skills).
   - **Model results** — baselines, final metrics, confusion/calibration or equivalent; researcher summary.
   - **Solution architecture** — React (Vercel) + API (Azure) + DB (Supabase), security highlights.
   - **Live / screenshots** — web app flows (from webapp-testing captures if available).
   - **Recommendation & next steps** — monitoring, retrain triggers.
2. Use **pptx-plugin / PptxGenJS** (or equivalent in the user’s pptx skill pack) with **palette discipline** and **page numbers** per that skill’s rules.
3. Store the file in a stable path (e.g. `stakeholder-deck/<Name>.pptx`) and mention it in the repo `README`.

---

## §5. Phase D — Database, local verification, then cloud deployment

### §5.0 Principles — **MUST**

1. **Supabase early:** Provision Postgres (Supabase) **during development**, not as a post-deploy afterthought, so local `.NET` + local Vite exercise the **same** schema and policies the team will ship.
2. **Local-first:** The app MUST be **fully functional locally** — `frontend/` talking to local `backend/` URLs — **with no dependency on Vercel or Azure** for the code to run. Cloud hosting is an **optional promotion** step after acceptance.
3. **Deploy late:** **Azure** (API) and **Vercel** (frontend)—sections **§5.4–§5.7**—happen **only after §5.3**.

### §5.1 Supabase setup — **MUST (before or as part of Phase B completion)**

1. **Create or use** a Supabase project with the user (MCP/plugins, Supabase CLI, or guided dashboard steps).
2. **Apply migrations** / SQL for the schema the app requires (align with EF migrations or document the source of truth).
3. Supply the user with **connection details** the backend needs (host, database, user, password or pooler string) and any **anon/service** keys if the frontend uses Supabase client features—via secure channel, **never** committed.
4. **Walk the user** through any dashboard steps they must perform (org, billing, network). If you lack tool access, **stop** and instruct; do not skip.

### §5.2 Local operation — **MUST**

1. Document in README how to run **`backend/`** (HTTPS dev cert, port) and **`frontend/`** (Vite, `VITE_API_BASE_URL` or proxy) together.
2. Confirm **end-to-end** flows work: UI → .NET API → Supabase Postgres → response (plus model/scoring paths).
3. **webapp-testing** MUST pass against this **local** stack (or document blockers).

### §5.3 User acceptance gate — **MUST**

**Do not** start Azure or Vercel production deployment until the user **explicitly confirms** in the conversation that they:

- are **satisfied** with the web app (UX, flows, design intent), and  
- agree it **works** as tested **locally** (and name any known limitations they accept).

If the user wants changes, iterate **locally** until they confirm.

### §5.4 Cloud targets — **MUST (after §5.3)**

| Layer | Platform | Owns |
|-------|----------|------|
| Database | **Supabase** | Already live from **§5.1**; production URL/keys unchanged unless rotating secrets |
| Backend | **Microsoft Azure** | ASP.NET Core API (App Service, Container Apps, or equivalent—document choice) |
| Frontend | **Vercel** | Built static/SSR output from `frontend/` |

### §5.5 Tooling

- Prefer **Vercel**, **Supabase**, and **Azure** **MCP servers / CLI / official plugins** when available.
- **Never** silently skip because tools are missing.

### §5.6 If tools are unavailable — **MUST**

1. **State clearly** which integration is missing (e.g. “No Azure MCP configured”).
2. **Ask the user** to enable the server, log in, or grant network access.
3. Provide **step-by-step** manual runbooks:
   - **Supabase** (if still pending): project → SQL → connection string → app settings.  
   - **Azure**: app service / container → publish → connection string env → health check.  
   - **Vercel**: import repo → build → env `VITE_API_BASE_URL` → preview URL → CORS update on Azure for that origin.

### §5.7 Configuration hygiene

- **Secrets** only in provider stores or local user secrets—never committed.
- **CORS** on Azure API MUST allow the **exact** Vercel production origin (and preview URLs if used).
- Document **rollback** and **health check** URLs in README.

---

## §6. Definition of Done (checklist)

The agent MUST verify each item or mark it **blocked** with user-facing instructions.

- [ ] `lab/<project_slug>/` complete per **crisp-dm-pipeline** (phases 1–5, executive summary, artifacts).
- [ ] `.lab/` researcher log shows **iterative optimization**; winning config reflected in lab `artifacts/` and narrative.
- [ ] Data skills used where applicable; important numbers **validated** for stakeholder use.
- [ ] `frontend/` + `backend/` per **full-stack-react-dotnet**; **security-baseline** applied.
- [ ] Optimized model integrated and callable from **.NET**; versioning documented.
- [ ] **frontend-design** + **ui-ux-pro-max** reflected in UI quality.
- [ ] **webapp-testing** executed against **local** stack; failures fixed or documented.
- [ ] **Supabase** project and schema **live**; **local** backend connects and persists correctly.
- [ ] README documents **local run** (frontend + backend + Supabase) with no requirement for Azure/Vercel.
- [ ] User **explicit sign-off** recorded in thread (**§5.3**) before any Azure/Vercel deploy.
- [ ] **After sign-off:** Azure API live; Vercel frontend live; production smoke **passes** or **blocker** filed with user.
- [ ] `.pptx` deck delivered and referenced in README.

---

## §7. Concurrency note

Work may **iterate** between modeling and API contracts (e.g. feature names for scoring). **Do not** violate holdout discipline: any change that uses test metrics for model selection is forbidden. Update the **Project brief** when the API surface changes.

---

*End WORKFLOW_2.md*
