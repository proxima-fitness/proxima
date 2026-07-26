import { describe, expect, it } from "vitest";

import {
    MAX_WEEK_SUGGEST_CHANGES,
    buildWeekSuggestPrompt,
    filterWorkoutsInWindow,
    normalizeWeekSuggestChanges,
    resolveWeekSuggestTarget,
    weekLogWindow,
    weekSuggestModelOutputSchema,
    type TWeekSuggestChange,
    type TWeekSuggestLinkInput,
} from "../input";
import { LBS_TO_KG } from "@/lib/weightUtils";

function link(
    nthWeek: number,
    completedAt: string | null,
    createdAt = "2026-07-01T00:00:00.000Z",
): TWeekSuggestLinkInput {
    return { nth_week: nthWeek, completed_at: completedAt, created_at: createdAt };
}

function set(index: number, overrides: Partial<THevySets> = {}): THevySets {
    return {
        index,
        type: "normal",
        weight_kg: 60,
        reps: 8,
        distance_meters: null,
        duration_seconds: null,
        rpe: 8,
        custom_metric: null,
        rep_range: null,
        ...overrides,
    };
}

function day(order: number, title: string, exerciseTitles: string[]): THevyRoutine {
    return {
        id: `day-${order}`,
        title,
        folder_id: 2,
        notes: "",
        order: String(order),
        exercises: exerciseTitles.map((exerciseTitle, index) => ({
            index,
            title: exerciseTitle,
            notes: "",
            rest_seconds: null,
            exercise_template_id: `tpl-${index}`,
            supersets_id: null,
            sets: [set(0), set(1)],
        })),
    };
}

const TARGET_WEEK = 3;
const targetWeekPrescription = [day(1, "1 - Upper", ["Bench Press", "Row"])];

describe("resolveWeekSuggestTarget", () => {
    it("targets the week after the latest completed week", () => {
        const result = resolveWeekSuggestTarget(
            [link(1, "2026-07-08T00:00:00.000Z"), link(2, "2026-07-15T00:00:00.000Z")],
            8,
        );

        expect(result).toEqual({ ready: true, basedOnWeek: 2, targetWeek: 3 });
    });

    it("is not ready while no week is complete", () => {
        const result = resolveWeekSuggestTarget([link(1, null)], 8);

        expect(result).toMatchObject({ ready: false, code: "no_completed_week" });
    });

    it("is not ready past the last week of the program", () => {
        const result = resolveWeekSuggestTarget([link(4, "2026-07-22T00:00:00.000Z")], 4);

        expect(result).toMatchObject({
            ready: false,
            code: "program_complete",
            basedOnWeek: 4,
        });
    });

    it("is not ready when the next week is already exported", () => {
        const result = resolveWeekSuggestTarget(
            [link(1, "2026-07-08T00:00:00.000Z"), link(2, null)],
            8,
        );

        expect(result).toMatchObject({ ready: false, code: "already_exported" });
    });

    it("allows a target past an unknown program length", () => {
        const result = resolveWeekSuggestTarget([link(2, "2026-07-15T00:00:00.000Z")], null);

        expect(result).toEqual({ ready: true, basedOnWeek: 2, targetWeek: 3 });
    });
});

describe("weekLogWindow", () => {
    it("spans Export → Week complete", () => {
        expect(
            weekLogWindow(link(2, "2026-07-15T00:00:00.000Z", "2026-07-08T00:00:00.000Z")),
        ).toMatchObject({
            since: "2026-07-08T00:00:00.000Z",
            until: "2026-07-15T00:00:00.000Z",
        });
    });

    it("falls back to now when the week has no completed_at", () => {
        const now = new Date("2026-07-20T00:00:00.000Z");

        expect(weekLogWindow(link(2, null, "2026-07-08T00:00:00.000Z"), now)).toMatchObject({
            since: "2026-07-08T00:00:00.000Z",
            until: "2026-07-20T00:00:00.000Z",
        });
    });

    it("reads back past Export so sessions open across it are still fetched", () => {
        expect(
            weekLogWindow(link(2, "2026-07-15T00:00:00.000Z", "2026-07-08T00:00:00.000Z"))
                .fetchSince,
        ).toBe("2026-07-07T00:00:00.000Z");
    });
});

describe("filterWorkoutsInWindow", () => {
    const window = { since: "2026-07-08T00:00:00.000Z", until: "2026-07-15T00:00:00.000Z" };

    function logged(startedAt: string | undefined, endedAt?: string): THevyRoutine {
        return {
            id: `w-${startedAt ?? "none"}`,
            title: "Session",
            folder_id: null,
            notes: "",
            exercises: [],
            started_at: startedAt,
            ended_at: endedAt,
        };
    }

    it("keeps only sessions inside the window, oldest first", () => {
        const result = filterWorkoutsInWindow(
            [
                logged("2026-07-12T10:00:00.000Z"),
                logged("2026-07-20T10:00:00.000Z"),
                logged("2026-07-09T10:00:00.000Z"),
                logged("2026-07-01T10:00:00.000Z"),
            ],
            window,
        );

        expect(result.map((workout) => workout.started_at)).toEqual([
            "2026-07-09T10:00:00.000Z",
            "2026-07-12T10:00:00.000Z",
        ]);
    });

    it("drops sessions with no start timestamp", () => {
        expect(filterWorkoutsInWindow([logged(undefined)], window)).toEqual([]);
    });

    it("keeps a session started before Export but finished inside the week", () => {
        const result = filterWorkoutsInWindow(
            [logged("2026-07-07T18:00:00.000Z", "2026-07-08T09:00:00.000Z")],
            window,
        );

        expect(result).toHaveLength(1);
    });

    it("keeps a session still running when the week was marked complete", () => {
        const result = filterWorkoutsInWindow(
            [logged("2026-07-14T23:00:00.000Z", "2026-07-15T01:00:00.000Z")],
            window,
        );

        expect(result).toHaveLength(1);
    });

    it("drops a session that finished before the week was exported", () => {
        expect(
            filterWorkoutsInWindow(
                [logged("2026-07-06T10:00:00.000Z", "2026-07-06T11:00:00.000Z")],
                window,
            ),
        ).toEqual([]);
    });
});

describe("buildWeekSuggestPrompt", () => {
    const prompt = buildWeekSuggestPrompt({
        programTitle: "Hypertrophy Block",
        basedOnWeek: 2,
        targetWeek: TARGET_WEEK,
        completedWeekPrescription: [day(1, "1 - Upper", ["Bench Press"])],
        targetWeekPrescription,
        loggedWorkouts: [
            {
                id: "w1",
                title: "Upper",
                folder_id: null,
                notes: "",
                started_at: "2026-07-09T10:00:00.000Z",
                exercises: [
                    {
                        index: 0,
                        title: "Bench Press",
                        notes: "",
                        rest_seconds: null,
                        exercise_template_id: "tpl-0",
                        supersets_id: null,
                        sets: [set(0, { weight_kg: 60, reps: 9, rpe: 7 })],
                    },
                ],
            },
        ],
        isInLbs: false,
    });

    it("frames both weeks and the logged session", () => {
        expect(prompt).toContain("Week 2 prescription");
        expect(prompt).toContain("Week 2 logged sessions");
        expect(prompt).toContain("Week 3 prescription");
        expect(prompt).toContain("2026-07-09");
        expect(prompt).toContain("Bench Press");
    });

    it("pins operations to the target week folder and the user's unit", () => {
        expect(prompt).toContain("`folderIds` is always [2]");
        expect(prompt).toContain("1–2.5 kg");
        expect(prompt).toContain("60 kg (60 kg)");
        expect(prompt).toContain("plate step");
    });

    it("says an empty batch is allowed", () => {
        expect(prompt).toContain("No changes at all is a valid answer");
    });

    it("reports an empty log window instead of pretending sessions exist", () => {
        const emptyLogs = buildWeekSuggestPrompt({
            programTitle: "Hypertrophy Block",
            basedOnWeek: 2,
            targetWeek: TARGET_WEEK,
            completedWeekPrescription: [],
            targetWeekPrescription,
            loggedWorkouts: [],
            isInLbs: true,
        });

        expect(emptyLogs).toContain("no logged sessions backed up");
    });
});

describe("weekSuggestModelOutputSchema", () => {
    it("accepts a well-formed update_set batch", () => {
        const parsed = weekSuggestModelOutputSchema.safeParse({
            summary: "Week 2 went well.",
            changes: [
                {
                    description: "Bench Press: 60 → 62.5 kg",
                    operation: {
                        op: "update_set",
                        folderIds: [2],
                        dayOrder: 1,
                        exerciseIndex: 0,
                        setIndex: 0,
                        set: { weight_kg: 62.5 },
                    },
                },
            ],
        });

        expect(parsed.success).toBe(true);
    });

    it("rejects ops outside the suggest subset", () => {
        const parsed = weekSuggestModelOutputSchema.safeParse({
            summary: "Swap it out.",
            changes: [
                {
                    description: "Delete the day",
                    operation: { op: "delete_day", folderIds: [2], dayOrder: 1 },
                },
            ],
        });

        expect(parsed.success).toBe(false);
    });
});

describe("normalizeWeekSuggestChanges", () => {
    function change(operation: Record<string, unknown>): TWeekSuggestChange {
        return {
            description: "change",
            operation: operation as TWeekSuggestChange["operation"],
        };
    }

    it("snaps weight_kg to a clean quarter in the display unit", () => {
        const { changes, dropped } = normalizeWeekSuggestChanges(
            [
                change({
                    op: "update_set",
                    folderIds: [2],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { weight_kg: 95.25 },
                }),
            ],
            TARGET_WEEK,
            targetWeekPrescription,
            true,
        );

        expect(dropped).toBe(0);
        const op = changes[0].operation;
        expect(op.op).toBe("update_set");
        if (op.op === "update_set") {
            expect(op.set.weight_kg).toBeCloseTo(210 * LBS_TO_KG, 6);
        }
    });

    it("retargets every operation to week N+1", () => {
        const { changes, dropped } = normalizeWeekSuggestChanges(
            [
                change({
                    op: "update_set",
                    folderIds: [0],
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 1,
                    set: { weight_kg: 62.5 },
                }),
            ],
            TARGET_WEEK,
            targetWeekPrescription,
        );

        expect(dropped).toBe(0);
        expect(changes[0].operation.folderIds).toEqual([TARGET_WEEK - 1]);
    });

    it("drops operations that do not resolve against the target week", () => {
        const { changes, dropped } = normalizeWeekSuggestChanges(
            [
                change({
                    op: "update_set",
                    dayOrder: 4,
                    exerciseIndex: 0,
                    setIndex: 0,
                    set: { reps: 10 },
                }),
                change({
                    op: "update_set",
                    dayOrder: 1,
                    exerciseIndex: 9,
                    setIndex: 0,
                    set: { reps: 10 },
                }),
                change({
                    op: "update_set",
                    dayOrder: 1,
                    exerciseIndex: 0,
                    setIndex: 7,
                    set: { reps: 10 },
                }),
                change({
                    op: "add_exercise_notes",
                    dayOrder: 1,
                    exerciseIndex: 1,
                    notes: "Keep the tempo controlled.",
                }),
            ],
            TARGET_WEEK,
            targetWeekPrescription,
        );

        expect(dropped).toBe(3);
        expect(changes).toHaveLength(1);
        expect(changes[0].operation.op).toBe("add_exercise_notes");
    });

    it("caps the batch at the panel limit", () => {
        const many = Array.from({ length: MAX_WEEK_SUGGEST_CHANGES + 3 }, () =>
            change({
                op: "update_set",
                dayOrder: 1,
                exerciseIndex: 0,
                setIndex: 0,
                set: { reps: 10 },
            }),
        );

        const { changes, dropped } = normalizeWeekSuggestChanges(
            many,
            TARGET_WEEK,
            targetWeekPrescription,
        );

        expect(changes).toHaveLength(MAX_WEEK_SUGGEST_CHANGES);
        expect(dropped).toBe(3);
    });
});
