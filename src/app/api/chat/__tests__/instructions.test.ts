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
            expect(prompt).toContain("getMoreInfoQuestions");
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
    });
});

