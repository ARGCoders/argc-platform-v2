import type { Metadata } from 'next'
import { getHandbookCategories } from '@/lib/handbook'
import { handbookPage } from '@/lib/content'
import { GroupSection } from '@/components/features/handbook/group-section'

// Article bodies fetch live from raw.githubusercontent.com at render time —
// same reasoning as app/blog/page.tsx and the landing Handbook teaser: CI
// builds without network access to that content, so render at request time
// instead of failing the build.
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: `${handbookPage.header.eyebrow} — ${handbookPage.header.title.join(' ')}`,
  description: handbookPage.header.tagline,
}

export default function HandbookPage() {
  const categories = getHandbookCategories()
  const sectionsLabel = `${categories.length} OF ${handbookPage.totalSections} SECTIONS LIVE`

  return (
    <main className="pt-nav bg-paper">
      <section className="mx-auto w-full max-w-[90rem] px-[clamp(1.5rem,4vw,3rem)] pt-14 pb-12 md:pt-20 md:pb-14">
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 bg-argc-maroon" />
          <p className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink-muted">
            {handbookPage.header.eyebrow}
          </p>
        </div>

        <h1 className="mt-6 font-sans text-[clamp(2.5rem,7vw,5.25rem)] font-bold leading-[0.98] tracking-[-0.035em] text-ink [text-wrap:balance]">
          {handbookPage.header.title.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h1>

        <p className="mt-6 max-w-[60ch] text-base leading-relaxed text-ink-muted md:text-lg">
          {handbookPage.header.tagline}
        </p>
      </section>

      <section className="mx-auto w-full max-w-[90rem] px-[clamp(1.5rem,4vw,3rem)] pb-24">
        <div className="flex items-baseline justify-between gap-4 border-y border-border py-3">
          <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink">
            Sections
          </span>
          <span className="font-mono text-[0.7rem] tracking-[0.2em] uppercase text-ink-muted">
            {sectionsLabel}
          </span>
        </div>

        {categories.map((category) => (
          <GroupSection key={category.slug} category={category} />
        ))}
      </section>
    </main>
  )
}
