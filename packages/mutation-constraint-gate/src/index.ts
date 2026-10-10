// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module @proxima/mutation-constraint-gate
 *
 * Gate mutate/suggest paths against a constraint profile without UI catalogs.
 *
 * Depends on: nothing
 * Used by: landing chat constraints; edge MCP (slice 03+)
 */

/** Subset of the constraint profile the gate reads. */
export type TConstraintGateProfile = {
    injuries: string[];
    excludedEquipment: string[];
    excludedAreas: string[];
};

export type TConstraintViolation = {
    exerciseTitle: string;
    reason: string;
};

export type TValidationResult =
    | { valid: true }
    | { valid: false; violations: TConstraintViolation[] };

type TExerciseMeta = {
    title: string;
    equipment?: string | null;
    primary_muscle_group?: string | null;
};

/**
 * Hevy uses equipment `"none"` for no-equipment / bodyweight-adjacent templates.
 * That sentinel must never be treated as an exclusion target (blocks warmups/mobility).
 *
 * @param values - Raw excluded-equipment tokens
 */
export function sanitizeExcludedEquipment(values: string[]): string[] {
    return values.filter((v) => v.trim().toLowerCase() !== "none");
}

function matchesAny(value: string | null | undefined, terms: string[]): boolean {
    if (!value || !terms.length) return false;
    const lower = value.toLowerCase();
    return terms.some((t) => lower.includes(t.toLowerCase()));
}

/**
 * @param profile - Injuries / excluded equipment / excluded areas
 * @param exercises - Exercise metas to check (title + optional equipment/muscle)
 */
export function validateAgainstConstraints(
    profile: TConstraintGateProfile,
    exercises: TExerciseMeta[],
): TValidationResult {
    const excludedEquipment = sanitizeExcludedEquipment(profile.excludedEquipment);
    const violations = exercises
        .flatMap(({ title, equipment, primary_muscle_group }) => [
            matchesAny(equipment, excludedEquipment) && {
                exerciseTitle: title,
                reason: `uses excluded equipment: ${equipment}`,
            },
            matchesAny(primary_muscle_group, profile.excludedAreas) && {
                exerciseTitle: title,
                reason: `targets excluded area: ${primary_muscle_group}`,
            },
            matchesAny(primary_muscle_group, profile.injuries) && {
                exerciseTitle: title,
                reason: `targets injured area: ${primary_muscle_group}`,
            },
        ])
        .filter((v): v is TConstraintViolation => !!v);

    return violations.length ? { valid: false, violations } : { valid: true };
}
