// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module @proxima/exercise-identity
 *
 * The two title keys every `canonical_exercises` row is written with: `normalized_title`
 * (the identity key, scoped to one owner by a unique index) and `match_key` (lossy, for
 * suggesting merges only).
 *
 * Depends on: nothing
 * Used by: landing workout-history / custom-movements; edge MCP (slice 03+)
 */

/**
 * Normalizes an exercise title into the canonical identity key.
 * Lowercases, collapses whitespace, and trims — word order and parentheses are preserved.
 *
 * @param title - Raw exercise title from Hevy or a fallback label
 */
export function normalizeExerciseTitle(title: string): string {
    return title.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Builds the lossy match key used to *suggest* merges and promotions.
 * Token-sorted and parens-stripped. Never an identity key.
 *
 * @param title - Raw exercise title
 */
export function exerciseMatchKey(title: string): string {
    return normalizeExerciseTitle(title.replace(/[()]/g, ""))
        .split(" ")
        .filter(Boolean)
        .sort()
        .join(" ");
}
