import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { agentExposedMutations } from "./catalog";
import { mutateProgramInputSchema } from "./agentSchema";

describe("mutateProgramInputSchema", () => {
    it("accepts edit_day_title", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Push" }],
        });
        expect(parsed.success).toBe(true);
    });

    it("accepts update_set", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [
                {
                    op: "update_set",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { rpe: 8 },
                },
            ],
        });
        expect(parsed.success).toBe(true);
    });

    it("rejects human-only duplicate_week", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [{ op: "duplicate_week", fromWeekIndex: 0, toWeekIndexes: [1] }],
        });
        expect(parsed.success).toBe(false);
    });

    it("rejects unknown op id", () => {
        const parsed = mutateProgramInputSchema.safeParse({
            operations: [{ op: "not_a_real_op", folderIds: [0] }],
        });
        expect(parsed.success).toBe(false);
    });

    it("includes every agent-exposed op id", () => {
        const exposedIds = agentExposedMutations.map((m) => m.id);
        expect(exposedIds).toContain("insert_exercise");
        expect(exposedIds).toContain("update_set");
        expect(exposedIds).not.toContain("duplicate_week");
        expect(exposedIds).toHaveLength(12);
    });
});
