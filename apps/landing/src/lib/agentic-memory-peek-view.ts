// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module lib/agentic-memory-peek-view
 *
 * Pure helpers for Agentic memory peek: Training profile rows, body one-liner,
 * and default accordion section. Constraint summaries stay in constraint-profile-view.
 *
 * Depends on: TTrainingProfile, TBodyMeasurementRow, training-profile-options catalogs,
 * body-measurements-display, constraint-profile-view truncate length
 * Used by: AgenticMemoryPeek
 */

import type { TBodyMeasurementRow } from "@/api/body-measurements-read";
import { heightCmToImperial } from "@/components/account/training-profile-draft";
import {
    TRAINING_ACTIVITY_LEVEL_OPTIONS,
    TRAINING_EXPERIENCE_OPTIONS,
    TRAINING_FOCUS_OPTIONS,
    TRAINING_PHYSIQUE_PHASE_OPTIONS,
    TRAINING_SEX_OPTIONS,
} from "@/components/account/training-profile-options";
import {
    formatHistoryPreview,
} from "@/components/account/body-measurements-display";
import { CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH } from "@/lib/constraint-profile-view";

/** Accordion section ids for Agentic memory peek. */
export type TAgenticMemoryPeekSectionId = "constraint" | "training" | "body";

export type TTrainingProfileSummaryRow = {
    label: string;
    value: string;
};

export type TTrainingProfileSummary = {
    rows: TTrainingProfileSummaryRow[];
};

function truncateValue(value: string): string {
    if (value.length <= CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH) return value;
    return `${value.slice(0, CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH - 1)}…`;
}

function catalogLabel(options: TSelectOption[], value: string): string {
    return options.find((option) => option.value === value)?.label ?? value;
}

/** True when no Training profile / all fields empty. */
export function isTrainingProfileEmptyForPeek(
    profile: TTrainingProfile | null | undefined,
): boolean {
    if (!profile) return true;
    return (
        profile.age == null &&
        profile.sex === "" &&
        profile.heightCm == null &&
        profile.experienceLevel === "" &&
        profile.physiquePhase === "" &&
        profile.trainingFocus === "" &&
        profile.activityLevel === "" &&
        profile.sessionDurationMin == null
    );
}

/**
 * Condensed Training profile rows for peek: non-empty fields only; truncates;
 * catalog values → display labels; height follows unit preference.
 */
export function toTrainingProfileSummary(
    profile: TTrainingProfile | null | undefined,
    isImperial: boolean,
): TTrainingProfileSummary {
    if (!profile || isTrainingProfileEmptyForPeek(profile)) {
        return { rows: [] };
    }

    const rows: TTrainingProfileSummaryRow[] = [];

    if (profile.age != null) {
        rows.push({ label: "Age", value: truncateValue(String(profile.age)) });
    }
    if (profile.sex !== "") {
        rows.push({
            label: "Sex",
            value: truncateValue(catalogLabel(TRAINING_SEX_OPTIONS, profile.sex)),
        });
    }
    if (profile.heightCm != null) {
        rows.push({
            label: "Height",
            value: truncateValue(formatHeightCmForPeek(profile.heightCm, isImperial)),
        });
    }
    if (profile.experienceLevel !== "") {
        rows.push({
            label: "Experience",
            value: truncateValue(
                catalogLabel(TRAINING_EXPERIENCE_OPTIONS, profile.experienceLevel),
            ),
        });
    }
    if (profile.physiquePhase !== "") {
        rows.push({
            label: "Physique phase",
            value: truncateValue(
                catalogLabel(TRAINING_PHYSIQUE_PHASE_OPTIONS, profile.physiquePhase),
            ),
        });
    }
    if (profile.trainingFocus !== "") {
        rows.push({
            label: "Training focus",
            value: truncateValue(
                catalogLabel(TRAINING_FOCUS_OPTIONS, profile.trainingFocus),
            ),
        });
    }
    if (profile.activityLevel !== "") {
        rows.push({
            label: "Activity level",
            value: truncateValue(
                catalogLabel(TRAINING_ACTIVITY_LEVEL_OPTIONS, profile.activityLevel),
            ),
        });
    }
    if (profile.sessionDurationMin != null) {
        rows.push({
            label: "Session cap",
            value: truncateValue(`${profile.sessionDurationMin} min`),
        });
    }

    return { rows };
}

/** Formats stored height_cm for peek (ft+in or cm). */
export function formatHeightCmForPeek(heightCm: number, isImperial: boolean): string {
    if (!isImperial) {
        return `${Math.round(heightCm)} cm`;
    }
    const { feet, inches } = heightCmToImperial(heightCm);
    if (feet == null || inches == null) {
        return `${Math.round(heightCm)} cm`;
    }
    return `${feet}'${inches}"`;
}

/**
 * Latest body measurement one-liner for peek (date · weight when present).
 * Returns null when no measurement.
 */
export function toLatestBodyMeasurementOneLiner(
    measurement: TBodyMeasurementRow | null | undefined,
    isInLbs: boolean,
): string | null {
    if (!measurement) return null;
    return truncateValue(formatHistoryPreview(measurement, isInLbs));
}

/**
 * Default open accordion section: first with content, else Constraint.
 * Body counts only when a one-liner is present.
 */
export function defaultOpenPeekSection(input: {
    constraintHasContent: boolean;
    trainingHasContent: boolean;
    bodyHasContent: boolean;
}): TAgenticMemoryPeekSectionId {
    if (input.constraintHasContent) return "constraint";
    if (input.trainingHasContent) return "training";
    if (input.bodyHasContent) return "body";
    return "constraint";
}

/** True when Constraint, Training, and body one-liner are all empty. */
export function isAgenticMemoryPeekEmpty(input: {
    constraintEmpty: boolean;
    trainingEmpty: boolean;
    bodyOneLiner: string | null;
}): boolean {
    return input.constraintEmpty && input.trainingEmpty && input.bodyOneLiner == null;
}
