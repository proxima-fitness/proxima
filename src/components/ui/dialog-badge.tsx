/**
 * @module dialog-badge
 * Badge styled for use inside dialogs (same variants as badge; renders as span).
 * Depends on: class-variance-authority, @/lib/utils.
 * Used by: dialog content that needs inline status/labels.
 */

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-hidden focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground shadow-sm hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/80",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

/** @param variant - default | secondary | destructive | outline. */
export interface IBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/** Badge for dialog context; same API as Badge but span-based. */
function DialogBadge({ className, variant, ...props }: IBadgeProps) {
  return (
      <span className={ cn(badgeVariants({ variant }), className) } { ...props } />
  );
}

export { DialogBadge, badgeVariants };
