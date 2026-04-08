/** Base for API calls; empty uses same-origin `/api` (Vite dev proxy). */
export function apiUrl(path: string): string {
  const configuredBase = (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, '')
  const productionFallbackBase =
    typeof window !== 'undefined' && window.location.hostname.endsWith('.vercel.app')
      ? 'https://northstar-shelter-api.azurewebsites.net'
      : ''
  const isLocalPage =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  const resolvedBase = configuredBase || productionFallbackBase
  const isLocalApi =
    resolvedBase.includes('localhost') || resolvedBase.includes('127.0.0.1')
  const base = isLocalPage && isLocalApi ? '' : resolvedBase
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalizedPath}`
}

async function readApiError(response: Response): Promise<string> {
  const text = await response.text()
  try {
    const data = JSON.parse(text) as { message?: unknown; title?: unknown; errors?: Record<string, unknown> }
    if (data && typeof data.message === 'string') {
      return data.message
    }
    if (data && data.errors && typeof data.errors === 'object') {
      const details = Object.entries(data.errors)
        .flatMap(([field, value]) => {
          if (Array.isArray(value)) {
            return value
              .filter((item): item is string => typeof item === 'string')
              .map(item => `${field}: ${item}`)
          }
          return typeof value === 'string' ? [`${field}: ${value}`] : []
        })
      if (details.length > 0) {
        return details.join(' ')
      }
    }
    if (data && typeof data.title === 'string') {
      return data.title
    }
  } catch {
    // fall through to raw text
  }
  return text || `${response.status} ${response.statusText}`
}

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), { credentials: 'include' })
  if (!response.ok) throw new Error(await readApiError(response))
  return response.json() as Promise<T>
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) throw new Error(await readApiError(response))
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

  if (!response.ok) throw new Error(await readApiError(response))
}

export async function apiDelete(path: string, query?: Record<string, string | boolean | number>): Promise<void> {
  const qs = query
    ? `?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}`
    : ''
  const response = await fetch(apiUrl(`${path}${qs}`), {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) throw new Error(await readApiError(response))
}
