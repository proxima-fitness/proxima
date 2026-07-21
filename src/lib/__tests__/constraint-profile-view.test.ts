import { describe, expect, it } from "vitest";

import type { TConstraintProfile } from "@/app/api/chat/constraints";
import {
    CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH,
    isConstraintProfileEmpty,
    toConstraintProfileSummary,
} from "../constraint-profile-view";

function profile(
    overrides: Omit<Partial<TConstraintProfile>, "preferences"> & {
        preferences?: Partial<TConstraintProfile["preferences"]>;
    } = {},
): TConstraintProfile {
    return {
        injuries: overrides.injuries ?? [],
        excludedEquipment: overrides.excludedEquipment ?? [],
        excludedAreas: overrides.excludedAreas ?? [],
        preferences: {
            splitType: "",
            exerciseVariability: "",
            progressionSystem: "",
            deloadWeek: "",
            peakWeek: "",
            warmupExercises: "",
            ...overrides.preferences,
        },
        chatRefinements: overrides.chatRefinements ?? [],
    };
}

describe("isConstraintProfileEmpty", () => {
    it("treats null/undefined as empty", () => {
        expect(isConstraintProfileEmpty(null)).toBe(true);
        expect(isConstraintProfileEmpty(undefined)).toBe(true);
    });

    it("treats all-empty structured fields as empty", () => {
        expect(isConstraintProfileEmpty(profile())).toBe(true);
    });

    it("is non-empty when any structured list or preference has content", () => {
        expect(isConstraintProfileEmpty(profile({ injuries: ["knee"] }))).toBe(false);
        expect(isConstraintProfileEmpty(profile({ excludedEquipment: ["Band"] }))).toBe(false);
        expect(isConstraintProfileEmpty(profile({ excludedAreas: ["Legs"] }))).toBe(false);
        expect(isConstraintProfileEmpty(profile({ chatRefinements: ["no floor"] }))).toBe(false);
        expect(isConstraintProfileEmpty(profile({ preferences: { splitType: "PPL" } }))).toBe(false);
    });
});

describe("toConstraintProfileSummary", () => {
    it("returns {} for empty / missing profiles", () => {
        expect(toConstraintProfileSummary(null)).toEqual({});
        expect(toConstraintProfileSummary(profile())).toEqual({});
    });

    it("includes only non-empty structured sections", () => {
        const summary = toConstraintProfileSummary(
            profile({
                injuries: ["knee"],
                excludedEquipment: ["Band"],
                preferences: {
                    splitType: "PPL",
                    exerciseVariability: "",
                    progressionSystem: "",
                    deloadWeek: "",
                    peakWeek: "",
                    warmupExercises: "",
                },
            }),
        );

        expect(summary).toEqual({
            injuries: ["knee"],
            excludedEquipment: ["Band"],
            preferences: { splitType: "PPL" },
        });
        expect(summary).not.toHaveProperty("excludedAreas");
        expect(summary).not.toHaveProperty("chatRefinements");
        expect(summary).not.toHaveProperty("rawStatements");
    });

    it("truncates long values", () => {
        const long = "x".repeat(CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH + 20);
        const summary = toConstraintProfileSummary(
            profile({
                injuries: [long],
                preferences: {
                    splitType: long,
                    exerciseVariability: "",
                    progressionSystem: "",
                    deloadWeek: "",
                    peakWeek: "",
                    warmupExercises: "",
                },
            }),
        );

        expect(summary.injuries?.[0]).toHaveLength(CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH);
        expect(summary.injuries?.[0]?.endsWith("…")).toBe(true);
        expect(summary.preferences?.splitType).toHaveLength(CONSTRAINT_PROFILE_SUMMARY_MAX_LENGTH);
        expect(summary.preferences?.splitType?.endsWith("…")).toBe(true);
    });
});
