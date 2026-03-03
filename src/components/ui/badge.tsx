/**
 * @module badge
 * Small status/label pill with variant styles (default, secondary, destructive, outline).
 * Depends on: class-variance-authority, @/lib/utils.
 * Used by: tool, SetTypesLegend, layout, and feature components.
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
          "border-transparent bg-white text-secondary-foreground hover:bg-white/80 dark:text-black",
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

/**
 * @param className - Optional extra class names.
 * @param variant - Visual style: default | secondary | destructive | outline.
 */
export interface IBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

/** Renders a small pill with semantic variant styling. */
function Badge({ className, variant, ...props }: IBadgeProps) {
  return (
      <div className={ cn(badgeVariants({ variant }), className) } { ...props } />
  );
}

export { Badge, badgeVariants };
