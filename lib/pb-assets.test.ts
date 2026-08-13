import { describe, it, expect, vi } from 'vitest'
import { pocketBaseFileUrl } from './pb-assets'

vi.mock('@/lib/env', () => ({
  env: { POCKETBASE_URL: 'http://127.0.0.1:8090' },
}))

describe('pocketBaseFileUrl', () => {
  it('builds the PocketBase files serving path', () => {
    expect(pocketBaseFileUrl('c123', 'r456', 'banner.png')).toBe(
      'http://127.0.0.1:8090/api/files/c123/r456/banner.png',
    )
  })

  it('encodes unsafe filename characters', () => {
    expect(pocketBaseFileUrl('c1', 'r1', 'my banner.png')).toContain('my%20banner.png')
  })
})
