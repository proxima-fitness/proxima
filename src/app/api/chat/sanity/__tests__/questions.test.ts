import { describe, expect, it } from "vitest";

import { initializeConstraintProfile } from "@/app/api/chat/constraints/initialize";
import { initializeTrainingProfile } from "@/app/api/chat/training-profile";

import {
    buildSanityQuestions,
    constraintPairId,
    isConstraintPairId,
    userRequestedId,
} from "../questions";
import type { TProgramSanitySnapshot } from "../types";

function emptySnapshot(overrides: Partial<TProgramSanitySnapshot> = {}): TProgramSanitySnapshot {
    return {
        userMessage: "",
        constraintProfile: null,
        trainingProfile: null,
        weekIntents: [],
        changedDays: [],
        matchingWeek1Days: [],
        matrix: [],
        ...overrides,
    };
}

function dayRow(week: number, day: number, titles: string[] = ["Squat"]) {
    return {
        week,
        day,
        title: `Day ${day}`,
        exercises: titles.map((title) => ({ title, workingSetCount: 3, rpeMin: 7, rpeMax: 8 })),
        matchesWeek1Stimulus: week > 1,
    };
}

function pairIds(questions: ReturnType<typeof buildSanityQuestions>): string[] {
    return Object.keys(questions).filter(isConstraintPairId);
}

describe("buildSanityQuestions", () => {
    it("omits a question when its premise is empty", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({
                healthIssues: "can't kneel",
                splitType: "",
                deloadWeek: "no",
            }),
            matrix: [dayRow(1, 1)],
        }));

        expect(questions[constraintPairId("injuries", "Squat", "can't kneel")]).toBeDefined();
        expect(questions["constraint.splitHonor"]).toBeUndefined();
        expect(questions["constraint.deloadHonor"]).toBeUndefined();
        expect(questions["constraint.peakHonor"]).toBeUndefined();
        expect(pairIds(questions).some((id) => id.startsWith("constraint.equipment."))).toBe(false);
        expect(questions["constraint.variabilityHonor"]).toBeUndefined();
        expect(questions["constraint.progressionHonor"]).toBeUndefined();
        expect(questions["constraint.warmupPolicy"]).toBeUndefined();
    });

    it("never asks constraint.deloadHonor / constraint.peakHonor, even when both preferences are yes (ADR 0032 C3)", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ deloadWeek: "yes", peakWeek: "yes" }),
        }), { firstBuild: true });

        expect(questions["constraint.deloadHonor"]).toBeUndefined();
        expect(questions["constraint.peakHonor"]).toBeUndefined();
    });

    it("omits whole-program Constraint and Training / skill on a standalone later mutation", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({
                healthIssues: "left ankle",
                excludeEquipment: "band",
                splitType: "ppl",
                exerciseVariability: "little",
                progressionSystem: "linear",
                peakWeek: "no",
                warmupExercises: "no",
            }),
            trainingProfile: initializeTrainingProfile({
                experienceLevel: "intermediate",
                trainingFocus: "fat_loss",
                sessionDurationMin: 90,
            }),
            changedDays: [],
            matrix: [dayRow(1, 1)],
        }), { firstBuild: false });

        expect(Object.keys(questions)).toEqual([]);
    });

    it("keeps delta Constraint questions on a standalone mutation that changed a day", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({
                healthIssues: "left ankle",
                excludeEquipment: "band",
                splitType: "ppl",
                progressionSystem: "linear",
                warmupExercises: "no",
            }),
            trainingProfile: initializeTrainingProfile({ trainingFocus: "fat_loss" }),
            changedDays: [{ week: 1, day: 3 }],
            matrix: [dayRow(1, 3)],
        }), { firstBuild: false });

        expect(questions[constraintPairId("injuries", "Squat", "left ankle")]).toBeDefined();
        expect(questions[constraintPairId("excludedEquipment", "Squat", "band")]).toBeDefined();
        expect(questions["constraint.warmupPolicy"]).toBeDefined();
        expect(questions[userRequestedId("constraint.warmupPolicy")]).toBeDefined();
        expect(questions["constraint.splitHonor"]).toBeUndefined();
        expect(questions["constraint.progressionHonor"]).toBeUndefined();
        expect(questions["training.trainingFocusFit"]).toBeUndefined();
        expect(questions["skill.sessionShape"]).toBeUndefined();
    });

    it("adds userRequested companions for preference honors and Training / skill, never for injury pairs", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            userMessage: "keep days short",
            constraintProfile: initializeConstraintProfile({
                healthIssues: "knee",
                splitType: "ppl",
                exerciseVariability: "little",
                warmupExercises: "yes",
            }),
            trainingProfile: initializeTrainingProfile({ sessionDurationMin: 45 }),
            matrix: [dayRow(1, 1)],
        }));

        expect(questions["training.sessionDurationFit"]).toBeDefined();
        expect(questions[userRequestedId("training.sessionDurationFit")]).toBeDefined();
        expect(questions["skill.sessionShape"]).toBeDefined();
        expect(questions[userRequestedId("skill.sessionShape")]).toBeDefined();
        expect(questions[userRequestedId("constraint.splitHonor")]).toBeDefined();
        expect(questions[userRequestedId("constraint.variabilityHonor")]).toBeDefined();
        expect(questions[userRequestedId("constraint.warmupPolicy")]).toBeDefined();
        const injuryPair = constraintPairId("injuries", "Squat", "knee");
        expect(questions[injuryPair]).toBeDefined();
        expect(questions[userRequestedId(injuryPair)]).toBeUndefined();
    });

    it("never asks age, sex, height, or skill.exerciseObjectionReplace", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            trainingProfile: initializeTrainingProfile({
                age: 30,
                sex: "male",
                heightCm: 180,
                experienceLevel: "intermediate",
            }),
            matrix: [dayRow(1, 1)],
        }));

        const ids = Object.keys(questions);
        expect(ids.some((id) => /age|sex|height/i.test(id))).toBe(false);
        expect(ids).not.toContain("skill.exerciseObjectionReplace");
        expect(questions["training.experienceFit"]).toBeDefined();
    });

    it("omits multi-week honor questions when the matrix is week 1 only", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({
                healthIssues: "left ankle, bad knee pain",
                excludeEquipment: "band,plate,other",
                splitType: "ppl",
                progressionSystem: "linear",
                warmupExercises: "no",
            }),
            trainingProfile: initializeTrainingProfile({
                physiquePhase: "cut",
                trainingFocus: "fat_loss",
            }),
            weekIntents: [
                { week: 1, name: "Build", intent: "Hypertrophy" },
                { week: 8, name: "Deload", intent: "Unload" },
            ],
            changedDays: [{ week: 1, day: 1 }],
            matrix: [dayRow(1, 1), dayRow(1, 2), dayRow(1, 3)],
        }));

        expect(pairIds(questions).length).toBeGreaterThan(0);
        expect(questions["constraint.splitHonor"]).toBeDefined();
        expect(questions["constraint.progressionHonor"]).toBeUndefined();
    });

    it("never asks constraint.progressionHonor on a stamped First build", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ progressionSystem: "linear" }),
            weekIntents: [{ week: 2, name: "Build", intent: "Add load" }],
            changedDays: [{ week: 2, day: 1 }],
            matrix: [dayRow(1, 1), dayRow(2, 1)],
        }), { firstBuild: true });

        expect(questions["constraint.progressionHonor"]).toBeUndefined();
    });

    it("keeps warmup but not deload / peak questions on a stamped First build", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({
                progressionSystem: "linear",
                deloadWeek: "yes",
                peakWeek: "yes",
                warmupExercises: "yes",
            }),
            weekIntents: [
                { week: 1, name: "Accumulation", intent: "Volume" },
                { week: 2, name: "Peak", intent: "Heavy" },
                { week: 3, name: "Deload", intent: "Unload" },
            ],
            changedDays: [{ week: 2, day: 1 }, { week: 3, day: 1 }],
            matrix: [dayRow(1, 1), dayRow(2, 1), dayRow(3, 1)],
        }), { firstBuild: true });

        expect(questions["constraint.deloadHonor"]).toBeUndefined();
        expect(questions["constraint.peakHonor"]).toBeUndefined();
        expect(questions["constraint.warmupPolicy"]).toBeDefined();
        expect(questions["constraint.progressionHonor"]).toBeUndefined();
        expect(Object.keys(questions).some((id) => id.includes("sameWeekProgram"))).toBe(false);
    });

    it("never asks skill phase honors on a multi-week First build with week intents (ADR 0032 C1)", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            trainingProfile: initializeTrainingProfile({ trainingFocus: "fat_loss" }),
            weekIntents: [
                { week: 1, name: "Accumulation", intent: "Volume" },
                { week: 2, name: "Intensification", intent: "Heavier" },
                { week: 3, name: "Peak", intent: "Heavy" },
                { week: 4, name: "Deload", intent: "Unload" },
            ],
            changedDays: [{ week: 2, day: 1 }, { week: 3, day: 1 }, { week: 4, day: 1 }],
            matrix: [dayRow(1, 1), dayRow(2, 1), dayRow(3, 1), dayRow(4, 1)],
        }), { firstBuild: true });

        for (const id of ["skill.stimulusHonor", "skill.weekIntentHonor", "skill.periodizationCoverage"]) {
            expect(questions[id]).toBeUndefined();
            expect(questions[userRequestedId(id)]).toBeUndefined();
        }
        expect(questions["skill.sessionShape"]).toBeDefined();
        expect(questions["skill.programTypeHonor"]).toBeDefined();
        expect(questions["training.trainingFocusFit"]).toBeDefined();
    });

    it("treats joint-friendly substitutions as injury honor", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ healthIssues: "left ankle" }),
            matrix: [dayRow(1, 1)],
        }));

        expect(questions[constraintPairId("injuries", "Squat", "left ankle")]?.criteria.true)
            .toMatch(/joint-friendly|accommodat/i);
        expect(questions["constraint.progressionHonor"]).toBeUndefined();
    });

    it("never asks the retired blob injury / equipment ids", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({
                healthIssues: "knee",
                excludeEquipment: "band",
            }),
            matrix: [dayRow(1, 1)],
        }));

        expect(Object.keys(questions).some((id) => /Semantic$/.test(id))).toBe(false);
    });
});

describe("buildSanityQuestions injury / equipment pairs (ADR 0030 C4)", () => {
    it("asks one question per unique title × injury: two injuries × two titles → four", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ healthIssues: "Knee Pain, Left Ankle" }),
            matrix: [dayRow(1, 1, ["Squat (Barbell)", "Leg Press (Machine)"])],
        }));

        expect(pairIds(questions).sort()).toEqual([
            constraintPairId("injuries", "Leg Press (Machine)", "Knee Pain"),
            constraintPairId("injuries", "Leg Press (Machine)", "Left Ankle"),
            constraintPairId("injuries", "Squat (Barbell)", "Knee Pain"),
            constraintPairId("injuries", "Squat (Barbell)", "Left Ankle"),
        ].sort());
    });

    it("collapses the same title plated across weeks to one pair", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ healthIssues: "Knee Pain" }),
            matrix: [
                dayRow(1, 1, ["Squat (Barbell)"]),
                dayRow(2, 1, ["Squat (Barbell)"]),
                dayRow(3, 1, ["Squat (Barbell)"]),
            ],
        }));

        expect(pairIds(questions)).toEqual([
            constraintPairId("injuries", "Squat (Barbell)", "Knee Pain"),
        ]);
    });

    it("includes a block-boundary swap title from a later week on First build", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ healthIssues: "Knee Pain" }),
            matrix: [
                dayRow(1, 1, ["Squat (Barbell)"]),
                dayRow(5, 1, ["Front Squat (Barbell)"]),
            ],
        }), { firstBuild: true });

        expect(pairIds(questions)).toContain(
            constraintPairId("injuries", "Front Squat (Barbell)", "Knee Pain"),
        );
    });

    it("pairs each title with each excluded-equipment string", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ excludeEquipment: "band,plate" }),
            matrix: [dayRow(1, 1, ["Squat (Barbell)", "Leg Press (Machine)"])],
        }));

        expect(pairIds(questions)).toHaveLength(4);
        expect(questions[constraintPairId("excludedEquipment", "Squat (Barbell)", "band")]?.pair)
            .toEqual({
                id: constraintPairId("excludedEquipment", "Squat (Barbell)", "band"),
                field: "excludedEquipment",
                constraint: "band",
                exerciseTitle: "Squat (Barbell)",
            });
    });

    it("names the title and saved string in the Jev instructions", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ healthIssues: "Knee Pain" }),
            matrix: [dayRow(1, 1, ["Squat (Barbell)"])],
        }));
        const question = questions[constraintPairId("injuries", "Squat (Barbell)", "Knee Pain")];

        expect(question?.instructions).toContain("\"Squat (Barbell)\"");
        expect(question?.instructions).toContain("\"Knee Pain\"");
    });

    it("only pairs changed-day titles on a standalone later mutation", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ healthIssues: "Knee Pain" }),
            changedDays: [{ week: 1, day: 2 }],
            matrix: [
                dayRow(1, 1, ["Squat (Barbell)"]),
                dayRow(1, 2, ["Leg Extension (Machine)"]),
            ],
        }), { firstBuild: false });

        expect(pairIds(questions)).toEqual([
            constraintPairId("injuries", "Leg Extension (Machine)", "Knee Pain"),
        ]);
    });

    it("asks no pair when the matrix has no exercises", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ healthIssues: "Knee Pain" }),
        }));

        expect(pairIds(questions)).toEqual([]);
    });

    it("builds a stable pair id from title and saved string", () => {
        expect(constraintPairId("injuries", "Squat (Barbell)", "Knee Pain"))
            .toBe("constraint.injury.squat-barbell.knee-pain");
        expect(constraintPairId("excludedEquipment", " Cable Fly ", "band"))
            .toBe("constraint.equipment.cable-fly.band");
    });
});
