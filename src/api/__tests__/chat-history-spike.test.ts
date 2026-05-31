import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ChatOnFinishCallback } from "ai";
import { createClient } from "@supabase/supabase-js";

/** Sub-plan 0 — remove in Sub-plan 4 (see docs/adr/.../04-chat-history-persistence-onfinish-upsert.md). */
describe("chat history spike — onFinish contract", () => {
    it("ChatOnFinishCallback exposes messages, isAbort, and isError", () => {
        const onFinish: ChatOnFinishCallback<TChatMessage> = ({
            messages,
            isAbort,
            isError,
            isDisconnect,
            message,
            finishReason,
        }) => {
            expect(Array.isArray(messages)).toBe(true);
            expect(typeof isAbort).toBe("boolean");
            expect(typeof isError).toBe("boolean");
            expect(typeof isDisconnect).toBe("boolean");
            expect(message).toBeDefined();
            expect(messages.at(-1)?.id).toBe(message.id);
            if (finishReason !== undefined) {
                expect(typeof finishReason).toBe("string");
            }
        };

        const assistantMessage: TChatMessage = {
            id: "assistant-1",
            role: "assistant",
            parts: [{ type: "text", text: "Done" }],
        };

        onFinish({
            message: assistantMessage,
            messages: [
                { id: "user-1", role: "user", parts: [{ type: "text", text: "Hi" }] },
                assistantMessage,
            ],
            isAbort: false,
            isError: false,
            isDisconnect: false,
            finishReason: "stop",
        });
    });
});

/** Sub-plan 0 — Supabase accepts explicit client UUID as `chat_history.id`. */
describe("chat history spike — client-assigned id insert", () => {
    const clientChatId = "11111111-1111-4111-8111-111111111111";
    const mockSingle = vi.fn();
    const mockSelect = vi.fn(() => ({ single: mockSingle }));
    const mockInsert = vi.fn(() => ({ select: mockSelect }));
    const mockFrom = vi.fn(() => ({ insert: mockInsert }));

    beforeEach(() => {
        vi.clearAllMocks();
        mockSingle.mockResolvedValue({
            data: { id: clientChatId },
            error: null,
        });
    });

    it("insert payload includes explicit id and returns the same id", async () => {
        const supabase = { from: mockFrom } as unknown as ReturnType<typeof createClient>;

        const conversation = [{ role: "user", parts: [{ type: "text", text: "spike" }] }];
        const { data, error } = await supabase
            .from("chat_history")
            .insert({
                id: clientChatId,
                user_id: "user-uuid",
                conversation,
                title: "spike test",
                program_id: null,
            })
            .select("id")
            .single();

        expect(mockFrom).toHaveBeenCalledWith("chat_history");
        expect(mockInsert).toHaveBeenCalledWith({
            id: clientChatId,
            user_id: "user-uuid",
            conversation,
            title: "spike test",
            program_id: null,
        });
        expect(error).toBeNull();
        expect(data?.id).toBe(clientChatId);
    });
});
