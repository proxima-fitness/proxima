// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Preference catalog display + canonicalize helpers.
 *
 * @vitest-environment node
 */
import { describe, it, expect } from "vitest";

import {
    canonicalizeConstraintPreferenceValue,
    canonicalizeConstraintPreferences,
    constraintPreferenceEnumValues,
    formatConstraintPreferenceDisplayValue,
} from "@/components/account/constraint-profile-options";

describe("constraint preference catalog helpers", () => {
    it("constraintPreferenceEnumValues returns non-empty splitType ids including ppl", () => {
        const values = constraintPreferenceEnumValues("splitType");
        expect(values.length).toBeGreaterThan(0);
        expect(values).toContain("ppl");
        expect(values).not.toContain("push_pull_legs");
    });

    it("canonicalize maps catalog ids and case variants to option ids", () => {
        expect(canonicalizeConstraintPreferenceValue("splitType", "ppl")).toBe("ppl");
        expect(canonicalizeConstraintPreferenceValue("splitType", "PPL")).toBe("ppl");
        expect(canonicalizeConstraintPreferenceValue("progressionSystem", "double")).toBe(
            "double",
        );
        expect(canonicalizeConstraintPreferenceValue("peakWeek", "no")).toBe("no");
        expect(canonicalizeConstraintPreferenceValue("exerciseVariability", "little")).toBe(
            "little",
        );
    });

    it("canonicalize leaves unmatched orphans unchanged", () => {
        expect(
            canonicalizeConstraintPreferenceValue("splitType", "push_pull_legs"),
        ).toBe("push_pull_legs");
    });

    it("canonicalize blank → empty string", () => {
        expect(canonicalizeConstraintPreferenceValue("splitType", "  ")).toBe("");
    });

    it("canonicalizeConstraintPreferences normalizes a full prefs object", () => {
        expect(
            canonicalizeConstraintPreferences({
                splitType: "PPL",
                exerciseVariability: "little",
                progressionSystem: "Double",
                deloadWeek: "no",
                peakWeek: "NO",
                warmupExercises: "yes",
            }),
        ).toEqual({
            splitType: "ppl",
            exerciseVariability: "little",
            progressionSystem: "double",
            deloadWeek: "no",
            peakWeek: "no",
            warmupExercises: "yes",
        });
    });

    it("formatConstraintPreferenceDisplayValue uses short human labels", () => {
        expect(formatConstraintPreferenceDisplayValue("splitType", "ppl")).toBe("PPL");
        expect(formatConstraintPreferenceDisplayValue("splitType", "PPL")).toBe("PPL");
        expect(formatConstraintPreferenceDisplayValue("progressionSystem", "double")).toBe(
            "Double",
        );
        expect(formatConstraintPreferenceDisplayValue("peakWeek", "no")).toBe("No");
        expect(formatConstraintPreferenceDisplayValue("exerciseVariability", "little")).toBe(
            "Little",
        );
        expect(formatConstraintPreferenceDisplayValue("progressionSystem", "rpe-based")).toBe(
            "RPE-based",
        );
        expect(
            formatConstraintPreferenceDisplayValue("progressionSystem", "wave-loading"),
        ).toBe("Wave-loading");
    });

    it("formatConstraintPreferenceDisplayValue keeps orphan text", () => {
        expect(
            formatConstraintPreferenceDisplayValue("splitType", "push_pull_legs"),
        ).toBe("push_pull_legs");
    });
});
