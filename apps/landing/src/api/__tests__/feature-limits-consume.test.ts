import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.fn();

vi.mock("@/api/index", () => ({
    supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import { recordAnonymousLlmRequest } from "@/api/feature-limits";

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
