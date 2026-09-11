'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ErrorFallbackProps {
  error: Error & { digest?: string }
  /** Next.js passes this from an error.tsx boundary — re-renders the segment. */
  reset?: () => void
  title?: string
  className?: string
  /**
   * `light` (default) renders on Paper/Stone via the ambient `foreground`/
   * `muted-foreground` tokens — correct as-is for the public site, which never
   * applies `.dark`. `dark` is for a Terminal Navy host (the dashboard's
   * `bg-sidebar`): those ambient tokens resolve to the same near-navy value
   * as the background there, so this surface swaps to the hero-ink family
   * instead, matching how DashboardHeader/StatusChip/Field already handle
   * the same surface.
   */
  surface?: 'dark' | 'light'
}

/**
 * Shared body for every error.tsx boundary.
 *
 * The raw message is shown only in development: in production it can carry
 * internal detail, and Next replaces it with a digest anyway.
 */
export function ErrorFallback({
  error,
  reset,
  title = 'Something went wrong',
  className,
  surface = 'light',
}: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-5 px-6 py-20 text-center',
        className,
      )}
    >
      <p
        className={cn(
          'font-mono text-[0.72rem] tracking-[0.12em] uppercase',
          surface === 'dark' ? 'text-hero-ink-dim' : 'text-muted-foreground',
        )}
      >
        Error
      </p>

      <h2
        className={cn(
          'text-2xl font-bold tracking-tight',
          surface === 'dark' ? 'text-hero-ink' : 'text-foreground',
        )}
      >
        {title}
      </h2>

      {isDev && error.message && (
        <pre
          className={cn(
            'max-w-prose overflow-x-auto border px-4 py-3 text-left font-mono text-xs',
            surface === 'dark'
              ? 'border-hero-ink/20 bg-white/5 text-hero-ink-muted'
              : 'border-border bg-muted text-muted-foreground',
          )}
        >
          {error.message}
        </pre>
      )}

      {error.digest && (
        <p
          className={cn(
            'font-mono text-[0.65rem] tracking-[0.08em]',
            surface === 'dark' ? 'text-hero-ink-dim' : 'text-muted-foreground',
          )}
        >
          Reference: {error.digest}
        </p>
      )}

      {reset && (
        <Button
          onClick={reset}
          variant="default"
          className={
            surface === 'dark'
              ? 'bg-argc-maroon-lt hover:bg-argc-maroon-lt/80'
              : undefined
          }
        >
          Try again
        </Button>
      )}
    </div>
  )
}
