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

// text-[3.4px], not shape-2's 2.2px verbatim: handbook.txt's raw dimensions
// (89 lines x 180 chars) are smaller than shape-1/shape-2's (123-141 lines x
// 276 chars) — reusing the same literal size would render it visibly
// smaller than its siblings. Scaled by the width ratio (276/180 ≈ 1.53) so
// it reads at the same visual prominence, not the same literal font-size.
const SHAPE_CLASS =
  'hidden md:block overflow-hidden select-none pointer-events-none font-mono font-black leading-[1.1] whitespace-pre text-[2.9px] text-ink -mx-4'

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
 * Fourth section below Hero, directly under Events — a live excerpt of the
 * actual public handbook, not landing-page copy. Doesn't build `/handbook`
 * itself, just links to it (planned, unbuilt, same situation as
 * `/register`).
 *
 * Standalone, full-width — split out from the combined Events/Handbook
 * section (see events.tsx for the same note). `bg-stone`, alternating from
 * Events' `bg-paper`.
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
    <section aria-label="Handbook" className="bg-stone">
      <RevealOnScroll className="mx-auto max-w-6xl px-6 py-[clamp(4rem,10vw,8rem)] sm:px-8 lg:px-12">
        <div
          className={
            shape
              ? 'grid grid-cols-1 gap-x-16 gap-y-10 md:grid-cols-[7fr_5fr] lg:gap-x-24'
              : 'grid grid-cols-1'
          }
        >
          <div className="flex flex-col gap-6 border-t border-border pt-6">
            <div className="flex flex-col gap-2">
              <h2 className="font-sans text-[1.5rem] font-bold tracking-tight text-foreground">
                {copy.heading}
              </h2>
              <p className="font-sans text-sm text-muted-foreground">{copy.detail}</p>
            </div>

            <div
              className={`flex max-w-[60ch] flex-col gap-3 font-sans text-base leading-relaxed text-muted-foreground ${MARKDOWN_CLASS}`}
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
