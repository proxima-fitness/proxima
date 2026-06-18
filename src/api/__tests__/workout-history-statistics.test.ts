import { describe, it, expect } from "vitest";
import { backedUpWorkoutFixture } from "./manual/backed-up-workout.fixture";
import {
    aggregateProfileStatistics,
    buildWeekBucketKeys,
    buildWorkoutCountByWeekKey,
    computeAvgWorkoutsPerWeek,
    computeWeekStreak,
    formatDurationFromSeconds,
    formatProfileConsistencyLine,
    formatRepsTotal,
    formatVolumeTotal,
    getCurrentWeekStartKey,
    getWeekStartKeyForTimestamp,
    workoutDurationSeconds,
    workoutTotalReps,
    workoutTotalVolumeKg,
} from "../workout-history-statistics";

/** Monday 2024-06-10 15:00 UTC — week of Sun Jun 9 in US ET. */
const REFERENCE_DATE = new Date("2024-06-10T15:00:00.000Z");

describe("workout-history-statistics", () => {
    it("getWeekStartKeyForTimestamp buckets by Sunday-start US ET week", () => {
        expect(getWeekStartKeyForTimestamp("2024-06-10T09:00:00.000Z")).toBe("2024-06-09");
        expect(getWeekStartKeyForTimestamp("2024-06-09T04:00:00.000Z")).toBe("2024-06-09");
        expect(getWeekStartKeyForTimestamp("2024-06-08T04:00:00.000Z")).toBe("2024-06-02");
    });

    it("buildWeekBucketKeys returns ordered Sunday keys ending at reference week", () => {
        const keys = buildWeekBucketKeys(REFERENCE_DATE, 4);
        expect(keys).toHaveLength(4);
        expect(keys[keys.length - 1]).toBe("2024-06-09");
        expect(keys[0]).toBe("2024-05-19");
    });

    it("workoutDurationSeconds sums wall time in seconds", () => {
        expect(
            workoutDurationSeconds(
                backedUpWorkoutFixture.started_at,
                backedUpWorkoutFixture.ended_at,
            ),
        ).toBe(4500);
        expect(workoutDurationSeconds(undefined, "2024-01-01T00:00:00.000Z")).toBe(0);
    });

    it("workoutTotalReps sums non-null set reps", () => {
        expect(workoutTotalReps(backedUpWorkoutFixture)).toBe(23);
    });

    it("workoutTotalVolumeKg sums weight_kg × reps per set", () => {
        expect(workoutTotalVolumeKg(backedUpWorkoutFixture)).toBe(1540);
    });

    it("workoutTotalVolumeKg excludes null reps and zero weight", () => {
        const workout: TBackedUpWorkout = {
            ...backedUpWorkoutFixture,
            workout_exercises: [
                {
                    ...backedUpWorkoutFixture.workout_exercises![0],
                    workout_sets: [
                        {
                            ...backedUpWorkoutFixture.workout_exercises![0].workout_sets![0],
                            weight_kg: 0,
                            reps: 20,
                        },
                        {
                            ...backedUpWorkoutFixture.workout_exercises![0].workout_sets![1],
                            reps: null,
                        },
                    ],
                },
            ],
        };
        expect(workoutTotalVolumeKg(workout)).toBe(0);
    });

    it("aggregateProfileStatistics fills current week bucket and thisWeek headline", () => {
        const result = aggregateProfileStatistics([backedUpWorkoutFixture], {
            weeks: 4,
            referenceDate: REFERENCE_DATE,
        });

        expect(result.weeks).toBe(4);
        expect(result.thisWeek).toEqual({ durationSeconds: 4500, reps: 23, volumeKg: 1540 });
        expect(result.buckets).toHaveLength(4);

        const currentBucket = result.buckets[result.buckets.length - 1];
        expect(currentBucket.weekStart).toBe("2024-06-09");
        expect(currentBucket.durationSeconds).toBe(4500);
        expect(currentBucket.reps).toBe(23);
        expect(currentBucket.volumeKg).toBe(1540);

        const priorBucket = result.buckets[0];
        expect(priorBucket.durationSeconds).toBe(0);
        expect(priorBucket.reps).toBe(0);
        expect(priorBucket.volumeKg).toBe(0);
    });

    it("aggregateProfileStatistics ignores workouts outside chart window", () => {
        const oldWorkout: TBackedUpWorkout = {
            ...backedUpWorkoutFixture,
            id: "old-workout",
            started_at: "2024-01-01T12:00:00.000Z",
            ended_at: "2024-01-01T13:00:00.000Z",
        };

        const result = aggregateProfileStatistics([oldWorkout, backedUpWorkoutFixture], {
            weeks: 4,
            referenceDate: REFERENCE_DATE,
        });

        expect(result.thisWeek.reps).toBe(23);
        expect(result.buckets.reduce((sum, bucket) => sum + bucket.reps, 0)).toBe(23);
    });

    it("formatDurationFromSeconds, formatRepsTotal, and formatVolumeTotal format headline values", () => {
        expect(formatDurationFromSeconds(4500)).toBe("1h 15m");
        expect(formatDurationFromSeconds(0)).toBe("0 min");
        expect(formatRepsTotal(1234)).toBe("1,234");
        expect(formatVolumeTotal(1540, false)).toBe("1,540");
        expect(formatVolumeTotal(1540, true)).toBe("3,395");
    });

    it("computeWeekStreak counts consecutive trained weeks with in-progress week grace", () => {
        const referenceDate = REFERENCE_DATE;
        const currentWeek = getCurrentWeekStartKey(referenceDate);

        const counts = buildWorkoutCountByWeekKey([
            `${currentWeek}T12:00:00.000Z`,
            "2024-06-03T12:00:00.000Z",
            "2024-05-27T12:00:00.000Z",
        ]);
        expect(computeWeekStreak(counts, referenceDate)).toBe(3);

        const emptyCurrentWeek = buildWorkoutCountByWeekKey([
            "2024-06-03T12:00:00.000Z",
            "2024-05-27T12:00:00.000Z",
        ]);
        expect(computeWeekStreak(emptyCurrentWeek, referenceDate)).toBe(2);

        expect(computeWeekStreak(new Map(), referenceDate)).toBe(0);
    });

    it("computeAvgWorkoutsPerWeek averages prior weeks in the chart window", () => {
        const referenceDate = REFERENCE_DATE;
        const counts = buildWorkoutCountByWeekKey([
            "2024-06-10T09:00:00.000Z",
            "2024-06-03T12:00:00.000Z",
            "2024-06-03T18:00:00.000Z",
            "2024-05-27T12:00:00.000Z",
            "2024-04-01T12:00:00.000Z",
        ]);

        expect(computeAvgWorkoutsPerWeek(counts, referenceDate, 4)).toEqual({
            thisWeekWorkouts: 1,
            avgWorkoutsPerWeek: 1,
        });

        expect(computeAvgWorkoutsPerWeek(counts, referenceDate, 12)).toEqual({
            thisWeekWorkouts: 1,
            avgWorkoutsPerWeek: 0.4,
        });

        const firstWeekOnly = buildWorkoutCountByWeekKey(["2024-06-10T09:00:00.000Z"]);
        expect(computeAvgWorkoutsPerWeek(firstWeekOnly, referenceDate, 12)).toEqual({
            thisWeekWorkouts: 1,
            avgWorkoutsPerWeek: null,
        });
    });

    it("formatProfileConsistencyLine renders workout count and trailing average", () => {
        expect(formatProfileConsistencyLine(3, 2.4)).toBe("3 workouts · 2.4 avg/wk");
        expect(formatProfileConsistencyLine(1, 1)).toBe("1 workout · 1.0 avg/wk");
    });
});
