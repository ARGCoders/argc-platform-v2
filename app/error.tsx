"use client";

import { ErrorFallback } from "@/components/shared/error-fallback";

/** Root error boundary — catches anything not handled by a nested error.tsx. */
export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 items-center justify-center pt-nav">
      <ErrorFallback error={error} reset={reset} />
    </main>
  );
}
