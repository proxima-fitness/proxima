import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import type { User } from "@supabase/supabase-js";

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

type TMockFilterBuilder =
    | { maybeSingle: typeof mockMaybeSingle; single: typeof mockSingle }
    | { eq: Mock<() => TMockFilterBuilder> }
    | { select: Mock<() => { maybeSingle: typeof mockMaybeSingle }> };

const mockEqSecond: Mock<() => TMockFilterBuilder> = vi.fn(() => ({
    maybeSingle: mockMaybeSingle,
    single: mockSingle,
}));
const mockEqFirst = vi.fn(() => ({ eq: mockEqSecond }));
const mockSelect = vi.fn(() => ({ eq: mockEqFirst }));
const mockUpdate = vi.fn(() => ({ eq: mockEqFirst }));
const mockInsert = vi.fn(() => ({ select: vi.fn(() => ({ single: mockSingle })) }));
const mockDelete = vi.fn(() => ({ eq: mockEqFirst }));
const mockFrom = vi.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
}));

vi.mock("@/api/index", () => ({
    supabase: {
        from: () => mockFrom(),
    },
}));

const mockApplyBuildProgramMintUrlUpdate = vi.fn();

vi.mock("@/lib/build-program-url", () => ({
    applyBuildProgramMintUrlUpdate: (...args: unknown[]) =>
        mockApplyBuildProgramMintUrlUpdate(...args),
}));

import {
    connectChatToSavedProgram,
    deriveChatTitleFromMessages,
    deleteChatHistory,
    ensureChatSessionOnSend,
    isChatSessionInsertConfirmed,
    linkProgramToChat,
    migrateAnonymousThreadToChat,
    persistChatHistoryAfterTurn,
    resetChatHistorySessionForTests,
    resolveChatSessionId,
    upsertChatHistoryTurn,
} from "@/api/chat-history";
import { CHAT_MESSAGES_KEY } from "@/assets/constants/ui-constants";

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

describe("resolveChatSessionId", () => {
    it("returns existing id when present", () => {
        expect(resolveChatSessionId(chatId)).toBe(chatId);
    });

    it("mints a uuid when empty", () => {
        const minted = resolveChatSessionId("");
        expect(minted).toEqual(expect.any(String));
        expect(minted.length).toBeGreaterThan(0);
    });
});

describe("ensureChatSessionOnSend", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetChatHistorySessionForTests();
    });

    it("mints chat id and inserts once (no router - URL synced by caller)", async () => {
        mockMaybeSingle.mockResolvedValueOnce({ data: null, error: null });
        mockSingle.mockResolvedValueOnce({ data: { id: chatId }, error: null });

        const first = await ensureChatSessionOnSend({
            user: testUser,
            chatId: "",
            firstUserText: "Build me a program",
        });

        expect(first).toEqual({
            chatId: expect.any(String),
            confirmed: true,
            inserted: true,
        });
        expect(mockInsert).toHaveBeenCalledTimes(1);

        mockMaybeSingle.mockResolvedValueOnce({ data: { id: first.chatId }, error: null });
        const second = await ensureChatSessionOnSend({
            user: testUser,
            chatId: first.chatId,
            firstUserText: "Second message",
        });

        expect(second).toEqual({
            chatId: first.chatId,
            confirmed: true,
            inserted: false,
        });
        expect(mockInsert).toHaveBeenCalledTimes(1);
    });
});

describe("migrateAnonymousThreadToChat", () => {
    const replace = vi.fn();
    const router = { replace };
    const pathname = "/build-program";
    const searchParams = new URLSearchParams(
        "resume=true&search=build+me+a+program",
    ) as import("next/navigation").ReadonlyURLSearchParams;

    beforeEach(() => {
        vi.clearAllMocks();
        resetChatHistorySessionForTests();
        localStorage.clear();
        localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify([userMessage("Anon thread")]));
    });

    it("inserts full thread, mints URL preserving resume, clears localStorage", async () => {
        mockSingle.mockResolvedValueOnce({ data: { id: chatId }, error: null });

        const messages = [userMessage("Anon thread"), assistantMessage("Sure")];
        const result = await migrateAnonymousThreadToChat({
            user: testUser,
            messages,
            router,
            pathname,
            searchParams,
        });

        expect(result.confirmed).toBe(true);
        expect(result.messages).toEqual(messages);
        expect(result.chatId).toEqual(expect.any(String));
        expect(isChatSessionInsertConfirmed(result.chatId)).toBe(true);
        expect(mockInsert).toHaveBeenCalledWith(
            expect.objectContaining({
                user_id: testUser.id,
                title: "Anon thread",
                program_id: null,
            }),
        );
        expect(mockApplyBuildProgramMintUrlUpdate).toHaveBeenCalledWith(
            router,
            pathname,
            searchParams,
            result.chatId,
            { stripSearch: true },
        );
        expect(localStorage.getItem(CHAT_MESSAGES_KEY)).toBeNull();
    });

    it("on insert failure retains localStorage and skips URL mint", async () => {
        mockSingle.mockResolvedValueOnce({ data: null, error: { message: "fail" } });

        const messages = [userMessage("Anon thread")];
        const result = await migrateAnonymousThreadToChat({
            user: testUser,
            messages,
            router,
            pathname,
            searchParams,
        });

        expect(result.confirmed).toBe(false);
        expect(mockApplyBuildProgramMintUrlUpdate).not.toHaveBeenCalled();
        expect(localStorage.getItem(CHAT_MESSAGES_KEY)).not.toBeNull();
    });

    it("skips insert and URL mint when send-path already set ?chat=", async () => {
        const existingChatId = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
        window.history.pushState({}, "", `/build-program?chat=${existingChatId}`);

        const messages = [userMessage("Anon thread")];
        const result = await migrateAnonymousThreadToChat({
            user: testUser,
            messages,
            router,
            pathname,
            searchParams,
        });

        expect(result).toEqual({
            chatId: existingChatId,
            confirmed: false,
            messages,
        });
        expect(mockInsert).not.toHaveBeenCalled();
        expect(mockApplyBuildProgramMintUrlUpdate).not.toHaveBeenCalled();
    });
});

describe("deleteChatHistory", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("deletes row for authenticated user", async () => {
        mockEqSecond.mockReturnValueOnce({ eq: mockEqSecond });

        const result = await deleteChatHistory(testUser, chatId);

        expect(result).toEqual({ success: true, id: chatId });
        expect(mockDelete).toHaveBeenCalled();
    });
});

function mockLinkProgramUpdateChain(data: { id: string } | null) {
    const mockSelectAfterUpdate = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
    mockEqSecond.mockImplementation(() => ({ select: mockSelectAfterUpdate }));
    mockMaybeSingle.mockResolvedValue({ data, error: null });
}

describe("linkProgramToChat", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockEqSecond.mockImplementation(() => ({
            maybeSingle: mockMaybeSingle,
            single: mockSingle,
        }));
        mockMaybeSingle.mockReset();
    });

    it("updates program_id only when a row matches", async () => {
        mockLinkProgramUpdateChain({ id: chatId });

        const result = await linkProgramToChat(testUser, chatId, "42");

        expect(result).toEqual({ success: true, id: chatId });
        expect(mockUpdate).toHaveBeenCalledWith({ program_id: "42" });
        expect(mockInsert).not.toHaveBeenCalled();
    });

    it("fails when update matches zero rows", async () => {
        mockLinkProgramUpdateChain(null);

        const result = await linkProgramToChat(testUser, chatId, "42");

        expect(result).toEqual({ success: false, error: "Chat row not found" });
    });
});

describe("connectChatToSavedProgram", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockEqSecond.mockImplementation(() => ({
            maybeSingle: mockMaybeSingle,
            single: mockSingle,
        }));
        mockMaybeSingle.mockReset();
    });

    it("skips when persist chat id is empty", async () => {
        const result = await connectChatToSavedProgram({
            user: testUser,
            persistChatId: "",
            programId: "42",
        });

        expect(result).toBe("skipped");
        expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns linked when linkProgramToChat succeeds", async () => {
        mockLinkProgramUpdateChain({ id: chatId });

        const result = await connectChatToSavedProgram({
            user: testUser,
            persistChatId: chatId,
            programId: "42",
        });

        expect(result).toBe("linked");
    });

    it("returns failed when linkProgramToChat matches no row", async () => {
        mockLinkProgramUpdateChain(null);

        const result = await connectChatToSavedProgram({
            user: testUser,
            persistChatId: chatId,
            programId: "42",
        });

        expect(result).toBe("failed");
    });
});

describe("persistChatHistoryAfterTurn", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        resetChatHistorySessionForTests();
        mockEqSecond.mockImplementation(() => ({
            maybeSingle: mockMaybeSingle,
            single: mockSingle,
        }));
        mockMaybeSingle.mockReset();
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
