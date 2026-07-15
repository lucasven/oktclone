import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { TextField } from './TextField'

describe('TextField', () => {
  it('renders a labelled input bound to value', () => {
    render(<TextField label="Email" name="email" value="a@b.co" onChange={vi.fn()} />)
    const input = screen.getByLabelText('Email')
    expect(input).toHaveValue('a@b.co')
    expect(input).toHaveAttribute('name', 'email')
    expect(input).toHaveAttribute('type', 'text')
  })

  it('supports a custom input type', () => {
    render(
      <TextField label="Password" name="password" type="password" value="" onChange={vi.fn()} />,
    )
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password')
  })

  it('reports changes with the new value', () => {
    const onChange = vi.fn()
    render(<TextField label="Email" name="email" value="" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'x@y.z' } })
    expect(onChange).toHaveBeenCalledWith('x@y.z')
  })

  it('shows an inline error and links it to the input', () => {
    render(<TextField label="Email" name="email" value="" onChange={vi.fn()} error="Invalid." />)
    const input = screen.getByLabelText('Email')
    expect(screen.getByText('Invalid.')).toBeInTheDocument()
    expect(input).toHaveAccessibleDescription('Invalid.')
    expect(input).toHaveAttribute('aria-invalid', 'true')
  })

  it('renders no error element when error is absent', () => {
    render(<TextField label="Email" name="email" value="" onChange={vi.fn()} />)
    expect(screen.getByLabelText('Email')).not.toHaveAttribute('aria-invalid')
  })
})
