import { BlogIndexSkeleton } from '@/components/shared/loading-skeleton'

/** Shown while the blog index streams in. Matches the /blog layout. */
export default function BlogLoading() {
  return (
    <main className="mx-auto w-full max-w-[90rem] px-[clamp(1.5rem,4vw,3rem)] py-14 pt-nav">
      <BlogIndexSkeleton />
    </main>
  )
}
