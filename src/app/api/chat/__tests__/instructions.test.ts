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
            expect(prompt).toContain("getCurrentProgram");
            expect(prompt).toContain("buildWeek");
            expect(prompt).toContain("modifyProgram");
            expect(prompt).toContain("getMoreInfoQuestions");
            expect(prompt).toContain("Mandatory skill loading");
            expect(prompt).toContain("loadSkill");
            expect(prompt).toContain("build-program");
            expect(prompt).toContain("first message");
            expect(prompt).toContain("two flows");
            expect(prompt).toContain("periodization");
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
            expect(prompt).toContain("getCurrentProgram");
            expect(prompt).toContain("buildWeek");
            expect(prompt).toContain("3");
            expect(prompt).toContain("4");
        });

        it("includes health / injury line when healthIssues is non-empty", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                healthIssues: " knee, lower_back ",
            });

            expect(prompt).toContain("Health / injury considerations:");
            expect(prompt).toContain("knee, lower_back");
            expect(prompt).toContain("movement variations");
        });

        it("omits health / injury line when healthIssues is empty or whitespace", () => {
            const prompt = instructions({
                hevyProgram: [],
                daysPerWeek: 4,
                programLength: 8,
                healthIssues: "   ",
            });

            expect(prompt).not.toContain("Health / injury considerations:");
        });
    });
});

