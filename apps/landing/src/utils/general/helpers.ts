/**
 * @module helpers
 *
 * General-purpose utility functions shared across the application:
 * date formatting, workout sorting, Hevy exercise-template lookups
 * from localStorage, AMRAP sentinel conversion, and display-name
 * initial extraction.
 *
 * Depends on: Hevy type definitions (THevyExerciseTemplate, TScheduleWorkouts)
 * Used by: Workout schedule views, exercise cards, program-builder UI
 */

/**
 * Format a Supabase ISO-8601 timestamp into a short human-readable date.
 *
 * @param inputDate - ISO date string from Supabase, or `undefined`
 * @returns Formatted date (e.g. "Jan 5, 2025") or empty string if input is falsy
 */
export function convertSupabaseDateToReadable(inputDate: string | undefined): string {

    let formattedDate = "";
    if (inputDate) {
        const date = new Date(inputDate);
        const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
        formattedDate = date.toLocaleDateString('en-US', options);
    }

    return formattedDate;
}

/**
 * Formats logged workout wall time (`ended_at − started_at`) for card headers.
 *
 * @param startedAt - ISO session start from backup
 * @param endedAt - ISO session end from backup
 * @returns Human-readable duration (e.g. "1h 15m", "45 min") or empty string when invalid
 */
export function formatWorkoutWallDuration(startedAt: string | undefined, endedAt: string | undefined): string {
    if (!startedAt || !endedAt) {
        return "";
    }

    const durationMs = new Date(endedAt).getTime() - new Date(startedAt).getTime();
    if (!Number.isFinite(durationMs) || durationMs <= 0) {
        return "";
    }

    const totalMinutes = Math.round(durationMs / 60_000);
    if (totalMinutes < 60) {
        return `${totalMinutes} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

/**
 * Sort schedule workouts into a week-major, day-minor 2D array.
 *
 * @param scheduleWorkouts - Flat array of workouts with `nthWeek` and `nthDay` fields
 * @returns Nested array grouped by week (ascending) then sorted by day within each week
 */
export const sortWorkouts = (scheduleWorkouts: TScheduleWorkouts[]) => {
    const workoutsByWeek = scheduleWorkouts.reduce<Record<number, TScheduleWorkouts[]>>((acc, workout) => {
        const { nthWeek } = workout;
        if (!acc[nthWeek]) {
            acc[nthWeek] = [];
        }
        acc[nthWeek].push(workout);
        return acc;
    }, {});

    const sortedWorkoutsByWeek: TScheduleWorkouts[][] = Object.keys(workoutsByWeek)
        .sort((a, b) => Number(a) - Number(b))
        .map(week =>
            workoutsByWeek[Number(week)].sort((a, b) => a.nthDay - b.nthDay),
    );

    return sortedWorkoutsByWeek;
};

/**
 * Look up a Hevy exercise template in localStorage by its title.
 *
 * @param title - The exact exercise title to search for
 * @returns The matching template, or `undefined` if not cached / not found
 */
export const getHevyExerciseFromLocalStorageByName = async (title: string) => {
    const cachedExercises = localStorage.getItem("hevy-exercises");

    if (!cachedExercises) {
        return undefined;
    }

    if (cachedExercises && cachedExercises.length > 0) {
        const { exercises } = JSON.parse(cachedExercises);
        const exercise: THevyExerciseTemplate | undefined = exercises?.find((exercise: THevyExerciseTemplate) => exercise.title === title);
        return exercise;
    }
};

/**
 * Look up a Hevy exercise template in localStorage by its ID.
 *
 * @param id - The exercise template ID to search for
 * @returns The matching template, or `undefined` if not cached / not found
 */
export const getHevyExerciseFromLocalStorageByID = async (id?: string) => {
    const cachedExercises = localStorage.getItem("hevy-exercises");

    if (!cachedExercises) {
        return undefined;
    }

    if (cachedExercises && cachedExercises.length > 0) {
        const { exercises } = JSON.parse(cachedExercises);
        const exercise: THevyExerciseTemplate | undefined = exercises?.find((exercise: THevyExerciseTemplate) => exercise.id === id);
        return exercise;
    }
};

/**
 * Convert an AMRAP string array into sentinel numeric values.
 *
 * Each element maps to `999`, the application-wide sentinel that
 * indicates "as many reps as possible" in numeric rep-scheme arrays.
 *
 * @param amrap - Array of AMRAP placeholder strings
 * @returns Array of `999` values with the same length
 */
export const amrapAsNumber = (amrap: string[] = []) => {
    return amrap.map(() => 999);
};


/**
 * Extract up to two uppercase initials from an exercise or user name.
 *
 * @param name - The full name to abbreviate
 * @returns One or two character initials, or `null` for empty/whitespace-only names
 */
export const getInitials = (name: string): string | null => {
    const words = name.trim().split(" ");
    const nonEmpty = words.filter(w => w.length > 0);
    if (nonEmpty.length === 0) return null;
    const initials = nonEmpty.map(word => word[0].toUpperCase());
    if (initials.length > 2) {
        return initials.slice(0, 2).join("");
    }
    return initials.join("");
};

