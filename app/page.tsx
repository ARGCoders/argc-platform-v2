import { Hero } from '@/components/features/landing/hero'
import { MissionValues } from '@/components/features/landing/mission-values'

/**
 * Landing page. Only the hero was carried over from V1 as-is; the rest is
 * being rebuilt against the new UI plan, one section at a time — Mission &
 * Values is the first. Everything below it is still unbuilt.
 */
export default function Home() {
  return (
    <main>
      <Hero />
      <MissionValues />
    </main>
  )
}
