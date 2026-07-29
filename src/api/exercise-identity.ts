/**
 * @module api/exercise-identity
 *
 * The two title keys every `canonical_exercises` row is written with: `normalized_title`
 * (the identity key, scoped to one owner by a unique index) and `match_key` (lossy, for
 * suggesting merges only).
 *
 * Pure and dependency-free on purpose. Rows are minted from two sides now - the server-side
 * workout history sync and the browser-side Week Export - and mixing two normalization schemes
 * is what once put two identity keys under one unique index.
 *
 * Depends on: nothing
 * Used by: api/workout-history (sync), api/custom-movements (Week Export mint)
 */

/**
 * Normalizes an exercise title into the canonical identity key.
 * Lowercases, collapses whitespace, and trims - word order and parentheses are preserved,
 * matching `normalized_title` in the ownership migration.
 *
 * @param title - Raw exercise title from Hevy or a fallback label
 * @returns Normalized title string
 */
export function normalizeExerciseTitle(title: string): string {
    return title.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Builds the lossy match key used to *suggest* merges and promotions.
 * Token-sorted and parens-stripped, mirroring `public.exercise_match_key`. Never an identity key:
 * it merges movements that differ only in word order.
 *
 * @param title - Raw exercise title
 * @returns Token-sorted match key
 */
export function exerciseMatchKey(title: string): string {
    return normalizeExerciseTitle(title.replace(/[()]/g, ""))
        .split(" ")
        .filter(Boolean)
        .sort()
        .join(" ");
}
