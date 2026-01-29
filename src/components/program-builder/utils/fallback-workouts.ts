/**
 * Fallback Workout Generator
 *
 * Provides template-based workouts when AI generation fails.
 * Uses standard Hevy exercise IDs for common exercises.
 */

// Standard Hevy exercise template IDs for common exercises
// These are well-known exercises that should exist in most accounts
const EXERCISE_IDS = {
    // Chest
    BENCH_PRESS: 'D04AC939',
    INCLINE_BENCH_PRESS: '3A5C61FD',
    DUMBBELL_BENCH_PRESS: 'F8E34E4B',
    DUMBBELL_FLY: 'E3B8D6F2',
    PUSH_UP: 'A1B2C3D4',
    CABLE_CROSSOVER: 'F5E6D7C8',

    // Back
    BARBELL_ROW: '87D3F3A2',
    LAT_PULLDOWN: 'C7E8F9A0',
    SEATED_CABLE_ROW: 'D8E9F0A1',
    PULL_UP: 'B9C0D1E2',
    DEADLIFT: 'A0B1C2D3',
    DUMBBELL_ROW: 'E4F5A6B7',

    // Shoulders
    OVERHEAD_PRESS: 'C8D9E0F1',
    LATERAL_RAISE: 'F2A3B4C5',
    FACE_PULL: 'D6E7F8A9',
    REAR_DELT_FLY: 'B0C1D2E3',
    ARNOLD_PRESS: 'F4A5B6C7',

    // Legs
    SQUAT: '96D8E49A',
    LEG_PRESS: 'A8B9C0D1',
    ROMANIAN_DEADLIFT: 'E2F3A4B5',
    LEG_CURL: 'C6D7E8F9',
    LEG_EXTENSION: 'A0B1C2D3',
    CALF_RAISE: 'E4F5A6B7',
    LUNGES: 'C8D9E0F1',

    // Arms
    BICEP_CURL: 'F2A3B4C5',
    HAMMER_CURL: 'D6E7F8A9',
    TRICEP_PUSHDOWN: 'B0C1D2E3',
    SKULL_CRUSHER: 'F4A5B6C7',
    TRICEP_DIP: 'C8D9E0F1',

    // Core
    PLANK: 'A2B3C4D5',
    CABLE_CRUNCH: 'E6F7A8B9',
    LEG_RAISE: 'C0D1E2F3',
} as const;

// Helper to create a single set
function createSet(type: 'normal' | 'warmup' | 'dropset' | 'failure', reps: number, rpe: number | null = null, index: number): THevySets {
    return {
        index,
        type,
        reps,
        weight_kg: null,
        rpe,
        distance_meters: null,
        duration_seconds: null,
        custom_metric: null,
    };
}

// Helper to create an exercise
function createExercise(
    exerciseTemplateId: string,
    title: string,
    index: number,
    sets: { type: 'normal' | 'warmup' | 'dropset' | 'failure'; reps: number; rpe?: number }[],
    restSeconds: string = '90',
    notes: string = ''
): THevyExercise {
    return {
        index,
        title,
        notes,
        rest_seconds: restSeconds,
        exercise_template_id: exerciseTemplateId,
        supersets_id: null,
        sets: sets.map((set, i) => createSet(set.type, set.reps, set.rpe ?? null, i)),
    };
}

// Template workout definitions
type WorkoutTemplate = {
    title: string;
    notes: string;
    exercises: THevyExercise[];
};

// Push day template
const pushDay: WorkoutTemplate = {
    title: 'Push Day',
    notes: 'Focus on chest, shoulders, and triceps',
    exercises: [
        createExercise(EXERCISE_IDS.BENCH_PRESS, 'Barbell Bench Press', 0, [
            { type: 'warmup', reps: 12 },
            { type: 'normal', reps: 8, rpe: 7 },
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '120'),
        createExercise(EXERCISE_IDS.INCLINE_BENCH_PRESS, 'Incline Barbell Bench Press', 1, [
            { type: 'normal', reps: 10, rpe: 7 },
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.OVERHEAD_PRESS, 'Overhead Press', 2, [
            { type: 'normal', reps: 8, rpe: 7 },
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.LATERAL_RAISE, 'Lateral Raise', 3, [
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 9 },
        ], '60'),
        createExercise(EXERCISE_IDS.TRICEP_PUSHDOWN, 'Tricep Pushdown', 4, [
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 9 },
        ], '60'),
    ],
};

// Pull day template
const pullDay: WorkoutTemplate = {
    title: 'Pull Day',
    notes: 'Focus on back and biceps',
    exercises: [
        createExercise(EXERCISE_IDS.BARBELL_ROW, 'Barbell Row', 0, [
            { type: 'warmup', reps: 12 },
            { type: 'normal', reps: 8, rpe: 7 },
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '120'),
        createExercise(EXERCISE_IDS.LAT_PULLDOWN, 'Lat Pulldown', 1, [
            { type: 'normal', reps: 10, rpe: 7 },
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.SEATED_CABLE_ROW, 'Seated Cable Row', 2, [
            { type: 'normal', reps: 10, rpe: 7 },
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.FACE_PULL, 'Face Pull', 3, [
            { type: 'normal', reps: 15, rpe: 7 },
            { type: 'normal', reps: 15, rpe: 8 },
            { type: 'normal', reps: 15, rpe: 8 },
        ], '60'),
        createExercise(EXERCISE_IDS.BICEP_CURL, 'Bicep Curl', 4, [
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 9 },
        ], '60'),
        createExercise(EXERCISE_IDS.HAMMER_CURL, 'Hammer Curl', 5, [
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 9 },
        ], '60'),
    ],
};

// Legs day template
const legsDay: WorkoutTemplate = {
    title: 'Leg Day',
    notes: 'Focus on quads, hamstrings, and calves',
    exercises: [
        createExercise(EXERCISE_IDS.SQUAT, 'Barbell Squat', 0, [
            { type: 'warmup', reps: 12 },
            { type: 'normal', reps: 8, rpe: 7 },
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '180'),
        createExercise(EXERCISE_IDS.LEG_PRESS, 'Leg Press', 1, [
            { type: 'normal', reps: 10, rpe: 7 },
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '120'),
        createExercise(EXERCISE_IDS.ROMANIAN_DEADLIFT, 'Romanian Deadlift', 2, [
            { type: 'normal', reps: 10, rpe: 7 },
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '120'),
        createExercise(EXERCISE_IDS.LEG_CURL, 'Leg Curl', 3, [
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 9 },
        ], '60'),
        createExercise(EXERCISE_IDS.LEG_EXTENSION, 'Leg Extension', 4, [
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 9 },
        ], '60'),
        createExercise(EXERCISE_IDS.CALF_RAISE, 'Calf Raise', 5, [
            { type: 'normal', reps: 15, rpe: 8 },
            { type: 'normal', reps: 15, rpe: 8 },
            { type: 'normal', reps: 15, rpe: 9 },
        ], '60'),
    ],
};

// Upper body template
const upperDay: WorkoutTemplate = {
    title: 'Upper Body',
    notes: 'Full upper body workout',
    exercises: [
        createExercise(EXERCISE_IDS.BENCH_PRESS, 'Barbell Bench Press', 0, [
            { type: 'warmup', reps: 12 },
            { type: 'normal', reps: 8, rpe: 7 },
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '120'),
        createExercise(EXERCISE_IDS.BARBELL_ROW, 'Barbell Row', 1, [
            { type: 'normal', reps: 8, rpe: 7 },
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.OVERHEAD_PRESS, 'Overhead Press', 2, [
            { type: 'normal', reps: 8, rpe: 7 },
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.LAT_PULLDOWN, 'Lat Pulldown', 3, [
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.LATERAL_RAISE, 'Lateral Raise', 4, [
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 8 },
        ], '60'),
        createExercise(EXERCISE_IDS.BICEP_CURL, 'Bicep Curl', 5, [
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '60'),
        createExercise(EXERCISE_IDS.TRICEP_PUSHDOWN, 'Tricep Pushdown', 6, [
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 8 },
        ], '60'),
    ],
};

// Lower body template
const lowerDay: WorkoutTemplate = {
    title: 'Lower Body',
    notes: 'Full lower body workout',
    exercises: [
        createExercise(EXERCISE_IDS.SQUAT, 'Barbell Squat', 0, [
            { type: 'warmup', reps: 12 },
            { type: 'normal', reps: 8, rpe: 7 },
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '180'),
        createExercise(EXERCISE_IDS.ROMANIAN_DEADLIFT, 'Romanian Deadlift', 1, [
            { type: 'normal', reps: 10, rpe: 7 },
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '120'),
        createExercise(EXERCISE_IDS.LEG_PRESS, 'Leg Press', 2, [
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.LEG_CURL, 'Leg Curl', 3, [
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 9 },
        ], '60'),
        createExercise(EXERCISE_IDS.LEG_EXTENSION, 'Leg Extension', 4, [
            { type: 'normal', reps: 12, rpe: 8 },
            { type: 'normal', reps: 12, rpe: 9 },
        ], '60'),
        createExercise(EXERCISE_IDS.CALF_RAISE, 'Calf Raise', 5, [
            { type: 'normal', reps: 15, rpe: 8 },
            { type: 'normal', reps: 15, rpe: 9 },
        ], '60'),
    ],
};

// Full body template
const fullBodyDay: WorkoutTemplate = {
    title: 'Full Body',
    notes: 'Complete full body workout',
    exercises: [
        createExercise(EXERCISE_IDS.SQUAT, 'Barbell Squat', 0, [
            { type: 'warmup', reps: 12 },
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '120'),
        createExercise(EXERCISE_IDS.BENCH_PRESS, 'Barbell Bench Press', 1, [
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.BARBELL_ROW, 'Barbell Row', 2, [
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.OVERHEAD_PRESS, 'Overhead Press', 3, [
            { type: 'normal', reps: 8, rpe: 8 },
            { type: 'normal', reps: 8, rpe: 8 },
        ], '90'),
        createExercise(EXERCISE_IDS.ROMANIAN_DEADLIFT, 'Romanian Deadlift', 4, [
            { type: 'normal', reps: 10, rpe: 8 },
            { type: 'normal', reps: 10, rpe: 8 },
        ], '90'),
    ],
};

// Get workout split based on number of days
function getWorkoutSplit(daysPerWeek: number): WorkoutTemplate[] {
    switch (daysPerWeek) {
        case 1:
            return [fullBodyDay];
        case 2:
            return [upperDay, lowerDay];
        case 3:
            return [pushDay, pullDay, legsDay];
        case 4:
            return [upperDay, lowerDay, upperDay, lowerDay].map((template, i) => ({
                ...template,
                title: `${template.title} ${i < 2 ? 'A' : 'B'}`,
            }));
        case 5:
            return [pushDay, pullDay, legsDay, upperDay, lowerDay];
        case 6:
            return [pushDay, pullDay, legsDay, pushDay, pullDay, legsDay].map((template, i) => ({
                ...template,
                title: `${template.title} ${i < 3 ? 'A' : 'B'}`,
            }));
        case 7:
            return [pushDay, pullDay, legsDay, pushDay, pullDay, legsDay, fullBodyDay];
        default:
            // Default to 4-day split
            return [upperDay, lowerDay, upperDay, lowerDay].map((template, i) => ({
                ...template,
                title: `${template.title} ${i < 2 ? 'A' : 'B'}`,
            }));
    }
}

// Convert workout template to THevyRoutine
function templateToRoutine(
    template: WorkoutTemplate,
    routineId: string,
    folderId: number,
    order: string
): THevyRoutine {
    const now = new Date().toISOString();
    return {
        id: routineId,
        title: template.title,
        folder_id: folderId,
        order,
        notes: template.notes,
        exercises: template.exercises,
        created_at: now,
        updated_at: now,
    };
}

/**
 * Generate a fallback workout program
 * @param daysPerWeek - Number of workout days per week (1-7)
 * @param programLength - Number of weeks in the program
 * @returns Array of THevyRoutine representing the full program
 */
export function generateFallbackWorkout(daysPerWeek: number = 4, programLength: number = 12): THevyRoutine[] {
    // Clamp days to valid range
    const clampedDays = Math.max(1, Math.min(7, daysPerWeek));
    const clampedWeeks = Math.max(1, Math.min(52, programLength));

    // Get the workout split for this number of days
    const weekTemplates = getWorkoutSplit(clampedDays);

    // Generate routines for all weeks
    const routines: THevyRoutine[] = [];
    let routineId = 1;

    for (let weekIndex = 0; weekIndex < clampedWeeks; weekIndex++) {
        for (let dayIndex = 0; dayIndex < weekTemplates.length; dayIndex++) {
            const template = weekTemplates[dayIndex];
            const routine = templateToRoutine(
                template,
                String(routineId++),
                weekIndex, // folder_id represents the week (0-indexed)
                String(dayIndex + 1) // order is 1-indexed
            );
            routines.push(routine);
        }
    }

    return routines;
}

/**
 * Generate a single week of fallback workouts (useful for preview)
 */
export function generateFallbackWeek(daysPerWeek: number = 4): THevyRoutine[] {
    return generateFallbackWorkout(daysPerWeek, 1);
}
