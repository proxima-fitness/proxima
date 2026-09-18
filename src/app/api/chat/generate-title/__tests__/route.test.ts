/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
    mockGetUser,
    mockGetChatTitleSource,
    mockApplyGeneratedChatTitleIfPlaceholder,
    mockGenerateChatTitle,
} = vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockGetChatTitleSource: vi.fn(),
    mockApplyGeneratedChatTitleIfPlaceholder: vi.fn(),
    mockGenerateChatTitle: vi.fn(),
}));

vi.mock("@/utils/supabase/server", () => ({
    createClient: vi.fn(async () => ({
        auth: { getUser: mockGetUser },
    })),
}));

vi.mock("@/api/chat-title-write", () => ({
    getChatTitleSource: mockGetChatTitleSource,
    applyGeneratedChatTitleIfPlaceholder: mockApplyGeneratedChatTitleIfPlaceholder,
}));

vi.mock("../generate", () => ({
    generateChatTitle: mockGenerateChatTitle,
}));

import { POST } from "../route";

function userMessage(text: string) {
    return { role: "user", parts: [{ type: "text", text }] };
}

describe("POST /api/chat/generate-title", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
        mockGenerateChatTitle.mockResolvedValue("4-day PPL for hypertrophy");
        mockApplyGeneratedChatTitleIfPlaceholder.mockResolvedValue("applied");
    });

    it("returns 401 when signed out", async () => {
        mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: null });

        const response = await POST(
            new Request("http://localhost/api/chat/generate-title", {
                method: "POST",
                body: JSON.stringify({ chatId: "chat-1" }),
            }),
        );

        expect(response.status).toBe(401);
        expect(mockGenerateChatTitle).not.toHaveBeenCalled();
    });

    it("returns 400 without chatId", async () => {
        const response = await POST(
            new Request("http://localhost/api/chat/generate-title", {
                method: "POST",
                body: JSON.stringify({}),
            }),
        );

        expect(response.status).toBe(400);
        expect(mockGenerateChatTitle).not.toHaveBeenCalled();
    });

    it("skips when there is no user text", async () => {
        mockGetChatTitleSource.mockResolvedValueOnce({
            title: "Untitled",
            conversation: [{ role: "assistant", parts: [{ type: "text", text: "Hi" }] }],
        });

        const response = await POST(
            new Request("http://localhost/api/chat/generate-title", {
                method: "POST",
                body: JSON.stringify({ chatId: "chat-1" }),
            }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({
            applied: false,
            skipped: true,
            reason: "no-text",
        });
        expect(mockGenerateChatTitle).not.toHaveBeenCalled();
    });

    it("skips when the stored title is no longer the placeholder", async () => {
        mockGetChatTitleSource.mockResolvedValueOnce({
            title: "My PPL",
            conversation: [userMessage("I want a 4-day PPL")],
        });

        const response = await POST(
            new Request("http://localhost/api/chat/generate-title", {
                method: "POST",
                body: JSON.stringify({ chatId: "chat-1" }),
            }),
        );

        expect(await response.json()).toMatchObject({
            applied: false,
            reason: "title-changed",
        });
        expect(mockGenerateChatTitle).not.toHaveBeenCalled();
    });

    it("applies a generated title when the placeholder is still stored", async () => {
        mockGetChatTitleSource.mockResolvedValueOnce({
            title: "I want a 4-day PPL",
            conversation: [userMessage("I want a 4-day PPL")],
        });

        const response = await POST(
            new Request("http://localhost/api/chat/generate-title", {
                method: "POST",
                body: JSON.stringify({ chatId: "chat-1" }),
            }),
        );

        expect(await response.json()).toEqual({
            applied: true,
            title: "4-day PPL for hypertrophy",
        });
        expect(mockGenerateChatTitle).toHaveBeenCalledWith("I want a 4-day PPL");
        expect(mockApplyGeneratedChatTitleIfPlaceholder).toHaveBeenCalledWith(
            expect.anything(),
            "user-1",
            "chat-1",
            "I want a 4-day PPL",
            "4-day PPL for hypertrophy",
        );
    });

    it("keeps the placeholder when the model throws", async () => {
        mockGetChatTitleSource.mockResolvedValueOnce({
            title: "Build me a program",
            conversation: [userMessage("Build me a program")],
        });
        mockGenerateChatTitle.mockRejectedValueOnce(new Error("gateway down"));

        const response = await POST(
            new Request("http://localhost/api/chat/generate-title", {
                method: "POST",
                body: JSON.stringify({ chatId: "chat-1" }),
            }),
        );

        expect(response.status).toBe(200);
        expect(await response.json()).toMatchObject({
            applied: false,
            reason: "error",
        });
        expect(mockApplyGeneratedChatTitleIfPlaceholder).not.toHaveBeenCalled();
    });
});
