import Link from 'next/link'

/** Shown when a category/article slug is not in the hand-maintained
 *  catalog (lib/handbook.ts's getHandbookCategories()) — a real 404, not
 *  the same thing as a live-fetch failure (see the article page's own
 *  in-page "couldn't load" state for that distinct case). */
export default function HandbookNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 pt-nav">
      <p className="font-mono text-[0.72rem] tracking-[0.1em] uppercase text-ink-muted">
        404 — Article not found
      </p>
      <p className="max-w-prose text-center text-sm text-ink-muted">
        That handbook article doesn&rsquo;t exist, or isn&rsquo;t published on the site
        yet.
      </p>
      <Link
        href="/handbook"
        className="inline-flex items-center bg-argc-maroon px-7 py-3 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-hero-ink transition-opacity hover:opacity-90"
      >
        Back to the handbook
      </Link>
    </main>
  )
}
