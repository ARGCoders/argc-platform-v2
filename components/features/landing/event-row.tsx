import Image from 'next/image'
import { BannerPlaceholder } from '@/components/shared/banner-placeholder'
import { StatusChip } from '@/components/shared/dashboard/status-chip'
import { EVENT_TYPE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/format'
import type { PublicEvent } from '@/app/api/public/events/route'

/**
 * A card, not a bordered-row — the public `/events` page is Persuade mode
 * (sell the event to a visitor deciding whether ARGC is real) rather than
 * Operate mode (report a ledger fact), and only a card has room for
 * `poster_photo`. DESIGN.md's Bordered Rows section still lists "EventRow"
 * as expected to match EvaluationStageRow/NodeMemberRow — that line predates
 * this component being split out as a distinct, public-facing one in
 * `components/features/landing/`, not the dashboard-internal family.
 *
 * No hover treatment and no link: there is no event detail page in this
 * task's scope (PLATFORM.md's route table has no `/events/[slug]`), so this
 * card promises no click affordance it cannot deliver.
 */
export function EventRow({ event }: { event: PublicEvent }) {
  const typeLabel = EVENT_TYPE_LABELS[event.type]

  return (
    <article className="flex flex-col overflow-hidden bg-card ring-1 ring-foreground/10">
      <div className="relative h-40 w-full">
        {event.poster_photo ? (
          <Image
            src={event.poster_photo}
            alt=""
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <BannerPlaceholder seed={event.slug} className="h-full" />
        )}
        <span className="absolute top-2 left-2 bg-card px-2 py-1 font-mono text-[0.6rem] font-semibold tracking-[0.1em] text-primary uppercase">
          {typeLabel}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <h3 className="font-sans text-base font-bold text-card-foreground">
          {event.title}
        </h3>
        {event.excerpt && (
          <p className="line-clamp-2 font-sans text-sm text-muted-foreground">
            {event.excerpt}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-2.5">
          <span className="font-mono text-xs text-muted-foreground">
            {formatDate(event.starts_at)}
          </span>
          <StatusChip domain="event" status={event.status} surface="light" />
        </div>
      </div>
    </article>
  )
}
