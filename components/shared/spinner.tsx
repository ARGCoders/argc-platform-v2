import { cn } from "@/lib/utils";

const SIZES = {
  sm: "w-4 h-4 border",
  md: "w-6 h-6 border-2",
  lg: "w-10 h-10 border-2",
} as const;

interface SpinnerProps {
  size?: keyof typeof SIZES;
  className?: string;
  /** Screen-reader text. Set to "" only if a visible label already says it. */
  label?: string;
}

export function Spinner({ size = "md", className, label = "Loading" }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn("inline-flex items-center justify-center", className)}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block animate-spin rounded-full",
          "border-current border-t-transparent opacity-60",
          SIZES[size],
        )}
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
