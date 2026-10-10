import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
    applyTestTierOverrideToLimits,
    parseTestTierOverride,
} from "@/api/feature-limits";
import {
    USAGE_CAP_ERROR,
    getServerHasActiveSubscription,
    getServerMyFeatureLimits,
    tryConsumeMonthlyLlmRequest,
    usageCapResponse,
} from "@/lib/server-feature-limits";

function mockSupabase(mock: unknown): Parameters<typeof getServerMyFeatureLimits>[0] {
    return mock as Parameters<typeof getServerMyFeatureLimits>[0];
}

const baseLimits: TFeatureLimits = {
    user_id: "user-1",
    tier: "Free",
    has_active_subscription: false,
    max_monthly_exports: 1,
    monthly_exports_used: 0,
    remaining_exports: 1,
    max_monthly_llm_requests: 20,
    monthly_llm_requests_used: 5,
    remaining_llm_requests: 15,
    period_start: "2026-07-01",
    resets_on: "2026-08-01",
};

vi.mock("next/headers", () => ({
    cookies: vi.fn(),
}));

vi.mock("@/api/feature-limits", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/feature-limits")>();
    return {
        ...actual,
        isTestUser: vi.fn(),
    };
});

import { cookies } from "next/headers";
import { isTestUser } from "@/api/feature-limits";

describe("feature-limits test tier helpers", () => {
    it("parses valid test tier overrides", () => {
        expect(parseTestTierOverride("pro")).toBe("pro");
        expect(parseTestTierOverride("pro_plus")).toBe("pro_plus");
        expect(parseTestTierOverride("free")).toBe("free");
        expect(parseTestTierOverride("invalid")).toBeNull();
        expect(parseTestTierOverride(null)).toBeNull();
    });

    it("applies Pro override as paid", () => {
        const result = applyTestTierOverrideToLimits(baseLimits, "pro");
        expect(result.tier).toBe("Pro");
        expect(result.has_active_subscription).toBe(true);
        expect(result.max_monthly_llm_requests).toBe(100);
        expect(result.remaining_llm_requests).toBe(95);
        expect(result.period_start).toBe(baseLimits.period_start);
        expect(result.resets_on).toBe(baseLimits.resets_on);
    });

    it("applies Pro+ override as paid", () => {
        const result = applyTestTierOverrideToLimits(baseLimits, "pro_plus");
        expect(result.tier).toBe("Pro+");
        expect(result.has_active_subscription).toBe(true);
        expect(result.max_monthly_llm_requests).toBe(1000);
    });

    it("applies Free override as unpaid", () => {
        const result = applyTestTierOverrideToLimits(baseLimits, "free");
        expect(result.tier).toBe("Free");
        expect(result.has_active_subscription).toBe(false);
    });

    it("applies Free override as 45 remaining LLM at zero usage", () => {
        const zeroUsage: TFeatureLimits = {
            ...baseLimits,
            monthly_llm_requests_used: 0,
            remaining_llm_requests: 0,
        };
        const result = applyTestTierOverrideToLimits(zeroUsage, "free");
        expect(result.max_monthly_llm_requests).toBe(45);
        expect(result.remaining_llm_requests).toBe(45);
        expect(result.has_active_subscription).toBe(false);
    });
});

describe("server-feature-limits", () => {
    const mockRpc = vi.fn();
    const supabase = mockSupabase({ rpc: mockRpc });
    const user = { id: "user-1", email: "qa@proxima.test" } as User;

    beforeEach(() => {
        vi.clearAllMocks();
        mockRpc.mockResolvedValue({ data: [baseLimits], error: null });
    });

    it("returns RPC limits for non-test users", async () => {
        vi.mocked(isTestUser).mockReturnValue(false);

        const limits = await getServerMyFeatureLimits(supabase, user);
        expect(limits).toEqual(baseLimits);
    });

    it("applies Pro cookie override for test users", async () => {
        vi.mocked(isTestUser).mockReturnValue(true);
        vi.mocked(cookies).mockResolvedValue({
            get: () => ({ value: "pro" }),
        } as Awaited<ReturnType<typeof cookies>>);

        const limits = await getServerMyFeatureLimits(supabase, user);
        expect(limits?.has_active_subscription).toBe(true);
        expect(limits?.tier).toBe("Pro");
    });

    it("applies Free cookie override for test users", async () => {
        vi.mocked(isTestUser).mockReturnValue(true);
        vi.mocked(cookies).mockResolvedValue({
            get: () => ({ value: "free" }),
        } as Awaited<ReturnType<typeof cookies>>);

        const limits = await getServerMyFeatureLimits(supabase, user);
        expect(limits?.has_active_subscription).toBe(false);
    });

    it("Free cookie override shows 45 remaining LLM at zero usage", async () => {
        mockRpc.mockResolvedValue({
            data: [{
                ...baseLimits,
                monthly_llm_requests_used: 0,
                remaining_llm_requests: 0,
            }],
            error: null,
        });
        vi.mocked(isTestUser).mockReturnValue(true);
        vi.mocked(cookies).mockResolvedValue({
            get: () => ({ value: "free" }),
        } as Awaited<ReturnType<typeof cookies>>);

        const limits = await getServerMyFeatureLimits(supabase, user);
        expect(limits?.max_monthly_llm_requests).toBe(45);
        expect(limits?.remaining_llm_requests).toBe(45);
        expect(limits?.has_active_subscription).toBe(false);
    });

    it("getServerHasActiveSubscription reflects Pro test override", async () => {
        vi.mocked(isTestUser).mockReturnValue(true);
        vi.mocked(cookies).mockResolvedValue({
            get: () => ({ value: "pro_plus" }),
        } as Awaited<ReturnType<typeof cookies>>);

        await expect(getServerHasActiveSubscription(supabase, user)).resolves.toBe(true);
    });
});

describe("usageCapResponse", () => {
    it("returns 402 with stable usage_cap body", async () => {
        const res = usageCapResponse({ resets_on: "2026-08-01" });
        expect(res.status).toBe(402);
        await expect(res.json()).resolves.toEqual({
            error: USAGE_CAP_ERROR,
            feature: "monthly_llm_requests",
            resets_on: "2026-08-01",
        });
    });
});

describe("tryConsumeMonthlyLlmRequest", () => {
    const mockRpc = vi.fn();
    const supabase = mockSupabase({ rpc: mockRpc });
    const user = { id: "user-1", email: "qa@proxima.test" } as User;

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(isTestUser).mockReturnValue(false);
    });

    it("returns usage_cap without try_consume when remaining is 0 (QA / override)", async () => {
        mockRpc.mockResolvedValueOnce({
            data: [{ ...baseLimits, remaining_llm_requests: 0 }],
            error: null,
        });

        const result = await tryConsumeMonthlyLlmRequest(supabase, user);

        expect(result).toEqual({
            ok: false,
            reason: "usage_cap",
            resets_on: "2026-08-01",
        });
        expect(mockRpc).toHaveBeenCalledTimes(1);
        expect(mockRpc).toHaveBeenCalledWith("get_my_feature_limits");
    });

    it("consumes under cap and returns limits", async () => {
        mockRpc
            .mockResolvedValueOnce({ data: [baseLimits], error: null })
            .mockResolvedValueOnce({ data: [{ allowed: true }], error: null });

        const result = await tryConsumeMonthlyLlmRequest(supabase, user);

        expect(result).toEqual({ ok: true, limits: baseLimits });
        expect(mockRpc).toHaveBeenNthCalledWith(2, "try_consume_feature_usage", {
            p_feature: "monthly_llm_requests",
        });
    });

    it("returns usage_cap when RPC denies at real tier ceiling", async () => {
        mockRpc
            .mockResolvedValueOnce({ data: [baseLimits], error: null })
            .mockResolvedValueOnce({ data: [{ allowed: false }], error: null });

        const result = await tryConsumeMonthlyLlmRequest(supabase, user);

        expect(result).toEqual({
            ok: false,
            reason: "usage_cap",
            resets_on: "2026-08-01",
        });
    });

    it("returns rpc_error when try_consume fails", async () => {
        mockRpc
            .mockResolvedValueOnce({ data: [baseLimits], error: null })
            .mockResolvedValueOnce({ data: null, error: { message: "boom" } });

        const result = await tryConsumeMonthlyLlmRequest(supabase, user);

        expect(result.ok).toBe(false);
        if (!result.ok && result.reason === "rpc_error") {
            expect(result.error.message).toBe("boom");
        } else {
            expect.fail("expected rpc_error");
        }
    });
});
