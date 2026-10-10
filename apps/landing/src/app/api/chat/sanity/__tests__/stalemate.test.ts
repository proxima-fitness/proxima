// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import {
    applySameWeekSkipFromUserMessage,
    buildStalematePayload,
    escalateKey,
    isStalemateOutput,
    matchedConstraintChips,
    pairRollupWhy,
    readStalematePayload,
    recordConstraintPairMisses,
    removeConstraintString,
    replaceLiftMessage,
    SAME_WEEK_SKIP_MESSAGE,
    shouldEscalate,
    stalemateKeyForError,
    STALEMATE_ERROR,
} from "../stalemate";
import type { IProgramSanityStash, TConstraintPairMiss } from "../types";
import type { TConstraintProfile } from "../../constraints/types";

function emptyStash(): IProgramSanityStash {
    return { plan: null, buildProgramRoutines: null };
}

const SQUAT_KNEE: TConstraintPairMiss = {
    id: "constraint.injury.squat-barbell.knee-pain",
    field: "injuries",
    constraint: "Knee pain",
    exerciseTitle: "Squat (Barbell)",
    why: "Can't keep Squat (Barbell) with your saved injury \"Knee pain\".",
};

const DEADLIFT_BARBELL: TConstraintPairMiss = {
    id: "constraint.equipment.deadlift-barbell.barbell",
    field: "excludedEquipment",
    constraint: "Barbell",
    exerciseTitle: "Deadlift (Barbell)",
    why: "Can't keep Deadlift (Barbell): it uses excluded equipment \"Barbell\".",
};

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
    it("counts code gates, phase hardness, and Jev honor ids", () => {
        expect(stalemateKeyForError("constraint_violation")).toBe("constraint_violation");
        expect(stalemateKeyForError("weekCoverage")).toBe("weekCoverage");
        expect(stalemateKeyForError(SQUAT_KNEE.id)).toBe(SQUAT_KNEE.id);
        expect(stalemateKeyForError("skill.sessionShape")).toBe("skill.sessionShape");
        expect(stalemateKeyForError("training.sessionDurationFit")).toBe(
            "training.sessionDurationFit",
        );
        expect(stalemateKeyForError("phaseHardness.peak")).toBe("phaseHardness.peak");
        expect(stalemateKeyForError("phaseHardness.deload")).toBe("phaseHardness.deload");
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
        expect(stalemateKeyForError("constraint.splitHonor")).toBeNull();
        expect(stalemateKeyForError("constraint.variabilityHonor")).toBeNull();
        expect(stalemateKeyForError("constraint.warmupPolicy")).toBeNull();
    });
});

describe("shouldEscalate", () => {
    it("escalates on the second of the same key this request", () => {
        const stash = emptyStash();
        expect(shouldEscalate(stash, "skill.sessionShape")).toBe(false);
        expect(stash.softFailCounts?.["skill.sessionShape"]).toBe(1);
        expect(shouldEscalate(stash, "skill.sessionShape")).toBe(true);
        expect(stash.stalemateStopped).toBe(true);
    });

    it("does not increment a different key onto the first", () => {
        const stash = emptyStash();
        expect(shouldEscalate(stash, "skill.sessionShape")).toBe(false);
        expect(shouldEscalate(stash, "weekCoverage")).toBe(false);
        expect(stash.stalemateStopped).toBeUndefined();
        expect(stash.softFailCounts).toEqual({
            "skill.sessionShape": 1,
            weekCoverage: 1,
        });
    });

    it("does not count a null key or a missing stash", () => {
        expect(shouldEscalate(undefined, "weekCoverage")).toBe(false);
        expect(shouldEscalate(emptyStash(), null)).toBe(false);
    });
});

describe("escalateKey", () => {
    it("counts each pair id on its own and returns the first to reach two", () => {
        const stash = emptyStash();
        expect(escalateKey(stash, [SQUAT_KNEE.id])).toBeNull();
        expect(escalateKey(stash, [DEADLIFT_BARBELL.id])).toBeNull();
        expect(stash.stalemateStopped).toBeUndefined();
        expect(escalateKey(stash, [DEADLIFT_BARBELL.id, SQUAT_KNEE.id])).toBe(DEADLIFT_BARBELL.id);
        expect(stash.softFailCounts).toEqual({
            [SQUAT_KNEE.id]: 2,
            [DEADLIFT_BARBELL.id]: 2,
        });
        expect(stash.stalemateStopped).toBe(true);
    });

    it("counts a key once when the error and a pair id are the same", () => {
        const stash = emptyStash();
        expect(escalateKey(stash, [SQUAT_KNEE.id, SQUAT_KNEE.id])).toBeNull();
        expect(stash.softFailCounts?.[SQUAT_KNEE.id]).toBe(1);
    });
});

describe("recordConstraintPairMisses", () => {
    it("keeps first-seen order and replaces a repeat id in place", () => {
        const stash = emptyStash();
        recordConstraintPairMisses(stash, [SQUAT_KNEE]);
        recordConstraintPairMisses(stash, [DEADLIFT_BARBELL]);
        const updated = { ...SQUAT_KNEE, why: "updated" };
        recordConstraintPairMisses(stash, [updated]);
        expect(stash.constraintPairMisses).toEqual([updated, DEADLIFT_BARBELL]);
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
    it("names the one pair and offers Fix it on a single pair escalate", () => {
        const payload = buildStalematePayload(
            SQUAT_KNEE.id,
            profile({ injuries: ["Knee pain", "left ankle"] }),
            undefined,
            [SQUAT_KNEE],
        );
        expect(payload).toEqual({
            chips: [],
            key: SQUAT_KNEE.id,
            kind: "constraint",
            why: SQUAT_KNEE.why,
            actions: [{ label: "Fix it.", message: "Fix it." }],
            pairs: [SQUAT_KNEE],
        });
    });

    it("rolls up every pair miss this request", () => {
        const payload = buildStalematePayload(SQUAT_KNEE.id, null, undefined, [
            SQUAT_KNEE,
            DEADLIFT_BARBELL,
        ]);
        expect(payload.why).toBe(pairRollupWhy(2));
        expect(payload.pairs).toEqual([SQUAT_KNEE, DEADLIFT_BARBELL]);
    });

    it("does not offer every saved injury on a pair escalate", () => {
        const payload = buildStalematePayload(
            SQUAT_KNEE.id,
            profile({ injuries: ["Knee pain", "left ankle"] }),
            undefined,
            [SQUAT_KNEE],
        );
        expect(payload.chips).toEqual([]);
    });

    it("uses training kind for skill and training honor ids", () => {
        expect(buildStalematePayload("skill.sessionShape", null).kind).toBe("training");
        expect(buildStalematePayload("weekCoverage", null).kind).toBe("weekCoverage");
    });

    it("gives a code peak-hardness miss a preference clear and Fix it", () => {
        const payload = buildStalematePayload(
            "phaseHardness.peak",
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
        expect(payload.why).toBe("The peak week still isn't harder than the week before it.");
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

describe("replaceLiftMessage", () => {
    it("names the lift and the saved limit", () => {
        expect(replaceLiftMessage(SQUAT_KNEE)).toBe(
            "Replace this lift: swap Squat (Barbell) for a lift that works with my injury \"Knee pain\".",
        );
        expect(replaceLiftMessage(DEADLIFT_BARBELL)).toBe(
            "Replace this lift: swap Deadlift (Barbell) for a lift that works with my excluded equipment \"Barbell\".",
        );
    });
});

describe("readStalematePayload", () => {
    it("keeps valid pairs and drops malformed ones", () => {
        const payload = buildStalematePayload(SQUAT_KNEE.id, null, undefined, [SQUAT_KNEE]);
        expect(readStalematePayload({ stalemate: payload })).toEqual(payload);
        expect(
            readStalematePayload({
                stalemate: { ...payload, pairs: [SQUAT_KNEE, { id: "x", field: "excludedAreas" }] },
            })?.pairs,
        ).toEqual([SQUAT_KNEE]);
    });

    it("reads a valid card payload and rejects junk", () => {
        const payload = buildStalematePayload("weekCoverage", null);
        expect(readStalematePayload({ error: "weekCoverage", stalemate: payload })).toEqual(payload);
        expect(readStalematePayload({ error: "weekCoverage" })).toBeNull();
        expect(isStalemateOutput({ error: STALEMATE_ERROR })).toBe(true);
        expect(isStalemateOutput({ error: "weekCoverage", stalemate: payload })).toBe(true);
        expect(isStalemateOutput({ error: "weekCoverage" })).toBe(false);
    });
});
