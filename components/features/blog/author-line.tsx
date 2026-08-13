import Image from 'next/image'
import type { PostAuthor } from '@/types/pocketbase'

/**
 * Author avatar + name for post bylines. Renders a monogram when the author
 * has no avatar, matching the navbar's fallback behaviour.
 */
export function AuthorLine({ author }: { author: PostAuthor | null }) {
  if (!author) return null

  const name = author.intra_login || 'ARGC'

  return (
    <span className="inline-flex items-center gap-2">
      {author.avatar_url ? (
        <Image
          src={author.avatar_url}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 object-cover"
        />
      ) : (
        <span className="flex h-6 w-6 items-center justify-center bg-eng-navy text-[0.6rem] font-bold text-hero-ink">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="font-mono text-[0.7rem] tracking-[0.08em] uppercase text-ink-muted">
        {name}
      </span>
    </span>
  )
}
