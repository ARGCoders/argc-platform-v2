import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPublishedPostBySlug } from '@/lib/blog'
import { formatBlogDate } from '@/lib/dates'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { BannerPlaceholder } from '@/components/shared/banner-placeholder'
import { AuthorLine } from '@/components/features/blog/author-line'
import { PostBody } from '@/components/features/blog/post-body'
import { Tag } from '@/components/features/blog/tag'

// Same reasoning as the /blog index: CI builds without PocketBase, so the
// post renders at request time.
export const dynamic = 'force-dynamic'

interface PostPageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PostPageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  if (!post) return { title: 'Post not found' }
  return { title: post.title, description: post.description }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  if (!post) notFound()

  const kicker = post.tags[0]?.toUpperCase() || 'Field notes'
  const dateStr = formatBlogDate(post.published_at)

  return (
    <main className="pt-nav bg-paper">
      <article className="mx-auto w-full max-w-[80rem] px-[clamp(1.5rem,4vw,3rem)] pb-24 pt-8 md:pt-12">
        <div className="border-b border-border pb-4">
          <Breadcrumb items={[{ label: 'Blog', href: '/blog' }, { label: post.title }]} />
        </div>

        <header className="mt-10">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 bg-argc-maroon" />
            <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-argc-maroon">
              {kicker}
            </p>
          </div>

          <h1 className="mt-5 font-sans text-[clamp(2.4rem,5.5vw,4rem)] font-bold leading-[1.04] tracking-[-0.03em] text-ink [text-wrap:balance]">
            {post.title}
          </h1>

          <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border pt-5 font-mono text-[0.72rem] tracking-[0.1em] uppercase text-ink-muted">
            <AuthorLine author={post.author} />
            {dateStr && <span aria-hidden="true">·</span>}
            {dateStr && <time dateTime={post.published_at}>{dateStr}</time>}
            {post.read_time && <span>· {post.read_time}</span>}
          </div>
        </header>

        {post.bannerUrl ? (
          <div className="relative mt-10 aspect-[16/7] w-full overflow-hidden border border-border">
            <Image
              src={post.bannerUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 60rem"
              className="object-cover"
            />
          </div>
        ) : (
          <BannerPlaceholder
            seed={post.slug}
            className="mt-10 aspect-[16/7] border border-border"
          />
        )}

        {post.tags.length > 0 && (
          <div className="mt-8 flex max-w-[46rem] flex-wrap gap-x-3 gap-y-1">
            {post.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}

        <div className="mt-10 max-w-[46rem]">
          <PostBody html={post.contentHtml} />
        </div>
      </article>
    </main>
  )
}
