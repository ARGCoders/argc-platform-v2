import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { RevealOnScroll } from './reveal-on-scroll'

function stubMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

type ObserverCallback = (
  entries: Pick<IntersectionObserverEntry, 'isIntersecting'>[],
) => void

let lastCallback: ObserverCallback | null = null

function stubIntersectionObserver() {
  lastCallback = null
  class StubIntersectionObserver {
    constructor(callback: ObserverCallback) {
      lastCallback = callback
    }
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
  vi.stubGlobal('IntersectionObserver', StubIntersectionObserver)
}

beforeEach(() => {
  stubIntersectionObserver()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('RevealOnScroll', () => {
  it('starts hidden and becomes visible once the element intersects', async () => {
    stubMatchMedia(false)

    const { getByText } = render(
      <RevealOnScroll>
        <p>Mission content</p>
      </RevealOnScroll>,
    )

    const wrapper = getByText('Mission content').parentElement
    expect(wrapper?.className).toContain('opacity-0')

    lastCallback?.([{ isIntersecting: true }])

    await waitFor(() => expect(wrapper?.className).toContain('opacity-100'))
  })

  it('renders visible immediately when the user prefers reduced motion', async () => {
    stubMatchMedia(true)

    const { getByText } = render(
      <RevealOnScroll>
        <p>Mission content</p>
      </RevealOnScroll>,
    )

    const wrapper = getByText('Mission content').parentElement
    await waitFor(() => expect(wrapper?.className).toContain('opacity-100'))
  })

  it('includes a noscript fallback forcing visibility when scripting is disabled', () => {
    stubMatchMedia(false)

    const { container } = render(
      <RevealOnScroll>
        <p>Mission content</p>
      </RevealOnScroll>,
    )

    const noscript = container.querySelector('noscript')
    expect(noscript?.innerHTML).toContain('[data-reveal-on-scroll]')
    expect(noscript?.innerHTML).toContain('opacity:1')
  })
})
