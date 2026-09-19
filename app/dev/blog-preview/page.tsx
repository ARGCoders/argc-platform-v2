import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { BannerPlaceholder } from '@/components/shared/banner-placeholder'
import { EmptyState } from '@/components/shared/empty-state'
import { BlogIndexSkeleton, DetailSkeleton } from '@/components/shared/loading-skeleton'
import { PostRow } from '@/components/features/blog/post-row'
import { AuthorLine } from '@/components/features/blog/author-line'
import { Tag } from '@/components/features/blog/tag'
import { PostBody } from '@/components/features/blog/post-body'
import { formatBlogDate } from '@/lib/dates'
import type { PostView } from '@/lib/blog'

function post(overrides: Partial<PostView> & { id: string }): PostView {
  return {
    slug: overrides.id,
    title: 'Post title',
    description: 'A one-line summary of the post.',
    contentHtml: '<p>Body.</p>',
    tags: [],
    read_time: '4 min',
    published_at: new Date().toISOString(),
    created: new Date().toISOString(),
    bannerUrl: null,
    author: null,
    ...overrides,
  }
}

const days = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString()

const AUTHOR = {
  id: 'author-1',
  intra_login: 'jbraun',
  avatar_url: '',
}

const MOCK_POSTS: PostView[] = [
  post({
    id: 'fully-populated',
    title: 'Shipping the Blog: Notes from the Migration',
    description: 'A post with an author and tags — the fully populated row shape.',
    tags: ['engineering', 'retro'],
    author: AUTHOR,
    published_at: days(-2),
  }),
  post({
    id: 'no-author',
    title: 'A Post Without an Author',
    description: 'Checks the row when post.author is null — no byline block at all.',
    published_at: days(-10),
  }),
  post({
    id: 'no-tags-no-read-time',
    title: 'A Post Without Tags or a Read Time',
    description: 'Checks the row when both post.tags and post.read_time are empty.',
    read_time: '',
    author: AUTHOR,
    published_at: days(-14),
  }),
  post({
    id: 'many-tags',
    title: 'A Post With Many Tags, Wrapping Across Lines',
    description: 'Checks the tag row wraps instead of overflowing at narrow widths.',
    tags: ['engineering', 'design', 'process', 'retro', 'infra', 'onboarding'],
    author: AUTHOR,
    published_at: days(-18),
  }),
  post({
    id: 'long-title',
    title:
      'A Deliberately Long Title That Should Wrap Across Multiple Lines to Check the Row Layout Does Not Break',
    description: 'Checks title wrapping at both mobile and desktop widths.',
    tags: ['stress-test'],
    author: AUTHOR,
    published_at: days(-22),
  }),
]

const DETAIL_POST = post({
  id: 'fully-populated',
  title: 'Shipping the Blog: Notes from the Migration',
  description: 'A post with an author and tags.',
  tags: ['engineering', 'retro'],
  author: AUTHOR,
  published_at: days(-2),
  contentHtml: `
    <p>We moved the blog off the old static generator and onto PocketBase-backed
    content, rendered live from <a href="/blog">/blog</a>. This exercises every
    rule in <code>.article-body</code>, including the two we just added.</p>

    <h2>Why now</h2>
    <p>The old pipeline needed a full rebuild for a single typo fix. This one
    doesn't.</p>

    <h3>What changed</h3>
    <ul>
      <li>Posts are sanitized server-side with DOMPurify</li>
      <li>Banners resolve through <code>files.getURL()</code></li>
      <li>Authors expand from the PocketBase relation</li>
    </ul>

    <h4>Rollout order</h4>
    <ol>
      <li>Schema first</li>
      <li>Data layer and sanitizer</li>
      <li>Components and routes</li>
    </ol>

    <blockquote>Ship the boring version first. Ship it again when it's wrong.</blockquote>

    <h2>Numbers</h2>
    <table>
      <thead>
        <tr><th>Stage</th><th>Before</th><th>After</th></tr>
      </thead>
      <tbody>
        <tr><td>Build time</td><td>340s</td><td>0s (no rebuild)</td></tr>
        <tr><td>Edit-to-live</td><td>~15 min</td><td>Immediate</td></tr>
      </tbody>
    </table>

    <pre><code>export async function getPublishedPosts() {
  const admin = await getAdminClient()
  return admin.collection('posts').getList(1, 100, { filter: "status = 'published'" })
}</code></pre>

    <p>Full writeup in the <a href="https://github.com/ARGCoders/argc-platform-v2">repo</a>.</p>
  `,
})

/**
 * Dev-only: renders the real blog components and pages against fixture data
 * instead of PocketBase — /blog and /blog/[slug] require a superuser session
 * (NEXT_PUBLIC_POCKETBASE_URL + POCKETBASE_ADMIN_EMAIL/PASSWORD) that isn't
 * configured on every machine, and no seed script creates sample posts. This
 * mirrors app/dev/events-preview's approach: same container classes as the
 * real pages, so what's reviewed here transfers directly. The real pages are
 * at /blog and /blog/[slug].
 *
 * Every fixture below keeps `bannerUrl: null` on purpose — `next/image`
 * only accepts local `public/` assets or the remote hosts allow-listed in
 * `next.config.ts`, and this repo already removed its one mock image asset
 * (see `dashboard-overview-preview`'s `avatar_url: ''` comment) rather than
 * commit binaries for previews. `BannerPlaceholder` is itself the real
 * fallback path a bannerless post takes, so this still exercises real code,
 * just never the `<Image>` branch.
 */
export default function BlogPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="mx-auto max-w-6xl px-6 pt-nav pb-16 sm:px-8 lg:px-12">
      <div className="mt-12 mb-10 flex flex-col gap-3 border-b border-border pb-8">
        <h1 className="font-sans text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight text-foreground">
          Blog (preview)
        </h1>
        <p className="max-w-2xl font-sans text-base text-muted-foreground">
          Fixture data — no PocketBase call. The real pages are{' '}
          <code className="font-mono text-sm">/blog</code> and{' '}
          <code className="font-mono text-sm">/blog/[slug]</code>.
        </p>
      </div>

      <Section label="Index — header + count row + populated rows">
        <div className="mx-auto w-full max-w-[90rem]">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 bg-argc-maroon" />
            <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink-muted">
              The Blog
            </p>
          </div>
          <h2 className="mt-6 font-sans text-[clamp(2.5rem,7vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.035em] text-ink [text-wrap:balance]">
            Field notes from the collective.
          </h2>
          <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-ink-muted md:text-lg">
            Retrospectives, technical writeups, and decisions worth explaining.
          </p>

          <div className="mt-12 flex items-baseline justify-between gap-4 border-y border-border py-3">
            <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink">
              Latest
            </span>
            <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink-muted">
              {MOCK_POSTS.length} POSTS
            </span>
          </div>

          <div className="pt-2">
            {MOCK_POSTS.map((p) => (
              <PostRow key={p.id} post={p} />
            ))}
          </div>
        </div>
      </Section>

      <Section label="Index — empty state (zero posts)">
        <div className="mx-auto w-full max-w-[90rem] pt-10">
          <EmptyState
            title="No posts yet"
            description="Posts appear here once the collective publishes its first note."
          />
        </div>
      </Section>

      <Section label="Index — loading skeleton">
        <div className="mx-auto w-full max-w-[90rem]">
          <BlogIndexSkeleton />
        </div>
      </Section>

      <Section label="Detail — full article (tags, author, all .article-body rules)">
        <article className="mx-auto w-full max-w-[80rem]">
          <div className="border-b border-border pb-4">
            <Breadcrumb
              items={[{ label: 'Blog', href: '/blog' }, { label: DETAIL_POST.title }]}
            />
          </div>

          <header className="mt-10">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 bg-argc-maroon" />
              <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-argc-maroon">
                {DETAIL_POST.tags[0]?.toUpperCase() || 'Field notes'}
              </p>
            </div>

            <h1 className="mt-5 font-sans text-[clamp(2.4rem,5.5vw,4rem)] font-bold leading-[1.04] tracking-[-0.03em] text-ink [text-wrap:balance]">
              {DETAIL_POST.title}
            </h1>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-5 font-mono text-[0.72rem] tracking-[0.1em] uppercase text-ink-muted">
              {DETAIL_POST.author ? (
                <AuthorLine author={DETAIL_POST.author} />
              ) : (
                <span>ARGC collective</span>
              )}
              {DETAIL_POST.author && <span aria-hidden="true">·</span>}
              <time dateTime={DETAIL_POST.published_at}>
                {formatBlogDate(DETAIL_POST.published_at)}
              </time>
              {DETAIL_POST.read_time && <span>· {DETAIL_POST.read_time}</span>}
            </div>
          </header>

          {DETAIL_POST.bannerUrl ? (
            <div className="relative mt-10 aspect-[16/7] w-full overflow-hidden border border-border">
              <Image
                src={DETAIL_POST.bannerUrl}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 60rem"
                className="object-cover"
              />
            </div>
          ) : (
            <BannerPlaceholder
              seed={DETAIL_POST.slug}
              className="mt-10 aspect-[16/7] border border-border"
            />
          )}

          {DETAIL_POST.tags.length > 0 && (
            <div className="mt-8 flex max-w-[46rem] flex-wrap gap-x-3 gap-y-1">
              {DETAIL_POST.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}

          <div className="mt-10 max-w-[46rem]">
            <PostBody html={DETAIL_POST.contentHtml} />
          </div>
        </article>
      </Section>

      <Section label="Detail — no author, no tags (literal 'ARGC collective' fallback, 'Field notes' kicker)">
        <article className="mx-auto w-full max-w-[80rem]">
          <header className="mt-4">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 bg-argc-maroon" />
              <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-argc-maroon">
                Field notes
              </p>
            </div>
            <h1 className="mt-5 font-sans text-[clamp(2.4rem,5.5vw,4rem)] font-bold leading-[1.04] tracking-[-0.03em] text-ink [text-wrap:balance]">
              A Post Without an Author or Tags
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-5 font-mono text-[0.72rem] tracking-[0.1em] uppercase text-ink-muted">
              <span>ARGC collective</span>
              <time dateTime={days(-30)}>{formatBlogDate(days(-30))}</time>
            </div>
          </header>
          <BannerPlaceholder
            seed="no-author-detail"
            className="mt-10 aspect-[16/7] border border-border"
          />
        </article>
      </Section>

      <Section label="Detail — loading skeleton">
        <div className="mx-auto w-full max-w-[80rem]">
          <DetailSkeleton />
        </div>
      </Section>
    </main>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mb-20">
      <p className="mb-6 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </p>
      {children}
    </div>
  )
}
