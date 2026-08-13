import 'server-only'
import { getAdminClient } from './pocketbase-server'
import { sanitizeHtml } from './sanitize'
import { pocketBaseFileUrl } from './pb-assets'
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

function toPostView(post: PostRecord): PostView {
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
    bannerUrl: post.banner
      ? pocketBaseFileUrl(post.collectionId, post.id, post.banner)
      : null,
    author: post.expand?.author ?? null,
  }
}

/**
 * All published posts, newest first. Status filtering lives here and nowhere
 * else — the frontend only ever renders published content.
 */
export async function getPublishedPosts(): Promise<PostView[]> {
  const pb = await getAdminClient()
  const result = await pb.collection('posts').getList<PostRecord>(1, 100, {
    filter: pb.filter('status = {:status}', { status: PUBLISHED }),
    sort: '-published_at',
    expand: 'author',
  })
  return result.items.map(toPostView)
}

/**
 * A single published post by slug, or null when it is missing or unpublished.
 * Callers decide between 404 and hiding the link.
 */
export async function getPublishedPostBySlug(slug: string): Promise<PostView | null> {
  const pb = await getAdminClient()
  const result = await pb.collection('posts').getList<PostRecord>(1, 1, {
    filter: pb.filter('status = {:status} && slug = {:slug}', {
      status: PUBLISHED,
      slug,
    }),
    expand: 'author',
  })
  return result.items[0] ? toPostView(result.items[0]) : null
}
