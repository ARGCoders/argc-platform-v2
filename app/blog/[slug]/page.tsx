import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPublishedPostBySlug } from '@/lib/blog'
import { formatBlogDate } from '@/lib/dates'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { BannerPlaceholder } from '@/components/shared/banner-placeholder'
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

  return (
    <main className="pt-nav">
      <article className="mx-auto max-w-[65ch] px-[clamp(1.5rem,4vw,3rem)] py-14">
        <Breadcrumb items={[{ label: 'Blog', href: '/blog' }, { label: post.title }]} />

        <h1 className="mt-6 font-sans text-[clamp(1.9rem,4.5vw,3rem)] font-bold leading-[1.08] tracking-[-0.03em] text-ink">
          {post.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2 font-mono text-[0.72rem] uppercase tracking-[0.1em] text-ink-muted">
          {post.author && (
            <>
              <span>{post.author.intra_login}</span>
              <span aria-hidden="true">—</span>
            </>
          )}
          <span>{formatBlogDate(post.published_at)}</span>
          {post.read_time && (
            <>
              <span aria-hidden="true">—</span>
              <span>{post.read_time}</span>
            </>
          )}
        </div>

        {post.bannerUrl ? (
          <div className="relative mt-10 aspect-[16/7] w-full overflow-hidden">
            <Image
              src={post.bannerUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 65ch"
              className="object-cover"
            />
          </div>
        ) : (
          <BannerPlaceholder seed={post.slug} className="mt-10 aspect-[16/7]" />
        )}

        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-x-3 gap-y-1">
            {post.tags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
          </div>
        )}

        <div className="mt-12">
          <PostBody html={post.contentHtml} />
        </div>
      </article>
    </main>
  )
}
