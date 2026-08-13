import Image from 'next/image'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { BannerPlaceholder } from '@/components/shared/banner-placeholder'
import { AuthorLine } from './author-line'
import { formatBlogDate } from '@/lib/dates'
import type { PostView } from '@/lib/blog'

/**
 * One post in the /blog grid. The whole card is a single link so the click
 * target is the full row, not just the title.
 */
export function PostCard({ post }: { post: PostView }) {
  return (
    <article className="flex flex-col border border-border bg-card">
      <Link
        href={`/blog/${post.slug}`}
        aria-label={post.title}
        className="group flex h-full flex-col"
      >
        {post.bannerUrl ? (
          <div className="relative aspect-[16/7] w-full overflow-hidden">
            <Image
              src={post.bannerUrl}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          </div>
        ) : (
          <BannerPlaceholder seed={post.slug} className="aspect-[16/7]" />
        )}

        <div className="flex flex-1 flex-col gap-3 p-5">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <h2 className="font-sans text-lg font-bold leading-snug tracking-[-0.01em] text-foreground group-hover:underline">
            {post.title}
          </h2>

          <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">
            {post.description}
          </p>

          <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-2 pt-4">
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
        </div>
      </Link>
    </article>
  )
}
