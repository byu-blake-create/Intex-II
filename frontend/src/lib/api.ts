/** Base for API calls; empty uses same-origin `/api` (Vite dev proxy). */
export function apiUrl(path: string): string {
  const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
  const isLocalPage =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const isLocalApi =
    configuredBase.includes('localhost') || configuredBase.includes('127.0.0.1')
  const base = isLocalPage && isLocalApi ? '' : configuredBase
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { credentials: 'include' })
  if (!response.ok) throw new Error(await response.text())
  return response.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(await response.text())
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export async function apiPut(path: string, body: unknown): Promise<void> {
  const response = await fetch(apiUrl(path), {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(await response.text())
}

export async function apiDelete(path: string, query?: Record<string, string | boolean | number>): Promise<void> {
  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}`
    : ''
  const response = await fetch(apiUrl(`${path}${qs}`), {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) throw new Error(await response.text())
}
