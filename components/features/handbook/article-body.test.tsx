import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ArticleBody } from './article-body'

describe('ArticleBody', () => {
  it('renders markdown as real elements, not raw text', () => {
    render(<ArticleBody markdown={'Some **bold** text.'} />)

    expect(screen.getByText('bold').tagName).toBe('STRONG')
  })

  it('renders GFM tables (remark-gfm)', () => {
    const markdown = '| A | B |\n| --- | --- |\n| 1 | 2 |\n'
    const { container } = render(<ArticleBody markdown={markdown} />)

    expect(container.querySelector('table')).toBeInTheDocument()
  })

  it('wraps content in the article-body typography class', () => {
    const { container } = render(<ArticleBody markdown="Plain text." />)

    expect(container.querySelector('.article-body')).toBeInTheDocument()
  })
})
