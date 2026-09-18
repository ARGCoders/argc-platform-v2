import 'server-only'
import { site, handbookCatalog } from '@/lib/content'
import type { HandbookArticleRef, HandbookCatalog } from '@/types/content'

const REVALIDATE_SECONDS = 60 * 60

// Every article file ends with a divider and a "back to the index" link
// (path varies — `./README.md` or `../README.md` depending on the file's
// own depth) — internal repo navigation, not content for this site.
const FOOTER_LINK_PATTERN = /\n+-{3,}\n+\[←?\s*Back to Handbook\]\([^)]*\)\s*$/

/**
 * Fetches the handbook README's intro — everything between the H1 heading
 * and the first `---` divider. Deliberately never touches anything past
 * that divider: the README's own Contents table links to files at the repo
 * root (`./mission.md`, etc.) that no longer exist there after a folder
 * reorg (they live at `01-company/01-mission.md` now) — rendering it live
 * would put broken-looking links on the public landing page.
 *
 * `raw.githubusercontent.com`, not the GitHub REST API — the API's
 * unauthenticated rate limit is exhausted easily (hit it directly testing
 * this), while raw file access on a public repo has no such limit and needs
 * no token. Revalidated hourly since this content changes rarely; returns
 * null on any failure so the caller falls back to static copy instead of
 * breaking the page.
 */
export async function getHandbookIntro(): Promise<string | null> {
  const { owner, repo, branch } = site.handbookRepo
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/README.md`

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } })
    if (!res.ok) return null

    const text = await res.text()
    const parts = text.split(/\n-{3,}\n/)
    // No divider found at all (e.g. the README's format changed) — don't
    // guess where the intro ends; fall back rather than risk showing
    // unbounded content, which could include the stale Contents table.
    if (parts.length < 2) return null

    const withoutHeading = parts[0]!.replace(/^#\s+.+\n/, '').trim()
    return withoutHeading || null
  } catch (err) {
    console.error('[lib/handbook] failed to fetch handbook README:', err)
    return null
  }
}

/**
 * The hand-maintained catalog of what's live on `/handbook` — synchronous,
 * no fetch, since it's static content (see `types/content.ts`'s
 * `HandbookCatalog` doc comment for why this isn't derived from GitHub's
 * real directory listing).
 */
export function getHandbookCategories(): HandbookCatalog {
  return handbookCatalog
}

export type HandbookArticleResult =
  | { status: 'not-found' }
  | { status: 'error' }
  | { status: 'ok'; title: string; markdown: string }

/**
 * A single article's live-fetched body. Two distinct failure modes, not
 * collapsed into one: `not-found` means the slug isn't in the catalog (a
 * real 404 — the page should call `notFound()`); `error` means the catalog
 * entry exists but the live GitHub fetch failed (the article exists, it's
 * just unreachable right now — a different fact, needs a different UI, not
 * a 404 that tells the visitor something false).
 */
export async function getHandbookArticle(
  categorySlug: string,
  articleSlug: string,
): Promise<HandbookArticleResult> {
  const category = handbookCatalog.find((c) => c.slug === categorySlug)
  const article = category?.articles.find((a) => a.slug === articleSlug)
  if (!article) return { status: 'not-found' }

  const { owner, repo, branch } = site.handbookRepo
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${article.path}`

  try {
    const res = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS } })
    if (!res.ok) {
      console.error(
        `[lib/handbook] article fetch answered ${res.status}: ${article.path}`,
      )
      return { status: 'error' }
    }

    const text = await res.text()
    const markdown = text
      .replace(/^#\s+.+\n/, '')
      .replace(FOOTER_LINK_PATTERN, '')
      .trim()

    return { status: 'ok', title: article.title, markdown }
  } catch (err) {
    console.error(`[lib/handbook] failed to fetch article ${article.path}:`, err)
    return { status: 'error' }
  }
}

export interface HandbookSiblings {
  prev: HandbookArticleRef | null
  next: HandbookArticleRef | null
}

/**
 * The previous/next article within the same category, in catalog order —
 * a handbook article is one chapter in an ordered group, not a standalone
 * leaf, so the reading experience shouldn't dead-end after every chapter.
 * Returns nulls at either end of the group (never wraps around).
 */
export function getHandbookSiblings(
  categorySlug: string,
  articleSlug: string,
): HandbookSiblings {
  const category = handbookCatalog.find((c) => c.slug === categorySlug)
  const articles = category?.articles ?? []
  const index = articles.findIndex((a) => a.slug === articleSlug)
  if (index === -1) return { prev: null, next: null }

  return {
    prev: index > 0 ? articles[index - 1]! : null,
    next: index < articles.length - 1 ? articles[index + 1]! : null,
  }
}
