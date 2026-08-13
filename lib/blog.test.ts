import { describe, it, expect, vi } from 'vitest'
import type PocketBase from 'pocketbase'
import { getAdminClient } from '@/lib/pocketbase-server'
import type { PostRecord } from '@/types/pocketbase'
import { getPublishedPosts, getPublishedPostBySlug } from './blog'

vi.mock('@/lib/pocketbase-server', () => ({
  getAdminClient: vi.fn(),
}))

// Keep the test fast and jsdom-free: sanitize and asset URL logic have their
// own tests, so blog only needs to know they were called and applied.
vi.mock('@/lib/sanitize', () => ({
  sanitizeHtml: (html: string) => `SANITIZED:${html}`,
}))

vi.mock('@/lib/pb-assets', () => ({
  pocketBaseFileUrl: (collectionId: string, id: string, filename: string) =>
    `URL:${collectionId}/${id}/${filename}`,
}))

function makePost(overrides: Record<string, unknown> = {}): PostRecord {
  return {
    id: 'p1',
    collectionId: 'col_posts',
    slug: 'hello-world',
    title: 'Hello World',
    description: 'A first post.',
    content: '<p>Raw content</p>',
    status: 'published',
    read_time: '4 min read',
    published_at: '2026-08-13T10:00:00.000Z',
    created: '2026-08-10T10:00:00.000Z',
    updated: '2026-08-13T10:00:00.000Z',
    banner: 'banner.png',
    tags: 'career, 42 amman,',
    expand: {},
    ...overrides,
  } as PostRecord
}

function mockAdminClient(items: PostRecord[]) {
  const getList = vi.fn().mockResolvedValue({ items, totalItems: items.length })
  const filter = vi.fn((template: string) => template)
  const pb = {
    filter,
    collection: vi.fn(() => ({ getList })),
  } as unknown as PocketBase
  vi.mocked(getAdminClient).mockResolvedValue(pb)
  return { pb, getList }
}

describe('getPublishedPosts', () => {
  it('queries the posts collection with status and author expansion', async () => {
    const { pb, getList } = mockAdminClient([])

    await getPublishedPosts()

    expect(pb.collection).toHaveBeenCalledWith('posts')
    expect(pb.filter).toHaveBeenCalledWith('status = {:status}', {
      status: 'published',
    })
    expect(getList).toHaveBeenCalledWith(
      1,
      100,
      expect.objectContaining({ sort: '-published_at', expand: 'author' }),
    )
  })

  it('maps posts to views: sanitized content, split tags, banner URL', async () => {
    mockAdminClient([makePost()])

    const view = (await getPublishedPosts())[0]!

    expect(view.contentHtml).toBe('SANITIZED:<p>Raw content</p>')
    expect(view.tags).toEqual(['career', '42 amman'])
    expect(view.bannerUrl).toBe('URL:col_posts/p1/banner.png')
    expect(view.author).toBeNull()
  })

  it('yields a null banner when the post has none', async () => {
    mockAdminClient([makePost({ banner: '' })])

    const view = (await getPublishedPosts())[0]!

    expect(view.bannerUrl).toBeNull()
  })

  it('carries the expanded author through', async () => {
    mockAdminClient([
      makePost({
        expand: {
          author: { id: 'u1', intra_login: 'anashwan', avatar_url: '' },
        },
      }),
    ])

    const view = (await getPublishedPosts())[0]!

    expect(view.author).toEqual({
      id: 'u1',
      intra_login: 'anashwan',
      avatar_url: '',
    })
  })
})

describe('getPublishedPostBySlug', () => {
  it('returns null when no published post matches', async () => {
    mockAdminClient([])

    expect(await getPublishedPostBySlug('missing')).toBeNull()
  })

  it('filters by slug without interpolating it', async () => {
    const { pb } = mockAdminClient([makePost()])

    await getPublishedPostBySlug('hello-world')

    expect(pb.filter).toHaveBeenCalledWith('status = {:status} && slug = {:slug}', {
      status: 'published',
      slug: 'hello-world',
    })
  })
})
