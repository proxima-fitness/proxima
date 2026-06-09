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
            expect(prompt).toContain("first message");
            expect(prompt).toContain("two flows");
            expect(prompt).toContain("Periodization after buildWeek");
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

        it("includes questionnaire preferences when any of split / variability / progression / deload / peak are set", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                splitType: "ppl",
                exerciseVariability: "little",
                progressionSystem: "linear",
                deloadWeek: "yes",
                peakWeek: "no",
            });

            expect(prompt).toContain("Questionnaire preferences");
            expect(prompt).toContain("Preferred split: ppl");
            expect(prompt).toContain("Exercise variability: little");
            expect(prompt).toContain("Progression system: linear");
            expect(prompt).toContain("Deload week: yes");
            expect(prompt).toContain("Peak week: no");
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
    });
});

