import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AuthorLine } from './author-line'

describe('AuthorLine', () => {
  it('renders the author name when the relation is expanded', () => {
    render(<AuthorLine author={{ id: 'u1', intra_login: 'anashwan', avatar_url: '' }} />)
    expect(screen.getByText('anashwan')).toBeInTheDocument()
  })

  it('renders a monogram from the name when there is no avatar', () => {
    render(<AuthorLine author={{ id: 'u1', intra_login: 'anashwan', avatar_url: '' }} />)
    expect(screen.getByText('A')).toBeInTheDocument()
  })

  // Regression guard: the detail page used to show "ARGC collective" for a
  // null author while the index row showed nothing at all for the same
  // data. Owning the fallback here is what keeps both call sites identical.
  it('falls back to "ARGC collective" when there is no author relation', () => {
    render(<AuthorLine author={null} />)
    expect(screen.getByText('ARGC collective')).toBeInTheDocument()
  })
})
