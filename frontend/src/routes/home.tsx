import { useQuery } from '@tanstack/react-query'

import { fetchHealth, isHealthy } from '../lib/health'

export function HomePage() {
  const { data, isLoading } = useQuery({ queryKey: ['health'], queryFn: fetchHealth })

  let status = 'checking…'
  if (!isLoading && data) {
    status = isHealthy(data) ? 'online' : 'offline'
  }

  return (
    <main>
      <h1>oktclone</h1>
      <p>
        API status: <span data-testid="api-status">{status}</span>
      </p>
    </main>
  )
}
