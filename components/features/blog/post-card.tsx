import Image from 'next/image'
import Link from 'next/link'
import { BannerPlaceholder } from '@/components/shared/banner-placeholder'
import { AuthorLine } from './author-line'
import { Tag } from './tag'
import { formatBlogDate } from '@/lib/dates'
import type { PostView } from '@/lib/blog'

/**
 * One post in the /blog grid. The whole card is a single link so the click
 * target is the full row, not just the title. Card styling follows
 * BLOG_DESIGN_SPECS §3.1: stone fill, 1px border, sharp corners, a 16:9
 * grayscale image that turns to colour on hover, and a smooth transition lift
 * with a 2px maroon bottom highlight. (`row-rise` stays entry-only — replaying
 * it on hover makes the card flicker out from opacity 0.)
 */
export function PostCard({ post }: { post: PostView }) {
  return (
    <article className="group flex flex-col border border-border bg-stone transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[inset_0_-2px_0_var(--color-argc-maroon)]">
      <Link
        href={`/blog/${post.slug}`}
        aria-label={post.title}
        className="flex h-full flex-col"
      >
        {post.bannerUrl ? (
          <div className="relative aspect-video w-full overflow-hidden">
            <Image
              src={post.bannerUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover grayscale transition-[filter,transform] duration-500 group-hover:grayscale-0 group-hover:scale-[1.02]"
            />
          </div>
        ) : (
          <BannerPlaceholder seed={post.slug} className="aspect-video" />
        )}

        <div className="flex flex-1 flex-col gap-3 p-5">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {post.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}

          <h2 className="font-sans text-lg font-bold leading-snug tracking-[-0.01em] text-ink group-hover:underline">
            {post.title}
          </h2>

          <p className="line-clamp-3 text-sm leading-relaxed text-ink-muted">
            {post.description}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4">
            <AuthorLine author={post.author} />
            <span className="font-mono text-[0.7rem] tracking-[0.08em] text-ink-muted">
              {formatBlogDate(post.published_at)}
            </span>
            {post.read_time && (
              <span className="font-mono text-[0.7rem] text-ink-muted">
                · {post.read_time}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  )
}
