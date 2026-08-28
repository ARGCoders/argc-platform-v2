import { describe, it, expect } from 'vitest'
import {
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  MAX_PER_PAGE,
  parsePagination,
} from './pagination'

function parse(query: string) {
  return parsePagination(new URLSearchParams(query))
}

describe('parsePagination', () => {
  it('applies the contract defaults when params are missing', () => {
    expect(parse('')).toEqual({ ok: true, page: DEFAULT_PAGE, perPage: DEFAULT_PER_PAGE })
  })

  it('accepts in-range page and perPage values', () => {
    expect(parse('?page=1&perPage=5')).toEqual({ ok: true, page: 1, perPage: 5 })
    expect(parse('?page=42&perPage=100')).toEqual({ ok: true, page: 42, perPage: 100 })
  })

  it('accepts perPage at the cap', () => {
    expect(parse(`?perPage=${MAX_PER_PAGE}`)).toEqual({
      ok: true,
      page: DEFAULT_PAGE,
      perPage: MAX_PER_PAGE,
    })
  })

  it('rejects page below 1', () => {
    expect(parse('?page=0')).toEqual({
      ok: false,
      code: 'invalid_input',
      message: 'page must be an integer ≥ 1',
    })
  })

  it('rejects a fractional page', () => {
    expect(parse('?page=1.5').ok).toBe(false)
  })

  it('rejects a non-numeric page', () => {
    expect(parse('?page=abc').ok).toBe(false)
  })

  it('rejects a blank page (Number("") is 0)', () => {
    expect(parse('?page=').ok).toBe(false)
  })

  it('rejects perPage above the cap', () => {
    expect(parse(`?perPage=${MAX_PER_PAGE + 1}`)).toEqual({
      ok: false,
      code: 'invalid_input',
      message: 'perPage must be an integer between 1 and 100',
    })
  })

  it('rejects a non-numeric perPage', () => {
    expect(parse('?perPage=ten').ok).toBe(false)
  })

  it('keeps the default cap explicit in the module for routes that embed it', () => {
    expect(DEFAULT_PAGE).toBe(1)
    expect(DEFAULT_PER_PAGE).toBe(20)
    expect(MAX_PER_PAGE).toBe(100)
  })
})
