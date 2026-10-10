import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";

import {
    emptyUserConstraintProfileRecord,
    getUserConstraints,
    saveUserConstraintProfile,
    upsertUserConstraints,
} from "../user-constraints";

type TSupabase = SupabaseClient<Database>;

function profileRecord(overrides: Partial<ReturnType<typeof emptyUserConstraintProfileRecord>> = {}) {
    return {
        ...emptyUserConstraintProfileRecord(),
        ...overrides,
        preferences: {
            ...emptyUserConstraintProfileRecord().preferences,
            ...overrides.preferences,
        },
    };
}

type TChain = {
    select: ReturnType<typeof vi.fn>;
    eq: ReturnType<typeof vi.fn>;
    maybeSingle: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    rpc: ReturnType<typeof vi.fn>;
};

function createSupabaseMock(options: {
    maybeSingleResult?: { data: unknown; error: unknown };
    upsertResult?: { error: unknown };
    rpcResult?: { error: unknown };
} = {}): { client: TSupabase; chain: TChain } {
    const chain: TChain = {
        select: vi.fn(),
        eq: vi.fn(),
        maybeSingle: vi.fn().mockResolvedValue(options.maybeSingleResult ?? { data: null, error: null }),
        upsert: vi.fn().mockResolvedValue(options.upsertResult ?? { error: null }),
        rpc: vi.fn().mockResolvedValue(options.rpcResult ?? { error: null }),
    };
    chain.select.mockReturnValue(chain);
    chain.eq.mockReturnValue(chain);

    const from = vi.fn(() => chain);

    return {
        client: { from, rpc: chain.rpc } as never,
        chain,
    };
}

describe("getUserConstraints", () => {
    it("returns null when no row exists", async () => {
        const { client } = createSupabaseMock({
            maybeSingleResult: { data: null, error: null },
        });

        const result = await getUserConstraints("user-1", client);
        expect(result).toBeNull();
    });

    it("maps structured fields and raw_statements", async () => {
        const { client, chain } = createSupabaseMock({
            maybeSingleResult: {
                data: {
                    injuries: ["knee"],
                    excluded_equipment: ["Band"],
                    excluded_areas: ["Legs"],
                    preferences: { splitType: "PPL" },
                    raw_statements: ["I hurt my knee"],
                },
                error: null,
            },
        });

        const result = await getUserConstraints("user-1", client);

        expect(chain.select).toHaveBeenCalledWith(
            "injuries, excluded_equipment, excluded_areas, preferences, raw_statements",
        );
        expect(result).toEqual({
            injuries: ["knee"],
            excludedEquipment: ["Band"],
            excludedAreas: ["Legs"],
            preferences: {
                splitType: "PPL",
                exerciseVariability: "",
                progressionSystem: "",
                deloadWeek: "",
                peakWeek: "",
                warmupExercises: "",
            },
            rawStatements: ["I hurt my knee"],
        });
    });

    it("defaults missing arrays and preference keys", async () => {
        const { client } = createSupabaseMock({
            maybeSingleResult: {
                data: {
                    injuries: null,
                    excluded_equipment: null,
                    excluded_areas: null,
                    preferences: null,
                    raw_statements: null,
                },
                error: null,
            },
        });

        const result = await getUserConstraints("user-1", client);
        expect(result).toEqual(emptyUserConstraintProfileRecord());
    });
});

describe("saveUserConstraintProfile", () => {
    it("upserts structured fields and replaces raw_statements", async () => {
        const { client, chain } = createSupabaseMock();
        const record = profileRecord({
            injuries: ["shoulder"],
            rawStatements: ["keep this", "and this"],
        });

        await saveUserConstraintProfile("user-1", record, client);

        expect(chain.upsert).toHaveBeenCalledWith(
            {
                user_id: "user-1",
                injuries: ["shoulder"],
                excluded_equipment: [],
                excluded_areas: [],
                preferences: record.preferences,
                raw_statements: ["keep this", "and this"],
            },
            { onConflict: "user_id" },
        );
        expect(chain.rpc).not.toHaveBeenCalled();
    });

    it("throws when upsert fails", async () => {
        const { client } = createSupabaseMock({
            upsertResult: { error: { message: "db down" } },
        });

        await expect(
            saveUserConstraintProfile("user-1", profileRecord(), client),
        ).rejects.toEqual({ message: "db down" });
    });
});

describe("upsertUserConstraints", () => {
    it("still appends raw via rpc when provided", async () => {
        const { client, chain } = createSupabaseMock();

        await upsertUserConstraints(
            client,
            "user-1",
            profileRecord({ injuries: ["knee"] }),
            "I hurt my knee",
        );

        expect(chain.upsert).toHaveBeenCalledWith(
            expect.not.objectContaining({ raw_statements: expect.anything() }),
            { onConflict: "user_id" },
        );
        expect(chain.rpc).toHaveBeenCalledWith("append_raw_statement", {
            p_user_id: "user-1",
            p_statement: "I hurt my knee",
        });
    });
});
