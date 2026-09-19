import fs from 'node:fs'
import path from 'node:path'
import { RevealOnScroll } from './reveal-on-scroll'
import { landing, site } from '@/lib/content'

// underline + focus-visible ring, matching the body-copy-link state pattern
// DESIGN.md documents (same construction as events.tsx/handbook.tsx's
// CTA_CLASS) — duplicated rather than centralized, matching how those two
// already chose to keep this per-file.
const CTA_CLASS =
  'font-mono text-[0.72rem] font-medium tracking-[0.1em] text-argc-maroon uppercase underline-offset-4 hover:underline outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'

const SHAPE_PATH = path.join(process.cwd(), 'content/ascii/githup_ascii.txt')

// Same construction as handbook.tsx's SHAPE_CLASS — box size comes from the
// grid column, not this value; font-size only controls how much of the
// source art is visible before overflow-hidden clips it.
const SHAPE_CLASS =
  'hidden md:block overflow-hidden select-none pointer-events-none font-mono font-black leading-[1.1] whitespace-pre text-[5.5px] text-ink -mx-4'

/**
 * Reads the art file server-side only — same rule as Mission & Values'
 * shape-2 and Handbook's shape (DESIGN.md bans importing ASCII frame data
 * as a JS module). Returns null so the section still renders cleanly if
 * the file is ever removed, no code change needed.
 */
function readGithubShape(): string | null {
  try {
    return fs.readFileSync(SHAPE_PATH, 'utf8')
  } catch {
    return null
  }
}

/**
 * Second section below Hero, directly under Mission & Values — the site's
 * only outbound link. There's no real contact info yet, so this is the
 * one "reach us" surface the public site has: an invitation to the org's
 * public GitHub rather than a quiet footer afterthought (there is no
 * footer). `id="get-involved"` is the navbar's "Contact Us" link target.
 *
 * A plain `<a>`, not `next/link` — the only real external link in the app,
 * so it gets its own construction: `target="_blank" rel="noopener
 * noreferrer"`, an `↗` glyph instead of the internal-nav `→`, and sr-only
 * text so the "this leaves the site" signal isn't sighted-only.
 *
 * `bg-stone`, alternating from Mission & Values' `bg-paper`. Two-column
 * grid when the shape art exists (text/art, 4fr/7fr — same ratio and
 * verified-no-clip approach as Handbook), collapsing to one column
 * otherwise, same as Handbook does when its own shape is absent.
 */
export function GetInvolved() {
  const copy = landing.getInvolved
  const shape = readGithubShape()

  return (
    <section id="get-involved" aria-label="Get involved" className="bg-stone">
      <RevealOnScroll className="mx-auto max-w-6xl px-6 py-[clamp(4rem,10vw,8rem)] sm:px-8 lg:px-12">
        <div
          className={
            shape
              ? 'grid grid-cols-1 items-start gap-x-16 gap-y-10 md:grid-cols-[4fr_7fr] lg:gap-x-24'
              : 'grid grid-cols-1'
          }
        >
          <div className="flex flex-col gap-6 border-t border-border pt-6">
            <div className="flex flex-col gap-2">
              <h2 className="font-sans text-[1.5rem] font-bold tracking-tight text-foreground">
                {copy.heading}
              </h2>
              <p className="max-w-[52ch] font-sans text-sm text-muted-foreground">
                {copy.detail}
              </p>
            </div>

            <a
              href={site.githubOrgUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={CTA_CLASS}
            >
              {copy.cta} <span aria-hidden="true">↗</span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
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
