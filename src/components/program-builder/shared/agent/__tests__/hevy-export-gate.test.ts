import { describe, it, expect } from "vitest";

import {
    findHevyExportGateMessageId,
    isOpenHevyExportGatePart,
} from "../hevy-export-gate";

function assistantWithParts(
    id: string,
    parts: TChatMessage["parts"],
): TChatMessage {
    return { id, role: "assistant", parts } as TChatMessage;
}

describe("hevy-export-gate detection", () => {
    it("recognizes opened tool part", () => {
        expect(
            isOpenHevyExportGatePart({
                type: "tool-openHevyExportGate",
                output: { opened: true, message: "ok" },
            }),
        ).toBe(true);
    });

    it("rejects tool part without opened flag", () => {
        expect(
            isOpenHevyExportGatePart({
                type: "tool-openHevyExportGate",
                output: { opened: false },
            }),
        ).toBe(false);
        expect(
            isOpenHevyExportGatePart({
                type: "tool-openHevyExportGate",
            }),
        ).toBe(false);
    });

    it("finds message id when last assistant has gate tool", () => {
        const messages = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "export" }] } as TChatMessage,
            assistantWithParts("a1", [
                { type: "text", text: "Opening setup…" },
                {
                    type: "tool-openHevyExportGate",
                    toolCallId: "gate-1",
                    state: "output-available",
                    input: {},
                    output: { opened: true },
                },
            ] as TChatMessage["parts"]),
        ];
        expect(findHevyExportGateMessageId(messages)).toBe("a1");
    });

    it("returns null when last message is user or has no gate", () => {
        expect(
            findHevyExportGateMessageId([
                assistantWithParts("a1", [
                    { type: "text", text: "hi" },
                ] as TChatMessage["parts"]),
            ]),
        ).toBeNull();
        expect(
            findHevyExportGateMessageId([
                { id: "u1", role: "user", parts: [{ type: "text", text: "hi" }] } as TChatMessage,
            ]),
        ).toBeNull();
    });
});
