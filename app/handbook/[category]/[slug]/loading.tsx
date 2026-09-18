import { HandbookArticleSkeleton } from '@/components/shared/loading-skeleton'

/** Shown while the article body streams in from GitHub. Matches the
 *  article layout. */
export default function HandbookArticleLoading() {
  return (
    <main className="pt-nav">
      <div className="mx-auto w-full max-w-[80rem] px-[clamp(1.5rem,4vw,3rem)] py-10">
        <HandbookArticleSkeleton />
      </div>
    </main>
  )
}
