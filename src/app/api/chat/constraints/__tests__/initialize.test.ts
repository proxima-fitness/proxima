import { describe, expect, it } from "vitest";

import {
    initializeConstraintProfile,
    splitConstraintCsv,
} from "../initialize";

describe("splitConstraintCsv", () => {
    it("splits comma-delimited wire strings and trims", () => {
        expect(splitConstraintCsv("legs, Arms,  back")).toEqual([
            "legs",
            "Arms",
            "back",
        ]);
    });

    it("returns empty array for missing or blank", () => {
        expect(splitConstraintCsv(undefined)).toEqual([]);
        expect(splitConstraintCsv("")).toEqual([]);
        expect(splitConstraintCsv("  ,  ")).toEqual([]);
    });
});

describe("initializeConstraintProfile", () => {
    it("maps excludeAreas wire into excludedAreas", () => {
        const profile = initializeConstraintProfile({
            excludeAreas: "legs,shoulders",
            excludeEquipment: "band",
            healthIssues: "knee",
        });

        expect(profile.excludedAreas).toEqual(["legs", "shoulders"]);
        expect(profile.excludedEquipment).toEqual(["band"]);
        expect(profile.injuries).toEqual(["knee"]);
    });

    it("leaves excludedAreas empty when excludeAreas omitted", () => {
        const profile = initializeConstraintProfile({
            splitType: "ppl",
        });

        expect(profile.excludedAreas).toEqual([]);
        expect(profile.preferences.splitType).toBe("ppl");
    });

    it('drops Hevy "none" sentinel from excludedEquipment', () => {
        const profile = initializeConstraintProfile({
            excludeEquipment: "band, none, plate",
        });

        expect(profile.excludedEquipment).toEqual(["band", "plate"]);
    });
});
