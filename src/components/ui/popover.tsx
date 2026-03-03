/**
 * @module popover
 * Uncontrolled popover (trigger opens floating panel) built on Radix Popover.
 * Depends on: @radix-ui/react-popover, @/lib/utils.
 * Used by: dropdowns, pickers, hover cards, custom menus.
 */
import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";

import { cn } from "@/lib/utils";

/** Root; manages open state and trigger/content association. */
const Popover = PopoverPrimitive.Root;

/** Element that opens the popover on click. */
const PopoverTrigger = PopoverPrimitive.Trigger;

/** Optional anchor for positioning content relative to an element other than trigger. */
const PopoverAnchor = PopoverPrimitive.Anchor;

/** Floating panel (portal); align/sideOffset control position. */
const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "center", sideOffset = 4, ...props }, ref) => (
    <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
      ref={ ref }
      align={ align }
      sideOffset={ sideOffset }
      className={ cn(
        "z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      ) }
      { ...props }
    />
    </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor };
