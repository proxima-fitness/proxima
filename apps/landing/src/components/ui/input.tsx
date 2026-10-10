/**
 * @module input
 * Text input with optional start/end Lucide icons and theme styles.
 * Depends on: lucide-react, @/lib/utils.
 * Used by: input-group, forms, and feature components.
 */

import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/** @param startIcon - Icon shown at leading edge. @param endIcon - Icon shown at trailing edge. @param containerClassName - Classes for the outer wrapper (default full width). */
export interface IInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  startIcon?: LucideIcon;
  endIcon?: LucideIcon;
  containerClassName?: string;
}

/** Single-line input; padding adjusted when startIcon/endIcon are set. */
const Input = React.forwardRef<HTMLInputElement, IInputProps>(
  ({ className, type, startIcon, endIcon, containerClassName, ...props }, ref) => {
    const StartIcon = startIcon;
    const EndIcon = endIcon;

    return (
        <div className={cn("relative", containerClassName ?? "w-full")}>
            {StartIcon && (
            <div className="absolute left-1.5 top-1/2 transform -translate-y-1/2">
                <StartIcon size={ 18 } className="text-muted-foreground" />
            </div>
        )}
            <input
          type={ type }
          className={ cn(
            "flex h-10 w-full rounded-md border border-input bg-background py-2 px-4 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
            startIcon ? "pl-8" : "",
            endIcon ? "pr-8" : "",
            className,
          ) }
          ref={ ref }
          { ...props }
        />
            {EndIcon && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <EndIcon className="text-muted-foreground" size={ 18 } />
            </div>
        )}
        </div>
    );
  },
);
Input.displayName = "Input";

export { Input };
