/**
 * @module WeekPreviewSources
 *
 * Pure Week preview resolver (ADR 0013 / SP5–6). Picks Program prescription,
 * Hevy week copy, or Planned vs completed, and names each card source.
 *
 * Depends on: edit-current-week-arrival.orderRoutinesByLink,
 *             workout-history-read.mapBackedUpWorkoutToHevyRoutine,
 *             ProgramOverviewWeekPreviewModel.weekPreviewDayKey
 * Used by: ProgramOverviewWeekPreview
 */

import { mapBackedUpWorkoutToHevyRoutine } from "@/api/workout-history-read";
import { orderRoutinesByLink } from "@/hooks/edit-current-week-arrival";
import { weekPreviewDayKey } from "./ProgramOverviewWeekPreviewModel";

/** Day card source badge labels (ADR 0013 / SP6). */
export type TDayCardSource = "Planned" | "In Hevy" | "Completed";

/** Title for an empty in-progress Hevy folder (C4). */
export const EMPTY_IN_HEVY_FOLDER_TITLE = "No Routines";

/** Explainer under the empty Hevy-folder title. */
export const EMPTY_IN_HEVY_FOLDER_EXPLAINER =
    "Add routines in Hevy";

export type TWeekPreviewEmptyCopy =
    | "Not logged"
    | "Not in the plan"
    | typeof EMPTY_IN_HEVY_FOLDER_TITLE;

export type TWeekPreviewLink = {
    nth_week: number;
    completed_at: string | null;
    hevy_routine_ids: readonly string[] | null;
    exported_hevy_routine_ids: readonly string[] | null;
};

export type TWeekPreviewSlot = {
    source: TDayCardSource;
    routine: THevyRoutine | null;
    emptyCopy: TWeekPreviewEmptyCopy | null;
};

export type TWeekPreviewDay = {
    slots: TWeekPreviewSlot[];
};

export type TResolvedWeekPreview = {
    days: TWeekPreviewDay[];
    shouldUncomplete: boolean;
};

export type TResolveWeekPreviewInput = {
    nthWeek: number;
    link: TWeekPreviewLink | null;
    prescriptionDays: readonly THevyRoutine[];
    hevyFolderRoutines: readonly THevyRoutine[];
    workouts: readonly TBackedUpWorkout[];
};

function withPreviewKey(day: THevyRoutine, nthWeek: number, index: number): THevyRoutine {
    return {
        ...day,
        id: weekPreviewDayKey(day, nthWeek, index),
    };
}

function plannedDays(prescriptionDays: readonly THevyRoutine[], nthWeek: number): TWeekPreviewDay[] {
    return prescriptionDays.map((day, index) => ({
        slots: [
            {
                source: "Planned",
                routine: withPreviewKey(day, nthWeek, index),
                emptyCopy: null,
            },
        ],
    }));
}

function loggedRoutineIdSet(
    workouts: readonly TBackedUpWorkout[] | readonly string[],
): Set<string> {
    if (workouts.length === 0) {
        return new Set();
    }
    if (typeof workouts[0] === "string") {
        return new Set((workouts as readonly string[]).filter((id) => id.length > 0));
    }
    return new Set(
        (workouts as readonly TBackedUpWorkout[])
            .map((workout) => workout.routine_id)
            .filter((id): id is string => Boolean(id)),
    );
}

function weekHasMatchingWorkouts(
    link: TWeekPreviewLink,
    logged: ReadonlySet<string>,
): boolean {
    const ids = [
        ...(link.exported_hevy_routine_ids ?? []),
        ...(link.hevy_routine_ids ?? []),
    ];
    return ids.some((id) => logged.has(id));
}

function isAutoComplete(link: TWeekPreviewLink, logged: ReadonlySet<string>): boolean {
    const liveIds = (link.hevy_routine_ids ?? []).filter((id) => id.length > 0);
    if (liveIds.length < 1) {
        return false;
    }
    return liveIds.every((id) => logged.has(id));
}

function latestWorkoutByRoutineId(
    workouts: readonly TBackedUpWorkout[],
): Map<string, TBackedUpWorkout> {
    const latest = new Map<string, TBackedUpWorkout>();
    const sorted = [...workouts].sort((a, b) => {
        if (a.started_at !== b.started_at) {
            return a.started_at < b.started_at ? 1 : -1;
        }
        return a.id < b.id ? 1 : -1;
    });
    for (const workout of sorted) {
        if (!workout.routine_id || latest.has(workout.routine_id)) {
            continue;
        }
        latest.set(workout.routine_id, workout);
    }
    return latest;
}

function pairDays(input: TResolveWeekPreviewInput): TWeekPreviewDay[] {
    const { nthWeek, link, prescriptionDays, workouts } = input;
    const exportIds = [...(link?.exported_hevy_routine_ids ?? [])];
    const latest = latestWorkoutByRoutineId(workouts);
    const used = new Set<string>();
    const days: TWeekPreviewDay[] = [];

    prescriptionDays.forEach((planned, index) => {
        const exportId = exportIds[index];
        if (exportId) {
            used.add(exportId);
        }
        const workout = exportId ? latest.get(exportId) : undefined;
        days.push({
            slots: [
                {
                    source: "Planned",
                    routine: withPreviewKey(planned, nthWeek, index),
                    emptyCopy: null,
                },
                workout
                    ? {
                          source: "Completed",
                          routine: withPreviewKey(
                              mapBackedUpWorkoutToHevyRoutine(workout),
                              nthWeek,
                              index,
                          ),
                          emptyCopy: null,
                      }
                    : {
                          source: "Completed",
                          routine: null,
                          emptyCopy: "Not logged",
                      },
            ],
        });
    });

    const extras = [...latest.entries()]
        .filter(([routineId]) => !used.has(routineId))
        .sort((a, b) => {
            if (a[1].started_at !== b[1].started_at) {
                return a[1].started_at < b[1].started_at ? -1 : 1;
            }
            return a[1].id < b[1].id ? -1 : 1;
        });

    extras.forEach(([, workout], extraIndex) => {
        const index = prescriptionDays.length + extraIndex;
        days.push({
            slots: [
                {
                    source: "Planned",
                    routine: null,
                    emptyCopy: "Not in the plan",
                },
                {
                    source: "Completed",
                    routine: withPreviewKey(
                        mapBackedUpWorkoutToHevyRoutine(workout),
                        nthWeek,
                        index,
                    ),
                    emptyCopy: null,
                },
            ],
        });
    });

    return days;
}

function inHevyDays(input: TResolveWeekPreviewInput): TWeekPreviewDay[] {
    const liveIds = input.link?.hevy_routine_ids ?? [];
    const ordered = orderRoutinesByLink([...input.hevyFolderRoutines], liveIds);
    if (ordered.length === 0) {
        return [
            {
                slots: [
                    {
                        source: "In Hevy",
                        routine: null,
                        emptyCopy: EMPTY_IN_HEVY_FOLDER_TITLE,
                    },
                ],
            },
        ];
    }
    return ordered.map((day, index) => ({
        slots: [
            {
                source: "In Hevy",
                routine: withPreviewKey(day, input.nthWeek, index),
                emptyCopy: null,
            },
        ],
    }));
}

/**
 * Resolve Week preview documents for the Selected week.
 *
 * @param input - Link, this week's prescription days, live folder, Workouts
 */
export function resolveWeekPreview(input: TResolveWeekPreviewInput): TResolvedWeekPreview {
    const { nthWeek, link, prescriptionDays, workouts } = input;

    if (link == null) {
        return { days: plannedDays(prescriptionDays, nthWeek), shouldUncomplete: false };
    }

    const logged = loggedRoutineIdSet(workouts);
    const hasProof = weekHasMatchingWorkouts(link, logged);
    const persistedComplete = link.completed_at != null;
    const shouldUncomplete = persistedComplete && !hasProof;
    const effectiveComplete = hasProof && (persistedComplete || isAutoComplete(link, logged));

    if (effectiveComplete) {
        return { days: pairDays(input), shouldUncomplete: false };
    }

    if (shouldUncomplete) {
        return { days: plannedDays(prescriptionDays, nthWeek), shouldUncomplete: true };
    }

    return { days: inHevyDays(input), shouldUncomplete: false };
}

/**
 * Whether Week preview should load Workout rows for Planned vs completed.
 *
 * @param link - Selected week's Program–Hevy link
 * @param workoutRoutineIds - Distinct logged routine IDs
 */
export function isPlannedVsCompletedWeek(
    link: TWeekPreviewLink | null,
    workoutRoutineIds: readonly string[],
): boolean {
    if (link == null) {
        return false;
    }
    const logged = loggedRoutineIdSet(workoutRoutineIds);
    const hasProof = weekHasMatchingWorkouts(link, logged);
    const persistedComplete = link.completed_at != null;
    return hasProof && (persistedComplete || isAutoComplete(link, logged));
}

/**
 * Routine IDs to fetch for Planned vs completed (export-time, live, folder extras).
 *
 * @param link - Selected week's Program–Hevy link
 * @param hevyFolderRoutines - Live folder routines when present
 */
export function weekPreviewWorkoutRoutineIds(
    link: TWeekPreviewLink | null,
    hevyFolderRoutines: readonly THevyRoutine[],
): string[] {
    if (link == null) {
        return [];
    }
    const folderIds = hevyFolderRoutines.map(
        (routine) => routine.hevyRoutineId ?? routine.id,
    );
    return [
        ...new Set(
            [
                ...(link.exported_hevy_routine_ids ?? []),
                ...(link.hevy_routine_ids ?? []),
                ...folderIds,
            ].filter((id) => id.length > 0),
        ),
    ];
}
