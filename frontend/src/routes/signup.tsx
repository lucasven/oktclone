import { AuthForm } from '../components/AuthForm'
import { signup } from '../lib/auth'

export function SignupPage() {
  return (
    <AuthForm
      title="sign up"
      submitLabel="sign up"
      action={signup}
      pendingMessage="Check your email to confirm your account."
      alternate={{ prompt: 'already a member?', linkLabel: 'log in', to: '/login' }}
    />
  )
}
