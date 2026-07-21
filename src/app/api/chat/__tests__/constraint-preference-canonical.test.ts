/**
 * updateConstraintProfile preferences must use questionnaire option-id enums.
 *
 * @vitest-environment node
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/api/user-constraints", () => ({
    upsertUserConstraints: vi.fn(async () => {}),
}));

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

import { upsertUserConstraints } from "@/api/user-constraints";
import { initializeConstraintProfile } from "@/app/api/chat/constraints";
import {
    constraintPreferencesUpdateSchema,
    getTools,
} from "@/app/api/chat/tools/tools";

const upsertUserConstraintsMock = vi.mocked(upsertUserConstraints);

type TToolExecuteHarness<TInput> = {
    execute: (input: TInput) => Promise<unknown>;
};

function asTestTool<TInput>(tool: unknown): TToolExecuteHarness<TInput> {
    return tool as TToolExecuteHarness<TInput>;
}

describe("constraint preference canonical enums", () => {
    beforeEach(() => {
        upsertUserConstraintsMock.mockClear();
    });

    it("rejects inventing splitType aliases like push_pull_legs", () => {
        const result = constraintPreferencesUpdateSchema.safeParse({
            splitType: "push_pull_legs",
        });
        expect(result.success).toBe(false);
    });

    it("accepts catalog option ids", () => {
        const result = constraintPreferencesUpdateSchema.safeParse({
            splitType: "ppl",
            exerciseVariability: "little",
            progressionSystem: "double",
            deloadWeek: "no",
            peakWeek: "no",
            warmupExercises: "no",
        });
        expect(result.success).toBe(true);
    });

    it("updateConstraintProfile persists canonical preference ids", async () => {
        const profile = initializeConstraintProfile({});
        const db = {} as TWorkoutHistoryDb;
        const tools = getTools({
            userId: "user-1",
            workoutHistoryDb: db,
            constraintProfile: profile,
        });
        const update = asTestTool<{
            preferences?: { splitType?: string; progressionSystem?: string };
        }>(tools.updateConstraintProfile);

        const result = await update.execute({
            preferences: { splitType: "ppl", progressionSystem: "double" },
        });

        expect(result).toEqual(
            expect.objectContaining({
                updatedProfile: expect.objectContaining({
                    preferences: expect.objectContaining({
                        splitType: "ppl",
                        progressionSystem: "double",
                    }),
                }),
            }),
        );
        expect(upsertUserConstraintsMock).toHaveBeenCalledWith(
            db,
            "user-1",
            expect.objectContaining({
                preferences: expect.objectContaining({
                    splitType: "ppl",
                    progressionSystem: "double",
                }),
            }),
            undefined,
        );
    });

    it("initializeConstraintProfile canonicalizes preference params", () => {
        const profile = initializeConstraintProfile({
            splitType: "PPL",
            progressionSystem: "Double",
            peakWeek: "NO",
        });
        expect(profile.preferences.splitType).toBe("ppl");
        expect(profile.preferences.progressionSystem).toBe("double");
        expect(profile.preferences.peakWeek).toBe("no");
    });
});
