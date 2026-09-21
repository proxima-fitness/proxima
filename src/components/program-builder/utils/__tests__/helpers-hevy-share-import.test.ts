import { afterEach, describe, expect, it, vi } from "vitest";
import type { UIMessage } from "ai";
import { createRef } from "react";

vi.mock("@/components/program-builder/api/hevy", () => ({
    getHevyExercises: vi.fn(async () => []),
}));

const toastError = vi.fn();
vi.mock("sonner", () => ({
    toast: {
        error: (...args: unknown[]) => toastError(...args),
        success: vi.fn(),
        warning: vi.fn(),
    },
}));

import {
    getHevyShareImportSeed,
    tryApplyHevyShareImport,
    tryCommitAtomicBuildProgramAndMutations,
} from "../helpers";

const makeShareDay = (dayNumber: number, title: string): THevyRoutine => ({
    id: String(dayNumber),
    title,
    folder_id: 0,
    order: String(dayNumber),
    notes: "",
    created_at: "",
    updated_at: "",
    exercises: [
        {
            index: 0,
            title: "Bench Press (Barbell)",
            notes: "",
            rest_seconds: "120",
            exercise_template_id: "TEMPLATE_BENCH",
            supersets_id: null,
            sets: [
                {
                    index: 0,
                    type: "normal",
                    reps: 8,
                    weight_kg: 60,
                    rpe: null,
                    distance_meters: null,
                    duration_seconds: null,
                    custom_metric: null,
                    rep_range: null,
                },
            ],
        },
    ],
});

const SEED = [makeShareDay(1, "Push"), makeShareDay(2, "Pull")];

const importPart = (output: unknown) =>
    ({
        type: "tool-importHevyShareFolder",
        toolCallId: "i1",
        state: "output-available",
        input: { url: "https://hevy.com/folder/abc123", confirmed: true },
        output,
    }) as UIMessage["parts"][number];

const importedOutput = (routines: THevyRoutine[]) => ({
    imported: true as const,
    url: "https://hevy.com/folder/abc123",
    kind: "folder" as const,
    title: "Push Pull Legs",
    dayCount: routines.length,
    exerciseCount: routines.length,
    routines,
});

function threadWith(output: unknown): UIMessage[] {
    return [
        { id: "u1", role: "user", parts: [{ type: "text", text: "yes, load it" }] },
        { id: "a1", role: "assistant", parts: [importPart(output)] },
    ];
}

function newImportKeyRef() {
    const ref = createRef<string | null>();
    ref.current = null;
    return ref;
}

afterEach(() => {
    toastError.mockClear();
    vi.restoreAllMocks();
});

describe("getHevyShareImportSeed", () => {
    it("ignores a refusal and an error output", () => {
        expect(getHevyShareImportSeed(threadWith({ refused: "not_confirmed", message: "no" }))).toBeNull();
        expect(
            getHevyShareImportSeed(
                threadWith({ error: "Hevy share not found", message: "gone", reason: "not_found" }),
            ),
        ).toBeNull();
    });

    it("takes the newest successful import in the thread", () => {
        const messages: UIMessage[] = [
            { id: "u1", role: "user", parts: [{ type: "text", text: "load it" }] },
            { id: "a1", role: "assistant", parts: [importPart(importedOutput([makeShareDay(1, "Old")]))] },
            { id: "u2", role: "user", parts: [{ type: "text", text: "this one instead" }] },
            { id: "a2", role: "assistant", parts: [importPart(importedOutput(SEED))] },
        ];

        const seed = getHevyShareImportSeed(messages);
        expect(seed?.key).toBe("a2-0");
        expect(seed?.routines.map((r) => r.title)).toEqual(["Push", "Pull"]);
    });
});

describe("tryApplyHevyShareImport", () => {
    it("commits the share as week 0 only when the grid is empty", () => {
        const keyRef = newImportKeyRef();
        const commitWithUndo = vi.fn();

        const applied = tryApplyHevyShareImport(
            threadWith(importedOutput(SEED)),
            "ready",
            [],
            keyRef,
            commitWithUndo,
        );

        expect(applied).toBe(true);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        const [committed, options] = commitWithUndo.mock.calls[0];
        // One-week seed: no duplication across the builder's program length.
        expect(committed.map((r: THevyRoutine) => r.folder_id)).toEqual([0, 0]);
        expect(committed.map((r: THevyRoutine) => r.id)).toEqual(["1", "2"]);
        expect(committed.map((r: THevyRoutine) => r.title)).toEqual(["Push", "Pull"]);
        // Empty grid before the load - no undo back to nothing.
        expect(options).toEqual({ recordUndo: false });
        expect(keyRef.current).toBe("a1-0");
    });

    it("records undo when day placeholders were already on the grid", () => {
        const commitWithUndo = vi.fn();
        const placeholders = [{ ...makeShareDay(1, ""), exercises: [] }];

        tryApplyHevyShareImport(
            threadWith(importedOutput(SEED)),
            "ready",
            placeholders,
            newImportKeyRef(),
            commitWithUndo,
        );

        expect(commitWithUndo).toHaveBeenCalledWith(expect.anything(), { recordUndo: true });
    });

    it("refuses to overwrite a grid that has exercises, even if the server let it through", () => {
        vi.spyOn(console, "warn").mockImplementation(() => {});
        const keyRef = newImportKeyRef();
        const commitWithUndo = vi.fn();

        const applied = tryApplyHevyShareImport(
            threadWith(importedOutput(SEED)),
            "ready",
            [makeShareDay(1, "Existing work")],
            keyRef,
            commitWithUndo,
        );

        expect(applied).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
        expect(toastError).toHaveBeenCalledOnce();
        // Keyed anyway, so the refusal does not re-toast on every render.
        expect(keyRef.current).toBe("a1-0");
    });

    it("waits for the stream to finish", () => {
        const commitWithUndo = vi.fn();

        const applied = tryApplyHevyShareImport(
            threadWith(importedOutput(SEED)),
            "streaming",
            [],
            newImportKeyRef(),
            commitWithUndo,
        );

        expect(applied).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
    });

    it("applies one seed once, across re-renders", () => {
        const messages = threadWith(importedOutput(SEED));
        const keyRef = newImportKeyRef();
        const commitWithUndo = vi.fn();

        expect(tryApplyHevyShareImport(messages, "ready", [], keyRef, commitWithUndo)).toBe(true);
        // Second pass sees the grid the first commit produced.
        expect(tryApplyHevyShareImport(messages, "ready", SEED, keyRef, commitWithUndo)).toBe(false);
        expect(commitWithUndo).toHaveBeenCalledOnce();
        expect(toastError).not.toHaveBeenCalled();
    });
});

describe("Hevy share import expand commit", () => {
    const rpeSeed = SEED.map((day) => ({
        ...day,
        exercises: day.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((set) => ({ ...set, rpe: 7 })),
        })),
    }));
    const roles = [
        { dayOrder: 1, exerciseIndex: 0, role: "main" as const },
        { dayOrder: 2, exerciseIndex: 0, role: "main" as const },
    ];
    const wave = {
        weeks: [
            { week: 1, main: { rpeDelta: 0, setCountDelta: 0 } },
            { week: 2, main: { rpeDelta: 1, setCountDelta: 0 } },
            { week: 3, main: { rpeDelta: 2, setCountDelta: 1 } },
        ],
    };

    function expandThread(): UIMessage[] {
        return [
            ...threadWith(importedOutput(rpeSeed)),
            { id: "u2", role: "user", parts: [{ type: "text", text: "yes, expand it" }] },
            {
                id: "a2",
                role: "assistant",
                parts: [
                    {
                        type: "tool-buildProgram",
                        toolCallId: "b1",
                        state: "output-available",
                        input: { expandHevyShareSeed: { exerciseRoles: roles } },
                        output: {
                            routines: rpeSeed,
                            exerciseRoles: roles,
                            plan: { durationWeeks: 3, periodizationWave: wave },
                            totalDays: 2,
                            expandedHevyShareSeed: true,
                        },
                    },
                ] as UIMessage["parts"],
            },
        ];
    }

    it("plates the seed across the plan and stamps the wave, with undo", () => {
        const appliedKeys = createRef<Set<string>>();
        appliedKeys.current = new Set();
        const lastCommitKey = newImportKeyRef();
        const commitWithUndo = vi.fn();

        const result = tryCommitAtomicBuildProgramAndMutations(
            expandThread(),
            "ready",
            3,
            rpeSeed,
            appliedKeys,
            lastCommitKey,
            commitWithUndo,
        );

        expect(result).toEqual({ committed: true, effectiveWeeks: 3 });
        const [committed, options] = commitWithUndo.mock.calls[0] as [THevyRoutine[], unknown];
        // The seed was on the grid, so the expand is undoable.
        expect(options).toEqual({ recordUndo: true });
        expect(committed.map((r) => r.folder_id)).toEqual([0, 0, 1, 1, 2, 2]);

        const mainSets = (week: number) =>
            committed.find((r) => r.folder_id === week && r.order === "1")?.exercises[0].sets ?? [];
        // Not a plated clone: later-week mains carry week1 + delta.
        expect(mainSets(0).map((set) => set.rpe)).toEqual([7]);
        expect(mainSets(1).map((set) => set.rpe)).toEqual([8]);
        expect(mainSets(2).map((set) => set.rpe)).toEqual([9, 9]);
        // Lifted loads from the share stay as they were; the stamp never invents kg.
        expect(mainSets(2).map((set) => set.weight_kg)).toEqual([60, 60]);
    });

    it("leaves the already-applied seed alone after the expand lands", () => {
        const keyRef = newImportKeyRef();
        keyRef.current = "a1-0";
        const commitWithUndo = vi.fn();

        expect(tryApplyHevyShareImport(expandThread(), "ready", rpeSeed, keyRef, commitWithUndo)).toBe(false);
        expect(commitWithUndo).not.toHaveBeenCalled();
        expect(toastError).not.toHaveBeenCalled();
    });
});
