/**
 * @module account/constraint-profile-options
 *
 * Questionnaire / form-options catalogs for the Constraint profile editor.
 * Excluded equipment + areas + preferences use fixed option sets (not freeform).
 *
 * Depends on: assets/constants/form-options
 * Used by: ConstraintProfileSection, constraint-profile-draft, ConstraintProfilePeek, chat tools
 */
import {
    equipmentOptions,
    excludedAreasOptions,
    sampleQuestions,
} from "@/assets/constants/form-options";

import type { TConstraintProfile } from "@/app/api/chat/constraints";

function optionsFromQuestion(questionId: string): TSelectOption[] {
    const question = sampleQuestions.find((q) => q.id === questionId);
    if (!question) return [];
    return question.options.map((opt) => ({
        label: opt.label,
        value: opt.id,
    }));
}

/** Excluded equipment picker - same catalog as Questionnaire (Bodyweight = Hevy `none`). */
export const CONSTRAINT_EXCLUDED_EQUIPMENT_OPTIONS: TSelectOption[] = equipmentOptions;

/** Excluded areas picker - same catalog as Questionnaire (drops "full body"). */
export const CONSTRAINT_EXCLUDED_AREA_OPTIONS: TSelectOption[] = excludedAreasOptions;

/** Preference field → questionnaire single-select options. */
export const CONSTRAINT_PREFERENCE_OPTIONS = {
    splitType: optionsFromQuestion("split-type"),
    exerciseVariability: optionsFromQuestion("exercise-variability"),
    progressionSystem: optionsFromQuestion("progression-system"),
    deloadWeek: optionsFromQuestion("deload-week"),
    peakWeek: optionsFromQuestion("peak-week"),
    warmupExercises: optionsFromQuestion("warmup-exercises"),
} as const satisfies Record<keyof TConstraintProfile["preferences"], TSelectOption[]>;

export type TConstraintPreferenceKey = keyof typeof CONSTRAINT_PREFERENCE_OPTIONS;

/** Stable preference field order for the editor. */
export const CONSTRAINT_PREFERENCE_FIELDS: readonly {
    key: TConstraintPreferenceKey;
    label: string;
}[] = [
    { key: "splitType", label: "Preferred split" },
    { key: "exerciseVariability", label: "Exercise variability" },
    { key: "progressionSystem", label: "Progression system" },
    { key: "deloadWeek", label: "Deload week" },
    { key: "peakWeek", label: "Peak week" },
    { key: "warmupExercises", label: "Warmup exercises" },
];

/** Sentinel Select value meaning “unset” (maps to empty string in the draft). */
export const CONSTRAINT_PREFERENCE_UNSET_VALUE = "__unset__";

/**
 * Maps a stored string to a catalog option (value or label, case-insensitive).
 * Unknown values become orphan options so they remain editable/removable.
 */
export function resolveSelectOption(
    value: string,
    catalog: TSelectOption[],
): TSelectOption {
    const trimmed = value.trim();
    if (!trimmed) return { label: "", value: "" };

    const lower = trimmed.toLowerCase();
    const match = catalog.find(
        (opt) =>
            opt.value.toLowerCase() === lower || opt.label.toLowerCase() === lower,
    );
    if (match) return match;
    return { label: trimmed, value: trimmed };
}

/** Converts persisted string[] → MultiSelect value list. */
export function valuesToSelectOptions(
    values: string[],
    catalog: TSelectOption[],
): TSelectOption[] {
    return values.map((value) => resolveSelectOption(value, catalog));
}

/** Converts MultiSelect value list → persisted string[] (canonical option values). */
export function selectOptionsToValues(options: TSelectOption[]): string[] {
    return options.map((opt) => opt.value).filter((value) => value.trim() !== "");
}

/** Non-empty tuple of catalog option ids for Zod `z.enum`. */
export function constraintPreferenceEnumValues(
    key: TConstraintPreferenceKey,
): [string, ...string[]] {
    const values = CONSTRAINT_PREFERENCE_OPTIONS[key].map((opt) => opt.value);
    if (values.length === 0) {
        throw new Error(`No preference options for ${key}`);
    }
    return values as [string, ...string[]];
}

const PREFERENCE_ACRONYM_IDS = new Set(["ppl", "pplul", "ul", "fb"]);

/** Short human label from a canonical option id (not full questionnaire copy). */
export function shortLabelFromPreferenceOptionId(id: string): string {
    if (PREFERENCE_ACRONYM_IDS.has(id)) return id.toUpperCase();
    if (id === "rpe-based") return "RPE-based";
    const [first, ...rest] = id.split("-");
    if (!first) return id;
    const titled = first.charAt(0).toUpperCase() + first.slice(1);
    return rest.length === 0 ? titled : [titled, ...rest].join("-");
}

function isCatalogValue(key: TConstraintPreferenceKey, value: string): boolean {
    return CONSTRAINT_PREFERENCE_OPTIONS[key].some((opt) => opt.value === value);
}

/**
 * Maps a stored preference string to the catalog option id when resolvable.
 * Blank → ""; unmatched orphan → trimmed raw (read/display path; tool enum rejects writes).
 */
export function canonicalizeConstraintPreferenceValue(
    key: TConstraintPreferenceKey,
    raw: string,
): string {
    const trimmed = raw.trim();
    if (!trimmed) return "";

    const resolved = resolveSelectOption(trimmed, CONSTRAINT_PREFERENCE_OPTIONS[key]);
    return isCatalogValue(key, resolved.value) ? resolved.value : trimmed;
}

/** Canonicalize every preference field on a profile preferences object. */
export function canonicalizeConstraintPreferences(
    preferences: TConstraintProfile["preferences"],
): TConstraintProfile["preferences"] {
    return {
        splitType: canonicalizeConstraintPreferenceValue("splitType", preferences.splitType),
        exerciseVariability: canonicalizeConstraintPreferenceValue(
            "exerciseVariability",
            preferences.exerciseVariability,
        ),
        progressionSystem: canonicalizeConstraintPreferenceValue(
            "progressionSystem",
            preferences.progressionSystem,
        ),
        deloadWeek: canonicalizeConstraintPreferenceValue("deloadWeek", preferences.deloadWeek),
        peakWeek: canonicalizeConstraintPreferenceValue("peakWeek", preferences.peakWeek),
        warmupExercises: canonicalizeConstraintPreferenceValue(
            "warmupExercises",
            preferences.warmupExercises,
        ),
    };
}

/**
 * Short display label for peek / UI: catalog id → PPL / Double / No / Little;
 * orphans stay as stored text.
 */
export function formatConstraintPreferenceDisplayValue(
    key: TConstraintPreferenceKey,
    raw: string,
): string {
    const trimmed = raw.trim();
    if (!trimmed) return "";

    const canonical = canonicalizeConstraintPreferenceValue(key, trimmed);
    if (!isCatalogValue(key, canonical)) return trimmed;
    return shortLabelFromPreferenceOptionId(canonical);
}
