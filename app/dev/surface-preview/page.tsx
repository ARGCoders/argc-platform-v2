import { notFound } from 'next/navigation'
import { EventRow } from '@/components/features/landing/event-row'
import { RoleBadge } from '@/components/shared/dashboard/role-badge'
import { TierBadge } from '@/components/shared/dashboard/tier-badge'
import { NodeMemberRow } from '@/components/shared/dashboard/node-member-row'
import { StatusChip } from '@/components/shared/dashboard/status-chip'
import { Field } from '@/components/shared/field'
import { ROLES } from '@/types/pocketbase'
import type { PublicEvent } from '@/app/api/public/events/route'

const SAMPLE_EVENTS: PublicEvent[] = [
  {
    id: 'ev-1',
    title: 'Winter Sprint — Open Registration',
    slug: 'winter-sprint',
    poster_photo: null,
    description: '',
    excerpt: 'Seven nodes ship in 48 hours; results judged by senior peers.',
    type: 'hackathon',
    status: 'scheduled',
    starts_at: '2027-03-14T15:00:00.000Z',
    ends_at: null,
    location: '42 Amman · Cluster 2',
  },
  {
    id: 'ev-2',
    title: 'Cancelled Hackathon',
    slug: 'cancelled-hackathon',
    poster_photo: null,
    description: '',
    excerpt: 'Postponed pending venue confirmation.',
    type: 'hackathon',
    status: 'cancelled',
    starts_at: '2026-02-18T19:00:00.000Z',
    ends_at: null,
    location: null,
  },
]

function PanelLabel({
  mood,
  name,
  surface,
}: {
  mood: string
  name: string
  surface: 'dark' | 'light'
}) {
  return (
    <p
      className={
        'mb-4 font-mono text-[0.68rem] font-medium tracking-[0.1em] uppercase ' +
        (surface === 'dark' ? 'text-hero-ink-dim' : 'text-ink-muted')
      }
    >
      {mood} — {name}
    </p>
  )
}

/**
 * Dev-only: real EventRow/Field on the real Paper background next to real
 * RoleBadge/TierBadge/NodeMemberRow/StatusChip on the real Terminal Navy
 * background — every component and token below is the actual shared one,
 * not a replica. Answers "what does light vs. dark actually look like"
 * directly from the code, rather than from a hand-built mockup.
 */
export default function SurfacePreviewPage() {
  if (process.env.NODE_ENV === 'production') notFound()

  return (
    <main className="pt-nav">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="bg-background px-6 py-10 sm:px-10">
          <PanelLabel mood="Light" name="Paper — public /events" surface="light" />
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {SAMPLE_EVENTS.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
            <Field
              label="Search handbook"
              placeholder="protocol, node, cycle…"
              surface="light"
            />
          </div>
        </div>

        <div className="bg-eng-navy px-6 py-10 sm:px-10">
          <PanelLabel mood="Dark" name="Terminal Navy — dashboard" surface="dark" />
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <RoleBadge key={role} role={role} />
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <TierBadge tier="Initiate" />
              <TierBadge tier="Contributor" />
              <TierBadge tier="Architect" />
              <TierBadge tier="Vanguard" />
            </div>

            <div className="border border-sidebar-border">
              <NodeMemberRow
                name="Dario Vance"
                avatarUrl=""
                tier="Vanguard"
                xp={1240}
                evaluationStages={['completed', 'completed', 'completed']}
              />
              <NodeMemberRow
                name="Priya Nasser"
                avatarUrl=""
                tier="Initiate"
                xp={20}
                evaluationStages={['scheduled', 'pending', 'pending']}
                className="border-b-0"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusChip domain="event" status="completed" />
              <StatusChip domain="event" status="cancelled" />
              <StatusChip domain="cycle" status="active" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
