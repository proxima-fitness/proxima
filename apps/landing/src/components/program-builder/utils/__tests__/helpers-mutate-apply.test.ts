// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";
import type { RefObject } from "react";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

vi.mock("sonner", () => ({
    toast: { error: vi.fn() },
}));

import { toast } from "sonner";
import {
    acceptMutationProposal,
    collectMutationProposal,
    isAgentMutationLockActive,
    mutationProposalApplies,
    readStoredMutationProposalRecipe,
    resolveMutationProposalDecision,
    withMutationProposalDecision,
    type IMutationProposal,
} from "../helpers";

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

const mutatePart = (operations: Array<Record<string, unknown>>) =>
    ({
        type: "tool-mutateProgram",
        toolCallId: "m1",
        state: "output-available",
        input: {},
        output: { operations },
    }) as UIMessage["parts"][number];

const appliedKeysRef = (): RefObject<Set<string>> => ({
    current: new Set(),
});

describe("collectMutationProposal", () => {
    it("records a pending batch on ready without committing", () => {
        const program = [makeDay()];

        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }]),
                ],
            },
        ];

        const proposal = collectMutationProposal(messages, "ready", program, appliedKeysRef());

        expect(proposal).toEqual({
            keys: ["a1-0"],
            messageIds: ["a1"],
            operations: [{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }],
        });
        expect(program[0].title).toBe("Push");
    });

    it("merges multiple mutateProgram parts into one pending batch", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Edit" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Step 1" }]),
                    mutatePart([{ op: "add_day_notes", folderIds: [0], dayOrder: 1, notes: "Focus" }]),
                ],
            },
        ];

        const proposal = collectMutationProposal(messages, "ready", [makeDay()], appliedKeysRef());

        expect(proposal?.keys).toEqual(["a1-0", "a1-1"]);
        expect(proposal?.messageIds).toEqual(["a1"]);
        expect(proposal?.operations).toHaveLength(2);
        expect(proposal?.operations[0]).toMatchObject({ op: "edit_day_title", title: "Step 1" });
        expect(proposal?.operations[1]).toMatchObject({ op: "add_day_notes", notes: "Focus" });
    });

    it("does not open a proposal while streaming", () => {
        const messages: UIMessage[] = [
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "X" }]),
                ],
            },
        ];

        expect(collectMutationProposal(messages, "streaming", [makeDay()], appliedKeysRef())).toBeNull();
    });

    it("does not open a proposal for a tool-error batch", () => {
        const messages: UIMessage[] = [
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-mutateProgram",
                        toolCallId: "m1",
                        state: "output-available",
                        input: {},
                        output: { error: "Invalid operations", operations: [] },
                    } as UIMessage["parts"][number],
                ],
            },
        ];

        expect(collectMutationProposal(messages, "ready", [makeDay()], appliedKeysRef())).toBeNull();
    });

    it("skips mutateProgram parts after buildProgram in the same turn", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-buildProgram",
                        toolCallId: "b1",
                        state: "output-available",
                        input: {},
                        output: {
                            totalDays: 1,
                            routines: [makeDay()],
                            routineCount: 1,
                            exerciseCount: 1,
                            setCount: 1,
                        },
                    } as UIMessage["parts"][number],
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Later" }]),
                ],
            },
        ];

        expect(collectMutationProposal(messages, "ready", [makeDay()], appliedKeysRef())).toBeNull();
    });

    it("does not reopen an accepted or rejected card after hydrate", () => {
        const accepted: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                metadata: { mutationProposal: "accepted" },
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }]),
                ],
            },
        ];
        const rejected: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                metadata: { mutationProposal: "rejected" },
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }]),
                ],
            },
        ];

        expect(collectMutationProposal(accepted, "ready", [makeDay()], appliedKeysRef())).toBeNull();
        expect(collectMutationProposal(rejected, "ready", [makeDay()], appliedKeysRef())).toBeNull();
    });

    it("treats a later user message as implicit Reject", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }]),
                ],
            },
            { id: "u2", role: "user", parts: [{ type: "text", text: "Never mind, do something else" }] },
        ];

        expect(collectMutationProposal(messages, "ready", [makeDay()], appliedKeysRef())).toBeNull();
        expect(resolveMutationProposalDecision(messages[1], messages.slice(2))).toBe("rejected");
    });

    it("collects a never-accepted batch after hydrate with an empty applied-keys ref", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }]),
                ],
            },
        ];

        const proposal = collectMutationProposal(messages, "ready", [makeDay()], appliedKeysRef());

        expect(proposal?.keys).toEqual(["a1-0"]);
        expect(proposal?.operations[0]).toMatchObject({ title: "Upper Push" });
    });
});

describe("acceptMutationProposal", () => {
    it("commits the pending batch as one undo step", () => {
        const program = [makeDay()];
        const keysRef = appliedKeysRef();
        const commitWithUndo = vi.fn();
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Edit" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Step 1" }]),
                    mutatePart([{ op: "add_day_notes", folderIds: [0], dayOrder: 1, notes: "Focus" }]),
                ],
            },
        ];

        const proposal = collectMutationProposal(messages, "ready", program, keysRef);
        expect(proposal).not.toBeNull();

        const accepted = acceptMutationProposal(
            program,
            proposal!,
            keysRef,
            commitWithUndo,
        );

        expect(accepted).toBe(true);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        expect(commitWithUndo.mock.calls[0][0][0].title).toBe("Step 1");
        expect(commitWithUndo.mock.calls[0][0][0].notes).toBe("Focus");
        expect(commitWithUndo.mock.calls[0][1]).toEqual({
            recordUndo: true,
            proposalMarkKeys: [],
        });
        expect(keysRef.current?.has("a1-0")).toBe(true);
        expect(keysRef.current?.has("a1-1")).toBe(true);
        expect(program[0].title).toBe("Push");
    });

    it("fail-all on Accept leaves the grid unchanged", () => {
        const program = [makeDay()];
        const keysRef = appliedKeysRef();
        const commitWithUndo = vi.fn();
        const proposal: IMutationProposal = {
            keys: ["a1-0"],
            messageIds: ["a1"],
            operations: [
                { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "OK" },
                { op: "edit_day_title", folderIds: [0], dayOrder: 0, title: "Bad" },
            ],
        };

        const accepted = acceptMutationProposal(program, proposal, keysRef, commitWithUndo);

        expect(accepted).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
        expect(program[0].title).toBe("Push");
        expect(keysRef.current?.has("a1-0")).toBe(false);
        expect(toast.error).toHaveBeenCalled();
    });

    it("applies program-wide swap_exercise_template on Accept", () => {
        const makeWeekProgram = (): THevyRoutine[] =>
            Array.from({ length: 8 }, (_, week) =>
                ({
                    id: String(week + 1),
                    folder_id: week,
                    order: "1",
                    title: "Day 1",
                    notes: "",
                    created_at: "",
                    updated_at: "",
                    exercises: [
                        {
                            index: 0,
                            title: "Barbell Bench Press",
                            notes: "Pause each rep",
                            reason: "Main lift",
                            rest_seconds: "180",
                            exercise_template_id: "BENCH_BB",
                            supersets_id: null,
                            sets: [
                                {
                                    index: 0,
                                    type: "normal",
                                    reps: 5,
                                    weight_kg: null,
                                    rpe: 8,
                                    distance_meters: null,
                                    duration_seconds: null,
                                    custom_metric: null,
                                    rep_range: null,
                                },
                            ],
                        },
                    ],
                }) as THevyRoutine,
            );

        const program = makeWeekProgram();
        const commitWithUndo = vi.fn();
        const proposal = {
            keys: ["a1-0"],
            messageIds: ["a1"],
            operations: [
                {
                    op: "swap_exercise_template" as const,
                    from_exercise_template_id: "BENCH_BB",
                    preserve_sets: true,
                    to: {
                        exercise_template_id: "3601968B",
                        title: "Dumbbell Bench Press",
                        reason: "Dumbbell-only.",
                    },
                },
            ],
        };

        const accepted = acceptMutationProposal(program, proposal, appliedKeysRef(), commitWithUndo);

        expect(accepted).toBe(true);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        const next = commitWithUndo.mock.calls[0][0] as THevyRoutine[];
        expect(next).toHaveLength(8);
        expect(next.every((day) => day.exercises[0].exercise_template_id === "3601968B")).toBe(true);
        expect(next.every((day) => day.exercises[0].title === "Dumbbell Bench Press")).toBe(true);
        expect(next.every((day) => day.exercises[0].reason === "Dumbbell-only.")).toBe(true);
        expect(next.every((day) => day.exercises[0].notes === "Pause each rep")).toBe(true);
        expect(next.every((day) => day.exercises[0].sets[0].reps === 5)).toBe(true);
        expect(commitWithUndo.mock.calls[0][1]).toEqual({
            recordUndo: true,
            proposalMarkKeys: [1, 2, 3, 4, 5, 6, 7, 8],
        });
    });

    it("Accept of a set change stores that row's Builder exercise key", () => {
        const program = [makeDay()];
        const commitWithUndo = vi.fn();
        const proposal: IMutationProposal = {
            keys: ["a1-0"],
            messageIds: ["a1"],
            operations: [
                {
                    op: "update_set",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { reps: 10 },
                },
            ],
        };

        expect(acceptMutationProposal(program, proposal, appliedKeysRef(), commitWithUndo)).toBe(true);
        expect(commitWithUndo.mock.calls[0][1]).toEqual({
            recordUndo: true,
            proposalMarkKeys: [1],
        });
    });

    it("empty-grid Accept stores no Proposal marks", () => {
        const commitWithUndo = vi.fn();
        const proposal: IMutationProposal = {
            keys: ["a1-0"],
            messageIds: ["a1"],
            operations: [{ op: "add_day", folderIds: [0] }],
        };

        expect(acceptMutationProposal([], proposal, appliedKeysRef(), commitWithUndo)).toBe(true);
        expect(commitWithUndo.mock.calls[0][1]).toEqual({ recordUndo: false });
    });
});

const pendingRenameMessages = (): UIMessage[] => [
    { id: "u1", role: "user", parts: [{ type: "text", text: "Rename day" }] },
    {
        id: "a1",
        role: "assistant",
        parts: [
            mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }]),
        ],
    },
];

describe("isAgentMutationLockActive", () => {
    it("locks while a pending Mutation proposal still applies", () => {
        expect(
            isAgentMutationLockActive(
                pendingRenameMessages(),
                "ready",
                [makeDay()],
                appliedKeysRef(),
            ),
        ).toBe(true);
    });

    it("locks while the chat is streaming, including first-build", () => {
        expect(
            isAgentMutationLockActive([], "streaming", [makeDay()], appliedKeysRef()),
        ).toBe(true);
    });

    it("lifts after Accept, Reject, or a later user message", () => {
        const program = [makeDay()];
        const accepted = withMutationProposalDecision(pendingRenameMessages(), ["a1"], "accepted");
        const rejected = withMutationProposalDecision(pendingRenameMessages(), ["a1"], "rejected");
        const implicit: UIMessage[] = [
            ...pendingRenameMessages(),
            { id: "u2", role: "user", parts: [{ type: "text", text: "Never mind" }] },
        ];

        expect(isAgentMutationLockActive(accepted, "ready", program, appliedKeysRef())).toBe(false);
        expect(isAgentMutationLockActive(rejected, "ready", program, appliedKeysRef())).toBe(false);
        expect(isAgentMutationLockActive(implicit, "ready", program, appliedKeysRef())).toBe(false);
    });

    it("does not lock first-build trailing mutate after the stream ends", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-buildProgram",
                        toolCallId: "b1",
                        state: "output-available",
                        input: {},
                        output: {
                            totalDays: 1,
                            routines: [makeDay()],
                            routineCount: 1,
                            exerciseCount: 1,
                            setCount: 1,
                        },
                    } as UIMessage["parts"][number],
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Later" }]),
                ],
            },
        ];

        expect(
            isAgentMutationLockActive(messages, "ready", [makeDay()], appliedKeysRef()),
        ).toBe(false);
    });

    it("does not lock a stale pending batch that fail-all cannot apply", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Drop bench" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "delete_exercise", folderIds: [0], dayOrder: 1, exerciseIndex: 0 }]),
                ],
            },
        ];

        expect(
            isAgentMutationLockActive(messages, "ready", [makeDay()], appliedKeysRef()),
        ).toBe(false);
    });

    it("lifts after fail-all expire is marked rejected", () => {
        const program = [makeDay()];
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Drop bench" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "delete_exercise", folderIds: [0], dayOrder: 1, exerciseIndex: 0 }]),
                ],
            },
        ];
        const proposal = collectMutationProposal(messages, "ready", program, appliedKeysRef());
        expect(proposal).not.toBeNull();

        const expired = withMutationProposalDecision(messages, proposal!.messageIds, "rejected");

        expect(isAgentMutationLockActive(expired, "ready", program, appliedKeysRef())).toBe(false);
        expect(collectMutationProposal(expired, "ready", program, appliedKeysRef())).toBeNull();
    });
});

describe("mutationProposalApplies", () => {
    it("is false when fail-all cannot apply to the current grid", () => {
        const proposal: IMutationProposal = {
            keys: ["a1-0"],
            messageIds: ["a1"],
            operations: [
                { op: "delete_exercise", folderIds: [0], dayOrder: 1, exerciseIndex: 0 },
            ],
        };

        expect(mutationProposalApplies([makeDay()], proposal)).toBe(false);
        expect(mutationProposalApplies([makeDay()], {
            keys: ["a1-0"],
            messageIds: ["a1"],
            operations: [{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }],
        })).toBe(true);
    });
});

describe("withMutationProposalDecision", () => {
    it("stores accepted and rejected on message metadata", () => {
        const messages: TChatMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Rename" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "Upper Push" }]),
                ],
            },
        ];

        const recipe = {
            days: [{ heading: "Week 1, Push", steps: [{ kind: "action" as const, text: "Rename Push to Upper Push" }] }],
        };
        const accepted = withMutationProposalDecision(messages, ["a1"], "accepted", recipe);
        expect(accepted[1].metadata).toEqual({
            mutationProposal: "accepted",
            mutationProposalRecipe: recipe,
        });
        expect(resolveMutationProposalDecision(accepted[1], [])).toBe("accepted");

        const rejected = withMutationProposalDecision(messages, ["a1"], "rejected", recipe);
        expect(rejected[1].metadata).toEqual({
            mutationProposal: "rejected",
            mutationProposalRecipe: recipe,
        });
        expect(resolveMutationProposalDecision(rejected[1], [])).toBe("rejected");
        expect(readStoredMutationProposalRecipe(accepted[1])).toEqual(recipe);
        expect(readStoredMutationProposalRecipe(messages[1])).toBeNull();
    });
});
