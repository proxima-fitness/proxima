// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module chat/training-profile/initialize
 *
 * Builds a session Training profile from questionnaire / request-body wire fields.
 * Catalog values must match CONTEXT / `TTrainingProfile` (prefer-not-to-say → empty sex).
 *
 * Depends on: emptyUserTrainingProfile (@/api/user-training-profile), TTrainingProfile
 * Used by: chat route (merge with persisted), tests
 */
import { emptyUserTrainingProfile } from "@/api/user-training-profile";

export interface IInitializeTrainingProfileParams {
    age?: number | string | null;
    sex?: string | null;
    heightCm?: number | string | null;
    experienceLevel?: string | null;
    physiquePhase?: string | null;
    trainingFocus?: string | null;
    activityLevel?: string | null;
    sessionDurationMin?: number | string | null;
}

const SEX_VALUES = ["male", "female"] as const satisfies readonly TTrainingSex[];
const EXPERIENCE_VALUES = [
    "beginner",
    "novice",
    "intermediate",
    "advanced",
] as const satisfies readonly TExperienceLevel[];
const PHYSIQUE_VALUES = [
    "bulk",
    "cut",
    "maintain",
    "recomp",
] as const satisfies readonly TPhysiquePhase[];
const FOCUS_VALUES = [
    "bodybuilding",
    "powerbuilding",
    "powerlifting",
    "hyrox",
    "crossfit",
    "olympic_weightlifting",
    "calisthenics_bodyweight",
    "athletics_sport",
    "fat_loss",
    "general_fitness",
    "rehab_pain_aware",
] as const satisfies readonly TTrainingFocus[];
const ACTIVITY_VALUES = [
    "sedentary",
    "light",
    "moderate",
    "high",
    "extreme",
] as const satisfies readonly TActivityLevel[];

/** Questionnaire sentinel for prefer-not-to-say / unset (same as TRAINING_PROFILE_UNSET_VALUE). */
const UNSET_SENTINEL = "__unset__";

function asCatalog<T extends string>(value: string | null | undefined, allowed: readonly T[]): T | "" {
    if (!value) return "";
    const trimmed = value.trim();
    if (!trimmed || trimmed === UNSET_SENTINEL) return "";
    return (allowed as readonly string[]).includes(trimmed) ? (trimmed as T) : "";
}

function parseIntInRange(
    value: number | string | null | undefined,
    min: number,
    max: number,
): number | null {
    if (value == null || value === "") return null;
    const n = typeof value === "number" ? value : Number(String(value).trim());
    if (!Number.isFinite(n)) return null;
    const rounded = Math.round(n);
    if (rounded < min || rounded > max) return null;
    return rounded;
}

/** True when any Training profile field is set (non-empty / non-null). */
export function trainingProfileHasAnyField(profile: TTrainingProfile): boolean {
    return (
        profile.age != null ||
        profile.sex !== "" ||
        profile.heightCm != null ||
        profile.experienceLevel !== "" ||
        profile.physiquePhase !== "" ||
        profile.trainingFocus !== "" ||
        profile.activityLevel !== "" ||
        profile.sessionDurationMin != null
    );
}

/**
 * Maps request-body / questionnaire advanced wire fields into a Training profile.
 * Invalid catalog values and out-of-range numbers become empty/null.
 */
export function initializeTrainingProfile(
    params: IInitializeTrainingProfileParams = {},
): TTrainingProfile {
    const empty = emptyUserTrainingProfile();
    return {
        ...empty,
        age: parseIntInRange(params.age, 14, 100),
        sex: asCatalog(params.sex, SEX_VALUES),
        heightCm: parseIntInRange(params.heightCm, 120, 230),
        experienceLevel: asCatalog(params.experienceLevel, EXPERIENCE_VALUES),
        physiquePhase: asCatalog(params.physiquePhase, PHYSIQUE_VALUES),
        trainingFocus: asCatalog(params.trainingFocus, FOCUS_VALUES),
        activityLevel: asCatalog(params.activityLevel, ACTIVITY_VALUES),
        sessionDurationMin: (() => {
            const mins = parseIntInRange(params.sessionDurationMin, 10, 180);
            if (mins == null) return null;
            // Canonical step: 10 minutes
            return Math.round(mins / 10) * 10;
        })(),
    };
}
