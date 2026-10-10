// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";
import {
    aggregateSessionsByTemplateId,
    FREE_STALL_PERFORMANCE_CAP,
    historyEntriesToSessions,
    transformSessionsToExercise,
} from "@/lib/exerciseStallsTransform";
import { backedUpWorkoutFixture } from "@/api/__tests__/manual/backed-up-workout.fixture";

const benchTemplate: THevyExerciseTemplate = {
    id: "11111111-1111-1111-1111-111111111111",
    title: "Bench Press (Barbell)",
    type: "weight_reps",
    primary_muscle_group: "chest",
    secondary_muscle_groups: [],
    is_custom: false,
    equipment: "barbell",
    normalized_title: "bench press (barbell)",
    gif_id: null,
    instructions: [],
};

function makeSession(
    workoutId: string,
    date: string,
    maxWeightKg: number,
    reps = 5,
): THevyExerciseHistoryEntry {
    return {
        workout_id: workoutId,
        workout_title: "Workout",
        workout_start_time: date,
        workout_end_time: date,
        exercise_template_id: benchTemplate.id,
        weight_kg: maxWeightKg,
        reps,
        distance_meters: null,
        duration_seconds: null,
        rpe: null,
        custom_metric: null,
        set_type: "normal",
    };
}

describe("aggregateSessionsByTemplateId", () => {
    it("groups backup sets by template id with max weight per workout", () => {
        const sessions = aggregateSessionsByTemplateId([backedUpWorkoutFixture]);
        const benchSessions = sessions.get("11111111-1111-1111-1111-111111111111");

        expect(benchSessions).toHaveLength(1);
        expect(benchSessions?.[0].maxWeight).toBe(100);
        expect(benchSessions?.[0].totalReps).toBe(15);
    });
});

describe("transformSessionsToExercise", () => {
    it("flags a stall when last 3 max weights do not beat previous 3", () => {
        const sessions = historyEntriesToSessions([
            makeSession("w1", "2024-06-10T09:00:00.000Z", 100),
            makeSession("w2", "2024-06-08T09:00:00.000Z", 100),
            makeSession("w3", "2024-06-06T09:00:00.000Z", 100),
            makeSession("w4", "2024-06-04T09:00:00.000Z", 105),
            makeSession("w5", "2024-06-02T09:00:00.000Z", 105),
            makeSession("w6", "2024-06-01T09:00:00.000Z", 105),
        ]);

        const result = transformSessionsToExercise(benchTemplate, sessions, { isPro: true });

        expect(result.hasStall).toBe(true);
        expect(result.color).toBe("red");
    });

    it("caps free tier performances at 15 for sessions and trend padding", () => {
        const sessions = historyEntriesToSessions(
            Array.from({ length: 20 }, (_, index) =>
                makeSession(
                    `w${index}`,
                    new Date(Date.UTC(2024, 5, 20 - index)).toISOString(),
                    80 + index,
                ),
            ),
        );

        const result = transformSessionsToExercise(benchTemplate, sessions, { isPro: false });

        expect(result.sessions).toHaveLength(FREE_STALL_PERFORMANCE_CAP);
        expect(result.trend).toHaveLength(FREE_STALL_PERFORMANCE_CAP);
    });

    it("returns full depth trend for Pro users", () => {
        const sessions = historyEntriesToSessions(
            Array.from({ length: 20 }, (_, index) =>
                makeSession(
                    `w${index}`,
                    new Date(Date.UTC(2024, 5, 20 - index)).toISOString(),
                    80 + index,
                ),
            ),
        );

        const result = transformSessionsToExercise(benchTemplate, sessions, { isPro: true });

        expect(result.sessions).toHaveLength(20);
        expect(result.trend).toHaveLength(20);
    });
});
