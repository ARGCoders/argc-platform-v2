"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ErrorFallbackProps {
  error: Error & { digest?: string };
  /** Next.js passes this from an error.tsx boundary — re-renders the segment. */
  reset?: () => void;
  title?: string;
  className?: string;
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
  title = "Something went wrong",
  className,
}: ErrorFallbackProps) {
  const isDev = process.env.NODE_ENV !== "production";

  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-5 px-6 py-20 text-center",
        className,
      )}
    >
      <p className="font-mono text-[0.72rem] tracking-[0.12em] uppercase text-muted-foreground">
        Error
      </p>

      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>

      {isDev && error.message && (
        <pre className="max-w-prose overflow-x-auto border border-border bg-muted px-4 py-3 text-left font-mono text-xs text-muted-foreground">
          {error.message}
        </pre>
      )}

      {error.digest && (
        <p className="font-mono text-[0.65rem] tracking-[0.08em] text-muted-foreground">
          Reference: {error.digest}
        </p>
      )}

      {reset && (
        <Button onClick={reset} variant="default">
          Try again
        </Button>
      )}
    </div>
  );
}
