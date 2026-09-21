import { describe, it, expect, vi } from "vitest";
import type { RefObject } from "react";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

vi.mock("sonner", () => ({
    toast: { error: vi.fn() },
}));

import type { UIMessage } from "ai";
import {
    getMergedBuildAndMutateSnapshot,
    resolveEffectiveWeeksForAtomicCommit,
    buildFullProgramFromFirstWeek,
    tryCommitAtomicBuildProgramAndMutations,
    getAtomicBuildCommitKey,
} from "../helpers";

/** `createRef` types `current` as `T | null`; the commit helper requires a live Set. */
function makeAppliedKeysRef(initial = new Set<string>()): RefObject<Set<string>> {
    return { current: initial };
}

function makeAtomicKeyRef(initial: string | null = null): RefObject<string | null> {
    return { current: initial };
}

const minimalRoutine = (day: number): THevyRoutine => ({
    id: String(day),
    title: `Day ${day}`,
    folder_id: 0,
    order: String(day),
    notes: "",
    created_at: "",
    updated_at: "",
    exercises: [
        {
            index: 0,
            title: "Test",
            notes: "",
            rest_seconds: "90",
            exercise_template_id: "ex-1",
            supersets_id: null,
            sets: [
                {
                    index: 0,
                    type: "normal",
                    reps: 10,
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

const buildProgramPart = (
    routines: THevyRoutine[],
    exerciseRoles?: Array<{
        dayOrder: number;
        exerciseIndex: number;
        role: "main" | "accessory" | "warmup";
    }>,
    plan?: Record<string, unknown>,
) =>
    ({
        type: "tool-buildProgram",
        toolCallId: "b1",
        state: "output-available",
        input: {},
        output: {
            totalDays: routines.length,
            routines,
            routineCount: routines.length,
            exerciseCount: routines.length,
            setCount: routines.length,
            ...(exerciseRoles ? { exerciseRoles } : {}),
            ...(plan ? { plan } : {}),
        },
    }) as UIMessage["parts"][number];

const mutatePart = (operations: Array<Record<string, unknown>>) =>
    ({
        type: "tool-mutateProgram",
        toolCallId: "m1",
        state: "output-available",
        input: {},
        output: { operations },
    }) as UIMessage["parts"][number];

describe("atomic commit / buildProgram plan duration alignment", () => {
    it("reads durationWeeks from the plan on the last tool-buildProgram (e.g. 11 vs UI 8)", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    buildProgramPart([minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)], undefined, {
                        durationWeeks: 11,
                        goal: "test",
                        daysPerWeek: 3,
                        blocks: [{ name: "A", weeks: [1], intent: "x" }],
                    }),
                ],
            },
        ];

        const snap = getMergedBuildAndMutateSnapshot(messages);
        expect(snap).not.toBeNull();
        expect(snap!.durationWeeksFromPlan).toBe(11);
        expect(resolveEffectiveWeeksForAtomicCommit(snap!, 8)).toBe(11);
        const full = buildFullProgramFromFirstWeek(snap!.baseWeekRoutines, snap!.totalDays, 11);
        expect(full.length).toBe(33);
    });

    it("falls back to UI program length when plan is absent", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [buildProgramPart([minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)])],
            },
        ];

        const snap = getMergedBuildAndMutateSnapshot(messages);
        expect(snap).not.toBeNull();
        expect(snap!.durationWeeksFromPlan).toBeUndefined();
        expect(resolveEffectiveWeeksForAtomicCommit(snap!, 8)).toBe(8);
    });
});

describe("getMergedBuildAndMutateSnapshot", () => {
    it("merges mutateProgram ops after buildProgram in message order", () => {
        const week = [minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)];
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    buildProgramPart(week),
                    mutatePart([{ op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "A" }]),
                    mutatePart([{ op: "add_day_notes", folderIds: [0], dayOrder: 1, notes: "Focus" }]),
                ],
            },
        ];

        const snap = getMergedBuildAndMutateSnapshot(messages);
        expect(snap!.mergedOperations).toHaveLength(2);
        expect(snap!.mutateKeys).toEqual(["a1-1", "a1-2"]);
    });
});

describe("tryCommitAtomicBuildProgramAndMutations", () => {
    it("duplicates week and applies post-buildProgram mutate batch in one commit", () => {
        const week = [minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)];
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    buildProgramPart(week),
                    mutatePart([
                        { op: "edit_day_title", folderIds: [1], dayOrder: 2, title: "Week 2 Day 2" },
                    ]),
                ],
            },
        ];

        const appliedKeysRef = makeAppliedKeysRef();
        const lastAtomicKeyRef = makeAtomicKeyRef();
        const commitWithUndo = vi.fn();

        const result = tryCommitAtomicBuildProgramAndMutations(
            messages,
            "ready",
            3,
            [],
            appliedKeysRef,
            lastAtomicKeyRef,
            commitWithUndo,
        );

        expect(result.committed).toBe(true);
        expect(result.effectiveWeeks).toBe(3);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        const committed = commitWithUndo.mock.calls[0][0] as THevyRoutine[];
        expect(committed.length).toBe(9);
        const week2Day2 = committed.find(
            (r) => r.folder_id === 1 && Number(r.order) === 2,
        );
        expect(week2Day2?.title).toBe("Week 2 Day 2");
        expect(appliedKeysRef.current?.has("a1-1")).toBe(true);
    });

    it("fail-all after duplicate leaves grid unchanged", () => {
        const week = [minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)];
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    buildProgramPart(week),
                    mutatePart([
                        { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "OK" },
                        { op: "edit_day_title", folderIds: [0], dayOrder: 0, title: "Bad" },
                    ]),
                ],
            },
        ];

        const appliedKeysRef = makeAppliedKeysRef();
        const lastAtomicKeyRef = makeAtomicKeyRef();
        const commitWithUndo = vi.fn();

        const result = tryCommitAtomicBuildProgramAndMutations(
            messages,
            "ready",
            2,
            [],
            appliedKeysRef,
            lastAtomicKeyRef,
            commitWithUndo,
        );

        expect(result.committed).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
        expect(appliedKeysRef.current?.size).toBe(0);
    });

    it("does not commit while streaming", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [buildProgramPart([minimalRoutine(1)])],
            },
        ];

        const commitWithUndo = vi.fn();
        const result = tryCommitAtomicBuildProgramAndMutations(
            messages,
            "streaming",
            1,
            [],
            makeAppliedKeysRef(),
            makeAtomicKeyRef(),
            commitWithUndo,
        );

        expect(result.committed).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
    });

    it("stamps later weeks when there is no same-turn mutateProgram", () => {
        const week = [minimalRoutine(1)];
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    buildProgramPart(week, [{ dayOrder: 1, exerciseIndex: 0, role: "main" }], {
                        durationWeeks: 4,
                        goal: "test",
                        daysPerWeek: 1,
                        blocks: [
                            { name: "Accumulation", weeks: [1, 2, 3], intent: "Volume" },
                            { name: "Deload", weeks: [4], intent: "Unload" },
                        ],
                        periodizationWave: {
                            weeks: [
                                { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
                                { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
                                { week: 3, main: { rpeDelta: 1, setCountDelta: 0 } },
                                {
                                    week: 4,
                                    main: { rpeDelta: -2, setCountDelta: 0 },
                                    accessory: { rpeDelta: -1, setCountDelta: 0 },
                                },
                            ],
                        },
                    }),
                ],
            },
        ];

        const appliedKeysRef = makeAppliedKeysRef();
        const lastAtomicKeyRef = makeAtomicKeyRef();
        const commitWithUndo = vi.fn();

        const result = tryCommitAtomicBuildProgramAndMutations(
            messages,
            "ready",
            4,
            [],
            appliedKeysRef,
            lastAtomicKeyRef,
            commitWithUndo,
        );

        expect(result.committed).toBe(true);
        const committed = commitWithUndo.mock.calls[0][0] as THevyRoutine[];
        expect(committed).toHaveLength(4);
        const week2 = committed.find((r) => r.folder_id === 1);
        expect(week2?.exercises[0].sets[0].rpe).toBe(8);
        const week4 = committed.find((r) => r.folder_id === 3);
        expect(week4?.exercises[0].sets[0].rpe).toBe(5);
        expect(week4?.exercises[0].sets[0].weight_kg).toBeNull();
        expect(week4?.title).toBe("Day 1");
    });

    it("changes the atomic commit key when only Exercise roles change", () => {
        const week = [minimalRoutine(1)];
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [buildProgramPart(week, [{ dayOrder: 1, exerciseIndex: 0, role: "main" }])],
            },
        ];
        const snapMain = getMergedBuildAndMutateSnapshot(messages)!;
        const messagesAccessory: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [buildProgramPart(week, [{ dayOrder: 1, exerciseIndex: 0, role: "accessory" }])],
            },
        ];
        const snapAccessory = getMergedBuildAndMutateSnapshot(messagesAccessory)!;
        expect(getAtomicBuildCommitKey(snapMain, messages, 4)).not.toBe(
            getAtomicBuildCommitKey(snapAccessory, messagesAccessory, 4),
        );
    });
});
