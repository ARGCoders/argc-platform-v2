import Link from 'next/link'

/** Shown when a post slug does not exist or is not published. */
export default function BlogNotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 pt-nav">
      <p className="font-mono text-[0.72rem] tracking-[0.1em] uppercase text-ink-muted">
        404 — Post not found
      </p>
      <p className="max-w-prose text-center text-sm text-ink-muted">
        That post does not exist or has not been published yet.
      </p>
      <Link
        href="/blog"
        className="inline-flex items-center bg-argc-maroon px-7 py-3 font-mono text-[0.72rem] font-semibold uppercase tracking-[0.06em] text-hero-ink transition-opacity hover:opacity-90"
      >
        Back to blog
      </Link>
    </main>
  )
}
