/**
 * @module account/constraint-profile-options
 *
 * Questionnaire / form-options catalogs for the Constraint profile editor.
 * Excluded equipment + areas + preferences use fixed option sets (not freeform).
 *
 * Depends on: assets/constants/form-options
 * Used by: ConstraintProfileSection, constraint-profile-draft
 */
import {
    equipmentOptions,
    focusAreasOptions,
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

/** Excluded equipment picker — questionnaire exclude-equipment set (drops "none"). */
export const CONSTRAINT_EXCLUDED_EQUIPMENT_OPTIONS: TSelectOption[] = equipmentOptions.filter(
    (opt) => opt.value !== "none",
);

/** Excluded areas picker — focus-area catalog (drops "full body"). */
export const CONSTRAINT_EXCLUDED_AREA_OPTIONS: TSelectOption[] = focusAreasOptions.filter(
    (opt) => opt.value !== "full body",
);

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
