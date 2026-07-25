import { describe, expect, it, vi, beforeEach } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
    applyTestTierOverrideToLimits,
    parseTestTierOverride,
} from "@/api/feature-limits";
import {
    getServerHasActiveSubscription,
    getServerMyFeatureLimits,
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

    it("getServerHasActiveSubscription reflects Pro test override", async () => {
        vi.mocked(isTestUser).mockReturnValue(true);
        vi.mocked(cookies).mockResolvedValue({
            get: () => ({ value: "pro_plus" }),
        } as Awaited<ReturnType<typeof cookies>>);

        await expect(getServerHasActiveSubscription(supabase, user)).resolves.toBe(true);
    });
});
