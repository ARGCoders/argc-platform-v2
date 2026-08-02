import { Spinner } from '@/components/shared/spinner'

/** Shown while a server component streams. */
export default function RootLoading() {
  return (
    <main className="flex flex-1 items-center justify-center pt-nav">
      <Spinner size="lg" label="Loading page" className="text-muted-foreground" />
    </main>
  )
}
