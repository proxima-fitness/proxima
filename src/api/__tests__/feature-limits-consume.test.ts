import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const mockRpc = vi.fn();

vi.mock("@/api/index", () => ({
    supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import {
    recordAnonymousLlmRequest,
    tryConsumeMonthlyExport,
} from "@/api/feature-limits";

describe("tryConsumeMonthlyExport", () => {
    const user = { id: "user-1" } as User;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("calls try_consume_feature_usage and allows under cap", async () => {
        mockRpc.mockResolvedValue({ data: [{ allowed: true }], error: null });

        await expect(tryConsumeMonthlyExport(user)).resolves.toEqual({ allowed: true });
        expect(mockRpc).toHaveBeenCalledWith("try_consume_feature_usage", {
            p_feature: "monthly_exports_used",
        });
        expect(mockRpc).not.toHaveBeenCalledWith(
            "increment_feature_usage",
            expect.anything(),
        );
    });

    it("denies at cap without uncapped increment", async () => {
        mockRpc.mockResolvedValue({ data: [{ allowed: false }], error: null });

        await expect(tryConsumeMonthlyExport(user)).resolves.toEqual({ allowed: false });
        expect(mockRpc).toHaveBeenCalledTimes(1);
        expect(mockRpc.mock.calls[0]?.[0]).toBe("try_consume_feature_usage");
    });

    it("denies when unauthenticated", async () => {
        await expect(tryConsumeMonthlyExport(null)).resolves.toMatchObject({
            allowed: false,
        });
        expect(mockRpc).not.toHaveBeenCalled();
    });
});

describe("recordAnonymousLlmRequest", () => {
    beforeEach(() => {
        localStorage.clear();
    });

    it("decrements localStorage and never hits RPC", () => {
        localStorage.setItem("proxima_anonymous_llm_remaining", "3");
        recordAnonymousLlmRequest();
        expect(localStorage.getItem("proxima_anonymous_llm_remaining")).toBe("2");
        expect(mockRpc).not.toHaveBeenCalled();
    });
});
