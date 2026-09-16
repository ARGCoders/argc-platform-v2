import 'server-only'
import { site } from '@/lib/content'

const REVALIDATE_SECONDS = 60 * 60

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
