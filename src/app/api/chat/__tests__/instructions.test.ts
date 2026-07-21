import { describe, it, expect } from "vitest";

import { instructions } from "@/app/api/chat/instructions/instructions";

describe("chat instructions.ts", () => {
    describe("instructions()", () => {
        it("includes daysPerWeek, programLength, and workflow tokens for empty program", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
            });

            expect(prompt).toContain("4");
            expect(prompt).toContain("8");
            expect(prompt).toContain("planProgram");
            expect(prompt).toContain("readProgram");
            expect(prompt).not.toContain('purpose "edit"');
            expect(prompt).not.toContain('purpose "analyze"');
            expect(prompt).not.toContain("getCurrentProgram");
            expect(prompt).toContain("buildWeek");
            expect(prompt).toContain("mutateProgram");
            expect(prompt).not.toContain("modifyProgram");
            expect(prompt).toContain("getMoreInfoQuestions");
            expect(prompt).toContain("Mandatory skill loading");
            expect(prompt).toContain("loadSkill");
            expect(prompt).toContain("build-program");
            expect(prompt).toContain("mutate-program");
            expect(prompt).toContain("first message");
            expect(prompt).toContain("two flows");
            expect(prompt).toContain("Periodization after buildWeek");
            expect(prompt).toContain("Before mutateProgram (mandatory)");
            expect(prompt).toContain("Constraint Profile");
            expect(prompt).toContain("Constraint profile persistence (mandatory)");
            expect(prompt).toContain("updateConstraintProfile");
            expect(prompt).toContain("After questionnaire");
        });

        it("includes workflow when program is non-empty", () => {
            const prompt = instructions({
                hevyProgram: [
                    { id: "1", title: "Day 1", folder_id: 0, order: "1", notes: "", created_at: "", updated_at: "", exercises: [] },
                ],
                daysPerWeek: 3,
                programLength: 4,
            });

            expect(prompt).toContain("planProgram");
            expect(prompt).toContain("readProgram");
            expect(prompt).not.toContain('purpose "edit"');
            expect(prompt).not.toContain('purpose "analyze"');
            expect(prompt).not.toContain("getCurrentProgram");
            expect(prompt).toContain("buildWeek");
            expect(prompt).toContain("3");
            expect(prompt).toContain("4");
        });

        it("includes health in questionnaire preferences when healthIssues is non-empty", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                healthIssues: " knee, lower_back ",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Health / injury: knee, lower_back");
            expect(prompt).toContain("exercise selection, volume, and movement choices");
        });

        it("omits questionnaire preferences line when healthIssues is whitespace-only and no other prefs", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                healthIssues: "   ",
            });

            expect(prompt).not.toContain("Questionnaire preferences");
        });

        it("includes exclude equipment in questionnaire preferences when set", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                excludeEquipment: " bodyweight, band ",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Exclude equipment: bodyweight, band");
        });

        it("includes questionnaire preferences when any of split / variability / progression / deload / peak / warmups are set", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                splitType: "ppl",
                exerciseVariability: "little",
                progressionSystem: "linear",
                deloadWeek: "yes",
                peakWeek: "no",
                warmupExercises: "yes",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Preferred split: ppl");
            expect(prompt).toContain("Exercise variability: little");
            expect(prompt).toContain("Progression system: linear");
            expect(prompt).toContain("Deload week: yes");
            expect(prompt).toContain("Peak week: no");
            expect(prompt).toContain("Warmup exercises: yes");
        });

        it("includes warmup exercises preference when set alone", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                warmupExercises: "no",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Warmup exercises: no");
        });

        it("omits questionnaire preferences line when health, exclude equipment, and split-related fields are empty", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                healthIssues: "",
                excludeEquipment: "",
                splitType: "  ",
                exerciseVariability: "",
            });

            expect(prompt).not.toContain("Questionnaire preferences");
        });

        it("includes getWorkoutHistory guidance when hasWorkoutHistoryAccess is true", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                hasWorkoutHistoryAccess: true,
            });

            expect(prompt).toContain("getWorkoutHistory");
            expect(prompt).toContain("Workout history:");
            expect(prompt).toContain("logged training");
        });

        it("omits getWorkoutHistory guidance for free users", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                hasWorkoutHistoryAccess: false,
            });

            expect(prompt).not.toContain("getWorkoutHistory");
            expect(prompt).not.toContain("Workout history:");
        });
        it("includes weight display unit guidance for lbs UI", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                isInLbs: true,
            });
            expect(prompt).toContain("Weight units");
            expect(prompt).toContain("lbs (pounds)");
            expect(prompt).toContain("weight_display");
        });
    });
});

