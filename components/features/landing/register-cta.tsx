import Link from 'next/link'
import { RevealOnScroll } from './reveal-on-scroll'
import { landing } from '@/lib/content'

/**
 * Final section, directly below Handbook — the page's one conversion
 * moment. Full-bleed Signal Maroon, breaking the Paper/Stone alternation
 * every section above it followed — deliberately bookends the page with
 * Hero's own maroon, and this is the one place maroon's "act here" meaning
 * (DESIGN.md's One Signal Rule) is fully earned.
 *
 * Copy is deliberately not "Apply now" / "Register" — the handbook's
 * membership.md is explicit that membership is nominated, not self-applied
 * ("Membership is not applied for through a form. It is recognized through
 * observed behavior."). Framed as expressing interest, a first step that
 * puts a visitor on the club's radar, not a guaranteed-admission form.
 * Links to /register (planned, unbuilt, same situation as /handbook — not
 * building that page here).
 *
 * The CTA button is DESIGN.md's documented "custom CTA button" pattern
 * (navbar Register/Dashboard/Logout precedent: bare anchor, uppercase
 * tracked mono-adjacent label, generous px-7 padding) — not the shadcn
 * `Button` primitive, and not the quiet mono-text-link treatment
 * `Events`/`Handbook` use above it. This is the page's one primary action;
 * it needed to look like one.
 */
export function RegisterCta() {
  const { statement, detail, cta } = landing.registerCta

  return (
    <section aria-label="Register" className="bg-argc-maroon">
      <RevealOnScroll className="mx-auto flex max-w-6xl flex-col items-start gap-8 px-6 py-[clamp(5rem,12vw,10rem)] sm:px-8 lg:px-12">
        <h2 className="font-sans text-[clamp(2rem,5vw,3rem)] font-bold leading-[1.04] tracking-tight text-hero-ink [text-wrap:balance]">
          {statement.map((line, i) => (
            <span key={i} className="block">
              {line}
            </span>
          ))}
        </h2>

        <p className="max-w-[52ch] font-sans text-base leading-relaxed text-hero-ink/80">
          {detail}
        </p>

        <Link
          href="/register"
          className="inline-flex items-center bg-hero-ink px-7 py-3 font-sans text-[0.9375rem] font-semibold tracking-[0.05em] text-argc-maroon uppercase transition-colors hover:bg-hero-ink/90 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hero-ink"
        >
          {cta}
        </Link>
      </RevealOnScroll>
    </section>
  )
}
