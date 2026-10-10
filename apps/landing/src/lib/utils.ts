/**
 * @module utils
 *
 * Shared Tailwind CSS class-name merging utility. Combines clsx's
 * conditional class-name logic with tailwind-merge's conflict resolution
 * so that later classes correctly override earlier ones.
 *
 * Depends on: clsx, tailwind-merge
 * Used by: Virtually every UI component that composes class names
 */

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merge and de-duplicate Tailwind CSS class names.
 *
 * Accepts the same flexible inputs as `clsx` (strings, arrays, objects)
 * and feeds the result through `twMerge` so conflicting utilities
 * (e.g. `px-2` vs `px-4`) resolve to the last one specified.
 *
 * @param inputs - Class values to merge (strings, arrays, conditional objects)
 * @returns A single de-duplicated class-name string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
