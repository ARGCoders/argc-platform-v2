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
 * rebuilt one section at a time, mounted as each one landed. Handbook is
 * the last section — RegisterCta was dropped after a teammate shipped
 * "public site is a showcase" (no register/login CTA anywhere on the
 * public site) directly to main; keeping a dedicated register-CTA section
 * here would have contradicted that already-shipped decision.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <MissionValues />
      <GetInvolved />
      <Nodes />
      <Events />
      <Handbook />
    </main>
  )
}
