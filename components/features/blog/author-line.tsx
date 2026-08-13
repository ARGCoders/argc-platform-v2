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
        <span className="flex h-6 w-6 items-center justify-center bg-muted text-[0.6rem] font-bold text-muted-foreground">
          {name.charAt(0).toUpperCase()}
        </span>
      )}
      <span className="text-sm font-medium text-foreground">{name}</span>
    </span>
  )
}
