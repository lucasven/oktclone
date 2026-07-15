import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { Button } from './Button'

describe('Button', () => {
  it('renders a primary button by default', () => {
    render(<Button>save</Button>)
    const button = screen.getByRole('button', { name: 'save' })
    expect(button).toHaveClass('btn', 'btn-primary')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('supports the secondary variant and submit type', () => {
    render(
      <Button variant="secondary" type="submit">
        go
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'go' })
    expect(button).toHaveClass('btn', 'btn-secondary')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('calls onClick when clicked', () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>hit</Button>)
    fireEvent.click(screen.getByRole('button', { name: 'hit' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled and shows an ellipsis while loading', () => {
    render(<Button loading>save</Button>)
    const button = screen.getByRole('button', { name: 'save…' })
    expect(button).toBeDisabled()
  })

  it('is disabled when disabled is set', () => {
    render(<Button disabled>save</Button>)
    expect(screen.getByRole('button', { name: 'save' })).toBeDisabled()
  })
})
