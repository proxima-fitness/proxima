// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Pure **Created programs** helpers.
 */
import { describe, it, expect } from "vitest";
import {
    programDetailHref,
    selectCreatedPrograms,
} from "../createdProgramsModel";

const owned = {
    id: 11,
    title: "Strength Block A",
    details: null,
    program_length: 8,
    workout_duration: 60,
    equipment: null,
    specialization: null,
    difficulty: null,
    user_id: "user-1",
    saves: 4,
} satisfies TProgram;

describe("selectCreatedPrograms", () => {
    it("keeps owned programs that are not on overview", () => {
        const joined = { ...owned, id: 22, title: "On overview" };
        expect(selectCreatedPrograms([owned, joined], new Set([22]))).toEqual([owned]);
    });

    it("returns empty when every owned program is Joined", () => {
        expect(selectCreatedPrograms([owned], new Set([11]))).toEqual([]);
    });
});

describe("programDetailHref", () => {
    it("matches catalog slug URLs", () => {
        expect(programDetailHref("Strength Block A", 11)).toBe(
            "/programs/strength-block-a/11",
        );
    });
});
