import { Hero } from '@/components/features/landing/hero'
import { MissionValues } from '@/components/features/landing/mission-values'
import { Nodes } from '@/components/features/landing/nodes'
import { EventsHandbookPreview } from '@/components/features/landing/events-handbook-preview'

// EventsHandbookPreview fetches through env.APP_URL (the public events API)
// at render time — without this, `next build`'s trial execution of this
// page can fail wherever NEXT_PUBLIC_APP_URL isn't set until deploy time.
// Same rationale as app/events/page.tsx.
export const dynamic = 'force-dynamic'

/**
 * Landing page. Only the hero was carried over from V1 as-is; the rest is
 * being rebuilt against the new UI plan, one section at a time, mounted as
 * each one lands — the register CTA is still unbuilt.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <MissionValues />
      <Nodes />
      <EventsHandbookPreview />
    </main>
  )
}
