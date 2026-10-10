// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module hevy-create-custom-exercise-options
 *
 * Exercise-type and equipment slugs for the in-app Hevy create form and the
 * Public API **Custom exercise** body. Labels stay here with the slugs so the
 * form and the API cannot drift.
 *
 * Depends on: nothing
 * Used by: HevyCreateCustomExerciseView, Public API exercise OpenAPI schemas
 */

const EXERCISE_TYPE_ENTRIES: [THevyPostExerciseTemplate["exercise_type"], string][] = [
    ["weight_reps", "Weight + Reps"],
    ["reps_only", "Reps only"],
    ["bodyweight_reps", "Bodyweight reps"],
    ["bodyweight_assisted_reps", "Bodyweight assisted reps"],
    ["duration", "Duration"],
    ["weight_duration", "Weight + duration"],
    ["distance_duration", "Distance + duration"],
    ["short_distance_weight", "Short distance + weight"],
];

const EQUIPMENT_ENTRIES: [THevyPostExerciseTemplate["equipment_category"], string][] = [
    ["none", "None"],
    ["barbell", "Barbell"],
    ["dumbbell", "Dumbbell"],
    ["kettlebell", "Kettlebell"],
    ["machine", "Machine"],
    ["plate", "Plate"],
    ["resistance_band", "Resistance band"],
    ["suspension", "Suspension"],
    ["other", "Other"],
];

/** Ordered exercise-type slugs (create-exercise form order). */
export const HEVY_EXERCISE_TYPE_ORDER: readonly THevyPostExerciseTemplate["exercise_type"][] =
    EXERCISE_TYPE_ENTRIES.map(([value]) => value);

/** Ordered equipment slugs (create-exercise form order). */
export const HEVY_EQUIPMENT_ORDER: readonly THevyPostExerciseTemplate["equipment_category"][] =
    EQUIPMENT_ENTRIES.map(([value]) => value);

/** Options for the Hevy create-exercise type Select. */
export function getHevyExerciseTypeSelectOptions(): {
    value: THevyPostExerciseTemplate["exercise_type"];
    label: string;
}[] {
    return EXERCISE_TYPE_ENTRIES.map(([value, label]) => ({ value, label }));
}

/** Options for the Hevy create-exercise equipment Select. */
export function getHevyEquipmentSelectOptions(): {
    value: THevyPostExerciseTemplate["equipment_category"];
    label: string;
}[] {
    return EQUIPMENT_ENTRIES.map(([value, label]) => ({ value, label }));
}
