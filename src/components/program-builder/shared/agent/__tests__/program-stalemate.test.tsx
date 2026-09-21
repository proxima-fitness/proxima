import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRef, type ReactNode, type RefObject } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { emptyUserConstraintProfileRecord } from "@/api/user-constraints";
import {
    FIX_IT_MESSAGE,
    MAKE_LATER_WEEKS_DIFFERENT_MESSAGE,
    SAME_WEEK_SKIP_MESSAGE,
    USER_REQUESTED_EXCEPTION_MESSAGE,
} from "@/app/api/chat/sanity/stalemate";
import type { IProgramStalematePayload } from "@/app/api/chat/sanity/types";
import { resetAiToolErrorCaptureForTests } from "@/lib/capture-ai-tool-error";

vi.mock("next/navigation", () => ({
    useSearchParams: () => new URLSearchParams(),
}));

const userState = { user: null as { id: string } | null };

vi.mock("@/contexts/UserContext", () => ({
    useUserContext: () => ({ user: userState.user }),
}));

vi.mock("@/contexts/BuildProgramActionsContext", () => ({
    useBuildProgramActions: () => ({
        getPersistChatIdRef: { current: () => "" },
    }),
}));

vi.mock("@/contexts/AgentDebugModeContext", () => ({
    useAgentDebugMode: () => ({
        debugMode: false,
        setDebugMode: vi.fn(),
    }),
}));

vi.mock("@/api/hooks", () => ({
    useHevyExercises: () => ({ data: [] }),
}));

const saveUserConstraintProfile = vi.fn();
const getUserConstraints = vi.fn();

vi.mock("@/api/user-constraints", async (importOriginal) => {
    const actual = await importOriginal<typeof import("@/api/user-constraints")>();
    return {
        ...actual,
        saveUserConstraintProfile: (...args: unknown[]) => saveUserConstraintProfile(...args),
        getUserConstraints: (...args: unknown[]) => getUserConstraints(...args),
    };
});

vi.mock("posthog-js", () => ({
    default: { capture: vi.fn() },
}));

import { ProgramStalemateCard } from "../ProgramStalemateCard";
import { MessageBubbles } from "../MessageBubbles";

function renderWithProviders(ui: ReactNode) {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    return render(
        <QueryClientProvider client={ client }>
            <TooltipProvider>{ ui }</TooltipProvider>
        </QueryClientProvider>,
    );
}

function constraintPayload(chips: IProgramStalematePayload["chips"]): IProgramStalematePayload {
    return {
        chips,
        key: "constraint.injurySemantic",
        kind: "constraint",
        why: "A saved injury or health limit still conflicts with this program.",
    };
}

function weekPayload(): IProgramStalematePayload {
    return {
        chips: [],
        key: "weekCoverage",
        kind: "weekCoverage",
        why: "Later weeks still copy week 1.",
    };
}

function trainingPayload(): IProgramStalematePayload {
    return {
        chips: [],
        key: "skill.sessionShape",
        kind: "training",
        why: "This program doesn't match the training you asked for.",
    };
}

function baseBubbleProps(messages: TChatMessage[]) {
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

describe("ProgramStalemateCard", () => {
    afterEach(() => {
        cleanup();
        userState.user = null;
        saveUserConstraintProfile.mockReset();
        getUserConstraints.mockReset();
        resetAiToolErrorCaptureForTests();
    });

    it("persists only the clicked saved string then sends a user message", async () => {
        userState.user = { id: "user-1" };
        getUserConstraints.mockResolvedValue({
            ...emptyUserConstraintProfileRecord(),
            injuries: ["Left knee", "bad back"],
        });
        saveUserConstraintProfile.mockResolvedValue(undefined);
        const sendMessage = vi.fn(async () => {});
        const handleHealthIssues = vi.fn();

        renderWithProviders(
            <ProgramStalemateCard
                payload={ constraintPayload([
                    { field: "injuries", value: "Left knee" },
                    { field: "injuries", value: "bad back" },
                ]) }
                sendMessage={ sendMessage }
                healthIssues={ [
                    { label: "Left knee", value: "Left knee" },
                    { label: "bad back", value: "bad back" },
                ] }
                excludeEquipment={ [] }
                handleHealthIssues={ handleHealthIssues }
                handleExcludeEquipment={ vi.fn() }
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "Left knee" }));

        await waitFor(() => {
            expect(saveUserConstraintProfile).toHaveBeenCalledTimes(1);
        });
        const saved = saveUserConstraintProfile.mock.calls[0][1];
        expect(saved.injuries).toEqual(["bad back"]);
        expect(handleHealthIssues).toHaveBeenCalledWith([
            { label: "bad back", value: "bad back" },
        ]);
        expect(sendMessage).toHaveBeenCalledWith(
            { text: "I no longer have this constraint: Left knee" },
            { body: { healthIssues: "bad back" } },
        );
        expect(screen.queryByText("Proposed changes")).toBeNull();
        expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    });

    it("sends the exact same-week skip and later-weeks messages", () => {
        const sendMessage = vi.fn(async () => {});
        renderWithProviders(
            <ProgramStalemateCard
                payload={ weekPayload() }
                sendMessage={ sendMessage }
                healthIssues={ [] }
                excludeEquipment={ [] }
                handleHealthIssues={ vi.fn() }
                handleExcludeEquipment={ vi.fn() }
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: SAME_WEEK_SKIP_MESSAGE }));
        fireEvent.click(screen.getByRole("button", { name: MAKE_LATER_WEEKS_DIFFERENT_MESSAGE }));
        expect(sendMessage).toHaveBeenNthCalledWith(1, { text: SAME_WEEK_SKIP_MESSAGE }, undefined);
        expect(sendMessage).toHaveBeenNthCalledWith(
            2,
            { text: MAKE_LATER_WEEKS_DIFFERENT_MESSAGE },
            undefined,
        );
    });

    it("sends That's what I asked for and Fix it as the user message", () => {
        const sendMessage = vi.fn(async () => {});
        renderWithProviders(
            <ProgramStalemateCard
                payload={ trainingPayload() }
                sendMessage={ sendMessage }
                healthIssues={ [] }
                excludeEquipment={ [] }
                handleHealthIssues={ vi.fn() }
                handleExcludeEquipment={ vi.fn() }
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: USER_REQUESTED_EXCEPTION_MESSAGE }));
        fireEvent.click(screen.getByRole("button", { name: FIX_IT_MESSAGE }));
        expect(sendMessage).toHaveBeenCalledWith(
            { text: USER_REQUESTED_EXCEPTION_MESSAGE },
            undefined,
        );
        expect(sendMessage).toHaveBeenCalledWith({ text: FIX_IT_MESSAGE }, undefined);
    });
});

describe("MessageBubbles program stalemate", () => {
    afterEach(() => {
        cleanup();
        userState.user = null;
        resetAiToolErrorCaptureForTests();
    });

    it("keeps Recalculating on the first Soft-fail and shows the card on stalemate", () => {
        const first = [
            {
                id: "a-try1",
                role: "assistant" as const,
                parts: [{
                    type: "tool-buildWeek",
                    toolCallId: "bw1",
                    state: "output-available",
                    input: { totalDays: 3, routines: [] },
                    output: { error: "constraint.injurySemantic", message: "does not honor" },
                }],
            },
        ] as TChatMessage[];

        const { rerender } = renderWithProviders(<MessageBubbles { ...baseBubbleProps(first) } />);
        expect(screen.getByText("Recalculating…")).toBeTruthy();
        expect(screen.queryByText("Couldn't land this program")).toBeNull();

        const second = [
            {
                id: "a-try2",
                role: "assistant" as const,
                parts: [{
                    type: "tool-buildWeek",
                    toolCallId: "bw2",
                    state: "output-available",
                    input: { totalDays: 3, routines: [] },
                    output: {
                        error: "constraint.injurySemantic",
                        message: "does not honor",
                        stalemate: constraintPayload([{ field: "injuries", value: "knee" }]),
                    },
                }],
            },
        ] as TChatMessage[];

        const client = new QueryClient({
            defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        });
        rerender(
            <QueryClientProvider client={ client }>
                <TooltipProvider>
                    <MessageBubbles { ...baseBubbleProps(second) } />
                </TooltipProvider>
            </QueryClientProvider>,
        );
        expect(screen.getByText("Couldn't land this program")).toBeTruthy();
        expect(screen.getByRole("button", { name: "knee" })).toBeTruthy();
        expect(screen.queryByText("Recalculating…")).toBeNull();
    });

    it("does not fire onTimeoutError after 120s and clears isBuilding when ready with no land", async () => {
        const onTimeoutError = vi.fn();
        const handleIsBuilding = vi.fn();
        renderWithProviders(
            <MessageBubbles
                { ...baseBubbleProps([]) }
                onTimeoutError={ onTimeoutError }
                handleIsBuilding={ handleIsBuilding }
                isBuilding
                status="ready"
            />,
        );

        await waitFor(() => {
            expect(handleIsBuilding).toHaveBeenCalledWith(false);
        });
        expect(onTimeoutError).not.toHaveBeenCalled();
    });
});
