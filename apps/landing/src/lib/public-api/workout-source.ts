/**
 * @module lib/public-api/workout-source
 *
 * Closed Public API **Workout source** list (ADR 0026 / 01). Callers send one of
 * these slugs. `hevy` stays on `source_type` for native sync and is reserved.
 *
 * Depends on: nothing
 * Used by: Public API workout routes (ADR 0026 / 05), profile history (ADR 0026 / 06)
 */

/** Native sync only. Public API writes must not use this slug. */
export const HEVY_RESERVED_SOURCE = "hevy" as const;

/**
 * v1 Public API **Workout source** slugs. `manual` is the listed slug when
 * there is no app. Agents set the app the session was logged in, not themselves.
 */
export const PUBLIC_API_WORKOUT_SOURCES = [
    "manual",
    "strong",
    "macrofactor_workouts",
    "fitbod",
    "gravl",
    "apple_health",
    "jefit",
    "caliber",
    "boostcamp",
    "liftosaur",
    "strengthlog",
    "alpha_progression",
    "stronglifts",
    "setgraph",
    "rp_hypertrophy",
    "juggernaut",
] as const;

export type TPublicApiWorkoutSource = (typeof PUBLIC_API_WORKOUT_SOURCES)[number];

export const PUBLIC_API_WORKOUT_SOURCE_SET: ReadonlySet<string> = new Set(
    PUBLIC_API_WORKOUT_SOURCES,
);

const WORKOUT_SOURCE_LABELS: Record<string, string> = {
    [HEVY_RESERVED_SOURCE]: "Hevy",
    manual: "Manual",
    strong: "Strong",
    macrofactor_workouts: "MacroFactor",
    fitbod: "Fitbod",
    gravl: "Gravl",
    apple_health: "Apple Health",
    jefit: "Jefit",
    caliber: "Caliber",
    boostcamp: "Boostcamp",
    liftosaur: "Liftosaur",
    strengthlog: "StrengthLog",
    alpha_progression: "Alpha Progression",
    stronglifts: "StrongLifts",
    setgraph: "Setgraph",
    rp_hypertrophy: "RP Hypertrophy",
    juggernaut: "Juggernaut",
};

/**
 * Display name for a **Workout source** slug.
 *
 * @param slug - Backup `workouts.source` value
 */
export function workoutSourceLabel(slug: string): string {
    return WORKOUT_SOURCE_LABELS[slug] ?? slug;
}

/**
 * True when the slug is reserved for Hevy native sync.
 *
 * @param slug - Candidate **Workout source**
 */
export function isReservedHevySource(
    slug: string,
): slug is typeof HEVY_RESERVED_SOURCE {
    return slug === HEVY_RESERVED_SOURCE;
}

/**
 * True when the slug is on the closed Public API list (`hevy` is never accepted).
 *
 * @param slug - Candidate **Workout source**
 */
export function isPublicApiWorkoutSource(
    slug: string,
): slug is TPublicApiWorkoutSource {
    return PUBLIC_API_WORKOUT_SOURCE_SET.has(slug);
}
