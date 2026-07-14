import { fetchJson } from './api'

export interface HealthResponse {
  status: string
}

export function isHealthy(health: HealthResponse): boolean {
  return health.status === 'ok'
}

export function fetchHealth(): Promise<HealthResponse> {
  return fetchJson<HealthResponse>('health/')
}
