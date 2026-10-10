/**
 * @module collapsible
 * Uncontrolled expand/collapse (Root, Trigger, Content). Thin wrapper over Radix.
 * Depends on: @radix-ui/react-collapsible.
 * Used by: app and feature components needing simple show/hide sections.
 */

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
