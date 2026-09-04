import { describe, it, expect } from 'vitest'
import { formatDate, formatDateShort, formatEventDate } from './format'

describe('formatDate', () => {
  it('formats an ISO string as YYYY-MM-DD', () => {
    expect(formatDate('2026-08-19T00:00:00.000Z')).toBe('2026-08-19')
  })

  // Regression guard: a UTC-midnight date must not shift a day in a
  // non-UTC test environment.
  it('formats in UTC regardless of the local timezone', () => {
    expect(formatDate('2026-01-01T00:00:00.000Z')).toBe('2026-01-01')
  })
})

describe('formatDateShort', () => {
  it('formats an ISO string as MM-DD', () => {
    expect(formatDateShort('2026-08-19T00:00:00.000Z')).toBe('08-19')
  })
})

describe('formatEventDate', () => {
  it('formats in Asia/Amman, not UTC', () => {
    // 15:00 UTC = 18:00 Amman (UTC+3, no DST) — same calendar day either way,
    // isolating the timezone conversion from the day-shift case below.
    expect(formatEventDate('2026-03-14T15:00:00.000Z')).toBe('Sat, Mar 14 · 6:00 PM')
  })

  // Regression guard for the P0 this replaces formatDate() to fix: a UTC
  // timestamp that lands on the PREVIOUS day in Amman must not be reported
  // under the UTC day. 22:00 UTC on the 14th is 01:00 Amman on the 15th.
  it('reports the Amman calendar day, even when it differs from the UTC day', () => {
    expect(formatEventDate('2026-03-14T22:00:00.000Z')).toBe('Sun, Mar 15 · 1:00 AM')
  })

  it('appends the end time when ends_at falls on the same Amman day', () => {
    expect(formatEventDate('2026-03-14T15:00:00.000Z', '2026-03-14T18:30:00.000Z')).toBe(
      'Sat, Mar 14 · 6:00 PM–9:30 PM',
    )
  })

  it('omits the end time when ends_at falls on a different Amman day', () => {
    expect(formatEventDate('2026-03-14T15:00:00.000Z', '2026-03-15T10:00:00.000Z')).toBe(
      'Sat, Mar 14 · 6:00 PM',
    )
  })

  it('omits the end time when there is no ends_at', () => {
    expect(formatEventDate('2026-03-14T15:00:00.000Z', null)).toBe(
      'Sat, Mar 14 · 6:00 PM',
    )
  })

  it('falls back to a start-only string when ends_at fails to parse', () => {
    expect(formatEventDate('2026-03-14T15:00:00.000Z', 'not-a-date')).toBe(
      'Sat, Mar 14 · 6:00 PM',
    )
  })

  it('returns a safe placeholder for an unparseable start date', () => {
    expect(formatEventDate('not-a-date')).toBe('Date TBD')
  })
})
