import { EventsList } from '@/components/features/landing/events-list'
import { events as copy } from '@/lib/content'
import { env } from '@/lib/env'
import type { PublicEvent } from '@/app/api/public/events/route'

export const metadata = {
  title: 'Events — ARGC',
}

async function fetchEvents(): Promise<{ events: PublicEvent[]; truncated: boolean }> {
  const res = await fetch(`${env.APP_URL}/api/public/events?perPage=100`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`/api/public/events answered ${res.status}`)

  const body = (await res.json()) as {
    data: PublicEvent[]
    totalPages: number
  }
  return { events: body.data, truncated: body.totalPages > 1 }
}

export default async function EventsPage() {
  const { events, truncated } = await fetchEvents()

  return (
    <main className="mx-auto max-w-6xl px-6 pt-nav pb-16 sm:px-8 lg:px-12">
      <div className="mt-12 mb-10 flex flex-col gap-3 border-b border-border pb-8">
        <h1 className="font-sans text-[clamp(2rem,5vw,3rem)] font-bold tracking-tight text-foreground">
          {copy.heading}
        </h1>
        <p className="max-w-2xl font-sans text-base text-muted-foreground">
          {copy.tagline}
        </p>
      </div>

      <EventsList events={events} truncated={truncated} />
    </main>
  )
}
