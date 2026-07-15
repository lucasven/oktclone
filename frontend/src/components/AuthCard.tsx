import type { ReactNode } from 'react'

export function AuthCard({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <main className="auth-card">
      <h1 className="auth-card-title">{title}</h1>
      {children}
    </main>
  )
}
