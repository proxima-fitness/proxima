import { describe, expect, it } from "vitest";

import { formatReadProgramForModel, readProgramSnapshot, sortProgramRoutines } from "./read-program";

const sampleProgram = (): THevyRoutine[] => [
    {
        id: "2",
        folder_id: 1,
        order: "1",
        title: "Week 2 Day 1",
        notes: "day notes w2",
        created_at: "",
        updated_at: "",
        exercises: [
            {
                index: 0,
                title: "Row",
                notes: "ex notes",
                rest_seconds: "90",
                exercise_template_id: "ex-2",
                supersets_id: null,
                reason: "Because rows",
                sets: [],
            },
        ],
    },
    {
        id: "1",
        folder_id: 0,
        order: "2",
        title: "Week 1 Day 2",
        notes: "day notes w1",
        created_at: "",
        updated_at: "",
        exercises: [
            {
                index: 0,
                title: "Bench",
                notes: "bench notes",
                rest_seconds: "90",
                exercise_template_id: "ex-1",
                supersets_id: null,
                reason: "Main press",
                sets: [],
            },
        ],
    },
];

describe("sortProgramRoutines", () => {
    it("sorts by folder_id then order", () => {
        const sorted = sortProgramRoutines(sampleProgram());
        expect(sorted.map((r) => `${r.folder_id}-${r.order}`)).toEqual(["0-2", "1-1"]);
    });
});

describe("readProgramSnapshot", () => {
    it("returns full program with notes and reason", () => {
        const result = readProgramSnapshot(sampleProgram());
        expect(result[0].notes).toBe("day notes w1");
        expect(result[0].exercises[0].notes).toBe("bench notes");
        expect(result[0].exercises[0].reason).toBe("Main press");
        expect(result[1].notes).toBe("day notes w2");
        expect(result[1].exercises[0].reason).toBe("Because rows");
    });

    it("keeps structure fields for mutateProgram targeting", () => {
        const result = readProgramSnapshot(sampleProgram());
        expect(result[0].folder_id).toBe(0);
        expect(result[0].order).toBe("2");
        expect(result[0].exercises[0].exercise_template_id).toBe("ex-1");
        expect(result[0].exercises[0].title).toBe("Bench");
    });

    it("returns empty array for undefined program", () => {
        expect(readProgramSnapshot(undefined)).toEqual([]);
    });
});

describe("formatReadProgramForModel", () => {
    it("includes full exercise fields in JSON for the agent", () => {
        const formatted = formatReadProgramForModel(sampleProgram());
        expect(formatted).toContain("Bench");
        expect(formatted).toContain("ex-1");
        expect(formatted).toContain("bench notes");
        expect(formatted).toContain("Main press");
    });

    it("returns empty message when program has no routines", () => {
        expect(formatReadProgramForModel([])).toContain("empty");
    });
});
