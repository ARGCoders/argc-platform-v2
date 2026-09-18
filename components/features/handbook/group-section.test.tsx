import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GroupSection } from './group-section'
import type { HandbookCategory } from '@/types/content'

const category: HandbookCategory = {
  slug: 'company',
  label: 'Company',
  articles: [
    { slug: 'mission', title: 'Mission', path: '01-company/01-mission.md' },
    { slug: 'vision', title: 'Vision', path: '01-company/02-vision.md' },
  ],
}

describe('GroupSection', () => {
  it('renders the category label', () => {
    render(<GroupSection category={category} />)
    expect(screen.getByText('Company')).toBeInTheDocument()
  })

  it('renders every article title as a link to /handbook/[category]/[slug]', () => {
    render(<GroupSection category={category} />)

    expect(screen.getByRole('link', { name: /mission/i })).toHaveAttribute(
      'href',
      '/handbook/company/mission',
    )
    expect(screen.getByRole('link', { name: /vision/i })).toHaveAttribute(
      'href',
      '/handbook/company/vision',
    )
  })

  it('gives the section an accessible label matching the category', () => {
    render(<GroupSection category={category} />)
    expect(screen.getByLabelText('Company')).toBeInTheDocument()
  })
})
