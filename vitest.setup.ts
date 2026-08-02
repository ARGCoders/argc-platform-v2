import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// Unmount between tests so a leaked component cannot affect the next one.
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom does not implement matchMedia, which the ASCII canvas and any
// reduced-motion check call on mount.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
})

// Also absent from jsdom; used to pause the hero animation off-screen.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = ''
  readonly thresholds: ReadonlyArray<number> = []
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
}
vi.stubGlobal('IntersectionObserver', MockIntersectionObserver)
