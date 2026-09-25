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
 *  behavior too, not a V2-only shortcut. `hidden md:block` live directly on
 *  the `<pre>` now — the wrapping flex div (V1's own pattern) was dropped
 *  once the grid column itself became content-sized (see the grid
 *  className below), matching how Get Involved and Handbook already put
 *  these classes straight on their own `<pre>`. `overflow-hidden` is now a
 *  pure guard, not load-bearing for layout — the auto-sized column can't
 *  produce a mismatch between box and content the way a fixed-width column
 *  could.
 *
 *  History: 1.3px in a min(300px,28vw) column, then 1.4px in a wider
 *  min(360px,32vw) column ("a little bigger"), then a deliberately bold
 *  2.4px in a min(600px,55vw) column ("still too small"). That version's
 *  size was right, but the fixed-width column plus `justify-end` left a
 *  large empty gap on one side, reading as off-center rather than
 *  intentional. This round keeps 2.4px and instead makes the *column*
 *  content-sized (`auto`, not a fixed px/vw cap) — see the grid className
 *  below — so there's no leftover gap to justify away in the first place.
 *  Still not live-verified (no browser access this session). */
const SHAPE_CLASS =
  'hidden md:block overflow-hidden select-none pointer-events-none font-mono font-black leading-[1.1] whitespace-pre text-[2.4px] text-ink'

/**
 * Mission & Values — the first section below the untouched Hero. Restructured
 * to match V1's `SectionVision.tsx` layout pattern: a dedicated ASCII shape
 * column beside one flowing text column, rather than V2's original
 * asymmetric 5fr/7fr mission/values split. The column went through several
 * fixed-width attempts (`min(300px,28vw)`, then `min(360px,32vw)`, then
 * `min(600px,55vw)`) chasing "the shape looks too small," each of which
 * left the shape floating inside a box wider than its own content — the
 * last one specifically left a large, visibly off-center gap on one side.
 * The column is now `auto` — sized to the shape's own natural content
 * width, whatever that is at the current SHAPE_CLASS font-size — so the
 * shape's box and the shape's content are the same size, no gap to explain
 * away, and any freed width goes to the text column instead of sitting
 * empty. The kicker ("Mission & Values", mono/uppercase/maroon) is new —
 * V1 always led with one above its headline; V2 didn't have one until this
 * pass.
 *
 * The values list keeps its own established tag+text treatment (no numbered
 * index, unlike V1's roadmap list — it's a set of values, not a sequence)
 * but no longer stacks as a single-column list of rows: a responsive grid
 * (4-across at `lg`, 2x2 at `sm`/`md`, one column on mobile) reads more like
 * a set of four equal facts than a queue. Each cell's own `border-t` marks
 * it as a row-start, the same single-edge-border convention used elsewhere
 * on the page (e.g. Get Involved's text block), not a new full-box style.
 * It lives in the same text column as the statement, below it, the way V1
 * stacks kicker→headline→paragraph→list within one `1fr` cell.
 *
 * `id="vision"` is the navbar's "Our Vision" link target — this section
 * is V2's replacement for V1's dedicated `SectionVision.tsx` (which used
 * this same shape art), so the existing nav copy points here rather than
 * a separate section.
 *
 * `bg-paper`, flat across every section below Hero — the prior alternating
 * Paper/Stone rhythm read as an unintended color clash rather than a
 * deliberate one (Paper and Stone sit on different hue axes, not just
 * different lightness), so `border-t border-border` marks each section's
 * seam instead. This is the first section after Hero's `bg-argc-maroon`,
 * so its own top border sits against a hard color break either way.
 *
 * `items-center` on the outer grid — added after direct "doesn't look
 * good" feedback. Before this, the shape had no vertical alignment set
 * (grid default `stretch`), so it sat top-anchored while the text column
 * beside it grew taller across this session (kicker, then the values
 * grid), reading as orphaned with dead space around it. Now it centers
 * against the text column's height. No `justify-self`/wrapper-alignment
 * classes are needed on the shape itself — the `auto`-sized column (see
 * SHAPE_CLASS and the grid className above) already matches the shape's
 * own width exactly, so there's nothing left to justify within.
 */
export function MissionValues() {
  const { statement, detail, values } = landing.missionValues

  return (
    <section
      id="vision"
      aria-label="Mission and values"
      className="bg-paper border-t border-border"
    >
      <RevealOnScroll className="mx-auto max-w-6xl px-6 py-[clamp(4rem,10vw,8rem)] sm:px-8 lg:px-12">
        <div className="grid grid-cols-1 items-center gap-x-16 gap-y-12 md:grid-cols-[auto_1fr] lg:gap-x-24">
          <pre aria-hidden="true" className={SHAPE_CLASS}>
            {shape2}
          </pre>

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

            <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
              {values.map((value) => (
                <div
                  key={value.tag}
                  className="flex flex-col gap-2 border-t border-border pt-6"
                >
                  <span className="font-mono text-[0.72rem] font-medium tracking-[0.1em] text-foreground uppercase">
                    {value.tag}
                  </span>
                  <p className="font-sans text-[0.9375rem] leading-relaxed text-foreground/80">
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
