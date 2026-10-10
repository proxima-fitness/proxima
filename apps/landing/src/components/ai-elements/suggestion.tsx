"use client";

/**
 * @module Suggestion
 *
 * Horizontal list of one-click prompt suggestions that sit above the
 * prompt input. This module provides a scrollable container and a
 * button primitive that emits the selected suggestion text.
 *
 * Depends on:
 * - Design system `ScrollArea`, `ScrollBar`, and `Button`
 * - Utility class merging via `cn`
 *
 * Used by:
 * - `PromptTemplate` and agent chat UIs to present suggested prompts
 *   and "quick start" actions above the input.
 */

import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import {
  ScrollArea,
  ScrollBar,
} from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useCallback } from "react";

/**
 * Props for the horizontal list of suggestions. Inherits all scroll
 * area props so callers can integrate with surrounding layout.
 */
export type TSuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  className,
  children,
  ...props
}: TSuggestionsProps) => (
  <ScrollArea className="w-full overflow-x-auto whitespace-nowrap" {...props}>
    <div className={cn("flex w-max flex-nowrap items-center gap-2", className)}>
      {children}
    </div>
    <ScrollBar className="hidden md:flex" orientation="horizontal" />
  </ScrollArea>
);

/**
 * Props for a single suggestion chip.
 *
 * - `suggestion` is the text value surfaced to consumers.
 * - `onClick` receives the suggestion string when the chip is selected.
 */
export type TSuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
};

export const Suggestion = ({
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: TSuggestionProps) => {
  const handleClick = useCallback(() => {
    onClick?.(suggestion);
  }, [onClick, suggestion]);

  return (
    <Button
      className={cn("cursor-pointer rounded-full px-4", className)}
      onClick={handleClick}
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children || suggestion}
    </Button>
  );
};
