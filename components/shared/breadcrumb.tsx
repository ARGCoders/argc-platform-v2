import Link from "next/link";
import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Omit on the final crumb — the current page is not a link. */
  href?: string;
}

/**
 * Used by blog posts, handbook topics and dashboard detail pages.
 * The trailing crumb is marked aria-current and rendered as plain text.
 */
export function Breadcrumb({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn("w-full", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-[0.68rem] tracking-[0.1em] uppercase">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  href={item.href}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  {item.label}
                </Link>
              ) : (
                <span aria-current={isLast ? "page" : undefined} className="text-foreground">
                  {item.label}
                </span>
              )}

              {!isLast && (
                <span aria-hidden="true" className="text-muted-foreground/50">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
