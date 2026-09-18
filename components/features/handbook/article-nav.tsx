import Link from 'next/link'
import type { HandbookArticleRef } from '@/types/content'
import type { HandbookSiblings } from '@/lib/handbook'

interface ArticleNavProps {
  categorySlug: string
  siblings: HandbookSiblings
}

/**
 * Prev/next row at the foot of an article, scoped to siblings within the
 * same category — a handbook article is one chapter in an ordered group,
 * so finishing one shouldn't dead-end back to browser-back or the index.
 * Reuses `GroupSection`'s mono/maroon "Read →" vocabulary.
 */
export function ArticleNav({ categorySlug, siblings }: ArticleNavProps) {
  if (!siblings.prev && !siblings.next) return null

  return (
    <nav
      aria-label="Article navigation"
      className="mt-16 grid gap-4 border-t border-border pt-8 sm:grid-cols-2"
    >
      <div>
        {siblings.prev && (
          <SiblingLink
            categorySlug={categorySlug}
            article={siblings.prev}
            direction="prev"
          />
        )}
      </div>
      <div className="sm:text-right">
        {siblings.next && (
          <SiblingLink
            categorySlug={categorySlug}
            article={siblings.next}
            direction="next"
          />
        )}
      </div>
    </nav>
  )
}

function SiblingLink({
  categorySlug,
  article,
  direction,
}: {
  categorySlug: string
  article: HandbookArticleRef
  direction: 'prev' | 'next'
}) {
  return (
    <Link
      href={`/handbook/${categorySlug}/${article.slug}`}
      className={`group inline-flex flex-col gap-1 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        direction === 'next' ? 'items-end' : 'items-start'
      }`}
    >
      <span className="font-mono text-[0.72rem] tracking-[0.14em] text-argc-maroon uppercase opacity-80 transition-opacity duration-200 group-hover:opacity-100">
        {direction === 'prev' ? '← Previous' : 'Next →'}
      </span>
      <span className="font-sans text-base font-medium text-ink transition-colors duration-200 group-hover:text-argc-maroon">
        {article.title}
      </span>
    </Link>
  )
}
