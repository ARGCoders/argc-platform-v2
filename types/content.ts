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

/** Copy for the /blog page header. */
export interface BlogContent {
  header: {
    eyebrow: string
    title: string[]
    tagline: string
  }
}
