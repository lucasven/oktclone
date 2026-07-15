import { AuthForm } from '../components/AuthForm'
import { login } from '../lib/auth'

export function LoginPage() {
  return (
    <AuthForm
      title="login"
      submitLabel="log in"
      action={login}
      alternate={{ prompt: 'new around here?', linkLabel: 'sign up', to: '/signup' }}
    />
  )
}
