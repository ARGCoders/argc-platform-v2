import { EventsList } from '@/components/features/landing/events-list'
import { events as copy } from '@/lib/content'
import { env } from '@/lib/env'
import type { PublicEvent } from '@/app/api/public/events/route'

export const metadata = {
  title: 'Events — ARGC',
}

async function fetchEvents(): Promise<PublicEvent[]> {
  const res = await fetch(`${env.APP_URL}/api/public/events?perPage=100`, {
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`/api/public/events answered ${res.status}`)

  const body = (await res.json()) as { data: PublicEvent[] }
  return body.data
}

export default async function EventsPage() {
  const events = await fetchEvents()

  return (
    <main className="mx-auto max-w-6xl px-6 pt-nav pb-16 sm:px-8 lg:px-12">
      <div className="mt-12 mb-10 flex flex-col gap-3 border-b border-border pb-8">
        <h1 className="font-sans text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {copy.heading}
        </h1>
        <p className="max-w-2xl font-sans text-base text-muted-foreground">
          {copy.tagline}
        </p>
      </div>

      <EventsList events={events} />
    </main>
  )
}
