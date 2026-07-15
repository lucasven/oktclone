import { useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate } from '@tanstack/react-router'
import { useState, type SyntheticEvent } from 'react'

import { startGoogleLogin, type AuthResult, type ParsedErrors } from '../lib/auth'
import { AuthCard } from './AuthCard'
import { Button } from './ui/Button'
import { FormError } from './ui/FormError'
import { TextField } from './ui/TextField'

interface AuthFormProps {
  title: string
  submitLabel: string
  action: (email: string, password: string) => Promise<AuthResult>
  pendingMessage?: string
  alternate: { prompt: string; linkLabel: string; to: '/login' | '/signup' }
}

const NO_ERRORS: ParsedErrors = { fieldErrors: {} }

export function AuthForm({
  title,
  submitLabel,
  action,
  pendingMessage,
  alternate,
}: Readonly<AuthFormProps>) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<ParsedErrors>(NO_ERRORS)
  const [pending, setPending] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const handleSubmit = (event: SyntheticEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setErrors(NO_ERRORS)
    setPending(false)
    void action(email, password)
      .then(async (result) => {
        if (result.kind === 'success') {
          await queryClient.invalidateQueries({ queryKey: ['me'] })
          await navigate({ to: '/' })
        } else if (result.kind === 'pending') {
          setPending(true)
        } else {
          setErrors(result)
        }
      })
      .finally(() => {
        setSubmitting(false)
      })
  }

  return (
    <AuthCard title={title}>
      {pending ? <p className="form-info">{pendingMessage}</p> : null}
      <FormError message={errors.formError} />
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={setEmail}
          error={errors.fieldErrors.email}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          value={password}
          onChange={setPassword}
          error={errors.fieldErrors.password}
        />
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </form>
      <p className="auth-alt">
        <Button variant="secondary" onClick={startGoogleLogin}>
          continue with Google
        </Button>
      </p>
      <p className="auth-alt">
        {alternate.prompt} <Link to={alternate.to}>{alternate.linkLabel}</Link>
      </p>
    </AuthCard>
  )
}
