'use client'

import { ErrorFallback } from '@/components/shared/error-fallback'

export default function ProposeEventError({
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
      title="Couldn't load the propose page"
      surface="dark"
    />
  )
}
