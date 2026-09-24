import { landing } from '@/lib/content'
import { RevealOnScroll } from './reveal-on-scroll'

/**
 * Nodes — the third section below the untouched Hero, directly under Get
 * Involved. Deliberately not a repeat of Mission & Values' asymmetric
 * two-column-with-shape-art composition: this one is stat-anchored, built
 * around the "4-6 people" fact as a concrete visual element, so the two
 * sections don't read as the same template stacked twice while scrolling.
 *
 * Nodes are domain-based (per the handbook, argc-handbook/04-ecosystem/
 * 01-nodes.md), not cohort-based — a node owns one of four stable domains
 * (Platform/Evaluations/Events/Outreach) under one Node Leader. This
 * deliberately does not frame accountability as cross-node peer evaluation
 * or voting (a docs/PLATFORM.md schema detail, not the handbook's actual
 * model): the real "why" is visibility within a small group.
 */
export function Nodes() {
  const { statement, detail, stat, domains } = landing.nodes

  return (
    <section aria-label="Nodes" className="bg-paper">
      <RevealOnScroll className="mx-auto max-w-6xl px-6 py-[clamp(4rem,10vw,8rem)] sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-x-16 gap-y-10 md:grid-cols-[7fr_5fr] lg:gap-x-24">
          <div className="flex flex-col gap-5">
            <h2 className="font-sans text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.04] tracking-tight text-foreground [text-wrap:balance]">
              {statement.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </h2>
            <p className="max-w-[46ch] font-sans text-[0.9375rem] leading-relaxed text-muted-foreground">
              {detail}
            </p>
          </div>

          <div className="flex flex-col items-start gap-2 md:items-end md:text-right">
            <span className="font-mono text-[clamp(3.5rem,10vw,5.5rem)] font-semibold leading-none tabular-nums text-foreground">
              {stat.value}
            </span>
            <span className="font-mono text-[0.72rem] font-medium tracking-[0.1em] text-muted-foreground uppercase">
              {stat.label}
            </span>
          </div>
        </div>

        {/* One continuous top/bottom rule across the whole grid, not a
         *  border per item — a per-item border-t reads as fragmented
         *  segments once the grid wraps to more than one row. auto-fit
         *  (not a fixed lg:grid-cols-4) means an added/split/merged domain
         *  (the handbook: domains "may be added, split, or merged as the
         *  club evolves") reflows correctly instead of assuming exactly 4. */}
        <div className="mt-14 grid grid-cols-1 gap-x-8 border-t border-b border-border sm:[grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
          {domains.map((domain, i) => (
            <div key={`${domain.name}-${i}`} className="flex flex-col gap-2 py-6">
              <span className="font-mono text-[0.72rem] font-medium tracking-[0.1em] text-foreground uppercase">
                {domain.name}
              </span>
              <p className="max-w-[32ch] font-sans text-[0.9375rem] leading-relaxed text-muted-foreground">
                {domain.detail}
              </p>
            </div>
          ))}
        </div>
      </RevealOnScroll>
    </section>
  )
}
