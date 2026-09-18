import { describe, expect, it } from "vitest";

import {
    buildDeveloperToolErrorFeedback,
    buildToolErrorPayload,
    getMutateProgramFailureSeverity,
    summarizeToolError,
} from "../tool-error";

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

describe("buildDeveloperToolErrorFeedback", () => {
    it("includes chatId, tool, summary, and JSON payload", () => {
        const ctx = {
            errorText: "batch rejected",
            output: {
                error: "Program mutation batch failed",
                failures: [{ index: 0, op: "add_day", reason: "Maximum 7 days per week" }],
            },
        };
        const chatId = "11111111-1111-4111-8111-111111111111";

        const feedback = buildDeveloperToolErrorFeedback("mutateProgram", ctx, chatId);

        expect(feedback).toContain("Tool error report");
        expect(feedback).toContain(`Chat ID: ${chatId}`);
        expect(feedback).toContain("Tool: mutateProgram");
        expect(feedback).toContain("Summary: We couldn't apply that change: Maximum 7 days per week");
        expect(feedback).toContain(buildToolErrorPayload("mutateProgram", ctx));
    });

    it("uses unknown when chatId is empty", () => {
        const feedback = buildDeveloperToolErrorFeedback("buildWeek", { errorText: "timeout" }, "  ");

        expect(feedback).toContain("Chat ID: unknown");
    });
});

describe("getMutateProgramFailureSeverity", () => {
    it("treats validation batch failures as warnings", () => {
        expect(
            getMutateProgramFailureSeverity({
                output: {
                    error: "Program mutation batch failed",
                    failures: [{ index: 0, op: "insert_exercise", reason: "exerciseIndex 3 out of range for week 0, day 1" }],
                },
            }),
        ).toBe("warning");
    });

    it("treats SDK input validation as warnings", () => {
        const sdkError =
            'Invalid input for tool mutateProgram: Type validation failed: Value: {"operations":[{"op":"insert_exercise","folderIds":[0],"dayOrder":1}]}.' +
            ' Error message: [{"expected":"number","code":"invalid_type","path":["operations",0,"exerciseIndex"],"message":"Invalid input: expected number, received undefined"}]';

        expect(getMutateProgramFailureSeverity({ errorText: sdkError })).toBe("warning");
        expect(
            getMutateProgramFailureSeverity({ errorText: "validation_error" }),
        ).toBe("warning");
    });

    it("treats unexpected batch validation errors as errors", () => {
        expect(
            getMutateProgramFailureSeverity({
                output: {
                    error: "Failed to validate mutation batch",
                    failures: [{ index: 0, op: "add_day", reason: "Unexpected server error" }],
                },
            }),
        ).toBe("error");
    });

    it("treats infrastructure errorText as errors", () => {
        expect(
            getMutateProgramFailureSeverity({
                errorText: "Network timeout while validating batch",
            }),
        ).toBe("error");
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
            ' Error message: [{"expected":"array","code":"invalid_type","path":["operations",0,"folderIds"],"message":"Invalid input: expected array, received undefined"}]';

        const summary = summarizeToolError("mutateProgram", { errorText: sdkError });

        expect(summary).toBe(
            "We couldn't apply that change: folderIds: expected array, received undefined",
        );
        expect(summary).not.toContain("Type validation failed");
        expect(summary).not.toContain('"invalid_type"');
    });

    it("humanizes missing exerciseIndex SDK validation errors", () => {
        const sdkError =
            'Invalid input for tool mutateProgram: Type validation failed: Value: {"operations":[{"op":"insert_exercise","folderIds":[0],"dayOrder":1}]}.' +
            ' Error message: [{"expected":"number","code":"invalid_type","path":["operations",0,"exerciseIndex"],"message":"Invalid input: expected number, received undefined"}]';

        const summary = summarizeToolError("mutateProgram", { errorText: sdkError });

        expect(summary).toBe(
            "We couldn't apply that change: insert_exercise requires exerciseIndex (0-based). Empty day → 0; append → exercises.length from readProgram",
        );
    });

    it("humanizes stringified nested object SDK validation errors", () => {
        const sdkError =
            'Invalid input for tool mutateProgram: Type validation failed: Value: {"operations":[{"op":"update_set","set":"{\\"rpe\\":9}"}]}.' +
            ' Error message: [{"expected":"object","code":"invalid_type","path":["operations",0,"set"],"message":"Invalid input: expected object, received string"}]';

        const summary = summarizeToolError("mutateProgram", { errorText: sdkError });

        expect(summary).toBe(
            "We couldn't apply that change: set must be a nested object in tool args, not a JSON string",
        );
    });

    it("summarizes the stream class code when Zod details never reached the client", () => {
        const summary = summarizeToolError("mutateProgram", {
            errorText: "validation_error",
            output: null,
        });

        expect(summary).toBe("We couldn't apply that change: The request format wasn't valid.");
        expect(summary).not.toContain("validation_error");
    });

    it("falls back to tool-specific default", () => {
        expect(summarizeToolError("rateProgram", {})).toBe("Could not rate this program.");
        expect(summarizeToolError("buildWeek", {})).toBe("Something went wrong while building your program.");
        expect(summarizeToolError("unknownTool", {})).toBe("Something went wrong. Try again or rephrase your request.");
    });
});
