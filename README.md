# North Star Shelter

## Admin Dev Startup

The normal local admin stack is:

- frontend: `http://localhost:3000`
- backend API: `https://localhost:5000`
- frontend `/api` requests are proxied to the backend by `frontend/vite.config.ts`

Use the real backend config in `backend/NorthStarShelter.API/.env` when you want the app to behave like the actual admin workspace.

### One-command startup

From the repo root:

```bash
./scripts/dev-admin.sh
```

That starts:

- the ASP.NET API on `https://localhost:5000`
- the Vite frontend on `http://localhost:3000`

Stop the script with `Ctrl+C`. It will shut down the backend process it started.

### Manual startup

Backend:

```bash
dotnet run --project backend/NorthStarShelter.API/NorthStarShelter.API.csproj --urls https://localhost:5000
```

Frontend:

```bash
cd frontend
npm run dev
```

### First-run checks

- confirm `backend/NorthStarShelter.API/.env` exists
- trust the local ASP.NET HTTPS development certificate if `https://localhost:5000` is blocked
- install frontend packages with `cd frontend && npm install`

### Validation

Before opening a PR for admin changes, run:

```bash
dotnet build NorthStarShelter.slnx
cd frontend && npm run build && npm run lint
```
