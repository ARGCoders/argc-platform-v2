import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PostBody } from './post-body'

describe('PostBody', () => {
  it('renders the already-sanitized HTML', () => {
    const { container } = render(<PostBody html="<p>Hello <strong>world</strong></p>" />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
    expect(container.querySelector('p strong')).toBeInTheDocument()
  })

  it('marks the body with the article typography class', () => {
    const { container } = render(<PostBody html="<p>x</p>" />)
    expect(container.firstElementChild).toHaveClass('article-body')
  })
})
