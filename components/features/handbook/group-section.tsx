import Link from 'next/link'
import type { HandbookCategory } from '@/types/content'

/**
 * One category ("Group", in the handbook's own restructuring toward a
 * GitLab-Handbook-style model) on the `/handbook` index: a mono label plus
 * its article rows. No thumbnail/tags/author/date — unlike `PostRow`,
 * there's no such metadata for a handbook article — so this is a lighter
 * row: title, hover state, a "Read →" affordance, same visual language as
 * `/blog`'s rows (`ink`/`ink-muted` tokens, `hover:bg-stone`, maroon on
 * hover) so the two public content sections read as one family.
 */
export function GroupSection({ category }: { category: HandbookCategory }) {
  return (
    <section aria-label={category.label} className="border-t border-border pt-8">
      <h2 className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink-muted">
        {category.label}
      </h2>

      <div className="mt-2">
        {category.articles.map((article) => (
          <article key={article.slug} className="group border-b border-border">
            <Link
              href={`/handbook/${category.slug}/${article.slug}`}
              className="flex items-center justify-between gap-4 py-4 transition-colors duration-200 outline-none hover:bg-stone focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="font-sans text-lg font-medium text-ink transition-colors duration-200 group-hover:text-argc-maroon">
                {article.title}
              </span>
              <span
                aria-hidden="true"
                className="shrink-0 font-mono text-[0.72rem] tracking-[0.14em] text-argc-maroon uppercase opacity-80 transition-opacity duration-200 group-hover:opacity-100"
              >
                Read →
              </span>
            </Link>
          </article>
        ))}
      </div>
    </section>
  )
}
