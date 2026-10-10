// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Hevy muscle_group slug → display label (matches POST API / create-exercise form).
 * Single source for primary muscle display in lists and custom exercise UI.
 */

const ENTRIES: [THevyPostExerciseTemplate["muscle_group"], string][] = [
    ["abdominals", "Abdominals"],
    ["shoulders", "Shoulders"],
    ["biceps", "Biceps"],
    ["triceps", "Triceps"],
    ["forearms", "Forearms"],
    ["quadriceps", "Quadriceps"],
    ["hamstrings", "Hamstrings"],
    ["calves", "Calves"],
    ["glutes", "Glutes"],
    ["abductors", "Abductors"],
    ["adductors", "Adductors"],
    ["lats", "Lats"],
    ["upper_back", "Upper back"],
    ["traps", "Traps"],
    ["lower_back", "Lower back"],
    ["chest", "Chest"],
    ["cardio", "Cardio"],
    ["neck", "Neck"],
    ["full_body", "Full body"],
    ["other", "Other"],
];

/** Ordered muscle keys (create-exercise form order). */
export const HEVY_MUSCLE_GROUP_ORDER: readonly THevyPostExerciseTemplate["muscle_group"][] = ENTRIES.map(
    ([k]) => k,
);

/** Slug → human-readable label. */
export const HEVY_MUSCLE_GROUP_LABELS: Record<THevyPostExerciseTemplate["muscle_group"], string> =
    Object.fromEntries(ENTRIES) as Record<THevyPostExerciseTemplate["muscle_group"], string>;

/** Options for Select / MultiSelect in custom exercise form. */
export function getHevyMuscleGroupSelectOptions(): {
    value: THevyPostExerciseTemplate["muscle_group"];
    label: string;
}[] {
    return HEVY_MUSCLE_GROUP_ORDER.map((value) => ({
        value,
        label: HEVY_MUSCLE_GROUP_LABELS[value],
    }));
}

function titleCaseSlugFallback(raw: string): string {
    return raw
        .replace(/_/g, " ")
        .split(/\s+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
}

/**
 * Maps API/DB `primary_muscle_group` slug to Hevy-style label (e.g. triceps → Triceps).
 * Unknown slugs get a readable title-case fallback.
 */
export function formatHevyPrimaryMuscleGroupLabel(raw: string | null | undefined): string {
    const trimmed = raw?.trim();
    if (!trimmed) {
        return "";
    }
    const key = trimmed.toLowerCase().replace(/\s+/g, "_");
    if (key in HEVY_MUSCLE_GROUP_LABELS) {
        return HEVY_MUSCLE_GROUP_LABELS[key as THevyPostExerciseTemplate["muscle_group"]];
    }
    return titleCaseSlugFallback(key);
}
