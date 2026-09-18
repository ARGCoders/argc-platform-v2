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
  const getURL = vi.fn((_record: unknown, filename: string) => `URL:${filename}`)
  const pb = {
    filter,
    files: { getURL },
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
    expect(view.bannerUrl).toBe('URL:banner.png')
    expect(view.author).toBeNull()
  })

  it('keeps the author when the relation is expanded', async () => {
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

  it('returns no banner URL when the banner field is empty', async () => {
    mockAdminClient([makePost({ banner: '' })])

    const view = (await getPublishedPosts())[0]!

    expect(view.bannerUrl).toBeNull()
  })

  it('drops blank tags from the split', async () => {
    mockAdminClient([makePost({ tags: 'one, , three' })])

    const view = (await getPublishedPosts())[0]!

    expect(view.tags).toEqual(['one', 'three'])
  })
})

describe('getPublishedPostBySlug', () => {
  it('filters by both status and slug', async () => {
    const { pb, getList } = mockAdminClient([])

    await getPublishedPostBySlug('hello-world')

    expect(pb.filter).toHaveBeenCalledWith('status = {:status} && slug = {:slug}', {
      status: 'published',
      slug: 'hello-world',
    })
    expect(getList).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ expand: 'author' }),
    )
  })

  it('returns the mapped post when found', async () => {
    mockAdminClient([makePost()])

    const post = await getPublishedPostBySlug('hello-world')

    expect(post?.slug).toBe('hello-world')
    expect(post?.contentHtml).toBe('SANITIZED:<p>Raw content</p>')
  })

  it('returns null when the slug is missing or unpublished', async () => {
    mockAdminClient([])

    expect(await getPublishedPostBySlug('nope')).toBeNull()
  })
})
