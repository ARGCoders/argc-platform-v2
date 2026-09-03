'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

export default function EventsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="pt-nav">
      <ErrorFallback error={error} reset={reset} title="Couldn't load events" />
    </div>
  )
}
