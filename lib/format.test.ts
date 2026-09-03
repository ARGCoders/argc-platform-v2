import { describe, it, expect } from 'vitest'
import { formatDate, formatDateShort } from './format'

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
