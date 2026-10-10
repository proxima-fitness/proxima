// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import { USAGE_CAP_ERROR } from "@/lib/usage-cap";

const {
    mockGetUser,
    mockRpc,
    mockTryConsume,
    mockUsageCapResponse,
    mockCreateAgentUIStreamResponse,
    mockGateway,
    ToolLoopAgentMock,
} = vi.hoisted(() => {
    const mockUsageCapResponse = vi.fn(
        (options?: { resets_on?: string | null }) =>
            new Response(
                JSON.stringify({
                    error: "usage_cap",
                    feature: "monthly_llm_requests",
                    ...(options?.resets_on ? { resets_on: options.resets_on } : {}),
                }),
                { status: 402, headers: { "Content-Type": "application/json" } },
            ),
    );
    return {
        mockGetUser: vi.fn(),
        mockRpc: vi.fn(async () => ({ data: null, error: null })),
        mockTryConsume: vi.fn(),
        mockUsageCapResponse,
        mockCreateAgentUIStreamResponse: vi.fn(
            async () => new Response("stream", { status: 200 }),
        ),
        mockGateway: vi.fn(() => "mock-model"),
        ToolLoopAgentMock: vi.fn(function ToolLoopAgent() {
            return {};
        }),
    };
});

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
        rpc: mockRpc,
    })),
}));

vi.mock("@/lib/server-feature-limits", () => ({
    USAGE_CAP_ERROR: "usage_cap",
    tryConsumeMonthlyLlmRequest: mockTryConsume,
    usageCapResponse: mockUsageCapResponse,
}));

vi.mock("@langfuse/tracing", () => ({
    observe: (fn: unknown) => fn,
    propagateAttributes: (_attrs: unknown, fn: () => unknown) => fn(),
}));

vi.mock("../../../../instrumentation", () => ({
    langfuseSpanProcessor: { forceFlush: vi.fn() },
}));

vi.mock("next/server", () => ({
    after: vi.fn(),
}));

vi.mock("ai", () => ({
    ToolLoopAgent: ToolLoopAgentMock,
    createAgentUIStreamResponse: mockCreateAgentUIStreamResponse,
    gateway: mockGateway,
    isStepCount: () => () => false,
}));

vi.mock("../instructions/instructions", () => ({
    instructions: vi.fn(() => "system"),
}));

vi.mock("../tools/tools", () => ({
    getTools: vi.fn(() => ({})),
}));

vi.mock("../constraints", () => ({
    initializeConstraintProfile: vi.fn(() => ({})),
}));

vi.mock("../constraints/merge", () => ({
    mergeConstraintProfiles: vi.fn((_a, b) => b),
}));

vi.mock("@/api/user-constraints", () => ({
    getUserConstraints: vi.fn(async () => null),
}));

vi.mock("../training-profile", () => ({
    initializeTrainingProfile: vi.fn(() => ({})),
    mergeTrainingProfiles: vi.fn((_a, b) => b),
}));

vi.mock("@/api/user-training-profile", () => ({
    getUserTrainingProfile: vi.fn(async () => null),
}));

vi.mock("@/api/body-measurements-read", () => ({
    getLatestBodyMeasurement: vi.fn(async () => null),
}));

vi.mock("../skills/sandbox", () => ({
    createSandbox: vi.fn(() => ({})),
}));

vi.mock("../skills/index", () => ({
    discoverSkills: vi.fn(async () => []),
}));

vi.mock("../sanitize-messages", () => ({
    sanitizeMessagesWithUnresolvedToolCalls: (messages: unknown) => messages,
}));

vi.mock("../always-available-tools", () => ({
    ALWAYS_AVAILABLE_CHAT_TOOLS: [],
}));

// Import once after mocks — avoids per-test cold dynamic import timeouts + cascade pollution.
import { POST } from "../route";

describe("POST /api/chat usage enforcement", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUsageCapResponse.mockImplementation(
            (options?: { resets_on?: string | null }) =>
                new Response(
                    JSON.stringify({
                        error: USAGE_CAP_ERROR,
                        feature: "monthly_llm_requests",
                        ...(options?.resets_on ? { resets_on: options.resets_on } : {}),
                    }),
                    { status: 402, headers: { "Content-Type": "application/json" } },
                ),
        );
        mockCreateAgentUIStreamResponse.mockResolvedValue(
            new Response("stream", { status: 200 }),
        );
    });

    it("returns paywall for signed-in user at cap without starting the model stream", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } as User },
        });
        mockTryConsume.mockResolvedValue({
            ok: false,
            reason: "usage_cap",
            resets_on: "2026-08-01",
        });

        const res = await POST(
            new Request("http://localhost/api/chat", {
                method: "POST",
                body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
            }),
        );

        expect(res.status).toBe(402);
        await expect(res.json()).resolves.toMatchObject({
            error: USAGE_CAP_ERROR,
            feature: "monthly_llm_requests",
        });
        expect(mockTryConsume).toHaveBeenCalledTimes(1);
        expect(mockGateway).not.toHaveBeenCalled();
        expect(ToolLoopAgentMock).not.toHaveBeenCalled();
        expect(mockCreateAgentUIStreamResponse).not.toHaveBeenCalled();
    });

    it("streams for signed-in user under cap after consume", async () => {
        mockGetUser.mockResolvedValue({
            data: { user: { id: "user-1" } as User },
        });
        mockTryConsume.mockResolvedValue({
            ok: true,
            limits: { has_active_subscription: true },
        });

        const res = await POST(
            new Request("http://localhost/api/chat", {
                method: "POST",
                body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
            }),
        );

        expect(res.status).toBe(200);
        expect(mockTryConsume).toHaveBeenCalledTimes(1);
        expect(ToolLoopAgentMock).toHaveBeenCalled();
        expect(mockCreateAgentUIStreamResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                onError: expect.any(Function),
            }),
        );
    });

    it("does not call try_consume for anonymous users", async () => {
        mockGetUser.mockResolvedValue({ data: { user: null } });

        const res = await POST(
            new Request("http://localhost/api/chat", {
                method: "POST",
                body: JSON.stringify({ messages: [{ role: "user", content: "hi" }] }),
            }),
        );

        expect(res.status).toBe(200);
        expect(mockTryConsume).not.toHaveBeenCalled();
        expect(mockCreateAgentUIStreamResponse).toHaveBeenCalled();
    });
});
