import { describe, it, expect, vi } from "vitest";
import { createRef } from "react";

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
    tryCommitAtomicBuildWeekAndMutations,
} from "../helpers";

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

const buildWeekPart = (routines: THevyRoutine[]) =>
    ({
        type: "tool-buildWeek",
        toolCallId: "b1",
        state: "output-available",
        input: {},
        output: {
            totalDays: routines.length,
            routines,
            routineCount: routines.length,
            exerciseCount: routines.length,
            setCount: routines.length,
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

describe("atomic commit / planProgram duration alignment", () => {
    it("reads durationWeeks from tool-planProgram before last buildWeek (e.g. 11 vs UI 8)", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    {
                        type: "tool-planProgram",
                        toolCallId: "p1",
                        state: "output-available",
                        input: {},
                        output: {
                            plan: {
                                durationWeeks: 11,
                                goal: "test",
                                daysPerWeek: 3,
                                blocks: [{ name: "A", weeks: [1], intent: "x" }],
                            },
                            summary: "11 wk",
                        },
                    } as UIMessage["parts"][number],
                    buildWeekPart([minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)]),
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
                parts: [buildWeekPart([minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)])],
            },
        ];

        const snap = getMergedBuildAndMutateSnapshot(messages);
        expect(snap).not.toBeNull();
        expect(snap!.durationWeeksFromPlan).toBeUndefined();
        expect(resolveEffectiveWeeksForAtomicCommit(snap!, 8)).toBe(8);
    });
});

describe("getMergedBuildAndMutateSnapshot", () => {
    it("merges mutateProgram ops after buildWeek in message order", () => {
        const week = [minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)];
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    buildWeekPart(week),
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

describe("tryCommitAtomicBuildWeekAndMutations", () => {
    it("duplicates week and applies post-buildWeek mutate batch in one commit", () => {
        const week = [minimalRoutine(1), minimalRoutine(2), minimalRoutine(3)];
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "Build" }] },
            {
                id: "a1",
                role: "assistant",
                parts: [
                    buildWeekPart(week),
                    mutatePart([
                        { op: "edit_day_title", folderIds: [1], dayOrder: 2, title: "Week 2 Day 2" },
                    ]),
                ],
            },
        ];

        const appliedKeysRef = createRef<Set<string>>();
        appliedKeysRef.current = new Set();
        const lastAtomicKeyRef = createRef<string | null>();
        lastAtomicKeyRef.current = null;
        const commitWithUndo = vi.fn();

        const result = tryCommitAtomicBuildWeekAndMutations(
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
                    buildWeekPart(week),
                    mutatePart([
                        { op: "edit_day_title", folderIds: [0], dayOrder: 1, title: "OK" },
                        { op: "edit_day_title", folderIds: [0], dayOrder: 0, title: "Bad" },
                    ]),
                ],
            },
        ];

        const appliedKeysRef = createRef<Set<string>>();
        appliedKeysRef.current = new Set();
        const lastAtomicKeyRef = createRef<string | null>();
        lastAtomicKeyRef.current = null;
        const commitWithUndo = vi.fn();

        const result = tryCommitAtomicBuildWeekAndMutations(
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
                parts: [buildWeekPart([minimalRoutine(1)])],
            },
        ];

        const commitWithUndo = vi.fn();
        const result = tryCommitAtomicBuildWeekAndMutations(
            messages,
            "streaming",
            1,
            [],
            createRef<Set<string>>(),
            createRef<string | null>(),
            commitWithUndo,
        );

        expect(result.committed).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
    });
});
