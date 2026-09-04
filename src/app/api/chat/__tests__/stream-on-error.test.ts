/**
 * @vitest-environment node
 */
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@langfuse/tracing", () => ({
    startObservation: vi.fn(() => ({ end: vi.fn() })),
}));

import { startObservation } from "@langfuse/tracing";
import { AGENT_ERROR_CLASS } from "@/lib/agent-error-classes";
import { streamAgentOnError } from "@/app/api/chat/stream-on-error";

describe("streamAgentOnError", () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.mocked(startObservation).mockClear();
    });

    it("logs the real error server-side and returns a class code", () => {
        const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        const err = new Error("AI Gateway authentication failed");

        expect(streamAgentOnError(err)).toBe(AGENT_ERROR_CLASS.GATEWAY_AUTH);

        expect(errorSpy).toHaveBeenCalledWith(
            "[ai_stream_error]",
            expect.objectContaining({
                errorClass: AGENT_ERROR_CLASS.GATEWAY_AUTH,
                message: "AI Gateway authentication failed",
                error: err,
            }),
        );

        expect(startObservation).toHaveBeenCalledWith(
            "stream-error",
            expect.objectContaining({
                level: "ERROR",
                metadata: expect.objectContaining({
                    streamError: true,
                    errorClass: AGENT_ERROR_CLASS.GATEWAY_AUTH,
                }),
            }),
            { asType: "event" },
        );
    });

    it("never returns opaque SDK default copy", () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        expect(streamAgentOnError(new Error("model overloaded"))).toBe(
            AGENT_ERROR_CLASS.PROVIDER_ERROR,
        );
        expect(streamAgentOnError(new Error("model overloaded"))).not.toBe(
            "An error occurred.",
        );
    });
});
