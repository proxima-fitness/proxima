/**
 * @module account/constraint-profile-draft
 *
 * Pure helpers for Constraint profile Edit draft: clone, dirty check, list edits.
 * Persist only via Save constraints - draft stays local until then.
 *
 * Depends on: TUserConstraintProfileRecord
 * Used by: ConstraintProfileSection
 */
import type { TUserConstraintProfileRecord } from "@/api/user-constraints";
import type { TConstraintProfile } from "@/app/api/chat/constraints";

/** Deep-clone a Constraint profile record for local draft editing. */
export function cloneConstraintProfileDraft(
    record: TUserConstraintProfileRecord,
): TUserConstraintProfileRecord {
    return {
        injuries: [...record.injuries],
        excludedEquipment: [...record.excludedEquipment],
        excludedAreas: [...record.excludedAreas],
        preferences: { ...record.preferences },
        chatRefinements: [...record.chatRefinements],
        rawStatements: [...record.rawStatements],
    };
}

function arraysEqual(a: string[], b: string[]): boolean {
    if (a.length !== b.length) return false;
    return a.every((value, index) => value === b[index]);
}

function preferencesEqual(
    a: TConstraintProfile["preferences"],
    b: TConstraintProfile["preferences"],
): boolean {
    return (
        a.splitType === b.splitType &&
        a.exerciseVariability === b.exerciseVariability &&
        a.progressionSystem === b.progressionSystem &&
        a.deloadWeek === b.deloadWeek &&
        a.peakWeek === b.peakWeek &&
        a.warmupExercises === b.warmupExercises
    );
}

/** True when draft differs from the last loaded/saved baseline. */
export function isConstraintProfileDraftDirty(
    baseline: TUserConstraintProfileRecord,
    draft: TUserConstraintProfileRecord,
): boolean {
    return (
        !arraysEqual(baseline.injuries, draft.injuries) ||
        !arraysEqual(baseline.excludedEquipment, draft.excludedEquipment) ||
        !arraysEqual(baseline.excludedAreas, draft.excludedAreas) ||
        !arraysEqual(baseline.chatRefinements, draft.chatRefinements) ||
        !arraysEqual(baseline.rawStatements, draft.rawStatements) ||
        !preferencesEqual(baseline.preferences, draft.preferences)
    );
}

/**
 * Appends a trimmed freeform item if non-empty and not already present (case-insensitive).
 * Returns the same array reference when unchanged.
 */
export function addFreeformItem(items: string[], raw: string): string[] {
    const value = raw.trim();
    if (!value) return items;
    const lower = value.toLowerCase();
    if (items.some((item) => item.toLowerCase() === lower)) return items;
    return [...items, value];
}

/** Removes the item at index; returns same reference when index is out of range. */
export function removeItemAt(items: string[], index: number): string[] {
    if (index < 0 || index >= items.length) return items;
    return items.filter((_, i) => i !== index);
}

/** Sets one preference key; empty string clears. */
export function setPreferenceValue(
    preferences: TConstraintProfile["preferences"],
    key: keyof TConstraintProfile["preferences"],
    value: string,
): TConstraintProfile["preferences"] {
    return {
        ...preferences,
        [key]: value.trim(),
    };
}
