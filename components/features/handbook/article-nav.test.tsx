import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArticleNav } from './article-nav'

describe('ArticleNav', () => {
  it('renders a link to the previous article when one exists', () => {
    render(
      <ArticleNav
        categorySlug="company"
        siblings={{
          prev: { slug: 'mission', title: 'Mission', path: '01-company/01-mission.md' },
          next: null,
        }}
      />,
    )

    expect(screen.getByRole('link', { name: /mission/i })).toHaveAttribute(
      'href',
      '/handbook/company/mission',
    )
  })

  it('renders a link to the next article when one exists', () => {
    render(
      <ArticleNav
        categorySlug="company"
        siblings={{
          prev: null,
          next: { slug: 'values', title: 'Values', path: '01-company/03-values.md' },
        }}
      />,
    )

    expect(screen.getByRole('link', { name: /values/i })).toHaveAttribute(
      'href',
      '/handbook/company/values',
    )
  })

  it('renders nothing at either end of a group', () => {
    const { container } = render(
      <ArticleNav categorySlug="company" siblings={{ prev: null, next: null }} />,
    )

    expect(container).toBeEmptyDOMElement()
  })
})
