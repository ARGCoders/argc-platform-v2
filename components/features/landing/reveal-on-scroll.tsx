'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Scroll-triggered fade-rise for below-the-fold landing sections — the same
 * `--ease-expo` settle Hero's own load-time `hero-rise` animation uses, just
 * triggered on IntersectionObserver instead of mount, since this content
 * starts off-screen rather than in the first viewport. Not the `hero-rise`
 * keyframe itself: that one is tied to page load, this to scroll position.
 *
 * Respects `prefers-reduced-motion` by rendering visible immediately — a
 * section a visitor scrolls to see shouldn't stay hidden behind an
 * animation they've asked not to run.
 */
export function RevealOnScroll({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    if (prefersReducedMotion) {
      // Deferred a tick so setState never runs synchronously inside the
      // effect body itself (same fix as ascii-boot.tsx).
      Promise.resolve().then(() => setVisible(true))
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      {/* If JS never runs, the effect above never fires and this content
       * would stay at opacity-0 forever — a blank first content section
       * is a bad trust signal on a page whose job is to persuade. This
       * CSS-only override only takes effect when scripting is disabled. */}
      <noscript
        dangerouslySetInnerHTML={{
          __html:
            '<style>[data-reveal-on-scroll]{opacity:1!important;transform:none!important}</style>',
        }}
      />
      <div
        ref={ref}
        data-reveal-on-scroll
        className={cn(
          'transition-[opacity,transform] duration-700 ease-[var(--ease-expo)]',
          visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6',
          className,
        )}
      >
        {children}
      </div>
    </>
  )
}
