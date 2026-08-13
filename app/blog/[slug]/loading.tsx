import { DetailSkeleton } from '@/components/shared/loading-skeleton'

/** Shown while the article body streams in. Matches the post layout. */
export default function PostLoading() {
  return (
    <main className="pt-nav">
      <div className="mx-auto w-full max-w-[80rem] px-[clamp(1.5rem,4vw,3rem)] py-10">
        <DetailSkeleton />
      </div>
    </main>
  )
}
