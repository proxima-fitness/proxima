/**
 * @module lib/constraint-profile-view
 *
 * Pure helpers for Constraint profile empty checks and condensed peek summaries.
 * Omits raw statements from summaries (Edit profile only).
 *
 * Depends on: TConstraintProfile shape
 * Used by: Constraint profile peek, Edit profile empty states
 */
import type { TConstraintProfile } from "@/app/api/chat/constraints";

/** Max characters per string value in a condensed peek summary. */
export const CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH = 72;

export type TConstraintProfileSummary = {
    injuries?: string[];
    excludedEquipment?: string[];
    excludedAreas?: string[];
    preferences?: Partial<TConstraintProfile["preferences"]>;
};

type TConstraintProfileViewSource = Pick<
    TConstraintProfile,
    "injuries" | "excludedEquipment" | "excludedAreas" | "preferences"
>;

function truncateValue(value: string): string {
    if (value.length <= CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH) return value;
    return `${value.slice(0, CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH - 1)}…`;
}

function truncateList(values: string[]): string[] {
    return values.map(truncateValue);
}

/** True when no row / all structured fields empty (raw statements ignored). */
export function isConstraintProfileEmpty(
    profile: TConstraintProfileViewSource | null | undefined,
): boolean {
    if (!profile) return true;

    if (profile.injuries.length > 0) return false;
    if (profile.excludedEquipment.length > 0) return false;
    if (profile.excludedAreas.length > 0) return false;

    return !Object.values(profile.preferences).some((value) => value.trim() !== "");
}

/**
 * Condensed peek view: non-empty structured sections only; truncates long values;
 * omits raw statements.
 */
export function toConstraintProfileSummary(
    profile: TConstraintProfileViewSource | null | undefined,
): TConstraintProfileSummary {
    if (!profile || isConstraintProfileEmpty(profile)) return {};

    const summary: TConstraintProfileSummary = {};

    if (profile.injuries.length > 0) {
        summary.injuries = truncateList(profile.injuries);
    }
    if (profile.excludedEquipment.length > 0) {
        summary.excludedEquipment = truncateList(profile.excludedEquipment);
    }
    if (profile.excludedAreas.length > 0) {
        summary.excludedAreas = truncateList(profile.excludedAreas);
    }

    const preferences: Partial<TConstraintProfile["preferences"]> = {};
    for (const [key, value] of Object.entries(profile.preferences) as Array<
        [keyof TConstraintProfile["preferences"], string]
    >) {
        if (value.trim() !== "") {
            preferences[key] = truncateValue(value);
        }
    }
    if (Object.keys(preferences).length > 0) {
        summary.preferences = preferences;
    }

    return summary;
}
