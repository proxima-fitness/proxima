/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import {
    applyGeneratedChatTitleIfPlaceholder,
    getChatTitleSource,
} from "@/api/chat-title-write";

function asDb(mock: unknown): SupabaseClient<Database> {
    return mock as SupabaseClient<Database>;
}

describe("getChatTitleSource", () => {
    const maybeSingle = vi.fn();
    const eqId = vi.fn(() => ({ maybeSingle }));
    const eqUser = vi.fn(() => ({ eq: eqId }));
    const select = vi.fn(() => ({ eq: eqUser }));
    const from = vi.fn(() => ({ select }));

    beforeEach(() => {
        vi.clearAllMocks();
        eqId.mockReturnValue({ maybeSingle });
        eqUser.mockReturnValue({ eq: eqId });
        select.mockReturnValue({ eq: eqUser });
        from.mockReturnValue({ select });
    });

    it("returns title and conversation", async () => {
        maybeSingle.mockResolvedValueOnce({
            data: {
                title: "Hello",
                conversation: [{ role: "user", parts: [{ type: "text", text: "Hello" }] }],
            },
            error: null,
        });

        const source = await getChatTitleSource(asDb({ from }), "user-1", "chat-1");

        expect(source).toEqual({
            title: "Hello",
            conversation: [{ role: "user", parts: [{ type: "text", text: "Hello" }] }],
        });
        expect(select).toHaveBeenCalledWith("title, conversation");
    });

    it("returns null when missing", async () => {
        maybeSingle.mockResolvedValueOnce({ data: null, error: null });
        expect(await getChatTitleSource(asDb({ from }), "user-1", "chat-1")).toBeNull();
    });
});

describe("applyGeneratedChatTitleIfPlaceholder", () => {
    const maybeSingle = vi.fn();
    const select = vi.fn(() => ({ maybeSingle }));
    const eqTitle = vi.fn(() => ({ select }));
    const eqId = vi.fn(() => ({ eq: eqTitle }));
    const eqUser = vi.fn(() => ({ eq: eqId }));
    const update = vi.fn(() => ({ eq: eqUser }));
    const from = vi.fn(() => ({ update }));

    beforeEach(() => {
        vi.clearAllMocks();
        select.mockReturnValue({ maybeSingle });
        eqTitle.mockReturnValue({ select });
        eqId.mockReturnValue({ eq: eqTitle });
        eqUser.mockReturnValue({ eq: eqId });
        update.mockReturnValue({ eq: eqUser });
        from.mockReturnValue({ update });
    });

    it("skips write when generated title matches the placeholder", async () => {
        const result = await applyGeneratedChatTitleIfPlaceholder(
            asDb({ from }),
            "user-1",
            "chat-1",
            "Hello",
            "Hello",
        );
        expect(result).toBe("skipped");
        expect(update).not.toHaveBeenCalled();
    });

    it("applies when the row still has the placeholder title", async () => {
        maybeSingle.mockResolvedValueOnce({ data: { id: "chat-1" }, error: null });

        const result = await applyGeneratedChatTitleIfPlaceholder(
            asDb({ from }),
            "user-1",
            "chat-1",
            "Hello there this is a long first prompt",
            "4-day PPL",
        );

        expect(result).toBe("applied");
        expect(update).toHaveBeenCalledWith({ title: "4-day PPL" });
        expect(eqTitle).toHaveBeenCalledWith(
            "title",
            "Hello there this is a long first prompt",
        );
    });

    it("skips when no row matches the placeholder", async () => {
        maybeSingle.mockResolvedValueOnce({ data: null, error: null });

        const result = await applyGeneratedChatTitleIfPlaceholder(
            asDb({ from }),
            "user-1",
            "chat-1",
            "Placeholder",
            "Generated",
        );

        expect(result).toBe("skipped");
    });
});
