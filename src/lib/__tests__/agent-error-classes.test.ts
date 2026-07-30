import { afterEach, describe, expect, it, vi } from "vitest";

import {
    AGENT_ERROR_CLASS,
    AGENT_ERROR_CLASSES,
    classifyAgentErrorClass,
    extractSoftToolErrorCode,
    truncateForAgentTelemetry,
} from "@/lib/agent-error-classes";
import {
    captureAiToolError,
    resetAiToolErrorCaptureForTests,
} from "@/lib/capture-ai-tool-error";

const posthogMocks = vi.hoisted(() => ({
    capture: vi.fn(),
}));

vi.mock("posthog-js", () => ({
    default: { capture: posthogMocks.capture },
}));

describe("agent-error-classes", () => {
    it("exports the ADR vocabulary", () => {
        expect(AGENT_ERROR_CLASSES).toEqual([
            "provider_error",
            "validation_error",
            "stall_timeout",
            "payload_too_large",
            "network_error",
            "gateway_auth",
            "unknown",
        ]);
    });

    it("classifies stall timeout from client timeout copy", () => {
        expect(
            classifyAgentErrorClass(
                new Error("Generation timed out. The AI took too long to respond."),
            ),
        ).toBe(AGENT_ERROR_CLASS.STALL_TIMEOUT);
    });

    it("classifies payload / network / opaque provider messages", () => {
        expect(classifyAgentErrorClass("FUNCTION_PAYLOAD_TOO_LARGE")).toBe(
            AGENT_ERROR_CLASS.PAYLOAD_TOO_LARGE,
        );
        expect(classifyAgentErrorClass(new Error("Failed to fetch"))).toBe(
            AGENT_ERROR_CLASS.NETWORK_ERROR,
        );
        expect(classifyAgentErrorClass("An error occurred.")).toBe(
            AGENT_ERROR_CLASS.PROVIDER_ERROR,
        );
        expect(classifyAgentErrorClass("something weird")).toBe(AGENT_ERROR_CLASS.UNKNOWN);
    });

    it("truncates telemetry strings", () => {
        expect(truncateForAgentTelemetry("short", 10)).toBe("short");
        expect(truncateForAgentTelemetry("x".repeat(20), 10)).toBe(`${"x".repeat(9)}…`);
    });

    it("extracts soft tool error codes from output.error", () => {
        expect(
            extractSoftToolErrorCode({ error: "Program mutation batch failed" }),
        ).toBe("Program mutation batch failed");
        expect(
            extractSoftToolErrorCode(undefined, "Invalid input for tool mutateProgram: Type validation failed"),
        ).toBe(AGENT_ERROR_CLASS.VALIDATION_ERROR);
        expect(extractSoftToolErrorCode(undefined)).toBe(AGENT_ERROR_CLASS.UNKNOWN);
    });
});

describe("captureAiToolError", () => {
    afterEach(() => {
        posthogMocks.capture.mockClear();
        resetAiToolErrorCaptureForTests();
    });

    it("fires ai_tool_error with tool + errorCode once per toolCallId", () => {
        const input = {
            tool: "mutateProgram",
            output: { error: "Program mutation batch failed" },
            severity: "warning" as const,
            chatSessionId: "chat-1",
            userId: "user-1",
            toolCallId: "tc-1",
        };

        captureAiToolError(input);
        captureAiToolError(input);

        expect(posthogMocks.capture).toHaveBeenCalledTimes(1);
        expect(posthogMocks.capture).toHaveBeenCalledWith("ai_tool_error", {
            tool: "mutateProgram",
            errorCode: "Program mutation batch failed",
            severity: "warning",
            chatSessionId: "chat-1",
            user: "user-1",
        });
    });
});
