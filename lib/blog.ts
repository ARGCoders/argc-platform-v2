import 'server-only'
import { getAdminClient } from './pocketbase-server'
import { sanitizeHtml } from './sanitize'
import type PocketBase from 'pocketbase'
import type { PostAuthor, PostRecord } from '@/types/pocketbase'

/**
 * The shape blog pages render. Content arrives already sanitized and the
 * banner is a ready-to-serve URL — pages should not transform it further.
 */
export interface PostView {
  id: string
  slug: string
  title: string
  description: string
  /** Sanitized HTML — safe to hand to dangerouslySetInnerHTML. */
  contentHtml: string
  tags: string[]
  read_time: string
  published_at: string
  created: string
  /** Null when the post has no banner; render BannerPlaceholder instead. */
  bannerUrl: string | null
  author: PostAuthor | null
}

const PUBLISHED = 'published'

/**
 * Banner URLs go through files.getURL() — the same resolution the events
 * layer uses — so the host always matches the PocketBase this admin client
 * points at, local dev or production.
 */
function toPostView(post: PostRecord, admin: PocketBase): PostView {
  return {
    id: post.id,
    slug: post.slug,
    title: post.title,
    description: post.description,
    contentHtml: sanitizeHtml(post.content),
    tags: post.tags
      ? post.tags
          .split(',')
          .map((tag) => tag.trim())
          .filter(Boolean)
      : [],
    read_time: post.read_time,
    published_at: post.published_at,
    created: post.created,
    bannerUrl: post.banner ? admin.files.getURL(post, post.banner) : null,
    author: post.expand?.author ?? null,
  }
}

/**
 * All published posts, newest first. Status filtering lives here and nowhere
 * else — the frontend only ever renders published content.
 */
export async function getPublishedPosts(): Promise<PostView[]> {
  const admin = await getAdminClient()
  const result = await admin.collection('posts').getList<PostRecord>(1, 100, {
    filter: admin.filter('status = {:status}', { status: PUBLISHED }),
    sort: '-published_at',
    expand: 'author',
  })
  // The index has no pagination — a 101st post would otherwise disappear
  // from /blog with no signal anywhere that anything was truncated.
  if (result.totalItems > result.items.length) {
    console.warn(
      `[lib/blog] getPublishedPosts truncated: ${result.totalItems} published posts exist, only the newest ${result.items.length} were returned`,
    )
  }
  return result.items.map((post) => toPostView(post, admin))
}

/**
 * A single published post by slug, or null when it is missing or unpublished.
 * Callers decide between 404 and hiding the link.
 */
export async function getPublishedPostBySlug(slug: string): Promise<PostView | null> {
  const admin = await getAdminClient()
  const result = await admin.collection('posts').getList<PostRecord>(1, 1, {
    filter: admin.filter('status = {:status} && slug = {:slug}', {
      status: PUBLISHED,
      slug,
    }),
    expand: 'author',
  })
  return result.items[0] ? toPostView(result.items[0], admin) : null
}
