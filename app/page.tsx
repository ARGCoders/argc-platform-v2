import { Hero } from '@/components/features/landing/hero'
import { MissionValues } from '@/components/features/landing/mission-values'
import { Nodes } from '@/components/features/landing/nodes'
import { Events } from '@/components/features/landing/events'
import { Handbook } from '@/components/features/landing/handbook'
import { RegisterCta } from '@/components/features/landing/register-cta'

// Events/Handbook fetch through env.APP_URL and raw.githubusercontent.com
// at render time — without this, `next build`'s trial execution of this
// page can fail wherever NEXT_PUBLIC_APP_URL isn't set until deploy time.
// Same rationale as app/events/page.tsx.
export const dynamic = 'force-dynamic'

/**
 * Landing page. Only the hero was carried over from V1 as-is; the rest was
 * rebuilt one section at a time, mounted as each one landed. All four
 * planned UI-01 sections are now in place below the untouched Hero.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <MissionValues />
      <Nodes />
      <Events />
      <Handbook />
      <RegisterCta />
    </main>
  )
}
