export const DEFAULT_PAGE = 1
export const DEFAULT_PER_PAGE = 20
export const MAX_PER_PAGE = 100

export type PaginationResult =
  | { ok: true; page: number; perPage: number }
  | { ok: false; code: 'invalid_input'; message: string }

/**
 * Parse `page`/`perPage` query params against the dashboard list contract
 * (DASHBOARD_CONTRACT §1: page is 1-based, perPage defaults to 20 and caps at
 * 100). Missing params get the defaults; blank, fractional, or out-of-range
 * values answer 400 naming the offending field.
 *
 * Pure by design — no Next.js or DB imports — so list routes share one source
 * of truth for the defaults/cap instead of re-declaring the numbers per route.
 */
export function parsePagination(params: URLSearchParams): PaginationResult {
  const pageRaw = params.get('page')
  const page = pageRaw === null ? DEFAULT_PAGE : Number(pageRaw)
  if (!Number.isFinite(page) || page < 1 || !Number.isInteger(page)) {
    return { ok: false, code: 'invalid_input', message: 'page must be an integer ≥ 1' }
  }

  const perPageRaw = params.get('perPage')
  const perPage = perPageRaw === null ? DEFAULT_PER_PAGE : Number(perPageRaw)
  if (
    !Number.isFinite(perPage) ||
    perPage < 1 ||
    perPage > MAX_PER_PAGE ||
    !Number.isInteger(perPage)
  ) {
    return {
      ok: false,
      code: 'invalid_input',
      message: 'perPage must be an integer between 1 and 100',
    }
  }

  return { ok: true, page, perPage }
}
