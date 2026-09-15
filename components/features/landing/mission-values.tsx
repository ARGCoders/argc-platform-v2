import fs from 'node:fs'
import path from 'node:path'
import { landing } from '@/lib/content'
import { RevealOnScroll } from './reveal-on-scroll'

/**
 * Read server-side only — this component never gets `'use client'`, so
 * this string becomes server-rendered HTML text content and is never
 * parsed as client JS. DESIGN.md bans importing ASCII frame data as a JS
 * module (the hero's V1 animation once compiled 19MB of frames into the
 * client bundle); reading a static text file at render time, on the
 * server, for a component with no client interactivity of its own, avoids
 * that failure mode entirely rather than just keeping the file small.
 *
 * Only shape-2 is used here — shape-1 (content/ascii/shape-1.txt, also
 * ported verbatim from V1) is reserved for a future section, not imported
 * by this component.
 */
const shape2 = fs.readFileSync(
  path.join(process.cwd(), 'content/ascii/shape-2.txt'),
  'utf8',
)

/** Full-opacity ink at `font-black`, matching V1's own solid-black
 *  treatment of this same shape (SectionVision.tsx) rather than a faded
 *  fraction. IBM Plex Mono has no true 900 weight (Google serves up to
 *  700 for this family, confirmed the same in V1's own font config) — on
 *  both sites `font-black` renders as the browser's synthesized bold over
 *  the loaded 500 weight, not a real weight, but that's V1's actual
 *  behavior too, not a V2-only shortcut. `overflow-hidden` clips the raw
 *  monospace content at the column edge — at `md` widths, before `lg`'s
 *  wider padding applies, the shape's real rendered width can exceed the
 *  mission column's, and it must never visually cross the divider. */
const SHAPE_CLASS =
  'hidden md:block overflow-hidden select-none pointer-events-none font-mono font-black leading-[1.1] whitespace-pre text-[2.2px] text-ink -mx-4'

/**
 * Mission & Values — the first section below the untouched Hero. Persuade
 * mode: an asymmetric two-column composition (not centered, continuing
 * Hero's own left-anchored rhythm), mission statement paired against a
 * plain typographic values list, divided by one vertical rule.
 *
 * The single ASCII shape sits above the statement, inside the mission
 * column only — a quiet visual arrival before the thesis, not a kicker
 * (it's imagery, not a text label) and not touching the column divider.
 * The values column stays purely typographic — no art mixed into the
 * list, matching how Bordered Rows never decorates a data row with an
 * icon.
 */
export function MissionValues() {
  const { statement, detail, values } = landing.missionValues

  return (
    <section aria-label="Mission and values" className="bg-paper">
      <RevealOnScroll className="mx-auto max-w-6xl px-6 py-[clamp(4rem,10vw,8rem)] sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-[5fr_7fr] lg:gap-x-24">
          <div className="flex flex-col gap-8 md:border-r md:border-border md:pr-16 lg:pr-24">
            <pre aria-hidden="true" className={SHAPE_CLASS}>
              {shape2}
            </pre>

            <div className="flex flex-col gap-5">
              <h2 className="font-sans text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.04] tracking-tight text-foreground [text-wrap:balance]">
                {statement.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </h2>
              <p className="max-w-[42ch] font-sans text-base leading-relaxed text-muted-foreground">
                {detail}
              </p>
            </div>
          </div>

          <div className="flex flex-col border-t border-border">
            {values.map((value) => (
              <div
                key={value.tag}
                className="flex flex-col gap-2 border-b border-border py-6 sm:flex-row sm:gap-8"
              >
                <span className="shrink-0 font-mono text-[0.68rem] font-medium tracking-[0.1em] text-argc-maroon uppercase sm:w-32">
                  {value.tag}
                </span>
                <p className="max-w-[56ch] font-sans text-base leading-relaxed text-foreground/80">
                  {value.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}
