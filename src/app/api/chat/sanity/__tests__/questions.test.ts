import { describe, expect, it } from "vitest";

import { initializeConstraintProfile } from "@/app/api/chat/constraints/initialize";
import { initializeTrainingProfile } from "@/app/api/chat/training-profile";

import { buildSanityQuestions, userRequestedId } from "../questions";
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

function dayRow(week: number, day: number) {
    return {
        week,
        day,
        title: `Day ${day}`,
        exercises: [{ title: "Squat", workingSetCount: 3, rpeMin: 7, rpeMax: 8 }],
        matchesWeek1Stimulus: week > 1,
    };
}

describe("buildSanityQuestions", () => {
    it("omits a question when its premise is empty", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({
                healthIssues: "can't kneel",
                splitType: "",
                deloadWeek: "no",
            }),
        }));

        expect(questions["constraint.injurySemantic"]).toBeDefined();
        expect(questions["constraint.splitHonor"]).toBeUndefined();
        expect(questions["constraint.deloadHonor"]).toBeUndefined();
        expect(questions["constraint.peakHonor"]).toBeUndefined();
        expect(questions["constraint.equipmentSemantic"]).toBeUndefined();
        expect(questions["constraint.variabilityHonor"]).toBeUndefined();
        expect(questions["constraint.progressionHonor"]).toBeUndefined();
        expect(questions["constraint.warmupPolicy"]).toBeUndefined();
    });

    it("includes constraint.deloadHonor only when deloadWeek is yes", () => {
        const withDeload = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ deloadWeek: "yes" }),
        }));
        const withoutDeload = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ deloadWeek: "no" }),
        }));

        expect(withDeload["constraint.deloadHonor"]).toBeDefined();
        expect(withoutDeload["constraint.deloadHonor"]).toBeUndefined();
    });

    it("includes constraint.peakHonor only when peakWeek is yes", () => {
        const withPeak = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ peakWeek: "yes" }),
        }));
        const peakNo = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ peakWeek: "no" }),
        }));
        const withoutPeak = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({}),
        }));

        expect(withPeak["constraint.peakHonor"]).toBeDefined();
        expect(peakNo["constraint.peakHonor"]).toBeUndefined();
        expect(withoutPeak["constraint.peakHonor"]).toBeUndefined();
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

        expect(questions["constraint.injurySemantic"]).toBeDefined();
        expect(questions["constraint.equipmentSemantic"]).toBeDefined();
        expect(questions["constraint.warmupPolicy"]).toBeDefined();
        expect(questions["constraint.splitHonor"]).toBeUndefined();
        expect(questions["constraint.progressionHonor"]).toBeUndefined();
        expect(questions["training.trainingFocusFit"]).toBeUndefined();
        expect(questions["skill.sessionShape"]).toBeUndefined();
    });

    it("adds userRequested companions for Training / skill ids and never for Constraint", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            userMessage: "keep days short",
            constraintProfile: initializeConstraintProfile({ healthIssues: "knee" }),
            trainingProfile: initializeTrainingProfile({ sessionDurationMin: 45 }),
            matrix: [dayRow(1, 1)],
        }));

        expect(questions["training.sessionDurationFit"]).toBeDefined();
        expect(questions[userRequestedId("training.sessionDurationFit")]).toBeDefined();
        expect(questions["skill.sessionShape"]).toBeDefined();
        expect(questions[userRequestedId("skill.sessionShape")]).toBeDefined();
        expect(questions[userRequestedId("constraint.injurySemantic")]).toBeUndefined();
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

    it("omits skill.weekIntentHonor without a plan claim and periodizationCoverage without later-week changes", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            changedDays: [{ week: 1, day: 1 }],
            matrix: [dayRow(1, 1)],
        }));

        expect(questions["skill.weekIntentHonor"]).toBeUndefined();
        expect(questions["skill.periodizationCoverage"]).toBeUndefined();
        expect(questions["skill.sessionShape"]).toBeDefined();
    });

    it("includes skill.periodizationCoverage only for later-week changed days", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            weekIntents: [{ week: 4, name: "Deload", intent: "Unload" }],
            changedDays: [{ week: 4, day: 1 }],
            matrix: [dayRow(1, 1), dayRow(4, 1)],
        }));

        expect(questions["skill.periodizationCoverage"]).toBeDefined();
        expect(questions["skill.weekIntentHonor"]).toBeDefined();
        expect(questions[userRequestedId("skill.periodizationCoverage")]).toBeDefined();
    });

    it("omits multi-week honor questions from a week-1-only first build", () => {
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

        expect(questions["constraint.injurySemantic"]).toBeDefined();
        expect(questions["constraint.splitHonor"]).toBeDefined();
        expect(questions["constraint.progressionHonor"]).toBeUndefined();
        expect(questions["skill.weekIntentHonor"]).toBeUndefined();
        expect(questions["skill.stimulusHonor"]).toBeUndefined();
        expect(questions["skill.periodizationCoverage"]).toBeUndefined();
    });

    it("asks progression and week-intent only when later weeks are in the matrix", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ progressionSystem: "linear" }),
            weekIntents: [{ week: 2, name: "Build", intent: "Add load" }],
            changedDays: [{ week: 2, day: 1 }],
            matrix: [dayRow(1, 1), dayRow(2, 1)],
        }));

        expect(questions["constraint.progressionHonor"]).toBeDefined();
        expect(questions["skill.weekIntentHonor"]).toBeDefined();
        expect(questions["skill.stimulusHonor"]).toBeDefined();
    });

    it("treats joint-friendly substitutions as injury honor", () => {
        const questions = buildSanityQuestions(emptySnapshot({
            constraintProfile: initializeConstraintProfile({ healthIssues: "left ankle" }),
            matrix: [dayRow(1, 1)],
        }));

        expect(questions["constraint.injurySemantic"]?.criteria.true).toMatch(/joint-friendly|accommodat/i);
        expect(questions["constraint.progressionHonor"]).toBeUndefined();
    });
});
