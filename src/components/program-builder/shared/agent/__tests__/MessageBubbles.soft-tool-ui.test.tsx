import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { createRef, type ReactNode, type RefObject } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { resetAiToolErrorCaptureForTests } from "@/lib/capture-ai-tool-error";

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

const debugModeState = { debugMode: false };

vi.mock("@/contexts/AgentDebugModeContext", () => ({
    useAgentDebugMode: () => ({
        debugMode: debugModeState.debugMode,
        setDebugMode: vi.fn(),
    }),
}));

const { posthogCapture } = vi.hoisted(() => ({ posthogCapture: vi.fn() }));

vi.mock("posthog-js", () => ({
    default: { capture: posthogCapture },
}));

import { MessageBubbles } from "../MessageBubbles";

function renderBubbles(ui: ReactNode) {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
}

function baseProps(messages: TChatMessage[]) {
    const lastAtomicBuildCommitKeyRef = createRef<string | null>();
    const lastHevyShareImportKeyRef = createRef<string | null>();
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
        isBuilding: true,
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
        lastHevyShareImportKeyRef,
    };
}

function assistantWithPart(part: TChatMessage["parts"][number]): TChatMessage[] {
    return [
        {
            id: "a-soft",
            role: "assistant",
            parts: [part],
        },
    ];
}

describe("MessageBubbles soft tool UI", () => {
    afterEach(() => {
        cleanup();
        debugModeState.debugMode = false;
        posthogCapture.mockClear();
        resetAiToolErrorCaptureForTests();
    });

    it("non-debug: soft fail on buildWeek shows Recalculating only", () => {
        debugModeState.debugMode = false;
        const messages = assistantWithPart({
            type: "tool-buildWeek",
            toolCallId: "bw1",
            state: "output-available",
            input: { totalDays: 3, routines: [] },
            output: { error: "Invalid routines", message: "fix and retry" },
        } as TChatMessage["parts"][number]);

        renderBubbles(<MessageBubbles {...baseProps(messages)} />);

        expect(screen.getByText("Recalculating…")).toBeTruthy();
        expect(screen.queryByText("Send to Developer")).toBeNull();
        expect(screen.queryByText(/Something went wrong while building/i)).toBeNull();
        expect(posthogCapture).toHaveBeenCalledWith(
            "ai_tool_error",
            expect.objectContaining({
                tool: "buildWeek",
                errorCode: "Invalid routines",
            }),
        );
    });

    it("non-debug: soft fail on mutateProgram shows Planning only", () => {
        debugModeState.debugMode = false;
        const messages = assistantWithPart({
            type: "tool-mutateProgram",
            toolCallId: "mp1",
            state: "output-available",
            input: { operations: [] },
            output: { error: "Program mutation batch failed", failures: [] },
        } as TChatMessage["parts"][number]);

        renderBubbles(<MessageBubbles {...baseProps(messages)} />);

        expect(screen.getByText("Planning…")).toBeTruthy();
        expect(screen.queryByText("Send to Developer")).toBeNull();
        expect(posthogCapture).toHaveBeenCalledWith(
            "ai_tool_error",
            expect.objectContaining({
                tool: "mutateProgram",
                errorCode: "Program mutation batch failed",
            }),
        );
    });

    it("non-debug: soft fail on history / rate / Hevy share tools shows calm copy", () => {
        debugModeState.debugMode = false;
        const messages: TChatMessage[] = [
            {
                id: "a-multi",
                role: "assistant",
                parts: [
                    {
                        type: "tool-getWorkoutHistory",
                        toolCallId: "wh1",
                        state: "output-available",
                        input: {},
                        output: { error: "history_unavailable", message: "nope" },
                    },
                    {
                        type: "tool-rateProgram",
                        toolCallId: "rp1",
                        state: "output-available",
                        output: { error: "rate_failed", message: "nope" },
                    },
                    {
                        type: "tool-fetchHevyShareFolder",
                        toolCallId: "fs1",
                        state: "output-available",
                        input: { url: "https://hevy.com/folder/x" },
                        output: { error: "share_fetch_failed", message: "nope" },
                    },
                    {
                        type: "tool-importHevyShareFolder",
                        toolCallId: "is1",
                        state: "output-available",
                        input: { url: "https://hevy.com/folder/x", confirmed: true },
                        output: { error: "share_import_failed", message: "nope" },
                    },
                ] as TChatMessage["parts"],
            },
        ];

        renderBubbles(<MessageBubbles {...baseProps(messages)} />);

        expect(screen.getByText("Loading history…")).toBeTruthy();
        expect(screen.getByText("Scoring…")).toBeTruthy();
        expect(screen.getByText("Reading share…")).toBeTruthy();
        expect(screen.getByText("Loading share…")).toBeTruthy();
        expect(screen.queryByText("Send to Developer")).toBeNull();
    });

    it("debug mode: soft fail shows ToolErrorPanel for buildWeek and mutateProgram", () => {
        debugModeState.debugMode = true;
        const messages: TChatMessage[] = [
            {
                id: "a-debug",
                role: "assistant",
                parts: [
                    {
                        type: "tool-buildWeek",
                        toolCallId: "bw2",
                        state: "output-available",
                        input: { totalDays: 3, routines: [] },
                        output: { error: "Invalid routines", message: "fix and retry" },
                    },
                    {
                        type: "tool-mutateProgram",
                        toolCallId: "mp2",
                        state: "output-available",
                        input: { operations: [] },
                        output: { error: "Batch failed", failures: [] },
                    },
                ] as TChatMessage["parts"],
            },
        ];

        renderBubbles(<MessageBubbles {...baseProps(messages)} />);

        expect(screen.queryByText("Recalculating…")).toBeNull();
        expect(screen.queryByText("Planning…")).toBeNull();
        expect(screen.getAllByText("Send to Developer").length).toBeGreaterThanOrEqual(2);
        expect(screen.getByText("Build week")).toBeTruthy();
        expect(screen.getByText("Mutate program")).toBeTruthy();
    });
});
