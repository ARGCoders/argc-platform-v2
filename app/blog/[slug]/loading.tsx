import { DetailSkeleton } from '@/components/shared/loading-skeleton'

/** Shown while the article body streams in. */
export default function PostLoading() {
  return (
    <main className="pt-nav">
      <div className="mx-auto max-w-3xl px-[clamp(1.5rem,4vw,3rem)] py-14">
        <DetailSkeleton />
      </div>
    </main>
  )
}
