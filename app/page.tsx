import { Hero } from '@/components/features/landing/hero'
import { MissionValues } from '@/components/features/landing/mission-values'
import { Nodes } from '@/components/features/landing/nodes'

/**
 * Landing page. Only the hero was carried over from V1 as-is; the rest is
 * being rebuilt against the new UI plan, one section at a time, mounted as
 * each one lands — the events/handbook preview and register CTA are still
 * unbuilt.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <MissionValues />
      <Nodes />
    </main>
  )
}
