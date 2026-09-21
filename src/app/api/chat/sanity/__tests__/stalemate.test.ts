import { describe, expect, it } from "vitest";

import {
    applySameWeekSkipFromUserMessage,
    buildStalematePayload,
    isStalemateOutput,
    matchedConstraintChips,
    readStalematePayload,
    removeConstraintString,
    SAME_WEEK_SKIP_MESSAGE,
    shouldEscalate,
    stalemateKeyForError,
    STALEMATE_ERROR,
} from "../stalemate";
import type { IProgramSanityStash } from "../types";
import type { TConstraintProfile } from "../../constraints/types";

function emptyStash(): IProgramSanityStash {
    return { plan: null, buildWeekRoutines: null };
}

function profile(overrides: Partial<TConstraintProfile> = {}): TConstraintProfile {
    return {
        injuries: [],
        excludedEquipment: [],
        excludedAreas: [],
        preferences: {
            splitType: "",
            exerciseVariability: "",
            progressionSystem: "",
            deloadWeek: "",
            peakWeek: "",
            warmupExercises: "",
        },
        ...overrides,
    };
}

describe("stalemateKeyForError", () => {
    it("counts code gates and Jev honor ids", () => {
        expect(stalemateKeyForError("constraint_violation")).toBe("constraint_violation");
        expect(stalemateKeyForError("weekCoverage")).toBe("weekCoverage");
        expect(stalemateKeyForError("constraint.injurySemantic")).toBe("constraint.injurySemantic");
        expect(stalemateKeyForError("skill.sessionShape")).toBe("skill.sessionShape");
        expect(stalemateKeyForError("training.sessionDurationFit")).toBe(
            "training.sessionDurationFit",
        );
        expect(stalemateKeyForError("constraint.peakHonor")).toBe("constraint.peakHonor");
    });

    it("does not count schema, empty-day, bad id, readProgram_required, or structural stamp Soft-fails", () => {
        expect(stalemateKeyForError("Invalid exercises")).toBeNull();
        expect(stalemateKeyForError("Invalid routines")).toBeNull();
        expect(stalemateKeyForError("Invalid exercise_template_id")).toBeNull();
        expect(stalemateKeyForError("Program mutation batch failed")).toBeNull();
        expect(stalemateKeyForError("readProgram_required")).toBeNull();
        expect(stalemateKeyForError("periodizationStamp.missingWave")).toBeNull();
        expect(stalemateKeyForError("periodizationStamp.missingRoles")).toBeNull();
        expect(stalemateKeyForError("periodizationStamp.emptyMains")).toBeNull();
    });
});

describe("shouldEscalate", () => {
    it("escalates on the second of the same key this request", () => {
        const stash = emptyStash();
        expect(shouldEscalate(stash, "constraint.injurySemantic")).toBe(false);
        expect(stash.softFailCounts?.["constraint.injurySemantic"]).toBe(1);
        expect(shouldEscalate(stash, "constraint.injurySemantic")).toBe(true);
        expect(stash.stalemateStopped).toBe(true);
    });

    it("does not increment a different key onto the first", () => {
        const stash = emptyStash();
        expect(shouldEscalate(stash, "constraint.injurySemantic")).toBe(false);
        expect(shouldEscalate(stash, "weekCoverage")).toBe(false);
        expect(stash.stalemateStopped).toBeUndefined();
        expect(stash.softFailCounts).toEqual({
            "constraint.injurySemantic": 1,
            weekCoverage: 1,
        });
    });

    it("does not count a null key or a missing stash", () => {
        expect(shouldEscalate(undefined, "weekCoverage")).toBe(false);
        expect(shouldEscalate(emptyStash(), null)).toBe(false);
    });
});

describe("applySameWeekSkipFromUserMessage", () => {
    it("sets skip only for the exact card phrase", () => {
        const stash = emptyStash();
        applySameWeekSkipFromUserMessage(stash, SAME_WEEK_SKIP_MESSAGE);
        expect(stash.skipSameWeekCoverage).toBe(true);

        const other = emptyStash();
        applySameWeekSkipFromUserMessage(other, "same week is fine I guess");
        expect(other.skipSameWeekCoverage).toBeUndefined();
    });
});

describe("removeConstraintString", () => {
    it("removes only the case-insensitive equal string", () => {
        expect(removeConstraintString(["Left knee", "bad back", "Left Knee"], "left knee")).toEqual(
            ["bad back"],
        );
        expect(removeConstraintString(["Barbell", "Dumbbell"], "kettlebell")).toEqual([
            "Barbell",
            "Dumbbell",
        ]);
    });
});

describe("matchedConstraintChips", () => {
    it("names the saved terms matchesAny already hit", () => {
        const chips = matchedConstraintChips(
            profile({
                injuries: ["shoulder", "left ankle"],
                excludedEquipment: ["Barbell"],
                excludedAreas: ["Legs"],
            }),
            [
                { title: "OHP", equipment: "Barbell", primary_muscle_group: "Shoulders" },
            ],
        );
        expect(chips).toEqual([
            { field: "excludedEquipment", value: "Barbell" },
            { field: "injuries", value: "shoulder" },
        ]);
    });
});

describe("buildStalematePayload", () => {
    it("puts every injury chip on a Jev injury miss", () => {
        const payload = buildStalematePayload(
            "constraint.injurySemantic",
            profile({ injuries: ["can't kneel", "left ankle"] }),
        );
        expect(payload.kind).toBe("constraint");
        expect(payload.chips).toEqual([
            { field: "injuries", value: "can't kneel" },
            { field: "injuries", value: "left ankle" },
        ]);
        expect(payload.actions).toBeUndefined();
    });

    it("uses training kind for skill and training honor ids", () => {
        expect(buildStalematePayload("skill.sessionShape", null).kind).toBe("training");
        expect(buildStalematePayload("weekCoverage", null).kind).toBe("weekCoverage");
    });

    it("gives peakHonor a preference clear and Fix it", () => {
        const payload = buildStalematePayload(
            "constraint.peakHonor",
            profile({ preferences: {
                splitType: "",
                exerciseVariability: "",
                progressionSystem: "",
                deloadWeek: "",
                peakWeek: "yes",
                warmupExercises: "",
            } }),
        );
        expect(payload.kind).toBe("constraint");
        expect(payload.chips).toEqual([]);
        expect(payload.actions).toEqual([
            {
                label: "I don't need a peak week",
                message: "I no longer want a peak week",
                preference: { key: "peakWeek", value: "" },
            },
            { label: "Fix it.", message: "Fix it." },
        ]);
    });

    it("still offers Fix it when a constraint miss has empty chips", () => {
        const payload = buildStalematePayload("constraint.unknownHonor", null);
        expect(payload.chips).toEqual([]);
        expect(payload.actions).toEqual([{ label: "Fix it.", message: "Fix it." }]);
    });
});

describe("readStalematePayload", () => {
    it("reads a valid card payload and rejects junk", () => {
        const payload = buildStalematePayload("weekCoverage", null);
        expect(readStalematePayload({ error: "weekCoverage", stalemate: payload })).toEqual(payload);
        expect(readStalematePayload({ error: "weekCoverage" })).toBeNull();
        expect(isStalemateOutput({ error: STALEMATE_ERROR })).toBe(true);
        expect(isStalemateOutput({ error: "weekCoverage", stalemate: payload })).toBe(true);
        expect(isStalemateOutput({ error: "weekCoverage" })).toBe(false);
    });
});
