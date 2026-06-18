import { describe, expect, it } from "vitest";
import { backedUpWorkoutFixture } from "./manual/backed-up-workout.fixture";
import { mapBackedUpWorkoutToHevyRoutine } from "../workout-history-read";
import { classifySessionGoal } from "../session-goal";

function routineWithSets(
    sets: Array<{ type?: string; reps: number | null }>,
): Pick<THevyRoutine, "exercises"> {
    return {
        exercises: [
            {
                index: 0,
                title: "Test",
                exercise_template_id: "1",
                supersets_id: null,
                rest_seconds: null,
                notes: "",
                sets: sets.map((set, index) => ({
                    index,
                    type: set.type ?? "normal",
                    weight_kg: 100,
                    reps: set.reps,
                    distance_meters: null,
                    duration_seconds: null,
                    rpe: null,
                    custom_metric: null,
                    rep_range: null,
                })),
            },
        ],
    };
}

describe("classifySessionGoal", () => {
    it("classifies fixture workout as hypertrophy (62% working reps in 6–12 zone)", () => {
        const routine = mapBackedUpWorkoutToHevyRoutine(backedUpWorkoutFixture);
        expect(classifySessionGoal(routine)).toBe("hypertrophy");
    });

    it("excludes warmup sets from rep distribution", () => {
        const routine = routineWithSets([
            { type: "warmup", reps: 20 },
            { type: "normal", reps: 3 },
            { type: "normal", reps: 3 },
        ]);
        expect(classifySessionGoal(routine)).toBe("strength");
    });

    it("includes dropset and failure working sets", () => {
        const routine = routineWithSets([
            { type: "dropset", reps: 15 },
            { type: "failure", reps: 15 },
        ]);
        expect(classifySessionGoal(routine)).toBe("endurance");
    });

    it("returns mixed when no zone reaches 50% of working reps", () => {
        const routine = routineWithSets([
            { reps: 5 },
            { reps: 5 },
            { reps: 6 },
            { reps: 6 },
            { reps: 15 },
        ]);
        expect(classifySessionGoal(routine)).toBe("mixed");
    });

    it("returns mixed on a 50/50 tie between top zones", () => {
        const routine = routineWithSets([
            { reps: 5 },
            { reps: 5 },
            { reps: 10 },
        ]);
        expect(classifySessionGoal(routine)).toBe("mixed");
    });

    it("returns null when there are no qualifying working sets", () => {
        expect(classifySessionGoal(routineWithSets([{ type: "warmup", reps: 10 }]))).toBeNull();
        expect(classifySessionGoal(routineWithSets([{ reps: null }]))).toBeNull();
        expect(classifySessionGoal({ exercises: [] })).toBeNull();
    });
});
