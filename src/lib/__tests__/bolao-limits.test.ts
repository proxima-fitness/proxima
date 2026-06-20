import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
    BOLAO_DAILY_LIMIT,
    mapBolaoConsumeRow,
    mapBolaoPredictorLimitsRow,
    unlimitedBolaoPredictorLimits,
} from "@/lib/bolao-limits";
import {
    consumeBolaoPrediction,
    getServerBolaoPredictorLimits,
} from "@/lib/server-bolao-limits";

vi.mock("@/api/feature-limits", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/feature-limits")>();
    return {
        ...actual,
        isTestUser: vi.fn(),
    };
});

import { isTestUser } from "@/api/feature-limits";

describe("bolao-limits helpers", () => {
    it("maps unlimited test-user limits", () => {
        const limits = unlimitedBolaoPredictorLimits();
        expect(limits.unlimited).toBe(true);
        expect(limits.remainingToday).toBe(BOLAO_DAILY_LIMIT);
        expect(limits.usedToday).toBe(false);
    });

    it("maps RPC row when unused today", () => {
        expect(
            mapBolaoPredictorLimitsRow({ used_today: false, remaining_today: 1 }),
        ).toEqual({
            usedToday: false,
            remainingToday: 1,
            unlimited: false,
        });
    });

    it("maps RPC row when used today", () => {
        expect(
            mapBolaoPredictorLimitsRow({ used_today: true, remaining_today: 0 }),
        ).toEqual({
            usedToday: true,
            remainingToday: 0,
            unlimited: false,
        });
    });

    it("defaults missing RPC row to one remaining", () => {
        expect(mapBolaoPredictorLimitsRow(null)).toEqual({
            usedToday: false,
            remainingToday: BOLAO_DAILY_LIMIT,
            unlimited: false,
        });
    });

    it("maps consume row to allowed flag", () => {
        expect(mapBolaoConsumeRow({ allowed: true })).toBe(true);
        expect(mapBolaoConsumeRow({ allowed: false })).toBe(false);
        expect(mapBolaoConsumeRow(null)).toBe(false);
    });
});

describe("server-bolao-limits", () => {
    const mockRpc = vi.fn();
    const supabase = { rpc: mockRpc } as unknown as Parameters<
        typeof getServerBolaoPredictorLimits
    >[0];
    const user = { id: "user-1", email: "user@example.com" } as User;
    const testUser = { id: "test-1", email: "qa@proxima.test" } as User;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns unlimited limits for test users without RPC", async () => {
        vi.mocked(isTestUser).mockReturnValue(true);

        const limits = await getServerBolaoPredictorLimits(supabase, testUser);
        expect(limits?.unlimited).toBe(true);
        expect(mockRpc).not.toHaveBeenCalled();
    });

    it("fetches limits from RPC for regular users", async () => {
        vi.mocked(isTestUser).mockReturnValue(false);
        mockRpc.mockResolvedValue({
            data: [{ used_today: true, remaining_today: 0 }],
            error: null,
        });

        const limits = await getServerBolaoPredictorLimits(supabase, user);
        expect(mockRpc).toHaveBeenCalledWith("get_bolao_predictor_limits");
        expect(limits).toEqual({
            usedToday: true,
            remainingToday: 0,
            unlimited: false,
        });
    });

    it("allows consume for test users without RPC", async () => {
        vi.mocked(isTestUser).mockReturnValue(true);

        await expect(consumeBolaoPrediction(supabase, testUser)).resolves.toEqual({
            allowed: true,
            error: null,
        });
        expect(mockRpc).not.toHaveBeenCalled();
    });

    it("consumes via RPC for regular users", async () => {
        vi.mocked(isTestUser).mockReturnValue(false);
        mockRpc.mockResolvedValue({ data: [{ allowed: true }], error: null });

        await expect(consumeBolaoPrediction(supabase, user)).resolves.toEqual({
            allowed: true,
            error: null,
        });
        expect(mockRpc).toHaveBeenCalledWith("try_consume_bolao_prediction");
    });

    it("returns not allowed when RPC denies consume", async () => {
        vi.mocked(isTestUser).mockReturnValue(false);
        mockRpc.mockResolvedValue({ data: [{ allowed: false }], error: null });

        await expect(consumeBolaoPrediction(supabase, user)).resolves.toEqual({
            allowed: false,
            error: null,
        });
    });

    it("rejects consume when user is missing", async () => {
        await expect(consumeBolaoPrediction(supabase, null)).resolves.toEqual({
            allowed: false,
            error: expect.any(Error),
        });
    });
});
