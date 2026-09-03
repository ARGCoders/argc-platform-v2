// UTC explicit throughout: these format ledger-truth timestamps
// (evaluation schedules, XP ledger entries), and without a fixed zone a
// UTC-midnight date renders a day early for any viewer west of UTC.

/** YYYY-MM-DD. */
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC' }).format(new Date(iso))
}

/** MM-DD — for columns too narrow for the full date, e.g. below `sm`. */
export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'UTC',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}
