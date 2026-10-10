/**
 * Persisted Mesocycle blocks (ADR 0032 / 04, C5): parse the stored shape, read
 * blocks only from a landed First build, and write them on New-path Save.
 */
import type { UIMessage } from "ai";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { parseMesocycleBlocks, readLandedMesocycleBlocks, type TMesocycleBlock } from "../mesocycle-blocks";

const { insertedPrograms, mockFrom } = vi.hoisted(() => {
    const insertedPrograms: unknown[] = [];
    const mockFrom = vi.fn((table: string) => {
        if (table === "programs") {
            return {
                insert: (rows: unknown[]) => {
                    insertedPrograms.push(...rows);
                    return { select: () => ({ single: async () => ({ data: { id: 7 }, error: null }) }) };
                },
            };
        }
        if (table === "hevy_exercise_templates") {
            return { select: () => ({ limit: async () => ({ data: [], error: null }) }) };
        }
        return { insert: async () => ({ error: null }) };
    });
    return { insertedPrograms, mockFrom };
});

vi.mock("@/api/index", () => ({
    supabase: {
        from: mockFrom,
        auth: { getSession: vi.fn(async () => ({ data: { session: null } })) },
    },
}));

const BLOCKS: TMesocycleBlock[] = [
    { name: "Accumulation", weeks: [1, 2, 3], intent: "volume" },
    { name: "Deload", weeks: [4], intent: "recovery" },
];

function buildProgramPart(output: unknown): UIMessage["parts"][number] {
    return {
        type: "tool-buildProgram",
        toolCallId: "call-1",
        state: "output-available",
        input: {},
        output,
    } as UIMessage["parts"][number];
}

function assistant(id: string, ...parts: UIMessage["parts"]): UIMessage {
    return { id, role: "assistant", parts };
}

const USER: UIMessage = { id: "u1", role: "user", parts: [{ type: "text", text: "build a PPL" }] };

describe("parseMesocycleBlocks", () => {
    it("keeps name, weeks, and intent and drops extra keys", () => {
        expect(parseMesocycleBlocks([{ ...BLOCKS[0], extra: true }])).toEqual([BLOCKS[0]]);
    });

    it("returns null for null, empty, or off-shape JSON", () => {
        expect(parseMesocycleBlocks(null)).toBeNull();
        expect(parseMesocycleBlocks([])).toBeNull();
        expect(parseMesocycleBlocks([{ name: "Peak", weeks: [0], intent: "" }])).toBeNull();
        expect(parseMesocycleBlocks({ name: "Peak" })).toBeNull();
    });
});

describe("readLandedMesocycleBlocks", () => {
    it("returns plan.blocks from a successful buildProgram", () => {
        const messages = [USER, assistant("a1", buildProgramPart({ routines: [], plan: { blocks: BLOCKS } }))];

        expect(readLandedMesocycleBlocks(messages)).toEqual(BLOCKS);
    });

    it("ignores a Soft-fail attempt so its blocks never persist", () => {
        const softFail = buildProgramPart({
            error: "phaseHardness.peak",
            message: "Week 4 is claimed Peak but mains are easier.",
            plan: { blocks: [{ name: "Peak", weeks: [4], intent: "peak" }] },
        });

        expect(readLandedMesocycleBlocks([USER, assistant("a1", softFail)])).toBeNull();
    });

    it("uses the last landed First build across turns", () => {
        const later: TMesocycleBlock[] = [{ name: "Strength", weeks: [1, 2], intent: "intensity" }];
        const messages = [
            USER,
            assistant("a1", buildProgramPart({ routines: [], plan: { blocks: BLOCKS } })),
            { ...USER, id: "u2" },
            assistant(
                "a2",
                buildProgramPart({ routines: [], plan: { blocks: later } }),
                buildProgramPart({ error: "weekCoverage", plan: { blocks: BLOCKS } }),
            ),
        ];

        expect(readLandedMesocycleBlocks(messages)).toEqual(later);
    });

    it("returns null when no First build landed", () => {
        expect(readLandedMesocycleBlocks([USER])).toBeNull();
    });
});

describe("saveProgramToSupabase Mesocycle blocks", () => {
    beforeEach(() => {
        insertedPrograms.length = 0;
    });

    const routines: THevyRoutine[] = [{ id: "1", title: "Push", folder_id: 0, order: "1", notes: "", exercises: [] }];

    it("writes the landed blocks on the program row", async () => {
        const { saveProgramToSupabase } = await import("@/components/program-builder/api/hevy");

        await expect(saveProgramToSupabase(routines, "PPL", undefined, "user-1", BLOCKS)).resolves.toMatchObject({
            status: "success",
            id: 7,
        });
        expect(insertedPrograms).toEqual([expect.objectContaining({ mesocycle_blocks: BLOCKS })]);
    });

    it("writes null when no First build landed", async () => {
        const { saveProgramToSupabase } = await import("@/components/program-builder/api/hevy");

        await saveProgramToSupabase(routines, "PPL", undefined, "user-1");
        expect(insertedPrograms).toEqual([expect.objectContaining({ mesocycle_blocks: null })]);
    });
});
