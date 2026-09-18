/**
 * Bracket tag label per BLOG_DESIGN_SPECS §3.3 — monospace, all-caps,
 * `[LIKE THIS]`. Not a pill; tags are flat technical labels.
 */
export function Tag({ children }: { children: string }) {
  return (
    <span className="font-mono text-[0.68rem] tracking-[0.12em] uppercase text-ink-muted">
      [{children.toUpperCase()}]
    </span>
  )
}
