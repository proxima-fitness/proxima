// SPDX-License-Identifier: AGPL-3.0-only

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@langfuse/tracing", () => ({
    startObservation: vi.fn(() => ({ end: vi.fn() })),
}));

import { startObservation } from "@langfuse/tracing";
import {
    logSoftToolFailure,
    softToolErrorResult,
} from "@/app/api/chat/tools/soft-tool-fail-log";

describe("soft-tool-fail-log", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.mocked(startObservation).mockClear();
    });

    it("logs truncated fields and creates a Langfuse event", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const longReason = "r".repeat(600);

        logSoftToolFailure({
            tool: "mutateProgram",
            error: "Program mutation batch failed",
            failures: [{ index: 0, op: "insert_exercise", reason: longReason }],
        });

        expect(errorSpy).toHaveBeenCalledWith(
            "[ai_soft_tool_fail]",
            expect.objectContaining({
                tool: "mutateProgram",
                error: "Program mutation batch failed",
                failureReasons: [expect.stringMatching(/^r{199}…$/)],
            }),
        );

        expect(startObservation).toHaveBeenCalledWith(
            "soft-tool-failure",
            expect.objectContaining({
                level: "WARNING",
                metadata: expect.objectContaining({
                    softToolFailure: true,
                    tool: "mutateProgram",
                    error: "Program mutation batch failed",
                }),
            }),
            { asType: "event" },
        );
    });

    it("softToolErrorResult returns the same payload after logging", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        const payload = {
            error: "Invalid exercise_template_id",
            message: "bad id",
        };

        expect(softToolErrorResult("buildProgram", payload)).toBe(payload);
        expect(startObservation).toHaveBeenCalled();
    });
});
