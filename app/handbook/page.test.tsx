import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import HandbookPage from './page'
import { handbookCatalog, handbookPage } from '@/lib/content'

describe('HandbookPage', () => {
  // Regression guard: the catalog is a deliberate subset of the real repo
  // (2 of N sections) — the index must say so, not read as a finished doc.
  it('shows how many sections are live out of the real total', () => {
    render(<HandbookPage />)

    expect(
      screen.getByText(
        `${handbookCatalog.length} OF ${handbookPage.totalSections} SECTIONS LIVE`,
      ),
    ).toBeInTheDocument()
  })

  it('renders every live category and article title', () => {
    render(<HandbookPage />)

    for (const category of handbookCatalog) {
      expect(screen.getByText(category.label)).toBeInTheDocument()
      for (const article of category.articles) {
        expect(screen.getByText(article.title)).toBeInTheDocument()
      }
    }
  })

  it('links each article to /handbook/[category]/[slug]', () => {
    render(<HandbookPage />)

    const first = handbookCatalog[0]!.articles[0]!
    const category = handbookCatalog[0]!
    expect(
      screen.getByRole('link', { name: new RegExp(first.title, 'i') }),
    ).toHaveAttribute('href', `/handbook/${category.slug}/${first.slug}`)
  })
})
