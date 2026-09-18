import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  getHandbookArticle,
  getHandbookCategories,
  getHandbookSiblings,
} from '@/lib/handbook'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { ArticleBody } from '@/components/features/handbook/article-body'
import { ArticleNav } from '@/components/features/handbook/article-nav'

// Same reasoning as the /handbook index: the article body fetches live from
// raw.githubusercontent.com, so render at request time.
export const dynamic = 'force-dynamic'

interface ArticlePageProps {
  params: Promise<{ category: string; slug: string }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { category, slug } = await params
  const result = await getHandbookArticle(category, slug)
  if (result.status !== 'ok') return { title: 'Handbook' }
  return { title: `${result.title} — The Handbook` }
}

export default async function HandbookArticlePage({ params }: ArticlePageProps) {
  const { category: categorySlug, slug } = await params
  const category = getHandbookCategories().find((c) => c.slug === categorySlug)
  const result = await getHandbookArticle(categorySlug, slug)
  const siblings = getHandbookSiblings(categorySlug, slug)

  if (result.status === 'not-found') notFound()

  return (
    <main className="pt-nav bg-paper">
      <article className="mx-auto w-full max-w-[80rem] px-[clamp(1.5rem,4vw,3rem)] pt-8 pb-24 md:pt-12">
        <div className="border-b border-border pb-4">
          <Breadcrumb
            items={[
              { label: 'Handbook', href: '/handbook' },
              category
                ? {
                    label: category.label,
                    href: result.status === 'ok' ? '/handbook' : undefined,
                  }
                : { label: categorySlug },
              ...(result.status === 'ok' ? [{ label: result.title }] : []),
            ]}
          />
        </div>

        {result.status === 'error' ? (
          <div className="mt-10 flex flex-col items-start gap-3 border border-dashed border-border px-6 py-14 text-center sm:items-center">
            <p className="font-mono text-[0.72rem] tracking-[0.1em] text-argc-maroon uppercase">
              Couldn&rsquo;t load this article
            </p>
            <p className="max-w-[46ch] text-sm leading-relaxed text-ink-muted">
              The handbook is fetched live from its source and it didn&rsquo;t respond
              just now. The article itself is still there — try again in a moment.
            </p>
            <a
              href={`/handbook/${categorySlug}/${slug}`}
              className="mt-2 font-mono text-[0.72rem] font-medium tracking-[0.1em] text-argc-maroon uppercase underline-offset-4 hover:underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Try again
            </a>
          </div>
        ) : (
          <>
            <header className="mt-10">
              {category && (
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 bg-argc-maroon"
                  />
                  <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-argc-maroon">
                    {category.label}
                  </p>
                </div>
              )}

              <h1 className="mt-5 font-sans text-[clamp(2.4rem,5.5vw,4rem)] font-bold leading-[1.04] tracking-[-0.03em] text-ink [text-wrap:balance]">
                {result.title}
              </h1>
            </header>

            <div className="mt-10 max-w-[38rem]">
              <ArticleBody markdown={result.markdown} />
              <ArticleNav categorySlug={categorySlug} siblings={siblings} />
            </div>
          </>
        )}
      </article>
    </main>
  )
}
