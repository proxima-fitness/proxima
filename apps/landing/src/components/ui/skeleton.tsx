/**
 * @module skeleton
 * Placeholder block with pulse animation for loading states.
 * Depends on: @/lib/utils.
 * Used by: cards, lists, sidebar menu placeholders, profile.
 */
import { cn } from "@/lib/utils";

/** Div with pulse animation and rounded-md; accepts standard div props. */
function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
      <div
      className={ cn("animate-pulse rounded-md bg-primary/10", className) }
      { ...props }
    />
  );
}

export { Skeleton };
