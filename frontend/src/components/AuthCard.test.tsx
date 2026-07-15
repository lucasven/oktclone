import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AuthCard } from './AuthCard'

describe('AuthCard', () => {
  it('renders the title as a heading and its children', () => {
    render(
      <AuthCard title="login">
        <p>form goes here</p>
      </AuthCard>,
    )
    expect(screen.getByRole('heading', { name: 'login' })).toBeInTheDocument()
    expect(screen.getByText('form goes here')).toBeInTheDocument()
  })
})
