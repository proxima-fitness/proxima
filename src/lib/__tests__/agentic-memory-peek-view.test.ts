/**
 * @module lib/__tests__/agentic-memory-peek-view
 *
 * Unit tests for Agentic memory peek summary helpers.
 */

import { describe, expect, it } from "vitest";

import type { TBodyMeasurementRow } from "@/api/body-measurements-read";
import { emptyUserTrainingProfile } from "@/api/user-training-profile";
import { CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH } from "@/lib/constraint-profile-view";
import {
    defaultOpenPeekSection,
    formatHeightCmForPeek,
    isAgenticMemoryPeekEmpty,
    isTrainingProfileEmptyForPeek,
    toLatestBodyMeasurementOneLiner,
    toTrainingProfileSummary,
} from "../agentic-memory-peek-view";

function training(
    overrides: Partial<TTrainingProfile> = {},
): TTrainingProfile {
    return { ...emptyUserTrainingProfile(), ...overrides };
}

function measurement(
    overrides: Partial<TBodyMeasurementRow> = {},
): TBodyMeasurementRow {
    return {
        id: "bm-1",
        user_id: "user-1",
        source: "hevy",
        external_id: "2024-08-14",
        measured_on: "2024-08-14",
        weight_kg: 80.5,
        lean_mass_kg: null,
        fat_percent: null,
        neck_cm: null,
        shoulder_cm: null,
        chest_cm: null,
        left_bicep_cm: null,
        right_bicep_cm: null,
        left_forearm_cm: null,
        right_forearm_cm: null,
        abdomen: null,
        waist: null,
        hips: null,
        left_thigh: null,
        right_thigh: null,
        left_calf: null,
        right_calf: null,
        created_at: "2024-08-14T00:00:00Z",
        updated_at: "2024-08-14T00:00:00Z",
        ...overrides,
    };
}

describe("isTrainingProfileEmptyForPeek", () => {
    it("treats null/empty as empty", () => {
        expect(isTrainingProfileEmptyForPeek(null)).toBe(true);
        expect(isTrainingProfileEmptyForPeek(training())).toBe(true);
    });

    it("is non-empty when any field set", () => {
        expect(isTrainingProfileEmptyForPeek(training({ age: 28 }))).toBe(false);
        expect(isTrainingProfileEmptyForPeek(training({ sex: "male" }))).toBe(false);
        expect(isTrainingProfileEmptyForPeek(training({ heightCm: 180 }))).toBe(false);
    });
});

describe("toTrainingProfileSummary", () => {
    it("returns empty rows for missing profile", () => {
        expect(toTrainingProfileSummary(null, true)).toEqual({ rows: [] });
        expect(toTrainingProfileSummary(training(), false)).toEqual({ rows: [] });
    });

    it("includes only non-empty fields with catalog labels", () => {
        const summary = toTrainingProfileSummary(
            training({
                age: 28,
                sex: "male",
                heightCm: 180,
                experienceLevel: "intermediate",
                physiquePhase: "bulk",
                trainingFocus: "bodybuilding",
                activityLevel: "moderate",
                sessionDurationMin: 60,
            }),
            false,
        );

        expect(summary.rows).toEqual([
            { label: "Age", value: "28" },
            { label: "Sex", value: "Male" },
            { label: "Height", value: "180 cm" },
            { label: "Experience", value: "Intermediate" },
            { label: "Physique phase", value: "Bulk" },
            { label: "Training focus", value: "Bodybuilding" },
            { label: "Activity level", value: "Moderate" },
            { label: "Session cap", value: "60 min" },
        ]);
    });

    it("formats height imperial and truncates long values", () => {
        const longFocus = "x".repeat(CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH + 10);
        const summary = toTrainingProfileSummary(
            training({ heightCm: 180, trainingFocus: longFocus as TTrainingFocus }),
            true,
        );

        expect(summary.rows.find((r) => r.label === "Height")?.value).toMatch(/'/);
        const focus = summary.rows.find((r) => r.label === "Training focus")?.value;
        expect(focus).toHaveLength(CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH);
        expect(focus?.endsWith("…")).toBe(true);
    });
});

describe("formatHeightCmForPeek", () => {
    it("formats metric and imperial", () => {
        expect(formatHeightCmForPeek(180, false)).toBe("180 cm");
        expect(formatHeightCmForPeek(180, true)).toMatch(/^\d+'\d+"$/);
    });
});

describe("toLatestBodyMeasurementOneLiner", () => {
    it("returns null when missing", () => {
        expect(toLatestBodyMeasurementOneLiner(null, true)).toBeNull();
    });

    it("returns date · weight one-liner", () => {
        const line = toLatestBodyMeasurementOneLiner(measurement(), true);
        expect(line).toMatch(/Aug/);
        expect(line).toMatch(/lbs|kg/);
    });
});

describe("defaultOpenPeekSection", () => {
    it("opens first section with content, else constraint", () => {
        expect(
            defaultOpenPeekSection({
                constraintHasContent: true,
                trainingHasContent: true,
                bodyHasContent: true,
            }),
        ).toBe("constraint");

        expect(
            defaultOpenPeekSection({
                constraintHasContent: false,
                trainingHasContent: true,
                bodyHasContent: true,
            }),
        ).toBe("training");

        expect(
            defaultOpenPeekSection({
                constraintHasContent: false,
                trainingHasContent: false,
                bodyHasContent: true,
            }),
        ).toBe("body");

        expect(
            defaultOpenPeekSection({
                constraintHasContent: false,
                trainingHasContent: false,
                bodyHasContent: false,
            }),
        ).toBe("constraint");
    });
});

describe("isAgenticMemoryPeekEmpty", () => {
    it("is empty only when all three surfaces empty", () => {
        expect(
            isAgenticMemoryPeekEmpty({
                constraintEmpty: true,
                trainingEmpty: true,
                bodyOneLiner: null,
            }),
        ).toBe(true);

        expect(
            isAgenticMemoryPeekEmpty({
                constraintEmpty: true,
                trainingEmpty: false,
                bodyOneLiner: null,
            }),
        ).toBe(false);
    });
});
