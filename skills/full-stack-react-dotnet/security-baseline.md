# Security baseline (RootkitIdentityW26 + production hardening)

Use this when implementing or reviewing the stack. The live sample repo may be a teaching mix; the **skill** expects these behaviors.

## Backend (ASP.NET Core 10)

| Area | Requirement |
|------|-------------|
| **CORS** | Named policy (e.g. `FrontendClient`). `WithOrigins` **only** the configured frontend URL (`FrontendUrl` in appsettings, never hardcode in multiple places). If cookies or credentialed requests are used: `AllowCredentials()`. Do not use `AllowAnyOrigin` with credentials. |
| **Pipeline order** | `UseCors(policyName)` before `UseHttpsRedirection`. Keep `UseAuthentication()` before `UseAuthorization()` when auth is enabled. |
| **HTTPS** | `UseHttpsRedirection()`. In production, enable HSTS (`UseHsts`) behind HTTPS-terminated infrastructure as appropriate. |
| **Config / secrets** | Connection strings, frontend URL, and auth secrets in configuration or user secrets — not committed as plaintext secrets in source. |
| **Hosts** | Prefer tightening `AllowedHosts` for production (avoid `*` where possible). |
| **API surface** | `[ApiController]`, conventional `api/[controller]` routes. Validate and bound all inputs (e.g. clamp `pageSize`/`pageNum`, max string lengths, enums). |
| **Data access** | EF Core parameterized queries; `AsNoTracking` for read-only lists where suitable. No raw SQL concatenation. |
| **Identity package** | Reference `Microsoft.AspNetCore.Identity.EntityFrameworkCore` (same major as your ASP.NET version). **If the interview requires sign-in**, wire `IdentityDbContext`, `AddIdentity`, authentication (e.g. cookies or JWT per product choice), `UseAuthentication`, and `[Authorize]` on protected endpoints. |

## Frontend (Vite + React + TypeScript)

| Area | Requirement |
|------|-------------|
| **API base** | `import.meta.env.VITE_API_BASE_URL ?? ''` for fetch URLs; document `.env` / `.env.local` for non-proxied builds. |
| **Dev proxy** | Optional `server.proxy` for `/api` → backend HTTPS URL (e.g. `https://localhost:5000`) with `secure: false` only for local dev certificates. |
| **XSS** | Prefer React escaping; avoid `dangerouslySetInnerHTML` unless sanitized and justified. |

## Cross-cutting

- Match ports: frontend dev (e.g. 3000), backend launchSettings HTTPS (e.g. 5000) — CORS origin must match exactly (scheme + host + port).
- Document run instructions (trust dev cert, two terminals) in README.
