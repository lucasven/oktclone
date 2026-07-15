import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { FormError } from './FormError'

describe('FormError', () => {
  it('renders the message in an alert', () => {
    render(<FormError message="Bad credentials." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Bad credentials.')
  })

  it('renders nothing without a message', () => {
    const { container } = render(<FormError />)
    expect(container).toBeEmptyDOMElement()
  })
})
