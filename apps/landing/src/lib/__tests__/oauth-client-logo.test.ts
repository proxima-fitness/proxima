// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module oauth-client-logo.test
 */
import { describe, expect, it } from "vitest";
import { resolveKnownOAuthClientLogo } from "@/lib/oauth-client-logo";

describe("resolveKnownOAuthClientLogo", () => {
    it("maps Claude / Anthropic names to the Claude mark", () => {
        expect(resolveKnownOAuthClientLogo("Claude")).toBe("/oauth-client-claude.svg");
        expect(resolveKnownOAuthClientLogo("claude.ai")).toBe("/oauth-client-claude.svg");
        expect(resolveKnownOAuthClientLogo("Anthropic")).toBe("/oauth-client-claude.svg");
    });

    it("maps ChatGPT / OpenAI names to the OpenAI mark", () => {
        expect(resolveKnownOAuthClientLogo("ChatGPT")).toBe("/oauth-client-openai.svg");
        expect(resolveKnownOAuthClientLogo("OpenAI")).toBe("/oauth-client-openai.svg");
    });

    it("returns null for unknown clients", () => {
        expect(resolveKnownOAuthClientLogo("Some MCP Client")).toBeNull();
        expect(resolveKnownOAuthClientLogo("")).toBeNull();
    });
});
