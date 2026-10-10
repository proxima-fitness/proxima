// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";

import {
    emptyUserTrainingProfile,
    getUserTrainingProfile,
    saveUserTrainingProfile,
    upsertUserTrainingProfile,
} from "../user-training-profile";

type TSupabase = SupabaseClient<Database>;

function profile(overrides: Partial<ReturnType<typeof emptyUserTrainingProfile>> = {}) {
    return {
        ...emptyUserTrainingProfile(),
        ...overrides,
    };
}

type TChain = {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
};

function createSupabaseMock(options: {
    maybeSingleResult?: { data: unknown; error: unknown };
    upsertResult?: { error: unknown };
} = {}): { client: TSupabase; chain: TChain; from: ReturnType<typeof vi.fn> } {
    const chain: TChain = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue(options.maybeSingleResult ?? { data: null, error: null }),
        upsert: vi.fn().mockResolvedValue(options.upsertResult ?? { error: null }),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);

    const from = vi.fn(() => chain);

    return {
        client: { from } as never,
        chain,
        from,
    };
}

describe("getUserTrainingProfile", () => {
    it("returns null when no row exists", async () => {
        const { client } = createSupabaseMock({
            maybeSingleResult: { data: null, error: null },
        });

        const result = await getUserTrainingProfile("user-1", client);
        expect(result).toBeNull();
    });

    it("maps structured fields and treats null sex as empty (prefer-not-to-say)", async () => {
        const { client, chain, from } = createSupabaseMock({
            maybeSingleResult: {
                data: {
                    age: 28,
                    sex: null,
                    height_cm: 180,
                    experience_level: "intermediate",
                    physique_phase: "bulk",
                    training_focus: "powerbuilding",
                    activity_level: "moderate",
                    session_duration_min: 60,
                },
                error: null,
            },
        });

        const result = await getUserTrainingProfile("user-1", client);

        expect(from).toHaveBeenCalledWith("user_training_profile");
        expect(chain.select).toHaveBeenCalledWith(
            "age, sex, height_cm, experience_level, physique_phase, training_focus, activity_level, session_duration_min",
        );
        expect(result).toEqual({
            age: 28,
            sex: "",
            heightCm: 180,
            experienceLevel: "intermediate",
            physiquePhase: "bulk",
            trainingFocus: "powerbuilding",
            activityLevel: "moderate",
            sessionDurationMin: 60,
        });
    });

    it("defaults missing fields to empty/null", async () => {
        const { client } = createSupabaseMock({
            maybeSingleResult: {
                data: {
                    age: null,
                    sex: null,
                    height_cm: null,
                    experience_level: null,
                    physique_phase: null,
                    training_focus: null,
                    activity_level: null,
                    session_duration_min: null,
                },
                error: null,
            },
        });

        const result = await getUserTrainingProfile("user-1", client);
        expect(result).toEqual(emptyUserTrainingProfile());
    });
});

describe("saveUserTrainingProfile", () => {
    it("upserts full profile and stores empty sex as null", async () => {
        const { client, chain } = createSupabaseMock();
        const record = profile({
            age: 30,
            sex: "",
            heightCm: 175.5,
            experienceLevel: "advanced",
            physiquePhase: "cut",
            trainingFocus: "hyrox",
            activityLevel: "high",
            sessionDurationMin: 45,
        });

        await saveUserTrainingProfile("user-1", record, client);

        expect(chain.upsert).toHaveBeenCalledWith(
            {
                user_id: "user-1",
                age: 30,
                sex: null,
                height_cm: 175.5,
                experience_level: "advanced",
                physique_phase: "cut",
                training_focus: "hyrox",
                activity_level: "high",
                session_duration_min: 45,
            },
            { onConflict: "user_id" },
        );
    });

    it("throws when upsert fails", async () => {
        const { client } = createSupabaseMock({
            upsertResult: { error: { message: "db down" } },
        });

        await expect(saveUserTrainingProfile("user-1", profile(), client)).rejects.toEqual({
            message: "db down",
        });
    });
});

describe("upsertUserTrainingProfile", () => {
    it("upserts profile for agent path without throwing on error", async () => {
        const { client, chain } = createSupabaseMock({
            upsertResult: { error: { message: "db down" } },
        });

        await expect(
            upsertUserTrainingProfile(client, "user-1", profile({ age: 22, sex: "male" })),
        ).resolves.toBeUndefined();

        expect(chain.upsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: "user-1",
                age: 22,
                sex: "male",
            }),
            { onConflict: "user_id" },
        );
    });
});
