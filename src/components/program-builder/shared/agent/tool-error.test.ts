import { describe, expect, it } from "vitest";

import { buildToolErrorPayload, summarizeToolError } from "./tool-error";

describe("buildToolErrorPayload", () => {
    it("serializes tool, errorText, and output for clipboard", () => {
        const payload = buildToolErrorPayload("mutateProgram", {
            errorText: "batch rejected",
            output: { error: "Program mutation batch failed", failures: [{ index: 0, op: "add_day", reason: "Maximum 7 days per week" }] },
        });

        expect(JSON.parse(payload)).toEqual({
            tool: "mutateProgram",
            errorText: "batch rejected",
            output: {
                error: "Program mutation batch failed",
                failures: [{ index: 0, op: "add_day", reason: "Maximum 7 days per week" }],
            },
        });
    });
});

describe("summarizeToolError", () => {
    it("prefers output.message for buildWeek-style errors", () => {
        const summary = summarizeToolError("buildWeek", {
            output: {
                error: "Invalid exercise_template_id",
                message: 'exercise_template_id "bad-id" (day 1) is not in hevy_exercise_templates.',
            },
        });

        expect(summary).toBe('exercise_template_id "bad-id" (day 1) is not in hevy_exercise_templates.');
    });

    it("humanizes mutateProgram failures", () => {
        const summary = summarizeToolError("mutateProgram", {
            output: {
                error: "Program mutation batch failed",
                failures: [{ index: 0, op: "add_day", reason: "Maximum 7 days per week" }],
            },
        });

        expect(summary).toBe("We couldn't apply that change: Maximum 7 days per week");
    });

    it("maps known output.error codes to friendly copy", () => {
        const summary = summarizeToolError("buildWeek", {
            output: { error: "Failed to build week" },
        });

        expect(summary).toBe("Something went wrong while building your program.");
    });

    it("uses short human errorText when not JSON", () => {
        const summary = summarizeToolError("mutateProgram", {
            errorText: "Network timeout while validating batch",
        });

        expect(summary).toBe("We couldn't apply that change: Network timeout while validating batch");
    });

    it("parses JSON errorText and extracts message", () => {
        const summary = summarizeToolError("rateProgram", {
            errorText: JSON.stringify({ error: "Failed to rate program", message: "Score engine unavailable" }),
        });

        expect(summary).toBe("Score engine unavailable");
    });

    it("parses failure-style errorText", () => {
        const summary = summarizeToolError("mutateProgram", {
            errorText: "[0] add_day: Maximum 7 days per week",
        });

        expect(summary).toBe("We couldn't apply that change: Maximum 7 days per week");
    });

    it("summarizes SDK validation dumps instead of showing raw JSON", () => {
        const sdkError =
            'Invalid input for tool mutateProgram: Type validation failed: Value: {"operations":[{"op":"remove_from_superset","dayOrder":1}]}.' +
            ' Error message: [{"expected":"string","code":"invalid_type","path":["operations",0,"dayId"],"message":"Invalid input: expected string, received undefined"}]';

        const summary = summarizeToolError("mutateProgram", { errorText: sdkError });

        expect(summary).toBe("We couldn't apply that change: A required field (dayId) was missing.");
        expect(summary).not.toContain("Type validation failed");
        expect(summary).not.toContain('"invalid_type"');
    });

    it("falls back to tool-specific default", () => {
        expect(summarizeToolError("rateProgram", {})).toBe("Could not rate this program.");
        expect(summarizeToolError("buildWeek", {})).toBe("Something went wrong while building your program.");
        expect(summarizeToolError("unknownTool", {})).toBe("Something went wrong. Try again or rephrase your request.");
    });
});
