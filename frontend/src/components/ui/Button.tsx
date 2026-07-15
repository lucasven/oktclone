import type { ReactNode } from 'react'

interface ButtonProps {
  variant?: 'primary' | 'secondary'
  type?: 'button' | 'submit'
  disabled?: boolean
  loading?: boolean
  onClick?: () => void
  children: ReactNode
}

export function Button({
  variant = 'primary',
  type = 'button',
  disabled = false,
  loading = false,
  onClick,
  children,
}: Readonly<ButtonProps>) {
  return (
    <button
      type={type}
      className={`btn btn-${variant}`}
      disabled={disabled || loading}
      onClick={onClick}
    >
      {children}
      {loading ? '…' : null}
    </button>
  )
}
