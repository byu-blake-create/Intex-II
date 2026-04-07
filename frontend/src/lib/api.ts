/** Base for API calls; empty uses same-origin `/api` (Vite dev proxy). */
export function apiUrl(path: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? ''
  const p = path.startsWith('/') ? path : `/${path}`
  return `${base}${p}`
}

const USE_MOCK = import.meta.env.VITE_MOCK === 'true'

export async function apiGet<T>(path: string): Promise<T> {
  if (USE_MOCK) {
    const { mockFetch } = await import('./mockHandlers')
    const r = mockFetch(apiUrl(path))
    if (!r.ok) throw new Error(await r.text())
    return r.json() as Promise<T>
  }
  const r = await fetch(apiUrl(path), { credentials: 'include' })
  if (!r.ok) throw new Error(await r.text())
  return r.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const r = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
  if (r.status === 204) return undefined as T
  return r.json() as Promise<T>
}

export async function apiPut(path: string, body: unknown): Promise<void> {
  const r = await fetch(apiUrl(path), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) throw new Error(await r.text())
}

export async function apiDelete(path: string, query?: Record<string, string | boolean | number>): Promise<void> {
  const qs = query ? `?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}` : ''
  const r = await fetch(apiUrl(`${path}${qs}`), { method: 'DELETE', credentials: 'include' })
  if (!r.ok) throw new Error(await r.text())
}
