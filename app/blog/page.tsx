import type { Metadata } from 'next'
import { getPublishedPosts } from '@/lib/blog'
import { blog } from '@/lib/content'
import { PostCard } from '@/components/features/blog/post-card'
import { EmptyState } from '@/components/shared/empty-state'

// CI builds without PocketBase, and the SDK's fetch is not tracked by Next's
// prerenderer. Renders at request time instead of failing the build — and
// keeps the list current without cache invalidation.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${blog.header.eyebrow} — ${blog.header.title.join(' ')}`,
  description: blog.header.tagline,
}

export default async function BlogPage() {
  const posts = await getPublishedPosts()

  return (
    <main className="pt-nav">
      <section className="px-[clamp(1.5rem,4vw,3rem)] pt-16 pb-14 md:pt-24 md:pb-16">
        <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink-muted">
          {blog.header.eyebrow}
        </p>
        <h1 className="mt-5 font-sans text-[clamp(2.75rem,8vw,6rem)] font-bold leading-[0.95] tracking-[-0.035em] text-ink">
          {blog.header.title.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>
        <p className="mt-6 max-w-[58ch] text-base leading-relaxed text-ink-muted md:text-lg">
          {blog.header.tagline}
        </p>
      </section>

      <section className="px-[clamp(1.5rem,4vw,3rem)] pb-20">
        {posts.length === 0 ? (
          <EmptyState
            title="No posts yet"
            description="Posts appear here once the collective publishes its first note."
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
