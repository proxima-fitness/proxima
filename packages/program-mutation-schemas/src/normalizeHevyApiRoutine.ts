/**
 * @module @proxima/program-mutation-schemas/normalizeHevyApiRoutine
 *
 * Coerce Hevy API routine payloads into grid/mutation schema shape.
 * Depends on: nothing
 */

/** Builder stores rest as a string (or null); Hevy GET /v1/routines sends a number. */
export function normalizeRestSeconds(value: unknown): string | null {
    if (value === null || value === undefined) return null;
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "string") return value;
    return null;
}

function normalizeHevyApiSetForGrid(set: unknown, arrayIndex: number): Record<string, unknown> {
    if (typeof set !== "object" || set === null) {
        return {
            index: arrayIndex,
            type: "normal",
            weight_kg: null,
            reps: null,
            distance_meters: null,
            duration_seconds: null,
            rpe: null,
            custom_metric: null,
            rep_range: null,
        };
    }

    const raw = set as Record<string, unknown>;

    return {
        index: arrayIndex,
        type: typeof raw.type === "string" ? raw.type : "normal",
        weight_kg: raw.weight_kg !== undefined ? raw.weight_kg : null,
        reps: raw.reps !== undefined ? raw.reps : null,
        distance_meters: raw.distance_meters !== undefined ? raw.distance_meters : null,
        duration_seconds: raw.duration_seconds !== undefined ? raw.duration_seconds : null,
        rpe: raw.rpe !== undefined ? raw.rpe : null,
        custom_metric: raw.custom_metric !== undefined ? raw.custom_metric : null,
        rep_range: raw.rep_range !== undefined ? raw.rep_range : null,
    };
}

function normalizeHevyApiExerciseForGrid(
    exercise: unknown,
    arrayIndex: number,
): Record<string, unknown> {
    if (typeof exercise !== "object" || exercise === null) {
        return {
            index: arrayIndex,
            title: "",
            notes: "",
            rest_seconds: null,
            exercise_template_id: "",
            supersets_id: null,
            sets: [],
        };
    }

    const raw = exercise as Record<string, unknown>;
    const supersetsId = raw.supersets_id ?? raw.superset_id;

    return {
        index: arrayIndex,
        title: typeof raw.title === "string" ? raw.title : "",
        notes: typeof raw.notes === "string" ? raw.notes : "",
        rest_seconds: normalizeRestSeconds(raw.rest_seconds),
        exercise_template_id:
            typeof raw.exercise_template_id === "string" ? raw.exercise_template_id : "",
        supersets_id: typeof supersetsId === "number" ? supersetsId : null,
        sets: Array.isArray(raw.sets)
            ? raw.sets.map((set, setIndex) => normalizeHevyApiSetForGrid(set, setIndex))
            : [],
    };
}

/** Normalize a Hevy API routine before add_routine_as_day Zod validation. */
export function normalizeHevyApiRoutineForAddDay(value: unknown): unknown {
    if (typeof value !== "object" || value === null) {
        return { title: "", notes: "", exercises: [] };
    }

    const raw = value as Record<string, unknown>;

    return {
        title: typeof raw.title === "string" ? raw.title : "",
        notes: typeof raw.notes === "string" ? raw.notes : "",
        exercises: Array.isArray(raw.exercises)
            ? raw.exercises.map((exercise, index) =>
                  normalizeHevyApiExerciseForGrid(exercise, index),
              )
            : [],
    };
}
