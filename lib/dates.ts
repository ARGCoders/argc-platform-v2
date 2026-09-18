const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/**
 * Blog dates render in the ARGC mono aesthetic — uppercase, e.g. "13 AUG 2026".
 * Invalid input yields an empty string so callers never render "NaN".
 */
export function formatBlogDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return dateFormatter.format(date).toUpperCase()
}
