// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";

import {
    aggregateProfileStatistics,
    aggregateSessionsByTemplateId,
    buildSundayStartCalendarGrid,
    buildWeekBucketKeys,
    buildWorkoutCountByWeekKey,
    computeAvgWorkoutsPerWeek,
    computeWeekStreak,
    DEFAULT_BODY_MEASUREMENTS_LIMIT,
    DEFAULT_WORKOUT_HISTORY_LIMIT,
    formatDurationFromSeconds,
    formatLocalDateKey,
    formatProfileConsistencyLine,
    formatRepsTotal,
    formatVolumeTotal,
    FREE_STALL_PERFORMANCE_CAP,
    getCurrentWeekStartKey,
    getLocalDateKey,
    getLocalMonthUtcBounds,
    getWeekStartKeyForTimestamp,
    groupWorkoutsByLocalDate,
    historyEntriesToSessions,
    mapBackedUpWorkoutToHevyRoutine,
    normalizeMeasuredOnBound,
    paginateBodyMeasurements,
    paginateWorkoutBrowse,
    PREVIEW_MAX_EXERCISES,
    takeKeysetPage,
    transformSessionsToExercise,
    UNKNOWN_EXERCISE_TITLE,
    workoutDurationSeconds,
    workoutTotalReps,
    workoutTotalVolumeKg,
} from "./index";
import type { TBrowseWorkoutRow } from "./workout-browse";

/** Monday 2024-06-10 15:00 UTC — week of Sun Jun 9 in US ET. */
const REFERENCE_DATE = new Date("2024-06-10T15:00:00.000Z");

const fixtureWorkout: TBrowseWorkoutRow = {
    id: "workout-1",
    title: "Upper Power",
    description: "Heavy singles focus",
    updated_at: "2024-06-10T10:20:00.000Z",
    created_at: "2024-06-10T10:20:00.000Z",
    started_at: "2024-06-10T09:00:00.000Z",
    ended_at: "2024-06-10T10:15:00.000Z",
    source: "hevy",
    workout_exercises: [
        {
            sort_order: 0,
            notes: "",
            source_exercise_id: "11111111-1111-1111-1111-111111111111",
            superset_id: 0,
            canonical_exercises: { title: "Bench Press (Barbell)" },
            workout_sets: [
                {
                    set_index: 0,
                    set_type: "warmup",
                    weight_kg: 60,
                    reps: 10,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: null,
                    rep_range_start: null,
                    rep_range_end: null,
                },
                {
                    set_index: 1,
                    set_type: "normal",
                    weight_kg: 100,
                    reps: 5,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: 8,
                    custom_metric: null,
                    rep_range_start: null,
                    rep_range_end: null,
                },
            ],
        },
        {
            sort_order: 1,
            notes: "felt heavy",
            source_exercise_id: "22222222-2222-2222-2222-222222222222",
            superset_id: 0,
            canonical_exercises: { title: "Overhead Press (Barbell)" },
            workout_sets: [
                {
                    set_index: 0,
                    set_type: "normal",
                    weight_kg: 55,
                    reps: 8,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: 7.5,
                    custom_metric: null,
                    rep_range_start: 6,
                    rep_range_end: 8,
                },
            ],
        },
    ],
};

describe("statistics", () => {
    it("buckets by Sunday-start US ET week", () => {
        expect(getWeekStartKeyForTimestamp("2024-06-10T09:00:00.000Z")).toBe("2024-06-09");
        expect(getWeekStartKeyForTimestamp("2024-06-08T04:00:00.000Z")).toBe("2024-06-02");
    });

    it("buildWeekBucketKeys ends at reference week", () => {
        const keys = buildWeekBucketKeys(REFERENCE_DATE, 4);
        expect(keys).toHaveLength(4);
        expect(keys[keys.length - 1]).toBe("2024-06-09");
        expect(keys[0]).toBe("2024-05-19");
    });

    it("sums duration, reps, and volume", () => {
        expect(
            workoutDurationSeconds(fixtureWorkout.started_at, fixtureWorkout.ended_at),
        ).toBe(4500);
        expect(workoutTotalReps(fixtureWorkout)).toBe(23);
        expect(workoutTotalVolumeKg(fixtureWorkout)).toBe(1540);
    });

    it("aggregateProfileStatistics fills thisWeek", () => {
        const result = aggregateProfileStatistics([fixtureWorkout], {
            weeks: 4,
            referenceDate: REFERENCE_DATE,
        });
        expect(result.thisWeek).toEqual({ durationSeconds: 4500, reps: 23, volumeKg: 1540 });
        expect(result.buckets.at(-1)?.weekStart).toBe("2024-06-09");
    });

    it("formats headlines and consistency line", () => {
        expect(formatDurationFromSeconds(4500)).toBe("1h 15m");
        expect(formatRepsTotal(1234)).toBe("1,234");
        expect(formatVolumeTotal(1540, true)).toBe("3,395");
        expect(formatProfileConsistencyLine(1, 1)).toBe("1 workout · 1.0 avg/wk");
    });

    it("computeWeekStreak and avg workouts/week", () => {
        const currentWeek = getCurrentWeekStartKey(REFERENCE_DATE);
        const streakCounts = buildWorkoutCountByWeekKey([
            `${currentWeek}T12:00:00.000Z`,
            "2024-06-03T12:00:00.000Z",
            "2024-05-27T12:00:00.000Z",
        ]);
        expect(computeWeekStreak(streakCounts, REFERENCE_DATE)).toBe(3);

        const avgCounts = buildWorkoutCountByWeekKey([
            "2024-06-10T09:00:00.000Z",
            "2024-06-03T12:00:00.000Z",
            "2024-06-03T18:00:00.000Z",
            "2024-05-27T12:00:00.000Z",
            "2024-04-01T12:00:00.000Z",
        ]);
        expect(computeAvgWorkoutsPerWeek(avgCounts, REFERENCE_DATE, 4)).toEqual({
            thisWeekWorkouts: 1,
            avgWorkoutsPerWeek: 1,
        });
    });
});

describe("calendar", () => {
    it("getLocalMonthUtcBounds uses timezone offset", () => {
        expect(getLocalMonthUtcBounds(2026, 5, 240)).toEqual({
            startIso: "2026-05-01T04:00:00.000Z",
            endIso: "2026-06-01T04:00:00.000Z",
        });
    });

    it("buildSundayStartCalendarGrid is 42 Sunday-start cells", () => {
        const grid = buildSundayStartCalendarGrid(2026, 5);
        expect(grid).toHaveLength(42);
        expect(grid[0].localDateKey).toBe("2026-04-26");
    });

    it("groupWorkoutsByLocalDate newest-first", () => {
        const grouped = groupWorkoutsByLocalDate([
            {
                id: "a",
                title: "Morning",
                started_at: "2026-05-04T10:00:00.000Z",
                ended_at: "2026-05-04T11:00:00.000Z",
            },
            {
                id: "b",
                title: "Evening",
                started_at: "2026-05-04T22:00:00.000Z",
                ended_at: "2026-05-04T23:00:00.000Z",
            },
        ]);
        const dayKey = getLocalDateKey("2026-05-04T22:00:00.000Z");
        expect(grouped.get(dayKey)?.map((w) => w.id)).toEqual(["b", "a"]);
        expect(formatLocalDateKey(2026, 5, 4)).toBe("2026-05-04");
    });
});

describe("blind-spot", () => {
    const benchTemplate = { title: "Bench Press (Barbell)" };

    it("aggregateSessionsByTemplateId groups by template", () => {
        const sessions = aggregateSessionsByTemplateId([fixtureWorkout]);
        const bench = sessions.get("11111111-1111-1111-1111-111111111111");
        expect(bench).toHaveLength(1);
        expect(bench?.[0].maxWeight).toBe(100);
        expect(bench?.[0].totalReps).toBe(15);
    });

    it("flags stall when last 3 do not beat previous 3", () => {
        const sessions = historyEntriesToSessions(
            [100, 100, 100, 105, 105, 105].map((kg, i) => ({
                workout_id: `w${i}`,
                workout_start_time: new Date(Date.UTC(2024, 5, 10 - i)).toISOString(),
                weight_kg: kg,
                reps: 5,
            })),
        );
        const result = transformSessionsToExercise(benchTemplate, sessions, { isPro: true });
        expect(result.hasStall).toBe(true);
        expect(result.color).toBe("red");
    });

    it("caps free tier at FREE_STALL_PERFORMANCE_CAP", () => {
        const sessions = historyEntriesToSessions(
            Array.from({ length: 20 }, (_, i) => ({
                workout_id: `w${i}`,
                workout_start_time: new Date(Date.UTC(2024, 5, 20 - i)).toISOString(),
                weight_kg: 80 + i,
                reps: 5,
            })),
        );
        const free = transformSessionsToExercise(benchTemplate, sessions, { isPro: false });
        expect(free.sessions).toHaveLength(FREE_STALL_PERFORMANCE_CAP);
        const pro = transformSessionsToExercise(benchTemplate, sessions, { isPro: true });
        expect(pro.sessions).toHaveLength(20);
    });
});

describe("workout-browse", () => {
    it("maps backup to Hevy routine shape", () => {
        const routine = mapBackedUpWorkoutToHevyRoutine(fixtureWorkout);
        expect(routine.title).toBe("Upper Power");
        expect(routine.exercises).toHaveLength(2);
        expect(routine.exercises[0].title).toBe("Bench Press (Barbell)");
        expect(routine.exercises[1].sets[0].rep_range).toEqual({ start: 6, end: 8 });
    });

    it("caps preview exercises and falls back unknown title", () => {
        const many: TBrowseWorkoutRow = {
            ...fixtureWorkout,
            workout_exercises: Array.from({ length: 5 }, (_, i) => ({
                ...fixtureWorkout.workout_exercises![0],
                sort_order: i,
                source_exercise_id: `t-${i}`,
            })),
        };
        const preview = mapBackedUpWorkoutToHevyRoutine(many, {
            previewMaxExercises: PREVIEW_MAX_EXERCISES,
        });
        expect(preview.exercises).toHaveLength(PREVIEW_MAX_EXERCISES);

        const hidden = mapBackedUpWorkoutToHevyRoutine({
            ...fixtureWorkout,
            workout_exercises: [
                { ...fixtureWorkout.workout_exercises![0], canonical_exercises: null },
            ],
        });
        expect(hidden.exercises[0].title).toBe(UNKNOWN_EXERCISE_TITLE);
    });

    it("paginateWorkoutBrowse mints nextCursor from limit+1", () => {
        const rows = [
            { ...fixtureWorkout, id: "a", started_at: "2024-06-12T09:00:00.000Z" },
            { ...fixtureWorkout, id: "b", started_at: "2024-06-11T09:00:00.000Z" },
            { ...fixtureWorkout, id: "c", started_at: "2024-06-10T09:00:00.000Z" },
        ];
        const page = paginateWorkoutBrowse(rows, 2);
        expect(page.workouts.map((w) => w.id)).toEqual(["a", "b"]);
        expect(page.nextCursor).toEqual({ startedAt: "2024-06-11T09:00:00.000Z", id: "b" });
        expect(DEFAULT_WORKOUT_HISTORY_LIMIT).toBe(15);
    });
});

describe("body-measurements", () => {
    it("normalizeMeasuredOnBound trims to YYYY-MM-DD", () => {
        expect(normalizeMeasuredOnBound(" 2024-08-14T12:00:00Z ")).toBe("2024-08-14");
        expect(normalizeMeasuredOnBound("")).toBeUndefined();
        expect(DEFAULT_BODY_MEASUREMENTS_LIMIT).toBe(30);
    });

    it("paginateBodyMeasurements mints measured_on cursor", () => {
        const page = paginateBodyMeasurements(
            [
                { id: "1", measured_on: "2024-08-14" },
                { id: "2", measured_on: "2024-08-13" },
                { id: "3", measured_on: "2024-08-12" },
            ],
            2,
        );
        expect(page.measurements).toHaveLength(2);
        expect(page.nextCursor).toEqual({ measuredOn: "2024-08-13", id: "2" });
    });
});

describe("takeKeysetPage", () => {
    it("detects hasMore from limit+1", () => {
        expect(takeKeysetPage([1, 2, 3], 2)).toEqual({ items: [1, 2], hasMore: true });
        expect(takeKeysetPage([1, 2], 2)).toEqual({ items: [1, 2], hasMore: false });
    });
});
