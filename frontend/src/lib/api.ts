const API_BASE = '/api'

export function apiUrl(path: string): string {
  const trimmed = path.startsWith('/') ? path.slice(1) : path
  return `${API_BASE}/${trimmed}`
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path))
  if (!response.ok) {
    throw new Error(`Request to ${path} failed with status ${String(response.status)}`)
  }
  return response.json() as Promise<T>
}
