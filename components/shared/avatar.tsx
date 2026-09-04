import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src: string
  name: string
  size?: number
  surface?: 'dark' | 'light'
  className?: string
}

/**
 * Image with an initial-letter fallback, extracted from DashboardSidebar's
 * former private SidebarAvatar so DashboardSidebar's Identity and
 * NodeMemberRow can share one implementation instead of two copies of the
 * same fallback logic.
 *
 * Square, zero radius — despite DESIGN.md's Shapes section noting avatars as
 * "the one confirmed exception (rounded-full)", the avatar this was
 * extracted from has never actually been rounded in the shipped code. This
 * preserves that real, load-bearing behavior rather than the documented
 * claim; DESIGN.md's note is stale and worth a correction pass, not a
 * silent redesign here.
 *
 * `surface` follows the same systemic pattern as StatusChip/Breadcrumb/
 * Field. DashboardSidebar's Identity never needed it (always dark), but
 * NodeMemberRow does — the fallback token must actually change, not just
 * accept the prop.
 */
export function Avatar({
  src,
  name,
  size = 40,
  surface = 'dark',
  className,
}: AvatarProps) {
  if (!src) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center text-xs font-bold',
          surface === 'dark'
            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
            : 'bg-muted text-muted-foreground',
          className,
        )}
        style={{ width: size, height: size }}
      >
        {(name || '?').charAt(0).toUpperCase()}
      </span>
    )
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      className={cn('shrink-0 object-cover', className)}
    />
  )
}
