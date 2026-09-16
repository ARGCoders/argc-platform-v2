import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { EventRow } from './event-row'
import { RevealOnScroll } from './reveal-on-scroll'
import { EmptyState } from '@/components/shared/empty-state'
import { landing } from '@/lib/content'
import { env } from '@/lib/env'
import { getHandbookIntro } from '@/lib/handbook'
import type { PublicEvent } from '@/app/api/public/events/route'

const PREVIEW_COUNT = 3

// underline + focus-visible ring, matching the body-copy-link state pattern
// DESIGN.md documents (`underline-offset-4 hover:underline`) plus the same
// focus treatment breadcrumb.tsx/cycle-selector.tsx already use on Paper —
// caught missing entirely by /impeccable critique.
const CTA_CLASS =
  'font-mono text-[0.72rem] font-medium tracking-[0.1em] text-argc-maroon uppercase underline-offset-4 hover:underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

/**
 * Always fresh (`no-store`), unlike the handbook fetch below — "soonest
 * upcoming" is time-sensitive in a way the handbook's rarely-changing intro
 * isn't. A small local filter, not `partitionEvents`/`EventsList`: this is
 * a 3-item teaser, not a browsable all/upcoming/past view.
 */
async function fetchUpcomingEvents(limit: number): Promise<PublicEvent[]> {
  try {
    const res = await fetch(`${env.APP_URL}/api/public/events?perPage=20`, {
      cache: 'no-store',
    })
    if (!res.ok) {
      // Logged so an API failure is distinguishable from a genuinely quiet
      // week server-side — the visitor-facing EmptyState stays identical
      // either way on purpose, this is for whoever's watching the logs.
      console.error(`[EventsHandbookPreview] events API answered ${res.status}`)
      return []
    }

    const body = (await res.json()) as { data: PublicEvent[] }
    const now = new Date()
    return body.data
      .filter(
        (event) =>
          event.status !== 'cancelled' &&
          new Date(event.ends_at ?? event.starts_at) >= now,
      )
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .slice(0, limit)
  } catch (err) {
    console.error('[EventsHandbookPreview] failed to fetch events:', err)
    return []
  }
}

// Scopes ReactMarkdown's plain child elements into the system's type
// language — today's live README intro happens to be plain paragraphs, but
// a future handbook edit could add a link or list, and this is the only
// thing standing between that and unstyled default markup landing directly
// in the page's proof section. Links match the CTA links' own maroon/
// underline treatment; bold text steps up to full `foreground`.
const MARKDOWN_CLASS =
  '[&_a]:text-argc-maroon [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1'

/**
 * Third section below Hero, directly under Nodes — two-part social proof
 * for a visitor still deciding: real upcoming events (not just landing-page
 * copy) paired with a live excerpt of the actual public handbook. Neither
 * half builds the page it links to (/events already exists; /handbook is
 * planned but unbuilt, same situation as /register).
 *
 * Asymmetric columns (2fr/3fr — handbook's prose needs more room than the
 * events column's compact cards), no vertical divider. Deliberately not
 * Mission & Values' even-split-plus-rule skeleton, the same way Nodes'
 * stat-anchored layout deliberately wasn't either — caught by critique as
 * an unintentional repeat of that section's template. Each half gets its
 * own top rule under the heading instead, echoing Nodes' horizontal-rule
 * vocabulary without reusing its exact bordered-grid treatment. `bg-paper`,
 * alternating back from Nodes' `bg-stone`.
 */
export async function EventsHandbookPreview() {
  const { events: eventsCopy, handbook: handbookCopy } = landing.eventsHandbook
  const [upcoming, intro] = await Promise.all([
    fetchUpcomingEvents(PREVIEW_COUNT),
    getHandbookIntro(),
  ])

  return (
    <section aria-label="Events and handbook" className="bg-paper">
      <RevealOnScroll className="mx-auto max-w-6xl px-6 py-[clamp(4rem,10vw,8rem)] sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-x-16 gap-y-14 md:grid-cols-[2fr_3fr] lg:gap-x-24">
          <div className="flex flex-col gap-6 border-t border-border pt-6">
            <div className="flex flex-col gap-2">
              <h2 className="font-sans text-[1.5rem] font-bold tracking-tight text-foreground">
                {eventsCopy.heading}
              </h2>
              <p className="font-sans text-sm text-muted-foreground">
                {eventsCopy.detail}
              </p>
            </div>

            {upcoming.length > 0 ? (
              <div className="flex flex-col gap-4">
                {upcoming.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <EmptyState
                title={eventsCopy.empty.title}
                description={eventsCopy.empty.description}
              />
            )}

            <Link href="/events" className={CTA_CLASS}>
              {eventsCopy.cta} <span aria-hidden="true">→</span>
            </Link>
          </div>

          <div className="flex flex-col gap-6 border-t border-border pt-6">
            <div className="flex flex-col gap-2">
              <h2 className="font-sans text-[1.5rem] font-bold tracking-tight text-foreground">
                {handbookCopy.heading}
              </h2>
              <p className="font-sans text-sm text-muted-foreground">
                {handbookCopy.detail}
              </p>
            </div>

            <div
              className={`flex max-w-[60ch] flex-col gap-3 font-sans text-base leading-relaxed text-muted-foreground ${MARKDOWN_CLASS}`}
            >
              {intro ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
              ) : (
                <p>{handbookCopy.fallbackIntro}</p>
              )}
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {handbookCopy.categories.map((category) => (
                <li
                  key={category}
                  className="font-mono text-[0.72rem] font-medium tracking-[0.1em] text-foreground uppercase"
                >
                  {category}
                </li>
              ))}
            </ul>

            <Link href="/handbook" className={CTA_CLASS}>
              {handbookCopy.cta} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}
