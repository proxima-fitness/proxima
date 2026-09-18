/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import {
    DERIVED_UNTITLED_CHAT_TITLE,
    deriveChatTitleFromMessages,
    firstUserMessageText,
    MAX_CHAT_TITLE_LENGTH,
    sanitizeGeneratedChatTitle,
} from "@/api/chat-title";

function userMessage(text: string): TChatMessage {
    return {
        id: "user-1",
        role: "user",
        parts: [{ type: "text", text }],
    };
}

function assistantMessage(text: string): TChatMessage {
    return {
        id: "a1",
        role: "assistant",
        parts: [{ type: "text", text }],
    };
}

describe("deriveChatTitleFromMessages", () => {
    it("uses first user message trimmed and capped at 200 chars", () => {
        const longText = "a".repeat(250);
        expect(deriveChatTitleFromMessages([userMessage("  Hello  ")])).toBe("Hello");
        expect(deriveChatTitleFromMessages([userMessage(longText)])).toHaveLength(
            MAX_CHAT_TITLE_LENGTH,
        );
    });

    it("returns Untitled when no user message or empty text", () => {
        expect(deriveChatTitleFromMessages([])).toBe(DERIVED_UNTITLED_CHAT_TITLE);
        expect(deriveChatTitleFromMessages([assistantMessage("Hi")])).toBe(
            DERIVED_UNTITLED_CHAT_TITLE,
        );
        expect(deriveChatTitleFromMessages([userMessage("   ")])).toBe(
            DERIVED_UNTITLED_CHAT_TITLE,
        );
    });
});

describe("firstUserMessageText", () => {
    it("reads top-level text when parts are missing", () => {
        expect(firstUserMessageText([{ role: "user", text: "  PPL  " }])).toBe("PPL");
    });
});

describe("sanitizeGeneratedChatTitle", () => {
    it("strips quotes, fences, trailing period, and extra whitespace", () => {
        expect(sanitizeGeneratedChatTitle('  "4-day PPL."  ')).toBe("4-day PPL");
        expect(
            sanitizeGeneratedChatTitle("```\nHypertrophy block\n```"),
        ).toBe("Hypertrophy block");
        expect(sanitizeGeneratedChatTitle("Home gym\nfull body")).toBe(
            "Home gym full body",
        );
    });

    it("reads a JSON title field", () => {
        expect(
            sanitizeGeneratedChatTitle('{"title":"4-day PPL for hypertrophy"}'),
        ).toBe("4-day PPL for hypertrophy");
    });

    it("caps at 200 characters", () => {
        const long = "b".repeat(250);
        expect(sanitizeGeneratedChatTitle(long)).toHaveLength(MAX_CHAT_TITLE_LENGTH);
    });
});
