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
 *  behavior too, not a V2-only shortcut. `hidden`/`md:flex` live on the
 *  wrapping div now (matching V1's own wrapper, not the `<pre>` itself),
 *  so this class only needs `overflow-hidden` as a guard against the raw
 *  monospace content ever exceeding its now-dedicated shape column. */
const SHAPE_CLASS =
  'font-mono font-black leading-[1.1] whitespace-pre text-[1.3px] text-ink overflow-hidden select-none pointer-events-none'

/**
 * Mission & Values — the first section below the untouched Hero. Restructured
 * to match V1's `SectionVision.tsx` layout pattern: a dedicated, narrow ASCII
 * shape column (`min(300px,28vw)`, V1's exact token) beside one flowing text
 * column, rather than V2's original asymmetric 5fr/7fr mission/values split.
 * The kicker ("Mission & Values", mono/uppercase/maroon) is new — V1 always
 * led with one above its headline; V2 didn't have one until this pass.
 *
 * The values list keeps its own established tag+text row treatment rather
 * than adopting V1's numbered index/label/description format — it's a set
 * of values, not a sequential roadmap, so a step-number wouldn't fit its
 * meaning. It now lives in the same text column as the statement, stacked
 * below it, the way V1 stacks kicker→headline→paragraph→list within one
 * `1fr` cell.
 *
 * `id="vision"` is the navbar's "Our Vision" link target — this section
 * is V2's replacement for V1's dedicated `SectionVision.tsx` (which used
 * this same shape art), so the existing nav copy points here rather than
 * a separate section.
 */
export function MissionValues() {
  const { statement, detail, values } = landing.missionValues

  return (
    <section id="vision" aria-label="Mission and values" className="bg-paper">
      <RevealOnScroll className="mx-auto max-w-6xl px-6 py-[clamp(4rem,10vw,8rem)] sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 gap-x-16 gap-y-12 md:grid-cols-[min(300px,28vw)_1fr] lg:gap-x-24">
          <div className="hidden w-full justify-center md:flex">
            <pre aria-hidden="true" className={SHAPE_CLASS}>
              {shape2}
            </pre>
          </div>

          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-5">
              <span className="font-mono text-[0.72rem] tracking-[0.12em] text-argc-maroon uppercase">
                Mission &amp; Values
              </span>
              <h2 className="font-sans text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.04] tracking-tight text-foreground [text-wrap:balance]">
                {statement.map((line, i) => (
                  <span key={i} className="block">
                    {line}
                  </span>
                ))}
              </h2>
              <p className="max-w-[42ch] font-sans text-[0.9375rem] leading-relaxed text-muted-foreground">
                {detail}
              </p>
            </div>

            <div className="flex flex-col border-t border-border">
              {values.map((value) => (
                <div
                  key={value.tag}
                  className="flex flex-col gap-2 border-b border-border py-6 sm:flex-row sm:gap-8"
                >
                  <span className="shrink-0 font-mono text-[0.72rem] font-medium tracking-[0.1em] text-foreground uppercase sm:w-32">
                    {value.tag}
                  </span>
                  <p className="max-w-[56ch] font-sans text-[0.9375rem] leading-relaxed text-foreground/80">
                    {value.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </RevealOnScroll>
    </section>
  )
}
