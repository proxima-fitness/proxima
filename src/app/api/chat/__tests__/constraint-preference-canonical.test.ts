/**
 * updateConstraintProfile preferences must use questionnaire option-id enums;
 * null clears a key to "" (ADR 0031 sub-plan 01).
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

    it("accepts null on every preference key (clear)", () => {
        const result = constraintPreferencesUpdateSchema.safeParse({
            splitType: null,
            exerciseVariability: null,
            progressionSystem: null,
            deloadWeek: null,
            peakWeek: null,
            warmupExercises: null,
        });
        expect(result.success).toBe(true);
    });

    it("rejects empty string as a preference value (null is the only clear)", () => {
        const result = constraintPreferencesUpdateSchema.safeParse({ splitType: "" });
        expect(result.success).toBe(false);
    });

    describe("updateConstraintProfile preference clears (ADR 0031)", () => {
        type TPreferencePatch = Partial<Record<
            "splitType" | "exerciseVariability" | "progressionSystem" | "deloadWeek" | "peakWeek" | "warmupExercises",
            string | null
        >>;

        function setup() {
            const profile = initializeConstraintProfile({
                splitType: "ppl",
                exerciseVariability: "little",
                progressionSystem: "double",
                deloadWeek: "no",
                peakWeek: "no",
                warmupExercises: "no",
            });
            const db = {} as TWorkoutHistoryDb;
            const tools = getTools({
                userId: "user-1",
                workoutHistoryDb: db,
                constraintProfile: profile,
            });
            const update = asTestTool<{ preferences?: TPreferencePatch }>(tools.updateConstraintProfile);
            return { profile, db, update };
        }

        it("splitType: null clears to \"\" and persists", async () => {
            const { profile, db, update } = setup();

            await update.execute({ preferences: { splitType: null } });

            expect(profile.preferences.splitType).toBe("");
            expect(upsertUserConstraintsMock).toHaveBeenCalledWith(
                db,
                "user-1",
                expect.objectContaining({
                    preferences: expect.objectContaining({ splitType: "" }),
                }),
                undefined,
            );
        });

        it("clears all six preference keys via null", async () => {
            const { profile, update } = setup();

            await update.execute({
                preferences: {
                    splitType: null,
                    exerciseVariability: null,
                    progressionSystem: null,
                    deloadWeek: null,
                    peakWeek: null,
                    warmupExercises: null,
                },
            });

            expect(profile.preferences).toEqual({
                splitType: "",
                exerciseVariability: "",
                progressionSystem: "",
                deloadWeek: "",
                peakWeek: "",
                warmupExercises: "",
            });
            expect(upsertUserConstraintsMock).toHaveBeenCalledTimes(1);
        });

        it("omitted keys stay unchanged when another key is cleared", async () => {
            const { profile, update } = setup();

            await update.execute({ preferences: { splitType: null } });

            expect(profile.preferences.progressionSystem).toBe("double");
            expect(profile.preferences.exerciseVariability).toBe("little");
        });

        it("replacing with another catalog id is a set, not a clear", async () => {
            const { profile, update } = setup();

            await update.execute({ preferences: { splitType: "fb" } });

            expect(profile.preferences.splitType).toBe("fb");
            expect(profile.preferences.splitType).not.toBe("");
        });

        it("preferences: {} alone still skips as an empty update", async () => {
            const { profile, update } = setup();

            const result = await update.execute({ preferences: {} });

            expect(result).toEqual(expect.objectContaining({ skipped: true }));
            expect(profile.preferences.splitType).toBe("ppl");
            expect(upsertUserConstraintsMock).not.toHaveBeenCalled();
        });
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
