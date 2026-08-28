/**
 * Shapes for the editable copy in `content/*.json`.
 *
 * These files are the single place site copy lives — no strings are hardcoded
 * in components. Because `lib/content.ts` types the imports against these
 * interfaces, a malformed edit fails `pnpm build` rather than shipping a
 * broken page.
 *
 * Multi-line headlines are arrays: one entry per rendered line. This keeps
 * markup out of the JSON while preserving the intended line breaks.
 *
 * Only the hero is defined for now; the rest of the landing page is being
 * redesigned, and its content shape will be added alongside it.
 */

export interface NavLink {
  label: string
  href: string
}

/** Source repository for the /handbook route. */
export interface HandbookRepo {
  owner: string
  repo: string
  branch: string
}

export interface SiteContent {
  name: string
  /** Used as the <title> and the OG title. */
  title: string
  description: string
  nav: NavLink[]
  handbookRepo: HandbookRepo
}

export interface LandingContent {
  hero: {
    headline: string[]
    tagline: string
  }
}

/**
 * Copy for the cross-node vote surface (`/dashboard/vote`), member-facing
 * (MEMBER-12). The `reason.min` / `reason.max` values mirror the server-side
 * validation bounds so the form enforces the same limits without duplicating
 * them in code. `confirm.body` interpolates `{polarity}` and `{name}`.
 */
export interface VoteContent {
  title: string
  intro: string
  subject: {
    label: string
    empty: string
  }
  polarity: {
    label: string
    positive: string
    negative: string
    positiveHint: string
    negativeHint: string
  }
  reason: {
    label: string
    placeholder: string
    min: number
    max: number
    tooShort: string
    tooLong: string
    chars: string
  }
  submit: string
  confirm: {
    title: string
    body: string
    confirm: string
    back: string
  }
  success: string
  errors: {
    conflict: string
    default: string
  }
}
