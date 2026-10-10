/**
 * @module progress
 * Determinate progress bar (0-100) built on Radix Progress.
 * Depends on: @radix-ui/react-progress, @/lib/utils.
 * Used by: uploads, quotas, onboarding steps, upgrade-banner, ProgramOverviewCtas.
 */
import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

type TProgressProps = React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {
  /** Play a 0→value fill animation on mount. */
  animateFill?: boolean
}

/** Progress bar; value drives indicator width via translateX. */
const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  TProgressProps
>(({ className, value, animateFill = false, ...props }, ref) => (
  <ProgressPrimitive.Root
    ref={ref}
    className={cn(
      "relative h-2 w-full overflow-hidden rounded-full bg-primary/20",
      className
    )}
    {...props}
  >
    <ProgressPrimitive.Indicator
      className={cn(
        "h-full w-full flex-1 bg-lightSecondary transition-transform duration-700 ease-out",
        animateFill ? "animate-progress-fill" : null,
      )}
      style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
    />
  </ProgressPrimitive.Root>
))
Progress.displayName = ProgressPrimitive.Root.displayName

export { Progress }
