'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

/** Handbook route error boundary — a genuine render/render-path exception,
 *  distinct from a live-fetch failure (the article page handles that as
 *  in-page content, not by throwing, so it never reaches this boundary). */
export default function HandbookError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex flex-1 items-center justify-center pt-nav">
      <ErrorFallback error={error} reset={reset} />
    </main>
  )
}
