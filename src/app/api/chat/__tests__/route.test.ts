import { describe, it, expect, beforeAll } from "vitest";

let sanitizeMessagesWithUnresolvedToolCalls: (messages: unknown[]) => unknown[];

beforeAll(async () => {
    // `@/src/api/index.ts` throws at import-time if these env vars aren't present.
    // The route sanitizer we test is pure logic, so we just stub minimal values.
    process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_URL ?? "http://localhost";
    process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_KEY ?? "test-key";
    process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_URL ?? "http://localhost";
    process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY = process.env.NEXT_PUBLIC_REACT_APP_SUPABASE_BLOG_KEY ?? "test-key";
    process.env.NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_REACT_APP_CAPTCHA_SITE_KEY ?? "test-site-key";

    const mod = await import("@/app/api/chat/route");
    sanitizeMessagesWithUnresolvedToolCalls = mod.sanitizeMessagesWithUnresolvedToolCalls;
});

describe("chat route.ts", () => {
    describe("sanitizeMessagesWithUnresolvedToolCalls", () => {
        it("returns empty or non-array as-is", () => {
            expect(sanitizeMessagesWithUnresolvedToolCalls([])).toEqual([]);
            expect(sanitizeMessagesWithUnresolvedToolCalls(null as unknown as unknown[])).toEqual(null);
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
                    parts: [{ type: "tool-buildWeek", state: "input-streaming" }],
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
            const messages = [{ role: "assistant", parts: [{ type: "tool-buildWeek", state: "result" }] }];
            expect(sanitizeMessagesWithUnresolvedToolCalls(messages)).toBe(messages);

            const textOnly = [{ role: "assistant", parts: [{ type: "text", text: "Done" }] }];
            expect(sanitizeMessagesWithUnresolvedToolCalls(textOnly)).toBe(textOnly);
        });
    });
});

