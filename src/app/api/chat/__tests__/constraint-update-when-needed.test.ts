/**
 * Regression: skipped questionnaire must not force an empty updateConstraintProfile call.
 *
 * Product rule: persist only when (A) non-empty constraints are not yet written, or
 * (B) something was changed/added. Empty unlock ("Build my program" after skip) → no call.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "node:fs/promises";
import * as path from "node:path";

import { instructions } from "@/app/api/chat/instructions/instructions";
import { getTools } from "@/app/api/chat/tools/tools";
import { initializeConstraintProfile } from "@/app/api/chat/constraints";

vi.mock("@/api/user-constraints", () => ({
    upsertUserConstraints: vi.fn(async () => {}),
}));

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { upsertUserConstraints } from "@/api/user-constraints";

const upsertUserConstraintsMock = vi.mocked(upsertUserConstraints);

type TToolExecuteHarness<TInput> = {
    execute: (input: TInput) => Promise<unknown>;
    description?: string;
};

function asTestTool<TInput>(tool: unknown): TToolExecuteHarness<TInput> {
    return tool as TToolExecuteHarness<TInput>;
}

describe("constraint update only when needed", () => {
    beforeEach(() => {
        upsertUserConstraintsMock.mockClear();
    });

    it("build-program skill does not mandate empty updateConstraintProfile on skip", async () => {
        const skillPath = path.join(
            process.cwd(),
            ".agents",
            "skills",
            "build-program",
            "SKILL.md",
        );
        const skill = await fs.readFile(skillPath, "utf8");

        expect(skill).not.toMatch(/If every field is empty,\s*still call once/i);
        expect(skill).not.toMatch(/still call once.*signed-in users get a row/i);
        expect(skill).toMatch(/skip|do not call|only when|non-empty/i);
        expect(skill).toMatch(/updateConstraintProfile/);
    });

    it("chat instructions do not mandate empty update after questionnaire unlock", () => {
        const prompt = instructions({
            hevyProgram: [],
            daysPerWeek: 4,
            programLength: 8,
        });

        expect(prompt).toContain("updateConstraintProfile");
        expect(prompt).not.toMatch(/must.*call.*updateConstraintProfile.*even.*(empty|skip)/i);
        // Unlock with answers → call; unlock with nothing to persist → skip
        expect(prompt).toMatch(/non-empty|only when|skip.*empty|nothing to persist|no.*fields/i);
    });

    it("updateConstraintProfile tool description does not require empty unlock calls", () => {
        const tools = getTools({
            constraintProfile: initializeConstraintProfile({}),
        });
        const update = asTestTool<Record<string, unknown>>(tools.updateConstraintProfile);
        const description = update.description ?? "";

        expect(description).toMatch(/Constraint profile/i);
        expect(description).not.toMatch(/REQUIRED after questionnaire unlock/i);
        expect(description).toMatch(/non-empty|skip|empty updates/i);
    });

    it("updateConstraintProfile no-ops empty payload (no upsert, skipped result)", async () => {
        const profile = initializeConstraintProfile({});
        const db = {} as TWorkoutHistoryDb;
        const tools = getTools({
            userId: "user-1",
            workoutHistoryDb: db,
            constraintProfile: profile,
        });
        const update = asTestTool<Record<string, never>>(tools.updateConstraintProfile);

        const result = await update.execute({});

        expect(result).toEqual(
            expect.objectContaining({
                skipped: true,
            }),
        );
        expect(upsertUserConstraintsMock).not.toHaveBeenCalled();
    });

    it("updateConstraintProfile still upserts when payload has changes", async () => {
        const profile = initializeConstraintProfile({});
        const db = {} as TWorkoutHistoryDb;
        const tools = getTools({
            userId: "user-1",
            workoutHistoryDb: db,
            constraintProfile: profile,
        });
        const update = asTestTool<{ addInjuries?: string[] }>(tools.updateConstraintProfile);

        const result = await update.execute({ addInjuries: ["knee"] });

        expect(result).toEqual(
            expect.objectContaining({
                updatedProfile: expect.objectContaining({
                    injuries: expect.arrayContaining(["knee"]),
                }),
            }),
        );
        expect(upsertUserConstraintsMock).toHaveBeenCalled();
    });

    it("updateConstraintProfile splits joined CSV add* blobs instead of storing them as one element", async () => {
        const healthIssues = "knee pain, stiff ankle";
        const excludeEquipment =
            "bodyweight, band, suspension, resistance_band, plate, other, none, cardio";
        const profile = initializeConstraintProfile({ healthIssues, excludeEquipment });
        const tools = getTools({
            userId: "user-1",
            workoutHistoryDb: {} as TWorkoutHistoryDb,
            constraintProfile: profile,
        });
        const update = asTestTool<{
            addInjuries?: string[];
            addExcludedEquipment?: string[];
        }>(tools.updateConstraintProfile);

        const result = await update.execute({
            addInjuries: [healthIssues],
            addExcludedEquipment: [excludeEquipment],
        });

        const updated = (
            result as {
                updatedProfile: {
                    injuries: string[];
                    excludedEquipment: string[];
                };
            }
        ).updatedProfile;

        expect(updated.injuries).toEqual(["knee pain", "stiff ankle"]);
        expect(updated.excludedEquipment).toEqual([
            "bodyweight",
            "band",
            "suspension",
            "resistance_band",
            "plate",
            "other",
            "none",
            "cardio",
        ]);
        expect(updated.injuries.every((s) => !s.includes(","))).toBe(true);
        expect(updated.excludedEquipment.every((s) => !s.includes(","))).toBe(true);
    });
});
