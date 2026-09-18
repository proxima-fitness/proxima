import { afterEach, describe, expect, it, vi } from "vitest";
import { requestGeneratedChatTitle } from "@/api/chat-title-request";

describe("requestGeneratedChatTitle", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("invalidates recents when the generated title is applied", async () => {
        const invalidateQueries = vi.fn();
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ applied: true, title: "4-day PPL" }),
        });
        vi.stubGlobal("fetch", fetchMock);

        requestGeneratedChatTitle({
            chatId: "chat-1",
            userId: "user-1",
            queryClient: { invalidateQueries },
        });

        await vi.waitFor(() => {
            expect(invalidateQueries).toHaveBeenCalledWith({
                queryKey: ["chat-ids", "user-1"],
            });
        });
        expect(fetchMock).toHaveBeenCalledWith(
            "/api/chat/generate-title",
            expect.objectContaining({ method: "POST" }),
        );
    });

    it("does not invalidate when the title is not applied", async () => {
        const invalidateQueries = vi.fn();
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ applied: false, skipped: true }),
            }),
        );

        requestGeneratedChatTitle({
            chatId: "chat-1",
            userId: "user-1",
            queryClient: { invalidateQueries },
        });

        await Promise.resolve();
        await Promise.resolve();
        expect(invalidateQueries).not.toHaveBeenCalled();
    });
});
