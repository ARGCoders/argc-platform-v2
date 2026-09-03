import { notFound } from 'next/navigation'
import { EventsList } from '@/components/features/landing/events-list'
import type { PublicEvent } from '@/app/api/public/events/route'

function event(overrides: Partial<PublicEvent>): PublicEvent {
  return {
    id: overrides.id ?? 'ev',
    title: 'Event',
    slug: overrides.id ?? 'ev',
    poster_photo: null,
    description: '',
    excerpt: '',
    type: 'hackathon',
    status: 'scheduled',
    starts_at: new Date().toISOString(),
    ends_at: null,
    location: null,
    ...overrides,
  }
}

const now = Date.now()
const days = (n: number) => new Date(now + n * 86_400_000).toISOString()

const MOCK_EVENTS: PublicEvent[] = [
  event({
    id: 'hackathon',
    title: 'Winter Sprint — Open Registration',
    excerpt: 'Seven nodes ship in 48 hours; results judged by senior peers.',
    type: 'hackathon',
    status: 'scheduled',
    starts_at: days(20),
  }),
  event({
    id: 'knowledge',
    title: 'Failure Reviews: Postmortems in Public',
    excerpt: 'Three incident write-ups presented by the members who owned them.',
    type: 'knowledge_session',
    status: 'approved',
    starts_at: days(5),
  }),
  event({
    id: 'workshop-no-excerpt',
    title: 'Onboarding Workshop',
    // No description on purpose — checks the card renders cleanly with the
    // excerpt paragraph omitted rather than an empty gap.
    type: 'workshop',
    status: 'proposed',
    starts_at: days(35),
  }),
  event({
    id: 'community',
    title: 'Node Assembly · Spring Convocation',
    excerpt: 'Charter amendments voted on the floor; full minutes attached.',
    type: 'community',
    status: 'completed',
    starts_at: days(-40),
  }),
  event({
    id: 'cross-node',
    title: 'Cross-Node Reading Group · Consensus',
    excerpt: 'Six weeks on replication protocols, closed with a written exam.',
    type: 'cross_node',
    status: 'completed',
    starts_at: days(-90),
  }),
  event({
    id: 'cancelled',
    title: 'Cancelled Hackathon',
    excerpt: 'Postponed pending venue confirmation.',
    type: 'hackathon',
    status: 'cancelled',
    starts_at: days(-10),
  }),
]

/**
 * Dev-only: renders the real `EventsList`/`EventRow` pair against fixture
 * data instead of `/api/public/events` — no PocketBase call, so it works
 * without `POCKETBASE_ADMIN_EMAIL`/`PASSWORD` configured locally. Lives
 * outside `/events` so it never collides with the real page or picks up its
 * maroon navbar variant (that variant keys off the `/events` path prefix).
 */
export default function EventsPreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="mx-auto max-w-6xl px-6 pt-nav pb-16 sm:px-8 lg:px-12">
      <div className="mt-12 mb-10 flex flex-col gap-3 border-b border-border pb-8">
        <h1 className="font-sans text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          Events (preview)
        </h1>
        <p className="max-w-2xl font-sans text-base text-muted-foreground">
          Fixture data — no PocketBase call. The real page is at{' '}
          <code className="font-mono text-sm">/events</code>.
        </p>
      </div>

      <div className="mb-16">
        <p className="mb-4 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
          EventsList — populated
        </p>
        <EventsList events={MOCK_EVENTS} />
      </div>

      <div>
        <p className="mb-4 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
          EventsList — empty
        </p>
        <EventsList events={[]} />
      </div>
    </main>
  )
}
