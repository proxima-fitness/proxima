import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { User } from "@supabase/supabase-js";

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

type MockFilterBuilder =
    | { maybeSingle: typeof mockMaybeSingle; single: typeof mockSingle }
    | { eq: Mock<() => MockFilterBuilder> };

const mockEqSecond: Mock<() => MockFilterBuilder> = vi.fn(() => ({
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
}));
const mockEqFirst = vi.fn(() => ({ eq: mockEqSecond }));
const mockSelect = vi.fn(() => ({ eq: mockEqFirst }));
const mockUpdate = vi.fn(() => ({ eq: mockEqFirst }));
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
}));

vi.mock("@/api/index", () => ({
    supabase: {
        from: () => mockFrom(),
    },
}));

vi.mock("@/components/program-builder/utils/helpers", () => ({
    getMessageText: (message: unknown) => {
        if (message == null || typeof message !== "object") return "";
        const m = message as { parts?: { text?: string }[] };
        return m.parts?.[0]?.text?.trim() ?? "";
    },
}));

import {
    deriveChatTitleFromMessages,
    ensureChatSessionOnSend,
    linkChatToProgram,
    persistChatHistoryAfterTurn,
    resetChatHistorySessionForTests,
    upsertChatHistoryTurn,
} from "@/api/chat-history";

const testUser = { id: "user-1" } as User;
const chatId = "11111111-1111-4111-8111-111111111111";

function userMessage(text: string): TChatMessage {
    return {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text }],
    };
}

function assistantMessage(text: string, id = "a1"): TChatMessage {
    return {
        id,
        role: "assistant",
        parts: [{ type: "text", text }],
    };
}

describe("deriveChatTitleFromMessages", () => {
    it("uses first user message trimmed and capped at 200 chars", () => {
        const longText = "a".repeat(250);
        expect(deriveChatTitleFromMessages([userMessage("  Hello  ")])).toBe("Hello");
        expect(deriveChatTitleFromMessages([userMessage(longText)])).toHaveLength(200);
    });

    it("returns Untitled when no user message or empty text", () => {
        expect(deriveChatTitleFromMessages([])).toBe("Untitled");
        expect(
            deriveChatTitleFromMessages([assistantMessage("Hi")]),
        ).toBe("Untitled");
        expect(deriveChatTitleFromMessages([userMessage("   ")])).toBe("Untitled");
    });
});

describe("upsertChatHistoryTurn", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetChatHistorySessionForTests();
    });

    it("updates when row exists", async () => {
        mockMaybeSingle.mockResolvedValueOnce({ data: { id: chatId }, error: null });
        mockEqSecond.mockReturnValueOnce({ maybeSingle: mockMaybeSingle, single: mockSingle });
        mockEqSecond.mockReturnValueOnce({ eq: mockEqSecond });
        mockUpdate.mockReturnValueOnce({ eq: mockEqFirst });

        const messages = [userMessage("Hello"), assistantMessage("Hi")];
        const result = await upsertChatHistoryTurn({ user: testUser, chatId, messages });

        expect(result).toEqual({ success: true, id: chatId });
        expect(mockUpdate).toHaveBeenCalled();
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it("inserts when row is missing", async () => {
        mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
        mockSingle.mockResolvedValueOnce({ data: { id: chatId }, error: null });

        const messages = [userMessage("Hello")];
        const result = await upsertChatHistoryTurn({ user: testUser, chatId, messages });

        expect(result).toEqual({ success: true, id: chatId });
        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                id: chatId,
                user_id: testUser.id,
                title: "Hello",
                program_id: null,
            }),
        );
    });
});

describe("ensureChatSessionOnSend", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetChatHistorySessionForTests();
    });

    it("mints chat id and inserts once (no router — URL synced by caller)", async () => {
        mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
        mockSingle.mockResolvedValueOnce({ data: { id: chatId }, error: null });

        const first = await ensureChatSessionOnSend({
            user: testUser,
            chatId: "",
            firstUserText: "Build me a program",
        });

        expect(first).toEqual({ chatId: expect.any(String), confirmed: true });
        expect(mockInsert).toHaveBeenCalledTimes(1);

        mockMaybeSingle.mockResolvedValueOnce({ data: { id: first.chatId }, error: null });
        const second = await ensureChatSessionOnSend({
            user: testUser,
            chatId: first.chatId,
            firstUserText: "Second message",
        });

        expect(second.confirmed).toBe(true);
        expect(mockInsert).toHaveBeenCalledTimes(1);
    });
});

describe("linkChatToProgram", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("updates program_id only", async () => {
        mockEqSecond.mockReturnValueOnce({ eq: mockEqSecond });

        const result = await linkChatToProgram(testUser, chatId, "42");

        expect(result).toEqual({ success: true, id: chatId });
        expect(mockUpdate).toHaveBeenCalledWith({ program_id: "42" });
        expect(mockInsert).not.toHaveBeenCalled();
    });
});

describe("persistChatHistoryAfterTurn", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetChatHistorySessionForTests();
    });

    it("skips abort and error turns", async () => {
        await persistChatHistoryAfterTurn({
            user: testUser,
            chatId,
            messages: [userMessage("hi")],
            isAbort: true,
            isError: false,
        });
        await persistChatHistoryAfterTurn({
            user: testUser,
            chatId,
            messages: [userMessage("hi")],
            isAbort: false,
            isError: true,
        });
        expect(mockFrom).not.toHaveBeenCalled();
        expect(await persistChatHistoryAfterTurn({
            user: testUser,
            chatId,
            messages: [userMessage("hi")],
            isAbort: true,
            isError: false,
        })).toBe("skipped");
        expect(await persistChatHistoryAfterTurn({
            user: testUser,
            chatId,
            messages: [userMessage("hi")],
            isAbort: false,
            isError: true,
        })).toBe("skipped");
    });

    it("upserts when turn completes for logged-in user", async () => {
        mockMaybeSingle.mockResolvedValueOnce({ data: { id: chatId }, error: null });
        mockEqSecond.mockReturnValueOnce({ maybeSingle: mockMaybeSingle, single: mockSingle });
        mockEqSecond.mockReturnValueOnce({ eq: mockEqSecond });
        mockUpdate.mockReturnValueOnce({ eq: mockEqFirst });

        await persistChatHistoryAfterTurn({
            user: testUser,
            chatId,
            messages: [userMessage("hi")],
            isAbort: false,
            isError: false,
        });

        expect(mockUpdate).toHaveBeenCalled();
    });

    it("updates full thread on follow-up turn", async () => {
        mockMaybeSingle.mockResolvedValueOnce({ data: { id: chatId }, error: null });
        mockEqSecond.mockReturnValueOnce({ maybeSingle: mockMaybeSingle, single: mockSingle });
        mockEqSecond.mockReturnValueOnce({ eq: mockEqSecond });
        mockUpdate.mockReturnValueOnce({ eq: mockEqFirst });

        const turnOne = [userMessage("Hello"), assistantMessage("Hi")];
        const turnTwo = [
            ...turnOne,
            userMessage("Follow up"),
            assistantMessage("Sure", "a2"),
        ];

        expect(await persistChatHistoryAfterTurn({
            user: testUser,
            chatId,
            messages: turnOne,
            isAbort: false,
            isError: false,
        })).toBe("success");

        mockMaybeSingle.mockResolvedValueOnce({ data: { id: chatId }, error: null });
        mockEqSecond.mockReturnValueOnce({ maybeSingle: mockMaybeSingle, single: mockSingle });
        mockEqSecond.mockReturnValueOnce({ eq: mockEqSecond });
        mockUpdate.mockReturnValueOnce({ eq: mockEqFirst });

        expect(await persistChatHistoryAfterTurn({
            user: testUser,
            chatId,
            messages: turnTwo,
            isAbort: false,
            isError: false,
        })).toBe("success");

        expect(mockUpdate).toHaveBeenLastCalledWith({ conversation: turnTwo });
    });
});
