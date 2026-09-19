import Image from 'next/image'
import Link from 'next/link'
import { BannerPlaceholder } from '@/components/shared/banner-placeholder'
import { AuthorLine } from './author-line'
import { Tag } from './tag'
import { formatBlogDate } from '@/lib/dates'
import type { PostView } from '@/lib/blog'

/**
 * One post in the /blog index, rendered as a horizontal row rather than a
 * card so the wide container does not collapse into a grid of small tiles.
 * The row keeps the flat ARGC log aesthetic: a 16:9 thumbnail that turns to
 * colour on hover, an unconstrained title column, mono metadata separated by
 * middle dots, and a "READ →" affordance on the right. The whole row is a
 * single link.
 */
export function PostRow({ post }: { post: PostView }) {
  const dateStr = formatBlogDate(post.published_at)

  return (
    <article className="group border-b border-border transition-colors duration-200 hover:bg-stone">
      <Link
        href={`/blog/${post.slug}`}
        aria-label={post.title}
        className="flex flex-col gap-6 py-6 outline-none md:flex-row md:items-center md:gap-8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden border border-border md:w-72 lg:w-80">
          {post.bannerUrl ? (
            <Image
              src={post.bannerUrl}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 320px"
              className="object-cover grayscale transition-[filter,transform] duration-500 group-hover:grayscale-0 group-hover:scale-[1.02]"
            />
          ) : (
            <BannerPlaceholder seed={post.slug} className="h-full w-full" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {post.tags.map((tag) => (
                <Tag key={tag}>{tag}</Tag>
              ))}
            </div>
          )}

          <h2 className="mt-3 font-sans text-xl font-bold leading-snug tracking-[-0.01em] text-ink transition-colors duration-200 group-hover:text-argc-maroon md:text-2xl">
            {post.title}
          </h2>

          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-ink-muted md:text-base">
            {post.description}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-[0.7rem] tracking-[0.08em] uppercase text-ink-muted">
            <AuthorLine author={post.author} />
            {dateStr && <span aria-hidden="true">·</span>}
            {dateStr && <time dateTime={post.published_at}>{dateStr}</time>}
            {post.read_time && <span>· {post.read_time}</span>}
          </div>
        </div>

        <span
          aria-hidden="true"
          className="hidden shrink-0 font-mono text-[0.72rem] tracking-[0.14em] uppercase text-argc-maroon opacity-80 transition-opacity duration-200 group-hover:opacity-100 md:block"
        >
          Read →
        </span>
      </Link>
    </article>
  )
}
