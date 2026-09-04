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

const EVENT_TZ = 'Asia/Amman'
const EVENT_DATE_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TZ,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
})
const EVENT_TIME_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: EVENT_TZ,
  hour: 'numeric',
  minute: '2-digit',
})

/**
 * Weekday + date + time, in the club's home timezone (Asia/Amman) — for the
 * public /events page, where formatDate()'s bare UTC-midnight date can land
 * on the wrong calendar day for an evening event and gives no time at all.
 * formatDate() stays as-is for ledger-truth timestamps; this is for a
 * Persuade surface where a visitor has to actually show up somewhere.
 *
 * Appends an end time when `endIso` falls on the same Amman calendar day as
 * the start; a multi-day event just shows its start (formatting a full date
 * range is more than this page currently needs).
 */
export function formatEventDate(startIso: string, endIso?: string | null): string {
  const start = new Date(startIso)
  if (Number.isNaN(start.getTime())) return 'Date TBD'

  const datePart = EVENT_DATE_FMT.format(start)
  const startTime = EVENT_TIME_FMT.format(start)

  if (!endIso) return `${datePart} · ${startTime}`

  const end = new Date(endIso)
  if (Number.isNaN(end.getTime()) || EVENT_DATE_FMT.format(end) !== datePart) {
    return `${datePart} · ${startTime}`
  }

  return `${datePart} · ${startTime}–${EVENT_TIME_FMT.format(end)}`
}
