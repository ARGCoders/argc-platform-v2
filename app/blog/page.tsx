import type { Metadata } from 'next'
import { getPublishedPosts } from '@/lib/blog'
import { blog } from '@/lib/content'
import { PostRow } from '@/components/features/blog/post-row'
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
  const countLabel = `${posts.length} ${posts.length === 1 ? 'POST' : 'POSTS'}`

  return (
    <main className="pt-nav bg-paper">
      <section className="mx-auto w-full max-w-[90rem] px-[clamp(1.5rem,4vw,3rem)] pt-14 pb-12 md:pt-20 md:pb-14">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 bg-argc-maroon" />
          <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink-muted">
            {blog.header.eyebrow}
          </p>
        </div>

        <h1 className="mt-6 font-sans text-[clamp(2.5rem,7vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.035em] text-ink [text-wrap:balance]">
          {blog.header.title.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>

        <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-ink-muted md:text-lg">
          {blog.header.tagline}
        </p>
      </section>

      <section className="mx-auto w-full max-w-[90rem] px-[clamp(1.5rem,4vw,3rem)] pb-24">
        <div className="flex items-baseline justify-between gap-4 border-y border-border py-3">
          <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink">
            Latest
          </span>
          <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink-muted">
            {countLabel}
          </span>
        </div>

        {posts.length === 0 ? (
          <div className="pt-10">
            <EmptyState
              title="No posts yet"
              description="Posts appear here once the collective publishes its first note."
            />
          </div>
        ) : (
          <div className="pt-2">
            {posts.map((post) => (
              <PostRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
