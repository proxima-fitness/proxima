/**
 * @module account/training-profile-options
 *
 * Closed option catalogs for the Training profile editor (CONTEXT lists).
 * Height unit is UI-only; storage is always centimeters.
 *
 * Depends on: age/duration options from form-options, TTrainingProfile catalogs
 * Used by: TrainingProfileSection, training-profile-draft
 */
import { ageOptions, workoutDurationOptions } from "@/assets/constants/form-options";

/** Sentinel Select value meaning unset / prefer-not-to-say (maps to empty string). */
export const TRAINING_PROFILE_UNSET_VALUE = "__unset__";

export type THeightUnit = "imperial" | "metric";

/** Sex picker — prefer not to say maps to empty on save. */
export const TRAINING_SEX_OPTIONS: TSelectOption[] = [
    { label: "Male", value: "male" },
    { label: "Female", value: "female" },
    { label: "Prefer not to say", value: TRAINING_PROFILE_UNSET_VALUE },
];

/** Age options (14–100) from form-options. */
export const TRAINING_AGE_OPTIONS: TSelectOption[] = ageOptions;

/** Experience level (difficultyOptions catalog). */
export const TRAINING_EXPERIENCE_OPTIONS: TSelectOption[] = [
    { label: "Beginner", value: "beginner" },
    { label: "Novice", value: "novice" },
    { label: "Intermediate", value: "intermediate" },
    { label: "Advanced", value: "advanced" },
];

/** Physique phase catalog. */
export const TRAINING_PHYSIQUE_PHASE_OPTIONS: TSelectOption[] = [
    { label: "Bulk", value: "bulk" },
    { label: "Cut", value: "cut" },
    { label: "Maintain", value: "maintain" },
    { label: "Recomp", value: "recomp" },
];

/** Training focus — CONTEXT closed list (storage slugs). */
export const TRAINING_FOCUS_OPTIONS: TSelectOption[] = [
    { label: "Bodybuilding", value: "bodybuilding" },
    { label: "Powerbuilding", value: "powerbuilding" },
    { label: "Powerlifting", value: "powerlifting" },
    { label: "Hyrox", value: "hyrox" },
    { label: "CrossFit", value: "crossfit" },
    { label: "Olympic weightlifting", value: "olympic_weightlifting" },
    { label: "Calisthenics / bodyweight", value: "calisthenics_bodyweight" },
    { label: "Athletics / sport", value: "athletics_sport" },
    { label: "Fat loss", value: "fat_loss" },
    { label: "General fitness", value: "general_fitness" },
    { label: "Rehab / pain-aware", value: "rehab_pain_aware" },
];

/**
 * Activity level — CONTEXT short forms (not questionnaire "light activity" values).
 */
export const TRAINING_ACTIVITY_LEVEL_OPTIONS: TSelectOption[] = [
    { label: "Sedentary", value: "sedentary" },
    { label: "Light", value: "light" },
    { label: "Moderate", value: "moderate" },
    { label: "High", value: "high" },
    { label: "Extreme", value: "extreme" },
];

/** Session duration cap — 10–180 minutes in 10-minute steps. */
export const TRAINING_SESSION_DURATION_OPTIONS: TSelectOption[] = workoutDurationOptions;

/** Feet options for Imperial height (3–8 ft). */
export const TRAINING_HEIGHT_FEET_OPTIONS: TSelectOption[] = Array.from(
    { length: 6 },
    (_, i) => {
        const feet = (i + 3).toString();
        return { label: `${feet} ft`, value: feet };
    },
);

/** Inches options for Imperial height (0–11 in). */
export const TRAINING_HEIGHT_INCHES_OPTIONS: TSelectOption[] = Array.from(
    { length: 12 },
    (_, i) => {
        const inches = i.toString();
        return { label: `${inches} in`, value: inches };
    },
);

/** Centimeter options for Metric height (120–230 cm). */
export const TRAINING_HEIGHT_CM_OPTIONS: TSelectOption[] = Array.from(
    { length: 111 },
    (_, i) => {
        const cm = (i + 120).toString();
        return { label: `${cm} cm`, value: cm };
    },
);

/** Maps Select value → stored catalog value (prefer-not-to-say / unset → ""). */
export function selectValueToCatalog(value: string): string {
    return value === TRAINING_PROFILE_UNSET_VALUE ? "" : value;
}

/** Maps stored catalog value → Select value (empty → unset sentinel). */
export function catalogToSelectValue(value: string): string {
    return value === "" ? TRAINING_PROFILE_UNSET_VALUE : value;
}
