---
name: full-stack-react-dotnet
description: >-
  Scaffolds and builds custom full-stack web apps with React, TypeScript, Vite in
  `frontend/` and ASP.NET Core 10 Web API in `backend/` using a documented monorepo layout
  (solution folder, nested API project, CORS aligned with the SPA, optional Identity).
  Runs a structured interview for product vision, pages, features, and data sources before
  generating code. Use when creating a new full-stack app, React + .NET + Vite monorepo,
  API + SPA split, or when the user wants this layout with documented security defaults.
---

# Full-stack React + .NET 10 (Vite)

## Workflow overview

1. **Interview** — Capture full context before coding. Do not scaffold until critical gaps are answered or explicitly deferred.
2. **Skeleton** — Repo layout per [Repository layout](#repository-layout), security per [security-baseline.md](security-baseline.md).
3. **Implement** — Features, pages, and APIs from the interview record; keep conventions consistent with the skeleton.

**Reference stance:** Prefer this skill’s layout (separate `frontend/` and `backend/`, minimal APIs with controllers, Vite dev server + optional `/api` proxy) over templates that embed the SPA inside the solution via `.esproj` and NuGet-driven client tooling—unless the user explicitly wants that pattern.

## Interview (run first)

Capture answers in a short **Project brief** (bullet list or table) the agent can follow. Ask follow-ups until the brief covers:

### Vision and scope

- What problem does the app solve? Who are the primary users?
- What is explicitly **out of scope** for v1?

### Experience

- List **pages** or major routes (name + one-line purpose).
- Key **user flows** (e.g. browse → detail → action).
- **Authentication**: anonymous only, accounts, roles/admin? Social login?
- **Branding**: theme constraints, accessibility priorities.

### Data

- **Sources**: new SQLite/EF database, existing API, files, external SaaS?
- **Entities** (or domains): name, main fields, relationships.
- **Read vs write**: which flows mutate data? Who can change what?
- **Volume / performance**: pagination, filtering, search needs?

### Technical

- Deployment target (if known): single VM, Azure, container, static frontend + API.
- Any required **integrations** (email, payments, webhooks).

### Confirmation

- Summarize the brief back to the user and confirm before generating the skeleton or large code drops.

## Repository layout

Use a **single repo** with the SPA and API as siblings: a `.sln` at the root, a virtual **solution folder** named `backend`, and the API project nested under `backend/<ProjectName>.API/`.

```text
<repo-root>/
├── <SolutionName>.sln          # includes solution folder "backend" + nested .csproj
├── frontend/                   # Vite + React + TypeScript (standalone app)
│   ├── src/
│   ├── vite.config.ts
│   ├── package.json
│   └── ...
└── backend/
    └── <ProjectName>.API/
        ├── Program.cs
        ├── appsettings.json
        ├── Controllers/
        ├── Data/
        └── <ProjectName>.API.csproj
```

### Solution file (Visual Studio / .NET CLI)

- Add a **solution folder** (`Project type GUID 2150E333-8FDC-42A3-9474-1A3956D46DE8`) labeled `backend`.
- Add the API project with a path like `backend\<ProjectName>.API\<ProjectName>.API.csproj`.
- In `GlobalSection(NestedProjects)`, nest the API project under the solution folder’s GUID so the tree shows `backend` → API in the IDE.

### Ports and alignment

- **Frontend**: Vite dev server on **3000** unless the brief specifies otherwise; `FrontendUrl` and CORS must use the **exact** origin (scheme + host + port).
- **Backend**: `launchSettings.json` HTTPS on **5000** (or document the chosen ports in the README); enable Swagger in Development.

## Backend skeleton (.NET 10)

- **Target framework**: `net10.0` on the API project.
- **Packages** (pin versions to the 10.0.x line for your SDK): `Microsoft.EntityFrameworkCore`, `Microsoft.EntityFrameworkCore.Sqlite` (or the provider from the interview), `Microsoft.EntityFrameworkCore.Design` / tooling, `Swashbuckle.AspNetCore`, and **`Microsoft.AspNetCore.Identity.EntityFrameworkCore`** so auth can be wired without retargeting later.

### Program.cs — CORS and pipeline order

Use a **named** CORS policy, read the SPA URL from configuration, and call `UseCors` **before** `UseHttpsRedirection`. When Identity or JWT is added, insert `UseAuthentication()` before `UseAuthorization()`.

```csharp
using Microsoft.EntityFrameworkCore;
// using <YourProject>.API.Data;

var builder = WebApplication.CreateBuilder(args);
const string FrontendCorsPolicy = "FrontendClient";
const string DefaultFrontendUrl = "http://localhost:3000";
var frontendUrl = builder.Configuration["FrontendUrl"] ?? DefaultFrontendUrl;

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// builder.Services.AddDbContext<YourDbContext>(options =>
//     options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddCors(options =>
{
    options.AddPolicy(FrontendCorsPolicy, policy =>
    {
        policy.WithOrigins(frontendUrl)
            .AllowCredentials()
            .AllowAnyMethod()
            .AllowAnyHeader();
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(FrontendCorsPolicy);
app.UseHttpsRedirection();
// app.UseAuthentication(); // when auth is enabled
app.UseAuthorization();
app.MapControllers();
app.Run();
```

**Credentials note:** If the product does **not** use cookies or credentialed cross-origin requests, you may omit `AllowCredentials()` and adjust origins accordingly. Never combine `AllowAnyOrigin()` with `AllowCredentials()`.

### appsettings.json shape

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "FrontendUrl": "http://localhost:3000",
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=app.sqlite"
  }
}
```

### Controllers

- `[ApiController]`, `[Route("api/[controller]")]`, inject `DbContext` where needed.
- **Validate and bound** query parameters (pagination, filters). Example pattern:

```csharp
[HttpGet]
public IActionResult GetItems(
    [FromQuery] int pageSize = 10,
    [FromQuery] int pageNum = 1)
{
    pageSize = Math.Clamp(pageSize, 1, 50);
    pageNum = Math.Max(pageNum, 1);

    var query = _db.Items.AsNoTracking().AsQueryable();
    var totalCount = query.Count();
    var items = query
        .OrderBy(e => e.Name)
        .Skip((pageNum - 1) * pageSize)
        .Take(pageSize)
        .ToList();

    return Ok(new { items, totalCount });
}
```

### Authentication (when the interview requires it)

Implement the agreed mechanism: e.g. `IdentityDbContext`, `AddIdentity`, cookie or JWT, `UseAuthentication()`, `[Authorize]` on protected endpoints, and CORS + cookie options that match (same-site / credentials rules). Do not reference Identity packages in the project and then leave them unwired when the product requires accounts.

## Frontend skeleton (Vite + React + TypeScript)

- **Tooling**: React 19, Vite 6, TypeScript, ESLint (Prettier optional). Scaffold with official templates or equivalent.
- **vite.config.ts**: set `server.port` (default **3000**). Optional dev proxy so the browser calls same-origin `/api`:

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'https://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
```

`secure: false` is only for trusting the local ASP.NET Core development certificate; do not treat this as a production setting.

- **API module** (e.g. `src/lib/<domain>Api.ts`): base URL `import.meta.env.VITE_API_BASE_URL ?? ''`; `fetch` with consistent error handling.
- **Routing**: add `react-router-dom` when the brief has multiple pages; a single main view can stay flat.
- **Types**: mirror API DTOs under `src/types/`.

## Security and quality

Before marking work complete, check [security-baseline.md](security-baseline.md).

Additionally:

- No production secrets in the repository; use User Secrets or environment variables for development.
- README: how to run API + frontend, how to trust the HTTPS dev cert on the target OS, and env vars (`VITE_API_BASE_URL`, `FrontendUrl`).

## Implementation priorities

1. Data model + migrations (if EF) + seed data when useful for demos.
2. API endpoints aligned with interview entities and rules.
3. Frontend pages and navigation; loading and error states.
4. Auth only if required — then end-to-end protected routes and API authorization.

## Anti-patterns

- Do **not** default to embedding the React app inside the .NET solution as an `.esproj`/SPA-in-solution project unless the user asks; keep **`frontend/`** and **`backend/`** as separate roots.
- Do **not** use `AllowAnyOrigin()` together with `AllowCredentials()`.
- Do **not** skip the interview when the user’s goals are vague — narrow scope first.