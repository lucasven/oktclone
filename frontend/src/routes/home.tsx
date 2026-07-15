import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'

import { Button } from '../components/ui/Button'
import { useMe } from '../hooks/useMe'
import { logout } from '../lib/auth'
import { fetchHealth, isHealthy } from '../lib/health'

export function HomePage() {
  const { data, isLoading } = useQuery({ queryKey: ['health'], queryFn: fetchHealth })
  const { data: me } = useMe()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  let status = 'checking…'
  if (!isLoading && data) {
    status = isHealthy(data) ? 'online' : 'offline'
  }

  const handleLogout = () => {
    void logout().then(async () => {
      queryClient.clear()
      await navigate({ to: '/login' })
    })
  }

  const greeting = me ? me.profile.display_name || me.email : ''

  return (
    <main>
      <header className="home-header">
        <p>welcome, {greeting}</p>
        <Button variant="secondary" onClick={handleLogout}>
          log out
        </Button>
      </header>
      <h1>oktclone</h1>
      <p>
        API status: <span data-testid="api-status">{status}</span>
      </p>
    </main>
  )
}
