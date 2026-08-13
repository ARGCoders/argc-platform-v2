import type { Metadata } from 'next'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { getPublishedPostBySlug } from '@/lib/blog'
import { formatBlogDate } from '@/lib/dates'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { BannerPlaceholder } from '@/components/shared/banner-placeholder'
import { AuthorLine } from '@/components/features/blog/author-line'
import { PostBody } from '@/components/features/blog/post-body'

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
      <article className="mx-auto max-w-3xl px-[clamp(1.5rem,4vw,3rem)] py-14">
        <Breadcrumb items={[{ label: 'Blog', href: '/blog' }, { label: post.title }]} />

        <h1 className="mt-6 font-sans text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-[1.15] tracking-[-0.02em] text-foreground">
          {post.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2">
          <AuthorLine author={post.author} />
          <span className="font-mono text-[0.7rem] tracking-[0.08em] text-muted-foreground">
            {formatBlogDate(post.published_at)}
          </span>
          {post.read_time && (
            <span className="font-mono text-[0.7rem] text-muted-foreground">
              · {post.read_time}
            </span>
          )}
        </div>

        {post.bannerUrl ? (
          <div className="relative mt-8 aspect-[16/7] w-full overflow-hidden">
            <Image
              src={post.bannerUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover"
            />
          </div>
        ) : (
          <BannerPlaceholder seed={post.slug} className="mt-8 aspect-[16/7]" />
        )}

        {post.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
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
