// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import {
    sanitizeExcludedEquipment,
    validateAgainstConstraints,
    type TConstraintGateProfile,
} from "./index";

function profile(overrides: Partial<TConstraintGateProfile> = {}): TConstraintGateProfile {
    return {
        injuries: [],
        excludedEquipment: [],
        excludedAreas: [],
        ...overrides,
    };
}

describe("sanitizeExcludedEquipment", () => {
    it('drops Hevy "none" sentinel', () => {
        expect(sanitizeExcludedEquipment(["band", "none", "plate"])).toEqual([
            "band",
            "plate",
        ]);
    });
});

describe("validateAgainstConstraints", () => {
    it("passes when no constraints are set", () => {
        const result = validateAgainstConstraints(profile(), [
            { title: "Bench Press", equipment: "Barbell", primary_muscle_group: "Chest" },
        ]);
        expect(result.valid).toBe(true);
    });

    it("flags excluded equipment", () => {
        const result = validateAgainstConstraints(profile({ excludedEquipment: ["Band"] }), [
            {
                title: "Band Pull-Apart",
                equipment: "Band",
                primary_muscle_group: "Shoulders",
            },
        ]);
        expect(result.valid).toBe(false);
        if (!result.valid) {
            expect(result.violations[0].exerciseTitle).toBe("Band Pull-Apart");
            expect(result.violations[0].reason).toContain("excluded equipment");
        }
    });

    it("does not flag bodyweight when only none is excluded", () => {
        const result = validateAgainstConstraints(profile({ excludedEquipment: ["none"] }), [
            { title: "Push Up", equipment: "none", primary_muscle_group: "Chest" },
        ]);
        expect(result.valid).toBe(true);
    });

    it("flags injured area case-insensitively", () => {
        const result = validateAgainstConstraints(profile({ injuries: ["shoulder"] }), [
            {
                title: "Lateral Raise",
                equipment: "Dumbbell",
                primary_muscle_group: "Shoulders",
            },
        ]);
        expect(result.valid).toBe(false);
        if (!result.valid) expect(result.violations[0].reason).toContain("injured area");
    });
});
