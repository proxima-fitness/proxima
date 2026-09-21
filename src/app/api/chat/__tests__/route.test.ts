import { describe, it, expect } from "vitest";
import { sanitizeMessagesWithUnresolvedToolCalls } from "../sanitize-messages";

describe("sanitizeMessagesWithUnresolvedToolCalls", () => {
    it("returns empty or non-array as-is", () => {
        expect(sanitizeMessagesWithUnresolvedToolCalls([])).toEqual([]);
        expect(sanitizeMessagesWithUnresolvedToolCalls(JSON.parse("null"))).toEqual(null);
    });

    it("returns as-is when last message is not assistant or has no parts", () => {
        const messages = [{ role: "user", content: "Hi" }];
        expect(sanitizeMessagesWithUnresolvedToolCalls(messages)).toBe(messages);

        const withAssistantNoParts = [{ role: "assistant" }];
        expect(sanitizeMessagesWithUnresolvedToolCalls(withAssistantNoParts)).toBe(withAssistantNoParts);
    });

    it("strips last message when it has unresolved tool call (input-streaming or input-available)", () => {
        const messages = [
            { role: "user", content: "Build a program" },
            {
                role: "assistant",
                parts: [{ type: "tool-buildProgram", state: "input-streaming" }],
            },
        ];

        const result = sanitizeMessagesWithUnresolvedToolCalls(messages);
        expect(result).toHaveLength(1);
        expect((result as unknown[])[0]).toEqual(messages[0]);

        const withInputAvailable = [
            { role: "user", content: "Hi" },
            { role: "assistant", parts: [{ type: "tool-getExerciseList", state: "input-available" }] },
        ];
        const result2 = sanitizeMessagesWithUnresolvedToolCalls(withInputAvailable);
        expect(result2).toHaveLength(1);
    });

    it("returns as-is when last message has only resolved or non-tool parts", () => {
        const messages = [{ role: "assistant", parts: [{ type: "tool-buildProgram", state: "result" }] }];
        expect(sanitizeMessagesWithUnresolvedToolCalls(messages)).toBe(messages);

        const textOnly = [{ role: "assistant", parts: [{ type: "text", text: "Done" }] }];
        expect(sanitizeMessagesWithUnresolvedToolCalls(textOnly)).toBe(textOnly);
    });
});
