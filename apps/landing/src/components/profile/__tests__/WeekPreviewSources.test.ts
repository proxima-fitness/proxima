// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Week preview source resolver (ADR 0013 / SP5–6).
 */
import { describe, expect, it } from "vitest";
import { backedUpWorkoutFixture } from "@/api/__tests__/manual/backed-up-workout.fixture";
import {
    DAY_CARD_SOURCE_TOOLTIPS,
    EMPTY_IN_HEVY_FOLDER_TITLE,
    resolveWeekPreview,
    type TWeekPreviewLink,
} from "@/components/profile/WeekPreviewSources";

function makeRoutine(
    title: string,
    options: { id?: string; order?: string; folderId?: number } = {},
): THevyRoutine {
    return {
        id: options.id ?? "",
        title,
        folder_id: options.folderId ?? 0,
        notes: "",
        order: options.order,
        exercises: [],
    };
}

function makeLink(overrides: Partial<TWeekPreviewLink> = {}): TWeekPreviewLink {
    return {
        nth_week: 1,
        completed_at: null,
        hevy_routine_ids: ["r-push", "r-pull"],
        exported_hevy_routine_ids: ["r-push", "r-pull"],
        ...overrides,
    };
}

function makeWorkout(
    routineId: string,
    overrides: Partial<TBackedUpWorkout> = {},
): TBackedUpWorkout {
    return {
        ...backedUpWorkoutFixture,
        id: `workout-${routineId}`,
        title: backedUpWorkoutFixture.title,
        ...overrides,
        routine_id: routineId,
    };
}

const prescription = [
    makeRoutine("1 - Push", { order: "1" }),
    makeRoutine("2 - Pull", { order: "2" }),
];

const hevyFolder = [
    makeRoutine("1 - Push", { id: "r-push" }),
    makeRoutine("2 - Pull", { id: "r-pull" }),
];

describe("resolveWeekPreview", () => {
    it("shows Program prescription with Planned badge when the week is not linked", () => {
        const preview = resolveWeekPreview({
            nthWeek: 2,
            link: null,
            prescriptionDays: prescription,
            hevyFolderRoutines: hevyFolder,
            hevyFolderPresent: true,
            workouts: [makeWorkout("r-push")],
        });

        expect(preview.shouldUncomplete).toBe(false);
        expect(preview.days).toHaveLength(2);
        expect(preview.days[0]?.slots).toHaveLength(1);
        expect(preview.days[0]?.slots[0]?.source).toBe("Planned");
        expect(preview.days[0]?.slots[0]?.routine?.title).toBe("1 - Push");
        expect(preview.days[1]?.slots[0]?.source).toBe("Planned");
        expect(preview.days[1]?.slots[0]?.routine?.title).toBe("2 - Pull");
    });

    it("shows the Hevy week copy with In Hevy badge when linked and not Week complete", () => {
        const liveFolder = [
            makeRoutine("Push heavy", { id: "r-push" }),
            makeRoutine("Pull live", { id: "r-pull" }),
        ];
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink(),
            prescriptionDays: prescription,
            hevyFolderRoutines: liveFolder,
            hevyFolderPresent: true,
            workouts: [],
        });

        expect(preview.shouldUncomplete).toBe(false);
        expect(preview.days).toHaveLength(2);
        expect(preview.days.map((day) => day.slots.map((slot) => slot.source))).toEqual([
            ["In Hevy"],
            ["In Hevy"],
        ]);
        expect(preview.days.map((day) => day.slots[0]?.routine?.title)).toEqual([
            "Push heavy",
            "Pull live",
        ]);
    });

    it("keeps an empty in-progress Hevy folder empty with In Hevy, no prescription fall-through", () => {
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink(),
            prescriptionDays: prescription,
            hevyFolderRoutines: [],
            hevyFolderPresent: true,
            workouts: [],
        });

        expect(preview.shouldUncomplete).toBe(false);
        expect(preview.days).toHaveLength(1);
        expect(preview.days[0]?.slots).toEqual([
            {
                source: "In Hevy",
                routine: null,
                emptyCopy: EMPTY_IN_HEVY_FOLDER_TITLE,
            },
        ]);
    });

    it("pairs Planned vs completed on export-time IDs when Week complete and Workouts remain", () => {
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink({ completed_at: "2026-09-01T00:00:00Z" }),
            prescriptionDays: prescription,
            hevyFolderRoutines: [],
            hevyFolderPresent: false,
            workouts: [
                makeWorkout("r-push", { title: "Logged Push", started_at: "2026-08-31T10:00:00Z" }),
                makeWorkout("r-pull", { title: "Logged Pull", started_at: "2026-08-31T12:00:00Z" }),
            ],
        });

        expect(preview.shouldUncomplete).toBe(false);
        expect(preview.days).toHaveLength(2);
        expect(preview.days[0]?.slots.map((slot) => slot.source)).toEqual([
            "Planned",
            "Completed",
        ]);
        expect(preview.days[0]?.slots[0]?.routine?.title).toBe("1 - Push");
        expect(preview.days[0]?.slots[1]?.routine?.title).toBe("Logged Push");
        expect(preview.days[1]?.slots[0]?.routine?.title).toBe("2 - Pull");
        expect(preview.days[1]?.slots[1]?.routine?.title).toBe("Logged Pull");
    });

    it("keeps a skipped plan day as Not logged with a Completed badge", () => {
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink({ completed_at: "2026-09-01T00:00:00Z" }),
            prescriptionDays: prescription,
            hevyFolderRoutines: hevyFolder,
            hevyFolderPresent: true,
            workouts: [makeWorkout("r-push", { title: "Logged Push" })],
        });

        expect(preview.days[1]?.slots[0]?.source).toBe("Planned");
        expect(preview.days[1]?.slots[0]?.routine?.title).toBe("2 - Pull");
        expect(preview.days[1]?.slots[1]).toEqual({
            source: "Completed",
            routine: null,
            emptyCopy: "Not logged",
        });
    });

    it("hangs an extra Workout off the end as Not in the plan with Planned and Completed badges", () => {
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink({
                completed_at: "2026-09-01T00:00:00Z",
                hevy_routine_ids: ["r-push", "r-legs", "r-arms"],
                exported_hevy_routine_ids: ["r-push", "r-pull", "r-legs"],
            }),
            prescriptionDays: [
                makeRoutine("1 - Push", { order: "1" }),
                makeRoutine("2 - Pull", { order: "2" }),
                makeRoutine("3 - Legs", { order: "3" }),
            ],
            hevyFolderRoutines: [],
            hevyFolderPresent: false,
            workouts: [
                makeWorkout("r-push", { title: "Logged Push" }),
                makeWorkout("r-legs", { title: "Logged Legs" }),
                makeWorkout("r-arms", { title: "Logged Arms" }),
            ],
        });

        expect(preview.days).toHaveLength(4);
        expect(preview.days[1]?.slots[1]?.emptyCopy).toBe("Not logged");
        expect(preview.days[3]?.slots[0]).toEqual({
            source: "Planned",
            routine: null,
            emptyCopy: "Not in the plan",
        });
        expect(preview.days[3]?.slots[1]?.source).toBe("Completed");
        expect(preview.days[3]?.slots[1]?.routine?.title).toBe("Logged Arms");
    });

    it("uses the latest Workout by started_at when a planned day was logged twice", () => {
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink({ completed_at: "2026-09-01T00:00:00Z" }),
            prescriptionDays: prescription,
            hevyFolderRoutines: hevyFolder,
            hevyFolderPresent: true,
            workouts: [
                makeWorkout("r-push", {
                    id: "older",
                    title: "First Push",
                    started_at: "2026-08-01T10:00:00Z",
                }),
                makeWorkout("r-push", {
                    id: "newer",
                    title: "Second Push",
                    started_at: "2026-08-20T10:00:00Z",
                }),
                makeWorkout("r-pull", { title: "Logged Pull" }),
            ],
        });

        expect(preview.days[0]?.slots[1]?.routine?.title).toBe("Second Push");
        expect(preview.days[0]?.slots[1]?.routine?.id).toBe("newer");
    });

    it("un-completes and shows the Hevy week copy when the folder is still there", () => {
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink({ completed_at: "2026-09-01T00:00:00Z" }),
            prescriptionDays: prescription,
            hevyFolderRoutines: hevyFolder,
            hevyFolderPresent: true,
            workouts: [],
        });

        expect(preview.shouldUncomplete).toBe(true);
        expect(preview.days.map((day) => day.slots.map((slot) => slot.source))).toEqual([
            ["In Hevy"],
            ["In Hevy"],
        ]);
        expect(preview.days[0]?.slots[0]?.routine?.title).toBe("1 - Push");
    });

    it("shows Program prescription when the linked folder is gone and the week is not complete", () => {
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink(),
            prescriptionDays: prescription,
            hevyFolderRoutines: [],
            hevyFolderPresent: false,
            workouts: [makeWorkout("r-push")],
        });

        expect(preview.shouldUncomplete).toBe(false);
        expect(preview.days.map((day) => day.slots.map((slot) => slot.source))).toEqual([
            ["Planned"],
            ["Planned"],
        ]);
        expect(preview.days[0]?.slots[0]?.routine?.title).toBe("1 - Push");
    });

    it("un-completes to Program prescription when Workouts and the folder are both gone", () => {
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink({ completed_at: "2026-09-01T00:00:00Z" }),
            prescriptionDays: prescription,
            hevyFolderRoutines: [],
            hevyFolderPresent: false,
            workouts: [],
        });

        expect(preview.shouldUncomplete).toBe(true);
        expect(preview.days.map((day) => day.slots.map((slot) => slot.source))).toEqual([
            ["Planned"],
            ["Planned"],
        ]);
    });

    it("does not join Planned vs completed on live day number after add/remove", () => {
        const preview = resolveWeekPreview({
            nthWeek: 1,
            link: makeLink({
                completed_at: "2026-09-01T00:00:00Z",
                hevy_routine_ids: ["r-push", "r-arms"],
                exported_hevy_routine_ids: ["r-push", "r-pull"],
            }),
            prescriptionDays: prescription,
            hevyFolderRoutines: [
                makeRoutine("Arms", { id: "r-arms" }),
                makeRoutine("Push", { id: "r-push" }),
            ],
            hevyFolderPresent: true,
            workouts: [
                makeWorkout("r-push", { title: "Logged Push" }),
                makeWorkout("r-arms", { title: "Logged Arms" }),
            ],
        });

        expect(preview.days[1]?.slots[0]?.routine?.title).toBe("2 - Pull");
        expect(preview.days[1]?.slots[1]?.emptyCopy).toBe("Not logged");
        expect(preview.days[2]?.slots[1]?.routine?.title).toBe("Logged Arms");
    });
});

describe("DAY_CARD_SOURCE_TOOLTIPS", () => {
    it("uses positive one-liners for each source badge", () => {
        expect(DAY_CARD_SOURCE_TOOLTIPS.Planned).toBe("This day's program plan");
        expect(DAY_CARD_SOURCE_TOOLTIPS["In Hevy"]).toBe("Live copy of this week in Hevy");
        expect(DAY_CARD_SOURCE_TOOLTIPS.Completed).toBe("Logged workout for this day");
    });
});
