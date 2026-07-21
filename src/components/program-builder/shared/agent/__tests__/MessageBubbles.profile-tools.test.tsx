import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createRef, type ReactNode, type RefObject } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";

vi.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => ({ user: null }),
}));

vi.mock("@/contexts/BuildProgramActionsContext", () => ({
    useBuildProgramActions: () => ({
        getPersistChatIdRef: { current: () => "" },
    }),
}));

vi.mock("@/contexts/AgentDebugModeContext", () => ({
    useAgentDebugMode: () => ({ debugMode: false }),
}));

vi.mock("posthog-js", () => ({
    default: { capture: vi.fn() },
}));

import { MessageBubbles } from "../MessageBubbles";

function renderBubbles(ui: ReactNode) {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
}

function baseProps(messages: TChatMessage[]) {
    const lastAtomicBuildCommitKeyRef = createRef<string | null>();
    const appliedMutateProgramKeysRef: RefObject<Set<string>> = {
        current: new Set(),
    };
    const sendMessage: TSendMessageWithContext = async () => {};

    return {
        messages,
        setMessages: vi.fn(),
        daysPerWeek: "3",
        programLength: "4",
        excludeEquipment: [] as TSelectOption[],
        healthIssues: [] as TSelectOption[],
        sendMessage,
        handleProgramLength: vi.fn(),
        handleDaysPerWeek: vi.fn(),
        handleExcludeEquipment: vi.fn(),
        handleHealthIssues: vi.fn(),
        isBuilding: false,
        handleIsBuilding: vi.fn(),
        isLoading: false,
        status: "ready" as const,
        error: null,
        onRetry: vi.fn(),
        onClearError: vi.fn(),
        retryCount: 0,
        maxRetries: 3,
        onTimeoutError: vi.fn(),
        hevyProgram: [] as THevyRoutine[],
        commitWithUndo: vi.fn(),
        lastAtomicBuildCommitKeyRef,
        appliedMutateProgramKeysRef,
    };
}

describe("MessageBubbles profile tool chips", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders Update constraints for tool-updateConstraintProfile", () => {
        const messages: TChatMessage[] = [
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-updateConstraintProfile",
                        toolCallId: "c1",
                        state: "output-available",
                        input: {},
                        output: { updatedProfile: { injuries: [] } },
                    } as TChatMessage["parts"][number],
                ],
            },
        ];

        renderBubbles(<MessageBubbles {...baseProps(messages)} />);

        expect(screen.getByText("Update constraints")).toBeTruthy();
    });

    it("renders Update training profile for tool-updateTrainingProfile", () => {
        const messages: TChatMessage[] = [
            {
                id: "a2",
                role: "assistant",
                parts: [
                    {
                        type: "tool-updateTrainingProfile",
                        toolCallId: "t1",
                        state: "output-available",
                        input: { age: 28 },
                        output: { updatedProfile: { age: 28 } },
                    } as TChatMessage["parts"][number],
                ],
            },
        ];

        renderBubbles(<MessageBubbles {...baseProps(messages)} />);

        expect(screen.getByText("Update training profile")).toBeTruthy();
    });

    it("renders both profile chips when both tools run in one turn", () => {
        const messages: TChatMessage[] = [
            {
                id: "a4",
                role: "assistant",
                parts: [
                    {
                        type: "tool-updateConstraintProfile",
                        toolCallId: "c2",
                        state: "output-available",
                        input: {},
                        output: { updatedProfile: {} },
                    } as TChatMessage["parts"][number],
                    {
                        type: "tool-updateTrainingProfile",
                        toolCallId: "t3",
                        state: "output-available",
                        input: { age: 30 },
                        output: { updatedProfile: { age: 30 } },
                    } as TChatMessage["parts"][number],
                ],
            },
        ];

        renderBubbles(<MessageBubbles {...baseProps(messages)} />);

        expect(screen.getByText("Update constraints")).toBeTruthy();
        expect(screen.getByText("Update training profile")).toBeTruthy();
    });

    it("hides skipped updateTrainingProfile chip", () => {
        const messages: TChatMessage[] = [
            {
                id: "a3",
                role: "assistant",
                parts: [
                    {
                        type: "tool-updateTrainingProfile",
                        toolCallId: "t2",
                        state: "output-available",
                        input: {},
                        output: { skipped: true, reason: "Nothing to persist" },
                    } as TChatMessage["parts"][number],
                ],
            },
        ];

        renderBubbles(<MessageBubbles {...baseProps(messages)} />);

        expect(screen.queryByText("Update training profile")).toBeNull();
    });
});
