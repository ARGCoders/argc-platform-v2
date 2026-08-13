import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '@/test/render'
import { PostRow } from './post-row'
import type { PostView } from '@/lib/blog'

function makePost(overrides: Partial<PostView> = {}): PostView {
  return {
    id: 'p1',
    slug: 'hello-world',
    title: 'Hello World',
    description: 'A first post.',
    contentHtml: '<p>x</p>',
    tags: ['career', '42 amman'],
    read_time: '4 min read',
    published_at: '2026-08-13T10:00:00.000Z',
    created: '2026-08-10T10:00:00.000Z',
    bannerUrl: null,
    author: null,
    ...overrides,
  }
}

describe('PostRow', () => {
  it('links the whole row to the post', () => {
    renderWithProviders(<PostRow post={makePost()} />)
    const link = screen.getByRole('link', { name: /hello world/i })
    expect(link).toHaveAttribute('href', '/blog/hello-world')
  })

  it('renders bracket tags, the formatted date and the read time', () => {
    renderWithProviders(<PostRow post={makePost()} />)
    expect(screen.getByText('[CAREER]')).toBeInTheDocument()
    expect(screen.getByText('[42 AMMAN]')).toBeInTheDocument()
    expect(screen.getByText('13 AUG 2026')).toBeInTheDocument()
    expect(screen.getByText('· 4 min read')).toBeInTheDocument()
  })

  it('shows the author name when the relation is expanded', () => {
    renderWithProviders(
      <PostRow
        post={makePost({
          author: { id: 'u1', intra_login: 'anashwan', avatar_url: '' },
        })}
      />,
    )
    expect(screen.getByText('anashwan')).toBeInTheDocument()
  })
})
