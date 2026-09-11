import { describe, expect, it } from "vitest";
import {
    USAGE_CAP_ERROR,
    parseUsageCapBody,
    parseUsageCapFromChatError,
} from "@/lib/usage-cap";

describe("parseUsageCapBody", () => {
    it("parses object and JSON string bodies", () => {
        expect(
            parseUsageCapBody({
                error: USAGE_CAP_ERROR,
                feature: "monthly_llm_requests",
                resets_on: "2026-08-01",
            }),
        ).toEqual({
            feature: "monthly_llm_requests",
            resets_on: "2026-08-01",
        });

        expect(
            parseUsageCapBody(
                JSON.stringify({
                    error: USAGE_CAP_ERROR,
                    feature: "monthly_llm_requests",
                }),
            ),
        ).toEqual({
            feature: "monthly_llm_requests",
            resets_on: null,
        });
    });

    it("does not treat leftover monthly_exports_used as a live usage-cap feature", () => {
        expect(
            parseUsageCapBody({
                error: USAGE_CAP_ERROR,
                feature: "monthly_exports_used",
            }),
        ).toBeNull();
    });

    it("rejects non-paywall bodies", () => {
        expect(parseUsageCapBody({ error: "other" })).toBeNull();
        expect(parseUsageCapBody(null)).toBeNull();
        expect(parseUsageCapBody("not-json")).toBeNull();
    });
});

describe("parseUsageCapFromChatError", () => {
    it("reads AI SDK-style statusCode + responseBody", () => {
        const err = {
            statusCode: 402,
            responseBody: JSON.stringify({
                error: USAGE_CAP_ERROR,
                feature: "monthly_llm_requests",
                resets_on: "2026-08-01",
            }),
        };
        expect(parseUsageCapFromChatError(err)).toEqual({
            feature: "monthly_llm_requests",
            resets_on: "2026-08-01",
        });
    });

    it("returns null for unrelated errors", () => {
        expect(parseUsageCapFromChatError(new Error("boom"))).toBeNull();
        expect(parseUsageCapFromChatError({ statusCode: 500 })).toBeNull();
    });
});
