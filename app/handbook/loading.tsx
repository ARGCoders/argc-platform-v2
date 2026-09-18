import { HandbookIndexSkeleton } from '@/components/shared/loading-skeleton'

/** Shown while the handbook index (and its live-fetched article catalog
 *  labels) streams in. Matches the /handbook layout. */
export default function HandbookLoading() {
  return (
    <main className="mx-auto w-full max-w-[90rem] px-[clamp(1.5rem,4vw,3rem)] py-14 pt-nav">
      <HandbookIndexSkeleton />
    </main>
  )
}
