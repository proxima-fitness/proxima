import { describe, expect, it, vi } from "vitest";

import { initializeConstraintProfile } from "@/app/api/chat/constraints/initialize";
import { initializeTrainingProfile } from "@/app/api/chat/training-profile";

import {
    applyEvaluatePolicy,
    CONSTRAINT_HONOR_MIN,
    constraintPairMisses,
    constraintPairWhy,
    evaluate,
    formatEvaluateMessage,
    JEV_MODEL,
    noulsFromEvaluateAnswers,
    toEvaluateQuestions,
    TRAINING_MISS_MAX,
    USER_REQUESTED_YES_MIN,
} from "../evaluate";
import { constraintPairId, userRequestedId } from "../questions";
import type { TProgramSanitySnapshot } from "../types";

const KNEEL_PAIR = constraintPairId("injuries", "Kneeling lunge", "can't kneel");
const KNEEL_WHY = "Can't keep Kneeling lunge with your saved injury \"can't kneel\".";

function snapshotWithInjury(): TProgramSanitySnapshot {
    return {
        userMessage: "Build me a week",
        constraintProfile: initializeConstraintProfile({ healthIssues: "can't kneel" }),
        trainingProfile: null,
        weekIntents: [],
        changedDays: [{ week: 1, day: 1 }],
        matchingWeek1Days: [],
        matrix: [{
            week: 1,
            day: 1,
            title: "Lower",
            exercises: [{ title: "Kneeling lunge", workingSetCount: 3, rpeMin: 8, rpeMax: 8 }],
            matchesWeek1Stimulus: false,
        }],
    };
}

function snapshotThinDay(userMessage: string): TProgramSanitySnapshot {
    return {
        userMessage,
        constraintProfile: null,
        trainingProfile: initializeTrainingProfile({ sessionDurationMin: 60 }),
        weekIntents: [],
        changedDays: [{ week: 1, day: 1 }],
        matchingWeek1Days: [],
        matrix: [{
            week: 1,
            day: 1,
            title: "Quick",
            exercises: [{ title: "Curl", workingSetCount: 1, rpeMin: 6, rpeMax: 6 }],
            matchesWeek1Stimulus: false,
        }],
    };
}

describe("applyEvaluatePolicy", () => {
    it("rejects a Constraint miss (fail-any, fail-closed, no User-stated exception)", () => {
        const misses = applyEvaluatePolicy(
            {
                [KNEEL_PAIR]: 0.1,
                [userRequestedId(KNEEL_PAIR)]: 0.99,
            },
            [KNEEL_PAIR],
            true,
        );

        expect(misses).toEqual([
            { id: KNEEL_PAIR, detail: `does not honor ${KNEEL_PAIR}` },
        ]);
    });

    it("rejects a low-confidence Constraint miss", () => {
        const noul = (CONSTRAINT_HONOR_MIN + TRAINING_MISS_MAX) / 2;
        expect(noul).toBeGreaterThan(TRAINING_MISS_MAX);
        expect(noul).toBeLessThan(CONSTRAINT_HONOR_MIN);

        const misses = applyEvaluatePolicy(
            { [KNEEL_PAIR]: noul },
            [KNEEL_PAIR],
            true,
        );

        expect(misses).toHaveLength(1);
        expect(misses[0].id).toBe(KNEEL_PAIR);
    });

    it("passes a user-asked thin day", () => {
        const misses = applyEvaluatePolicy(
            {
                "skill.sessionShape": 0.05,
                [userRequestedId("skill.sessionShape")]: 0.92,
            },
            ["skill.sessionShape", userRequestedId("skill.sessionShape")],
            true,
        );

        expect(misses).toEqual([]);
        expect(0.92).toBeGreaterThanOrEqual(USER_REQUESTED_YES_MIN);
    });

    it("passes a low-confidence skill miss", () => {
        const noul = (CONSTRAINT_HONOR_MIN + TRAINING_MISS_MAX) / 2;
        const misses = applyEvaluatePolicy(
            { "skill.sessionShape": noul },
            ["skill.sessionShape"],
            true,
        );

        expect(misses).toEqual([]);
    });

    it("does not reject Training / skill on a standalone later mutation", () => {
        const misses = applyEvaluatePolicy(
            { "skill.sessionShape": 0.05 },
            ["skill.sessionShape"],
            false,
        );

        expect(misses).toEqual([]);
    });
});

describe("JEV_MODEL", () => {
    it("is the Gateway Jev catalog id", () => {
        expect(JEV_MODEL).toBe("typesafe-ai/jev");
    });
});

describe("toEvaluateQuestions", () => {
    it("maps noul questions onto AI SDK boolean questions", () => {
        const mapped = toEvaluateQuestions({
            [KNEEL_PAIR]: {
                type: "noul",
                instructions: "Does matrix honor injuries?",
                criteria: { true: "yes", false: "no" },
            },
        });

        expect(mapped[KNEEL_PAIR]).toEqual({
            type: "boolean",
            instructions: "Does matrix honor injuries?",
            criteria: { true: "yes", false: "no" },
        });
    });
});

describe("noulsFromEvaluateAnswers", () => {
    it("reads probability as the honor noul", () => {
        expect(noulsFromEvaluateAnswers({
            [KNEEL_PAIR]: { probability: 0.12 },
            skipped: { probability: "nope" },
        })).toEqual({ [KNEEL_PAIR]: 0.12 });
    });
});

describe("formatEvaluateMessage", () => {
    it("puts the question id on each line", () => {
        expect(formatEvaluateMessage([
            { id: KNEEL_PAIR, detail: `does not honor ${KNEEL_PAIR}` },
        ])).toBe(`${KNEEL_PAIR}: does not honor ${KNEEL_PAIR}`);
    });
});

describe("evaluate", () => {
    it("rejects a Constraint miss from the mocked client", async () => {
        const postSystemOne = vi.fn(async () => ({
            [KNEEL_PAIR]: 0.12,
        }));

        const result = await evaluate(snapshotWithInjury(), {
            firstBuild: true,
            postSystemOne,
        });

        expect(postSystemOne).toHaveBeenCalledOnce();
        expect(result.ok).toBe(false);
        expect(result.misses[0]?.id).toBe(KNEEL_PAIR);
    });

    it("passes a user-asked thin day from the mocked client", async () => {
        const postSystemOne = vi.fn(async () => ({
            "training.sessionDurationFit": 0.9,
            [userRequestedId("training.sessionDurationFit")]: 0.1,
            "skill.sessionShape": 0.08,
            [userRequestedId("skill.sessionShape")]: 0.94,
        }));

        const result = await evaluate(snapshotThinDay("Keep today to one curl, I asked for a short day"), {
            firstBuild: true,
            postSystemOne,
        });

        expect(result.ok).toBe(true);
        expect(result.misses).toEqual([]);
    });

    it("fail-opens Jev questions when TypeSafe returns null (missing key / transport)", async () => {
        const postSystemOne = vi.fn(async () => null);
        const result = await evaluate(snapshotWithInjury(), {
            firstBuild: true,
            postSystemOne,
        });

        expect(postSystemOne).toHaveBeenCalledOnce();
        expect(result).toEqual({ ok: true, misses: [] });
    });

    it("logs a Jev trace when debug is on", async () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});
        const postSystemOne = vi.fn(async () => ({
            [KNEEL_PAIR]: 0.12,
        }));

        const result = await evaluate(snapshotWithInjury(), {
            firstBuild: true,
            debug: true,
            postSystemOne,
        });

        expect(result.ok).toBe(false);
        expect(log).toHaveBeenCalledWith(
            "[jev]",
            expect.objectContaining({
                ok: false,
                firstBuild: true,
                nouls: { [KNEEL_PAIR]: 0.12 },
                misses: [
                    expect.objectContaining({ id: KNEEL_PAIR, detail: KNEEL_WHY }),
                ],
            }),
        );
        expect(result.debug?.questionIds).toContain(KNEEL_PAIR);
        log.mockRestore();
    });

    it("does not log when debug is off", async () => {
        const log = vi.spyOn(console, "log").mockImplementation(() => {});

        await evaluate(snapshotWithInjury(), {
            firstBuild: true,
            postSystemOne: async () => ({ [KNEEL_PAIR]: 0.99 }),
        });

        expect(log).not.toHaveBeenCalled();
        log.mockRestore();
    });

    it("does not call TypeSafe when every premise is empty", async () => {
        const postSystemOne = vi.fn(async () => {
            throw new Error("should not call TypeSafe");
        });

        const result = await evaluate({
            userMessage: "",
            constraintProfile: null,
            trainingProfile: null,
            weekIntents: [],
            changedDays: [],
            matchingWeek1Days: [],
            matrix: [],
        }, {
            firstBuild: true,
            postSystemOne,
        });

        expect(postSystemOne).not.toHaveBeenCalled();
        expect(result).toEqual({ ok: true, misses: [] });
    });

    it("does not reject a standalone later mutation on pre-existing whole-program Constraint misses", async () => {
        const postSystemOne = vi.fn(async () => {
            throw new Error("should not re-judge the existing program");
        });

        const result = await evaluate({
            userMessage: "do those",
            constraintProfile: initializeConstraintProfile({
                healthIssues: "Left ankle surgery recovery, Medial patellar plica syndrome",
                excludeEquipment: "band,plate",
                splitType: "ppl",
                exerciseVariability: "little",
                progressionSystem: "linear",
                peakWeek: "no",
                warmupExercises: "no",
            }),
            trainingProfile: initializeTrainingProfile({
                experienceLevel: "intermediate",
                physiquePhase: "cut",
                trainingFocus: "fat_loss",
                activityLevel: "light",
                sessionDurationMin: 90,
            }),
            weekIntents: [],
            changedDays: [],
            matchingWeek1Days: [{ week: 2, day: 1 }],
            matrix: [
                {
                    week: 1,
                    day: 1,
                    title: "1 - Push Day",
                    exercises: [{ title: "Chest Press (Machine)", workingSetCount: 3, rpeMin: 8, rpeMax: 9 }],
                    matchesWeek1Stimulus: false,
                },
                {
                    week: 2,
                    day: 1,
                    title: "1 - Push Day",
                    exercises: [{ title: "Chest Press (Machine)", workingSetCount: 3, rpeMin: 8, rpeMax: 9 }],
                    matchesWeek1Stimulus: true,
                },
            ],
        }, {
            firstBuild: false,
            postSystemOne,
        });

        expect(postSystemOne).not.toHaveBeenCalled();
        expect(result).toEqual({ ok: true, misses: [] });
    });

    it("still rejects a standalone mutation that introduces a Constraint miss on a changed day", async () => {
        const result = await evaluate(snapshotWithInjury(), {
            firstBuild: false,
            postSystemOne: async () => ({ [KNEEL_PAIR]: 0.06 }),
        });

        expect(result.ok).toBe(false);
        expect(result.misses[0]?.id).toBe(KNEEL_PAIR);
    });

    it("sends Jev only the changed days on a standalone later mutation", async () => {
        const postSystemOne = vi.fn(async (state: TProgramSanitySnapshot) => {
            expect(state.matrix).toEqual([
                expect.objectContaining({ week: 1, day: 1, title: "Lower" }),
            ]);
            return { [KNEEL_PAIR]: 0.99 };
        });

        const result = await evaluate({
            ...snapshotWithInjury(),
            matrix: [
                snapshotWithInjury().matrix[0],
                {
                    week: 1,
                    day: 3,
                    title: "3 - Leg Day",
                    exercises: [{ title: "Squat (Barbell)", workingSetCount: 3, rpeMin: 8, rpeMax: 9 }],
                    matchesWeek1Stimulus: false,
                },
            ],
        }, {
            firstBuild: false,
            postSystemOne,
        });

        expect(postSystemOne).toHaveBeenCalledOnce();
        expect(result.ok).toBe(true);
    });

    it("judges a stamped First build on every later week the stamp changed, without constraint.progressionHonor or skill phase honors", async () => {
        const stamped: TProgramSanitySnapshot = {
            userMessage: "Build me a 3 week program",
            constraintProfile: initializeConstraintProfile({ progressionSystem: "linear", deloadWeek: "yes" }),
            trainingProfile: null,
            weekIntents: [
                { week: 1, name: "Accumulation", intent: "Volume" },
                { week: 2, name: "Accumulation", intent: "Volume" },
                { week: 3, name: "Deload", intent: "Unload" },
            ],
            changedDays: [{ week: 2, day: 1 }, { week: 3, day: 1 }],
            matchingWeek1Days: [],
            matrix: [1, 2, 3].map((week) => ({
                week,
                day: 1,
                title: "Lower",
                exercises: [{ title: "Squat", workingSetCount: week === 3 ? 2 : 3, rpeMin: 6 + week, rpeMax: 6 + week }],
                matchesWeek1Stimulus: false,
            })),
        };
        const postSystemOne = vi.fn(async (state: TProgramSanitySnapshot, questions: Record<string, unknown>) => {
            expect(state.matrix.map((row) => row.week)).toEqual([1, 2, 3]);
            expect(questions).not.toHaveProperty("constraint.progressionHonor");
            expect(questions).toHaveProperty("constraint.deloadHonor");
            expect(questions).not.toHaveProperty("skill.periodizationCoverage");
            expect(questions).not.toHaveProperty("skill.weekIntentHonor");
            expect(questions).not.toHaveProperty("skill.stimulusHonor");
            return { "constraint.deloadHonor": 0.9 };
        });

        const result = await evaluate(stamped, { firstBuild: true, postSystemOne });

        expect(postSystemOne).toHaveBeenCalledOnce();
        expect(result).toEqual({ ok: true, misses: [] });
    });

    it("does not reject a Training / skill miss when firstBuild is false (Case 2)", async () => {
        const result = await evaluate(snapshotThinDay("more please"), {
            firstBuild: false,
            postSystemOne: async () => ({ "skill.sessionShape": 0.02 }),
        });

        expect(result).toEqual({ ok: true, misses: [] });
    });
});

describe("injury / equipment pair Soft-fail detail (ADR 0030 C5)", () => {
    it("carries the structured pair and a why naming title and saved string", async () => {
        const result = await evaluate(snapshotWithInjury(), {
            firstBuild: true,
            postSystemOne: async () => ({ [KNEEL_PAIR]: 0.1 }),
        });

        expect(result.ok).toBe(false);
        expect(result.misses).toEqual([{
            id: KNEEL_PAIR,
            detail: KNEEL_WHY,
            pair: {
                id: KNEEL_PAIR,
                field: "injuries",
                constraint: "can't kneel",
                exerciseTitle: "Kneeling lunge",
                why: KNEEL_WHY,
            },
        }]);
        expect(formatEvaluateMessage(result.misses)).toBe(`${KNEEL_PAIR}: ${KNEEL_WHY}`);
    });

    it("reports only the pairs that missed, each with its own id", async () => {
        const snapshot = snapshotWithInjury();
        snapshot.matrix[0].exercises.push({
            title: "Leg Press (Machine)",
            workingSetCount: 3,
            rpeMin: 8,
            rpeMax: 8,
        });
        const pressPair = constraintPairId("injuries", "Leg Press (Machine)", "can't kneel");

        const result = await evaluate(snapshot, {
            firstBuild: true,
            postSystemOne: async () => ({ [KNEEL_PAIR]: 0.1, [pressPair]: 0.95 }),
        });

        expect(result.misses.map((miss) => miss.id)).toEqual([KNEEL_PAIR]);
    });

    it("fails closed on an unanswered pair", async () => {
        const result = await evaluate(snapshotWithInjury(), {
            firstBuild: true,
            postSystemOne: async () => ({}),
        });

        expect(result.misses[0]?.id).toBe(KNEEL_PAIR);
    });

    it("words an equipment pair why", () => {
        expect(constraintPairWhy({
            id: constraintPairId("excludedEquipment", "Squat (Barbell)", "barbell"),
            field: "excludedEquipment",
            constraint: "barbell",
            exerciseTitle: "Squat (Barbell)",
        })).toBe("Can't keep Squat (Barbell): it uses excluded equipment \"barbell\".");
    });

    it("collects only pair misses for the Soft-fail payload", () => {
        const pair = {
            id: KNEEL_PAIR,
            field: "injuries" as const,
            constraint: "can't kneel",
            exerciseTitle: "Kneeling lunge",
            why: KNEEL_WHY,
        };
        expect(constraintPairMisses([
            { id: "constraint.splitHonor", detail: "does not honor constraint.splitHonor" },
            { id: KNEEL_PAIR, detail: KNEEL_WHY, pair },
        ])).toEqual([pair]);
    });
});
