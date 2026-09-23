import fs from 'node:fs'
import path from 'node:path'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { RevealOnScroll } from './reveal-on-scroll'
import { landing } from '@/lib/content'
import { getHandbookIntro } from '@/lib/handbook'

// underline + focus-visible ring — see events.tsx for the same rationale;
// both files share this exact CTA treatment, split from one combined
// section that originally had it caught missing entirely by critique.
const CTA_CLASS =
  'font-mono text-[0.72rem] font-medium tracking-[0.1em] text-argc-maroon uppercase underline-offset-4 hover:underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

// Scopes ReactMarkdown's plain child elements into the system's type
// language — today's live README intro happens to be plain paragraphs, but
// a future handbook edit could add a link or list, and this is the only
// thing standing between that and unstyled default markup landing directly
// in the page's proof section.
const MARKDOWN_CLASS =
  '[&_a]:text-argc-maroon [&_a]:underline [&_a]:underline-offset-4 [&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mt-1'

const SHAPE_PATH = path.join(process.cwd(), 'content/ascii/handbook.txt')

// Matches get-involved.tsx's shape treatment: `justify-self-end` (no
// `-mx-4`) so the box sizes to its natural content width and anchors to
// the column's right edge, rather than stretching to fill it. 3.1px
// (down from 5.5px) brings this shape's rendered footprint in line with
// Get Involved's — the two sections share the identical 4fr/7fr grid
// role, and at the old size this one rendered noticeably larger with no
// breathing room, reading as an inconsistent pair. Verified live: 334x307
// vs Get Involved's 330x332, no clip.
const SHAPE_CLASS =
  'hidden md:block overflow-hidden select-none pointer-events-none font-mono font-black leading-[1.1] whitespace-pre text-[3.1px] text-ink justify-self-end'

/**
 * Reads the art file server-side only, same rule as Mission & Values'
 * shape-2 (DESIGN.md bans importing ASCII frame data as a JS module — the
 * hero's V1 animation once compiled 19MB of frames into the client bundle).
 * Not yet sourced (this session provides the technical slot, not the
 * asset) — returns null so the section renders cleanly without it until
 * `content/ascii/handbook.txt` exists, no code change needed once it does.
 */
function readHandbookShape(): string | null {
  try {
    return fs.readFileSync(SHAPE_PATH, 'utf8')
  } catch {
    return null
  }
}

/**
 * Fifth section below Hero, directly under Events — a live excerpt of the
 * actual public handbook, not landing-page copy. Doesn't build `/handbook`
 * itself, just links to it (planned, unbuilt, same situation as
 * `/register`).
 *
 * Standalone, full-width — split out from the combined Events/Handbook
 * section (see events.tsx for the same note). `bg-paper`, alternating from
 * Events' `bg-stone`.
 *
 * Heading uses the "big statement" scale (Mission & Values/Nodes'
 * `clamp(2rem,5vw,3rem)`), not the "small heading" scale Get Involved and
 * Events use — deliberately, since without it the page's heading-size
 * pattern would land on two small headings in a row at the very end of
 * the scroll (Get Involved, small → Nodes, big → Events, small → Handbook,
 * small) with nothing to punctuate the close. This restores a clean
 * big/small/big/small/big alternation and gives the last section — the
 * one right before a visitor leaves the page — the strongest beat.
 *
 * `categories` reflects what's currently pushed publicly in argc-handbook
 * (Company, People) — not every folder that exists in the repo. Grows as
 * more groups get pushed; content-only change, no code here.
 */
export async function Handbook() {
  const copy = landing.handbook
  const [intro, shape] = await Promise.all([
    getHandbookIntro(),
    Promise.resolve(readHandbookShape()),
  ])

  return (
    <section aria-label="Handbook" className="bg-paper">
      <RevealOnScroll className="mx-auto max-w-6xl px-6 py-[clamp(4rem,10vw,8rem)] sm:px-8 lg:px-12">
        {/* 4fr/7fr, not the usual editorial 7fr-for-text split — matches
         *  Get Involved's identical grid role. The art column no longer
         *  needs to be wide enough to contain a column-filling shape (see
         *  SHAPE_CLASS), but the ratio stays shared so the two sections
         *  read as the same pattern. */}
        <div
          className={
            shape
              ? 'grid grid-cols-1 items-start gap-x-16 gap-y-10 md:grid-cols-[4fr_7fr] lg:gap-x-24'
              : 'grid grid-cols-1'
          }
        >
          <div className="flex flex-col gap-6 border-t border-border pt-6">
            <div className="flex flex-col gap-2">
              <h2 className="font-sans text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.04] tracking-tight text-foreground [text-wrap:balance]">
                {copy.heading}
              </h2>
              <p className="font-sans text-[0.9375rem] text-muted-foreground">
                {copy.detail}
              </p>
            </div>

            <div
              className={`flex max-w-[60ch] flex-col gap-3 font-sans text-[0.9375rem] leading-relaxed text-muted-foreground ${MARKDOWN_CLASS}`}
            >
              {intro ? (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{intro}</ReactMarkdown>
              ) : (
                <p>{copy.fallbackIntro}</p>
              )}
            </div>

            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {copy.categories.map((category) => (
                <li
                  key={category}
                  className="font-mono text-[0.72rem] font-medium tracking-[0.1em] text-foreground uppercase"
                >
                  {category}
                </li>
              ))}
            </ul>

            <Link href="/handbook" className={CTA_CLASS}>
              {copy.cta} <span aria-hidden="true">→</span>
            </Link>
          </div>

          {shape && (
            <pre aria-hidden="true" className={SHAPE_CLASS}>
              {shape}
            </pre>
          )}
        </div>
      </RevealOnScroll>
    </section>
  )
}
