import { CardGridSkeleton } from '@/components/shared/loading-skeleton'

/** Shown while the blog grid streams in. */
export default function BlogLoading() {
  return (
    <main className="px-[clamp(1.5rem,4vw,3rem)] py-14 pt-nav">
      <CardGridSkeleton />
    </main>
  )
}
