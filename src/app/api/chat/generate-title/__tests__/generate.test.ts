/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";
import { buildChatTitlePrompt } from "../generate";

describe("buildChatTitlePrompt", () => {
    it("includes the first user message", () => {
        const prompt = buildChatTitlePrompt("I want a 4-day PPL for hypertrophy");
        expect(prompt).toContain("I want a 4-day PPL for hypertrophy");
        expect(prompt).toContain("Respond with only the title.");
    });
});
