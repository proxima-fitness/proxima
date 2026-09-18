import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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

vi.mock("@/api/chat-history", () => ({
    upsertChatHistoryTurn: vi.fn(),
}));

import { MessageBubbles } from "../MessageBubbles";
import * as helpers from "@/components/program-builder/utils/helpers";

function renderBubbles(ui: ReactNode) {
    return render(<TooltipProvider>{ui}</TooltipProvider>);
}

const makeDay = (): THevyRoutine => ({
    id: "1",
    folder_id: 0,
    order: "1",
    title: "Push",
    notes: "",
    created_at: "",
    updated_at: "",
    exercises: [
        {
            index: 0,
            title: "Bench Press",
            notes: "",
            rest_seconds: "90",
            exercise_template_id: "ex-1",
            supersets_id: null,
            sets: [
                {
                    index: 0,
                    type: "normal",
                    reps: 8,
                    weight_kg: null,
                    rpe: 7,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rep_range: { start: 8, end: 12 },
                },
            ],
        },
    ],
});

function baseProps(messages: TChatMessage[], hevyProgram: THevyRoutine[] = [makeDay()]) {
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
        hevyProgram,
        commitWithUndo: vi.fn(),
        lastAtomicBuildCommitKeyRef,
        appliedMutateProgramKeysRef,
        lastHevyShareImportKeyRef,
    };
}

describe("MessageBubbles mutation proposal", () => {
    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
    });

    it("shows Proposed changes with Accept and Reject for standalone mutateProgram", () => {
        const messages: TChatMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-mutateProgram",
                        toolCallId: "m1",
                        state: "output-available",
                        input: {},
                        output: {
                            operations: [
                                { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" },
                            ],
                        },
                    } as TChatMessage["parts"][number],
                ],
            },
        ];

        renderBubbles(<MessageBubbles { ...baseProps(messages) } />);

        expect(screen.getByText("Proposed changes")).toBeTruthy();
        expect(screen.getByText("Title")).toBeTruthy();
        expect(screen.getByText("Upper Push")).toBeTruthy();
        expect(screen.getByRole("button", { name: "Accept" })).toBeTruthy();
        expect(screen.getByRole("button", { name: "Reject" })).toBeTruthy();
        expect(screen.queryByText("Program modified")).toBeNull();
    });

    it("keeps proposal progress during the stream, without Accept", () => {
        const messages: TChatMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-mutateProgram",
                        toolCallId: "m1",
                        state: "output-available",
                        input: {},
                        output: {
                            operations: [
                                { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" },
                            ],
                        },
                    } as TChatMessage["parts"][number],
                ],
            },
        ];

        renderBubbles(<MessageBubbles { ...baseProps(messages) } status="streaming" />);

        expect(screen.getByText("Preparing proposed changes…")).toBeTruthy();
        expect(screen.queryByText("Applying program changes…")).toBeNull();
        expect(screen.queryByText("Proposed changes")).toBeNull();
        expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
    });

    it("does not open a proposal for mutateProgram after buildWeek in the same turn", () => {
        const day = makeDay();
        const messages: TChatMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-buildWeek",
                        toolCallId: "b1",
                        state: "output-available",
                        input: {},
                        output: {
                            totalDays: 1,
                            routines: [day],
                            routineCount: 1,
                            exerciseCount: 1,
                            setCount: 1,
                        },
                    } as TChatMessage["parts"][number],
                    {
                        type: "tool-mutateProgram",
                        toolCallId: "m1",
                        state: "output-available",
                        input: {},
                        output: {
                            operations: [
                                { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Later" },
                            ],
                        },
                    } as TChatMessage["parts"][number],
                ],
            },
        ];

        renderBubbles(<MessageBubbles { ...baseProps(messages) } />);

        expect(screen.queryByText("Proposed changes")).toBeNull();
        expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
        expect(screen.getByText("Program modified")).toBeTruthy();
    });

    it("does not commit the grid until Accept", () => {
        const props = baseProps([
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-mutateProgram",
                        toolCallId: "m1",
                        state: "output-available",
                        input: {},
                        output: {
                            operations: [
                                { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" },
                            ],
                        },
                    } as TChatMessage["parts"][number],
                ],
            },
        ]);

        renderBubbles(<MessageBubbles { ...props } />);

        expect(props.commitWithUndo).not.toHaveBeenCalled();

        fireEvent.click(screen.getByRole("button", { name: "Accept" }));

        expect(props.commitWithUndo).toHaveBeenCalledOnce();
        expect(props.commitWithUndo.mock.calls[0][0][0].title).toBe("Upper Push");
        expect(props.setMessages).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "a1",
                    metadata: { mutationProposal: "accepted" },
                }),
            ]),
        );
    });

    it("Reject leaves the grid unchanged and removes the buttons", () => {
        const props = baseProps([
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-mutateProgram",
                        toolCallId: "m1",
                        state: "output-available",
                        input: {},
                        output: {
                            operations: [
                                { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" },
                            ],
                        },
                    } as TChatMessage["parts"][number],
                ],
            },
        ]);

        renderBubbles(<MessageBubbles { ...props } />);

        fireEvent.click(screen.getByRole("button", { name: "Reject" }));

        expect(props.commitWithUndo).not.toHaveBeenCalled();
        expect(props.setMessages).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "a1",
                    metadata: { mutationProposal: "rejected" },
                }),
            ]),
        );
    });

    it("expires like Reject when Accept fail-all cannot apply, without committing", () => {
        vi.spyOn(helpers, "acceptMutationProposal").mockReturnValue(false);

        const props = baseProps([
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-mutateProgram",
                        toolCallId: "m1",
                        state: "output-available",
                        input: {},
                        output: {
                            operations: [
                                { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" },
                            ],
                        },
                    } as TChatMessage["parts"][number],
                ],
            },
        ]);

        renderBubbles(<MessageBubbles { ...props } />);

        fireEvent.click(screen.getByRole("button", { name: "Accept" }));

        expect(props.commitWithUndo).not.toHaveBeenCalled();
        expect(props.setMessages).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({
                    id: "a1",
                    metadata: { mutationProposal: "rejected" },
                }),
            ]),
        );
    });

    it("hides Accept on remount when the batch is illegal against the current grid", () => {
        const props = baseProps(
            [
                { id: "u1", role: "user", parts: [{ type: "text", text: "Drop bench" }] },
                {
                    id: "a1",
                    role: "assistant",
                    parts: [
                        {
                            type: "tool-mutateProgram",
                            toolCallId: "m1",
                            state: "output-available",
                            input: {},
                            output: {
                                operations: [
                                    { op: "delete_exercise", folderIds: [0], dayOrder: 1, exerciseIndex: 0 },
                                ],
                            },
                        } as TChatMessage["parts"][number],
                    ],
                },
            ],
        );

        renderBubbles(<MessageBubbles { ...props } />);

        expect(screen.getByText("Proposed changes")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
        expect(props.commitWithUndo).not.toHaveBeenCalled();
        expect(props.setMessages).not.toHaveBeenCalled();
    });
});
