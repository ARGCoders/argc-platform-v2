'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

export default function OverviewError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Couldn't load your overview"
      surface="dark"
    />
  )
}
