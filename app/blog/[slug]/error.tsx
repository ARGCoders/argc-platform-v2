'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

/** Post detail error boundary. */
export default function PostError({
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
