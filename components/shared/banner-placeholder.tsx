import { cn } from '@/lib/utils'

/**
 * Stands in for a blog banner when `posts.banner` is empty. Deterministic:
 * the same slug always yields the same angle, so a card does not change
 * appearance between renders.
 */
export function BannerPlaceholder({
  seed = '',
  className,
}: {
  seed?: string
  className?: string
}) {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0
  }
  const angle = Math.abs(hash) % 360

  return (
    <div
      aria-hidden="true"
      className={cn('relative w-full overflow-hidden bg-eng-navy', className)}
      style={{
        backgroundImage: `linear-gradient(${angle}deg, var(--color-argc-maroon-dk), var(--color-eng-navy) 60%, var(--color-steel-blue-dk))`,
      }}
    >
      <span className="absolute bottom-3 right-4 font-mono text-[0.6rem] tracking-[0.3em] uppercase text-hero-ink/25">
        ARGC
      </span>
    </div>
  )
}
