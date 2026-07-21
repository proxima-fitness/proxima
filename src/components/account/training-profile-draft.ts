/**
 * @module account/training-profile-draft
 *
 * Pure helpers for Training profile Edit draft: clone, dirty check, height convert.
 * Persist only via Save training profile — draft stays local until then.
 *
 * Depends on: TTrainingProfile, emptyUserTrainingProfile
 * Used by: TrainingProfileSection
 */
import { emptyUserTrainingProfile } from "@/api/user-training-profile";

/** Deep-clone a Training profile for local draft editing. */
export function cloneTrainingProfileDraft(profile: TTrainingProfile): TTrainingProfile {
    return { ...profile };
}

/** Seeds an empty draft when no persisted row exists. */
export function seedTrainingProfileDraft(
    profile: TTrainingProfile | null | undefined,
): TTrainingProfile {
    return cloneTrainingProfileDraft(profile ?? emptyUserTrainingProfile());
}

/** True when draft differs from the last loaded/saved baseline. */
export function isTrainingProfileDraftDirty(
    baseline: TTrainingProfile,
    draft: TTrainingProfile,
): boolean {
    return (
        baseline.age !== draft.age ||
        baseline.sex !== draft.sex ||
        baseline.heightCm !== draft.heightCm ||
        baseline.experienceLevel !== draft.experienceLevel ||
        baseline.physiquePhase !== draft.physiquePhase ||
        baseline.trainingFocus !== draft.trainingFocus ||
        baseline.activityLevel !== draft.activityLevel ||
        baseline.sessionDurationMin !== draft.sessionDurationMin
    );
}

/** Converts total inches → centimeters (rounded to nearest int). */
export function inchesToCm(totalInches: number): number {
    return Math.round(totalInches * 2.54);
}

/** Converts centimeters → total inches (rounded to nearest int). */
export function cmToInches(cm: number): number {
    return Math.round(cm / 2.54);
}

export type TImperialHeight = {
    feet: number;
    inches: number;
};

/** Splits total inches into feet + inches (0–11). */
export function splitImperialHeight(totalInches: number): TImperialHeight {
    const safe = Math.max(0, Math.round(totalInches));
    return {
        feet: Math.floor(safe / 12),
        inches: safe % 12,
    };
}

/** Combines feet + inches into total inches. */
export function combineImperialHeight(feet: number, inches: number): number {
    return feet * 12 + inches;
}

/** Canonical cm from Imperial feet + inches; null when either part missing. */
export function imperialToHeightCm(
    feet: number | null,
    inches: number | null,
): number | null {
    if (feet == null || inches == null) return null;
    return inchesToCm(combineImperialHeight(feet, inches));
}

/**
 * Imperial display parts from canonical cm.
 * Returns nulls when height unset.
 */
export function heightCmToImperial(heightCm: number | null): {
    feet: number | null;
    inches: number | null;
} {
    if (heightCm == null) return { feet: null, inches: null };
    const parts = splitImperialHeight(cmToInches(heightCm));
    return { feet: parts.feet, inches: parts.inches };
}

/** Parses a Select numeric string; empty/invalid → null. */
export function parseOptionalInt(raw: string): number | null {
    if (!raw || raw.trim() === "") return null;
    const n = Number.parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
}
