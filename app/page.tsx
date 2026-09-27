import { Hero } from '@/components/features/landing/hero'
import { MissionValues } from '@/components/features/landing/mission-values'
import { GetInvolved } from '@/components/features/landing/get-involved'
import { Nodes } from '@/components/features/landing/nodes'
import { Events } from '@/components/features/landing/events'
import { Handbook } from '@/components/features/landing/handbook'

// Events/Handbook fetch through env.APP_URL and raw.githubusercontent.com
// at render time — without this, `next build`'s trial execution of this
// page can fail wherever NEXT_PUBLIC_APP_URL isn't set until deploy time.
// Same rationale as app/events/page.tsx.
export const dynamic = 'force-dynamic'

/**
 * Landing page. Only the hero was carried over from V1 as-is; the rest was
 * rebuilt one section at a time, mounted as each one landed. RegisterCta
 * was dropped after a teammate shipped "public site is a showcase" (no
 * register/login CTA anywhere on the public site) directly to main; a
 * dedicated register-CTA section here would have contradicted that
 * already-shipped decision.
 *
 * Events moved below Handbook per a direct request, making Events the new
 * last section — Handbook keeps the "big statement" heading scale it was
 * given specifically to end the page on a strong beat (see handbook.tsx's
 * own doc comment), so the page now ends on a small heading again. Left
 * as-is rather than rebalanced, a deliberate choice, not an oversight.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <MissionValues />
      <GetInvolved />
      <Nodes />
      <Handbook />
      <Events />
    </main>
  )
}
