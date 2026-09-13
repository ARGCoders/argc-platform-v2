/**
 * Slugify a human string to a URL-safe unique key: lowercased, with runs of
 * non-letter/number characters collapsed to single hyphens and leading/
 * trailing hyphens trimmed.
 *
 * Unicode property escapes (`\p{Letter}`/`\p{Number}`, ES2018) keep Arabic
 * titles intact — ARGC is a Jordanian community, so a title in Arabic must
 * not dissolve into a stack of hyphens (or worse, an empty slug). NFKD +
 * diacritic stripping first, so accented Latin ("Hàckathon") doesn't leave
 * stray combining marks behind either.
 */
export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
}
