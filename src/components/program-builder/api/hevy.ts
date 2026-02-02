// File for endpoints to the Hevy App Public API
import { v4 as uuidv4 } from "uuid";
import { getMaxFolderId } from "@/components/program-builder/utils";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/api";
import { convertHevyOutputIntoInput } from "./hevy_export";

export const defaultFetch = async <T>(url: string, apiKey: string): Promise<T> => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return (await response.json()) as T;
};

// GETS CUSTOM EXERCISES FROM HEVY
export const getHevyCustomExercises = async (user: User | undefined | null, apiKey: string): Promise<THevyExerciseTemplate[]> => {
    if (!user) return [];

    const customExercises: THevyExerciseTemplate[] = [];

    for (let i = 1; i <= 10; i++) {
        const url = `https://api.hevyapp.com/v1/exercise_templates?page=${i}&pageSize=100`;

        try {
            const result = await defaultFetch<{ exercise_templates: THevyExerciseTemplate[] }>(url, apiKey);
            const exercises = result.exercise_templates;

            if ( !exercises || (exercises && exercises.length === 0) ) {
                break;
            }

            const isCustomExercise = exercises.filter((exercise) => exercise.is_custom);

            customExercises.push(...isCustomExercise);

            // If we get less than 100 exercises, we've reached the last page
            if (exercises.length < 100) {
                break;
            }

        } catch (error) {
            console.error("Error fetching Hevy custom exercises:", error);
            break;
        }

    }

    return customExercises;
};

export const getHevyPrograms = async (user: User | undefined | null, apiKey: string) => {
    try {
        if (!user) {
            return [];
        }

        if (!apiKey) {
            return [];
        }

        const routines = await getHevyRoutines(user, apiKey);

        if (!routines || routines.length === 0) {
            return [];
        }

        // Group routines by folder_id
        const programsByFolder: { [folderId: number]: THevyRoutine[] } = {};

        routines.forEach((routine) => {
            const folderId = routine.folder_id;
            // Skip routines with invalid folder_id
            if (folderId === undefined || folderId === null || isNaN(folderId)) {
                console.warn("Skipping routine with invalid folder_id:", routine);
                return;
            }
            if (!programsByFolder[folderId]) {
                programsByFolder[folderId] = [];
            }
            programsByFolder[folderId].push(routine);
        });

        // Convert to array of programs, sorted by folder_id
        const programs = Object.keys(programsByFolder)
            .map(Number)
            .sort((a, b) => a - b)
            .map((folderId) => programsByFolder[folderId])
            .filter((program) => program && program.length > 0); // Filter out undefined or empty programs


        // Add program titles by fetching routine folder information
        const programsWithTitles: { program_title: string, program: THevyRoutine[] }[] = [];
        for (const program of programs) {
            // Additional safety check
            if (!program || !Array.isArray(program) || program.length === 0) {
                console.warn("Skipping invalid program:", program);
                continue;
            }

            try {
                const routineFolder = await getHevyRoutineFolder(apiKey, program[0].folder_id);

                programsWithTitles.push({
                    program_title: routineFolder?.title || `Program ${program[0].folder_id}`,
                    program: program
                });
            } catch (error) {
                console.error(`Error fetching folder for program ${program[0].folder_id}:`, error);
                // Still add the program with a fallback title
                programsWithTitles.push({
                    program_title: `Program ${program[0].folder_id}`,
                    program: program
                });
            }
        }

        return programsWithTitles;
    } catch (error) {
        console.error("Error in getHevyPrograms:", error);
        return [];
    }
};

// Get individual routine folder
export const getHevyRoutineFolder = async (apiKey: string, folderId: number) => {
    try {
        const url = `https://api.hevyapp.com/v1/routine_folders/${folderId}`;
        const response = await defaultFetch<THevyRoutineFolder>(url, apiKey);
        return response;
    } catch (error) {
        console.error(`Error fetching routine folder ${folderId}:`, error);
        return null;
    }
};

// GET /v1/routine_folders. Get a paginated list of routien folders available on the account.
// https://api.hevyapp.com/docs/#/RoutineFolders/get_v1_routine_folders
/**
 * GETS A PAGINATED LIST OF ROUTINE FOLDERS AVAILABLE ON THE ACCOUNT
 * @param apiKey - The hevy api key
 * @param page - The page number
 * @returns The routine folders
 */
export const getRoutineFolders = async (apiKey: string, page: number) => {
    try {
        const response = await defaultFetch<THevyRoutineFolderResponse>(`https://api.hevyapp.com/v1/routine_folders?page=${page}&pageSize=10`, apiKey);
        if (response) {
            return response;
        }
    } catch (error: unknown) {
        console.error("Error fetching routine folders", error);
        throw error;
    }
};

// GETS HEVY ROUTINES FROM HEVY
export const getHevyRoutines = async (user: User | undefined | null, apiKey: string) => {

    if  (!user) return [];

    const syncedRoutines: THevyRoutine[] = [];

    for (let i = 1; i <= 10; i++) {
        const url = `https://api.hevyapp.com/v1/routines?page=${i}&pageSize=10`;

        try {
            const result = await defaultFetch<{ routines: THevyRoutine[] }>(url, apiKey);
            const routines = result.routines;

            if ( !routines || (routines && routines.length === 0) ) {
                break;
            }

            syncedRoutines.push(...routines);

            // If we get less than 10 routines, we've reached the last page
            if (routines.length < 10) {
                break;
            }

        } catch (error) {
            console.error("Error fetching Hevy routines:", error);
                break;
            }
        }

    return syncedRoutines;
};

/** Success shape returned by postHevyRoutineProgram when the program is saved. */
export type PostHevyRoutineProgramSuccess = { status: "success"; id: number };

/**
 * POSTS A PROGRAM TO SUPABASE DATABASE (IN PROXIMA SCHEMA FORMAT)
 * Program id is generated by the database (int4). Returns the new program id.
 * @param hevyRoutines - The hevy routines
 * @param prompt - The prompt
 * @param request - The request
 * @returns { status: "success", id: number } or an Error
 */
export const postHevyRoutineProgram = async (
    hevyRoutines: THevyRoutine[],
    prompt: string,
    request?: TTextToJsonRequest,
): Promise<PostHevyRoutineProgramSuccess | Error | unknown> => {
    const weeks = getMaxFolderId(hevyRoutines) + 1;
    const BATCH_SIZE = 50; // Process exercises in batches of 50

    try {
        // Ensure title defaults to "My AI Program" if missing, null, undefined, or empty string
        const programTitle = request?.programTitle?.trim();
        const title = programTitle && programTitle.length > 0 ? programTitle : "My AI Program";

        const programUploadObject = {
            title,
            details: request?.search ?? "",
            program_length: weeks,
            workout_duration: request?.workoutDuration ? Number(request.workoutDuration) : null,
            equipment: request?.equipment ?? null,
            specialization: request?.specialization ? request.specialization.split(',').map(s => s.trim()) : null,
            difficulty: request?.difficultyLevel ? request.difficultyLevel.split(',').map(s => s.trim()) : null,
            explore: request?.explore === "true" ? true : false,
            prompt,
        };

        // STEP 1: Insert into programs table (id generated by DB) and get the new id
        const { data: programRow, error: programsError } = await supabase
            .from('programs')
            .insert([programUploadObject])
            .select('id')
            .single();
        if (programsError) {
            console.error('Error inserting into programs:', programsError);
            return programsError;
        }
        const newProgramId = programRow?.id as number;

        // STEP 2: Prepare and insert schedule uploads in batches
        const scheduleUploads = hevyRoutines.map((routine) => ({
            id: uuidv4(),
            nthWeek: routine.folder_id + 1,
            nthDay: Number(routine?.order || '1'),
            day_title: routine.title,
            day_notes: routine?.notes ?? "",
            program_id: String(newProgramId),
        }));

        // Insert schedules in batches
        for (let i = 0; i < scheduleUploads.length; i += BATCH_SIZE) {
            const batch = scheduleUploads.slice(i, i + BATCH_SIZE);
            const { error: scheduleError } = await supabase.from('schedule_workouts').insert(batch);
            if (scheduleError) {
                console.error('Error inserting schedule workouts batch:', scheduleError);
                return scheduleError;
            }
        }

        // STEP 3: Process exercises in batches
        const allWorkoutUploads: { [key: string]: unknown }[] = [];

        for (let i = 0; i < hevyRoutines.length; i += BATCH_SIZE) {
            const routineBatch = hevyRoutines.slice(i, i + BATCH_SIZE);

            // Process each routine in the batch
            for (const routine of routineBatch) {
                const schedule = scheduleUploads[i + routineBatch.indexOf(routine)];
                if (!schedule) continue;

                const exercisePromises = (routine.exercises ?? []).map(async (exercise) => {
                    const exerciseId = exercise.exercise_template_id;
                    if (!exerciseId) return null;

                    const reps = exercise.sets?.map((set) => set.reps) ?? null;
                    const timeTaken = exercise.sets?.map((set) => set.duration_seconds) ?? null;
                    const weights = exercise.sets?.map((set) => set.weight_kg) ?? null;
                    const rpe = exercise.sets?.map((set) => set.rpe) ?? null;

                    return {
                        id: uuidv4(),
                        schedule_id: schedule.id,
                        exercise_id: exerciseId,
                        reps: reps,
                        reps_range: null,
                        reps_max: null,
                        amrap: null,
                        time_taken: timeTaken?.[0] === null ? null : timeTaken,
                        time_range: null,
                        weights: weights?.[0] === null ? null : weights,
                        rpe: rpe?.[0] === null ? null : rpe,
                        rpe_range: null,
                        percent_rm: null,
                    };
                });

                const batchResults = await Promise.all(exercisePromises);
                allWorkoutUploads.push(...batchResults.filter((result): result is NonNullable<typeof result> => result !== null));
            }
        }

        // STEP 4: Insert workouts in batches
        for (let i = 0; i < allWorkoutUploads.length; i += BATCH_SIZE) {
            const batch = allWorkoutUploads.slice(i, i + BATCH_SIZE);
            if (batch.length > 0) {
                const { error: workoutError } = await supabase.from('program_workout_exercises').insert(batch);
                if (workoutError) {
                    console.error('Error inserting program workout exercises batch:', workoutError);
                    return workoutError;
                }
            }
        }

        return { status: "success", id: newProgramId };
    } catch (error) {
        console.error('Unexpected error:', error);
        return error;
    }
};


/**
 * POSTS USER'S HEVY API KEY TO THEIR SUPABASE USER ACCOUNT
 * @param user - The user
 * @param secret - The hevy api key
 * @returns The hevy api key
 */
export const postHevyApikey = async (user: User, secret: string) => {

    try {
        if (user) {
            const { data: apiKeySaved, error: apiKeyError } = await supabase.rpc('insert_secret', {
                secret,
            });

            if (apiKeyError) {
                console.error("Error saving Hevy API Key", apiKeyError);
                return { success: false, data: apiKeyError };
            } else {
                return { success: true, data: apiKeySaved};
            }
        }
    } catch (error: unknown) {
        console.error("Unknown error saving Hevy API Key", error);
        return { success: false, data: error };
    }
};

/**
 * DELETES USER'S HEVY API KEY FROM THEIR SUPABASE USER ACCOUNT
 * @param user - The user
 * @returns The hevy api key
 */
export const deleteHevyApiKey = async (user: User) => {

    try {
        if (user) {
            const secretName = `hevy_api_key_${user.id}`;
            const { error: deletionError } = await supabase.rpc('delete_secret', {
                secret_name: secretName,
            });

            if (deletionError) {
                console.error("Error deleting Hevy API Key", deletionError);
                return false;
            } else {
                return true;
            }
        }
    } catch (error: unknown) {
        console.error("Error deleting Hevy API Key", error);
    }

};


/**
 * UPDATES USER'S HEVY API KEY IN THEIR SUPABASE USER ACCOUNT
 * @param user - The user
 * @param secret - The hevy api key
 * @returns The hevy api key
 */
export const updateHevyApiKey = async (user: User, secret: string): Promise<boolean> => {

    if (await deleteHevyApiKey(user)) {
        const apiKeySaved = await postHevyApikey(user, secret);
        if (apiKeySaved && apiKeySaved.success) {
            return true;
        }
    }

    return false;
};

/** Max routines to send in short succession before pausing (Hevy API limit). */
export const ROUTINES_BATCH_SIZE = 40;

/** Pause duration between batches or after 429 (ms). */
export const RATE_LIMIT_BACKOFF_MS = 60_000;

/** Max retries on 429 before returning error (4 attempts total). */
export const RATE_LIMIT_MAX_RETRIES = 3;

/** Error message when rate limit retries are exhausted (for UI to show). */
export const RATE_LIMIT_EXHAUSTED_MESSAGE = "Upload failed. Rate limited after 3 retries.";

/** Callback for upload progress: uploaded count, total count, status, and optional countdown seconds when rate limited. */
export type HevyUploadProgressCallback = (
    uploaded: number,
    total: number,
    status: 'uploading' | 'rate_limited',
    rateLimitSecondsLeft?: number,
) => void;

/**
 * DELAYS FOR A SPECIFIC AMOUNT OF TIME
 * @param ms - The amount of time to delay
 * @returns The delayed time
 */
export const delay = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

/** Runs waitSeconds delay while calling onProgress every second with countdown (waitSeconds down to 0). */
async function delayWithRateLimitCountdown(
    uploaded: number,
    total: number,
    onProgress?: HevyUploadProgressCallback,
    waitSeconds: number = RATE_LIMIT_BACKOFF_MS / 1000,
): Promise<void> {
    for (let s = waitSeconds; s >= 0; s--) {
        onProgress?.(uploaded, total, 'rate_limited', s);
        if (s > 0) await delay(1000);
    }
}



export const defaultPost = async <T, U = unknown>(url: string, apiKey: string, body: U): Promise<T> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'api-key': apiKey,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return (await response.json()) as T;
  };


/**
 * GETS USER'S HEVY API KEY FROM THEIR SUPABASE USER ACCOUNT
 * @param user - The user
 * @returns The hevy api key
 */
export const getHevyApiKey = async (user: User | undefined | null) => {

    try {
        if (user) {
            const secretName = `hevy_api_key_${user.id}`;
            const { data: hevyApiKey, error: hevyApiKeyError } = await supabase.rpc('read_secret', {
                secret_name: secretName,
            });

            if (hevyApiKeyError) {
                console.error("Error accessing Hevy API Key", hevyApiKeyError);
                return "";
            } else {
                return hevyApiKey;
            }
        }
        return "";
    } catch (error: unknown) {
        console.error("Error accessing Hevy API key", error);
        return "";
    }
};



// HEVY PUBLIC API REQUESTS: https://api.hevyapp.com/docs/

// Workouts

// GET /v1/workouts. Get a paginated list of workouts available on the account.
// https://api.hevyapp.com/docs/#/Workouts/get_v1_workouts
/**
 * GETS THE MOST RECENTLY COMPLETED WORKOUT FROM HEVY
 * @param apiKey - The hevy api key
 * @returns The most recently completed workout, or undefined if error or no workouts found
 */
export const getMostRecentHevyWorkout = async (apiKey: string, page: number, pageSize: number) => {
    try {
        const response = await defaultFetch<{ workouts: unknown[] }>(
            `https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=${pageSize}`,
            apiKey,
        );

        if (response && response.workouts && response.workouts.length > 0) {
            return response.workouts[0];
        }

        return undefined;
    } catch (error: unknown) {
        console.error("Error fetching most recent Hevy workout", error);
        return undefined;
    }
};

// Routines

// POST /v1/routines. Create a new routine
// https://api.hevyapp.com/docs/#/Routines/post_v1_routines
/**
 * POSTS A NEW ROUTINE TO HEVY
 * @param postRoutine - The routine to post
 * @param apiKey - The hevy api key
 * @returns The routine
 */
export const postRoutines = async (postRoutine: THevyRoutineRequest, apiKey: string) => {
    const body: THevyRoutineRequestObject = {
        routine: postRoutine,
    };

    const response = await defaultPost<THevyRoutineRequest, THevyRoutineRequestObject>(
        'https://api.hevyapp.com/v1/routines',
        apiKey,
        body,
    );

    return response;

};


// ExerciseTemplates

/**
 * GET HEVY EXERCISES STORED BY HEVY (CACHES IN CAPACITOR PREFERENCES)
 * @param user - The user
 * @returns The hevy exercises
 */
export const getHevyExercises = async () => {
    try {
        const { data: hevyExercises, error: hevyExercisesError } = await supabase
            .from('hevy_exercise_templates')
            .select('id, title, type, primary_muscle_group, secondary_muscle_groups, is_custom, equipment, normalized_title, gif_id, instructions')
            .order("title", { ascending: true});

        if (hevyExercisesError) {
            console.error('Error fetching existing exercises:', hevyExercisesError);
            return [];
        }

        return hevyExercises as THevyExerciseTemplate[];
    } catch (error) {
        console.error('Error fetching hevy exercises:', error);
        return [];
    }
};


/**
 * GETS THE EXERCISE HISTORY FOR A SPECIFIC WORKOUT
 * @param apiKey - The hevy api key
 * @param workoutId - The id of the workout
 * @param start_date - The start date of the exercise history ISO 8601 format
 * @param end_date - The end date of the exercise history ISO 8601 format
 * @returns The exercise history
 */
export const getHevyExerciseHistory = async (apiKey: string, exercise_template_id: string, start_date: string, end_date: string) => {
    try {
        const response = await defaultFetch<THevyExerciseHistory>(`https://api.hevyapp.com/v1/exercise_history/${exercise_template_id}?start_date=${start_date}&end_date=${end_date}`, apiKey);
        if (response) {
            return response;
        }
        return [];
    } catch (error: unknown) {
        console.error("Error fetching Hevy exercise history", error);
        return [];
    }
};


/**
 * ANALYZES EXERCISE STALLS FOR BENCH PRESS, SQUAT, AND DEADLIFT
 * @param user - The user
 * @returns Array of exercise analysis data with trends and stall detection
 */
export const getExerciseStallsAnalysis = async (user: User): Promise<Array<{
    name: string;
    weight: number;
    color: "green" | "yellow" | "red";
    trend: number[];
    hasStall: boolean;
    sessions: Array<{
        workoutId: string;
        date: string;
        totalVolume: number;
        maxWeight: number;
    }>;
}>> => {
    try {
        if (!user) {
            return getDefaultExerciseStalls();
        }

        const apiKey = await getHevyApiKey(user);
        if (!apiKey) {
            return getDefaultExerciseStalls();
        }

        // Exercise IDs and names
        const exercises = [
            { id: "79D0BB3A", name: "Bench Press (Barbell)" },
            { id: "D04AC939", name: "Squat (Barbell)" },
            { id: "C6272009", name: "Deadlift (Barbell)" },
        ];

        // Calculate date range (2 years back to ensure we get enough data)
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(startDate.getFullYear() - 2);
        const startDateISO = startDate.toISOString();
        const endDateISO = endDate.toISOString();

        const results = await Promise.all(
            exercises.map(async (exercise) => {
                try {
                    const historyResponse = await getHevyExerciseHistory(
                        apiKey,
                        exercise.id,
                        startDateISO,
                        endDateISO,
                    );

                    // Handle case where getHevyExerciseHistory returns empty array or invalid response
                    if (Array.isArray(historyResponse) || !historyResponse || !('exercise_history' in historyResponse) || !historyResponse.exercise_history || historyResponse.exercise_history.length === 0) {
                        return {
                            name: exercise.name,
                            weight: 0,
                            color: "green" as const,
                            trend: Array(15).fill(0),
                            hasStall: false,
                            sessions: [],
                        };
                    }

                    // Filter to only "normal" sets and sort by workout_start_time (most recent first)
                    const normalSets = historyResponse.exercise_history
                        .filter((entry) => entry.set_type === "normal")
                        .filter((entry) => entry.weight_kg !== null && entry.reps !== null)
                        .sort((a, b) => {
                            const dateA = new Date(a.workout_start_time).getTime();
                            const dateB = new Date(b.workout_start_time).getTime();
                            return dateB - dateA; // Most recent first
                        })
                        .slice(0, 15); // Take 15 most recent

                    if (normalSets.length === 0) {
                        return {
                            name: exercise.name,
                            weight: 0,
                            color: "green" as const,
                            trend: Array(15).fill(0),
                            hasStall: false,
                            sessions: [],
                        };
                    }

                    // Group sets by workout to calculate total volume per workout session
                    const workoutVolumes = new Map<string, number>();
                    const workoutWeights = new Map<string, number>();

                    normalSets.forEach((entry) => {
                        const volume = (entry.weight_kg || 0) * (entry.reps || 0);
                        const weightKg = entry.weight_kg || 0;
                        const workoutId = entry.workout_id;

                        // For each workout, sum the volume and track the maximum weight
                        const currentVolume = workoutVolumes.get(workoutId) || 0;
                        const currentWeight = workoutWeights.get(workoutId) || 0;

                        workoutVolumes.set(workoutId, currentVolume + volume);
                        if (weightKg > currentWeight) {
                            workoutWeights.set(workoutId, weightKg);
                        }
                    });

                    // Get unique workouts sorted by date (most recent first)
                    const uniqueWorkoutsWithDates = Array.from(
                        new Set(normalSets.map((entry) => entry.workout_id)),
                    )
                        .map((workoutId) => {
                            const entry = normalSets.find((e) => e.workout_id === workoutId);
                            return {
                                workoutId,
                                date: entry ? new Date(entry.workout_start_time).getTime() : 0,
                                dateString: entry ? entry.workout_start_time : "",
                            };
                        })
                        .sort((a, b) => b.date - a.date)
                        .slice(0, 15);

                    const uniqueWorkouts = uniqueWorkoutsWithDates.map((w) => w.workoutId);

                    // Build sessions array with volume and max weight for each workout
                    const sessions = uniqueWorkoutsWithDates.map((workout) => {
                        const volumeKg = workoutVolumes.get(workout.workoutId) || 0;
                        const volumeLbs = volumeKg * 2.20462;
                        const maxWeightKg = workoutWeights.get(workout.workoutId) || 0;
                        const maxWeightLbs = maxWeightKg * 2.20462;

                        return {
                            workoutId: workout.workoutId,
                            date: workout.dateString,
                            totalVolume: Math.round(volumeLbs),
                            maxWeight: Math.round(maxWeightLbs),
                        };
                    });

                    // Calculate volumes for each workout session (most recent to oldest)
                    const volumes = uniqueWorkouts.map((workoutId) => workoutVolumes.get(workoutId) || 0);

                    // Reverse to get oldest to newest for trend calculation
                    const volumesOldestToNewest = [...volumes].reverse();

                    // Determine color and stall status
                    // If less than 5 sessions, always green (not enough data to determine stall)
                    let color: "green" | "yellow" | "red" = "green";
                    let hasStall = false;

                    // Only apply stall detection if we have 5 or more sessions
                    if (sessions.length >= 5) {
                        // Calculate percentage change from oldest to newest
                        let percentageChange = 0;
                        if (volumesOldestToNewest.length >= 2) {
                            const oldestVolume = volumesOldestToNewest[0];
                            const newestVolume = volumesOldestToNewest[volumesOldestToNewest.length - 1];
                            if (oldestVolume > 0) {
                                percentageChange = ((newestVolume - oldestVolume) / oldestVolume) * 100;
                            }
                        }

                        // Apply stall detection logic
                        if (percentageChange < 1) {
                            color = "red";
                            hasStall = true;
                        } else if (percentageChange < 5) {
                            color = "yellow";
                            hasStall = false;
                        } else {
                            color = "green";
                            hasStall = false;
                        }
                    }
                    // If sessions.length < 5, color and hasStall remain green/false (default values above)

                    // Get current weight (most recent workout's max weight in lbs)
                    const mostRecentWorkoutId = uniqueWorkouts[0];
                    const currentWeightKg = workoutWeights.get(mostRecentWorkoutId) || 0;
                    const currentWeightLbs = currentWeightKg * 2.20462;

                    // Create trend array (pad with zeros if less than 15 entries)
                    const trend = [...volumes];
                    while (trend.length < 15) {
                        trend.unshift(0);
                    }

                    const result = {
                        name: exercise.name,
                        weight: Math.round(currentWeightLbs),
                        color,
                        trend: trend.slice(0, 15),
                        hasStall,
                        sessions,
                    };
                    return result;
                } catch (error: unknown) {
                    console.error(`Error analyzing exercise ${exercise.name}:`, error);
                    return {
                        name: exercise.name,
                        weight: 0,
                        color: "green" as const,
                        trend: Array(15).fill(0),
                        hasStall: false,
                        sessions: [],
                    };
                }
            }),
        );

        return results;
    } catch (error: unknown) {
        console.error("Error fetching exercise stalls analysis", error);
        return getDefaultExerciseStalls();
    }
};

/**
 * RETURNS DEFAULT EXERCISE STALLS DATA WHEN NO DATA IS AVAILABLE
 * @returns Default exercise stalls array
 */
const getDefaultExerciseStalls = (): Array<{
    name: string;
    weight: number;
    color: "green" | "yellow" | "red";
    trend: number[];
    hasStall: boolean;
    sessions: Array<{
        workoutId: string;
        date: string;
        totalVolume: number;
        maxWeight: number;
    }>;
}> => {
    return [
        {
            name: "Bench Press",
            weight: 0,
            color: "green",
            trend: Array(15).fill(0),
            hasStall: false,
            sessions: [],
        },
        {
            name: "Squat",
            weight: 0,
            color: "green",
            trend: Array(15).fill(0),
            hasStall: false,
            sessions: [],
        },
        {
            name: "Deadlift",
            weight: 0,
            color: "green",
            trend: Array(15).fill(0),
            hasStall: false,
            sessions: [],
        },
    ];
};

/**
 * GETS THE NUMBER OF WORKOUTS ON THE HEVY ACCOUNT
 * @param apiKey - The hevy api key
 * @returns The number of workouts
 */
export const getHevyWorkoutCount = async (apiKey: string) => {
    try {
        const response = await defaultFetch<{ workout_count: number }>(`https://api.hevyapp.com/v1/workouts/count`, apiKey);
        if (response) {
            return response.workout_count;
        }
        return 0;
    } catch (error: unknown) {
        console.error("Error fetching Hevy workout count", error);
    }
};

/**
 * GETS THE LAST KNOWN HEVY WORKOUT COUNT FROM THE DATABASE
 * @param user - The user
 * @returns The last known workout count, or null if not found
 */
export const getLastKnownHevyWorkoutCount = async (user: User): Promise<number | null> => {
    try {
        if (user) {
            const { data, error } = await supabase
                .from('hevy_workouts_count')
                .select('last_known_workout_count')
                .eq('user_id', user.id)
                .single();

            if (error) {
                // If no record exists, return null (not an error)
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error("Error fetching last known Hevy workout count", error);
                return null;
            }

            return data?.last_known_workout_count ?? null;
        }
        return null;
    } catch (error: unknown) {
        console.error("Error fetching last known Hevy workout count", error);
        return null;
    }
};

/**
 * UPDATES OR INSERTS THE LAST KNOWN HEVY WORKOUT COUNT
 * @param user - The user
 * @param count - The workout count to store
 * @returns True if successful, false otherwise
 */
export const updateLastKnownHevyWorkoutCount = async (user: User, count: number): Promise<boolean> => {
    try {
        if (user) {
            // Use upsert to insert or update
            const { error } = await supabase
                .from('hevy_workouts_count')
                .upsert({
                    user_id: user.id,
                    last_known_workout_count: count,
                    updated_at: new Date().toISOString(),
                }, {
                    onConflict: 'user_id',
                });

            if (error) {
                console.error("Error updating last known Hevy workout count", error);
                return false;
            }

            return true;
        }
        return false;
    } catch (error: unknown) {
        console.error("Error updating last known Hevy workout count", error);
        return false;
    }
};

/**
 * CALCULATES THE DIFFERENCE BETWEEN CURRENT AND LAST KNOWN HEVY WORKOUT COUNT
 * Updates the database with the current count and returns the difference
 * @param apiKey - The hevy api key
 * @param user - The user
 * @returns The difference (current - last known), or null if error
 */
export const getHevyWorkoutCountDiff = async (apiKey: string, user: User): Promise<{ diff: number; currentCount: number } | null> => {
    try {
        if (!apiKey || !user) {
            return null;
        }

        // Get current count from Hevy API
        const currentCount = await getHevyWorkoutCount(apiKey);
        if (currentCount === undefined || currentCount === null) {
            return null;
        }

        // Get last known count from database
        const lastKnownCount = await getLastKnownHevyWorkoutCount(user);

        // If no last known count exists, set current count as baseline and return 0 diff
        if (lastKnownCount === null) {
            await updateLastKnownHevyWorkoutCount(user, currentCount);
            return { diff: 0, currentCount };
        }

        // Calculate difference
        const diff = currentCount - lastKnownCount;

        // Update database with current count (only if count increased or stayed same)
        if (diff >= 0) {
            await updateLastKnownHevyWorkoutCount(user, currentCount);
        }

        return { diff, currentCount };
    } catch (error: unknown) {
        console.error("Error calculating Hevy workout count diff", error);
        return null;
    }
};






// POST /v1/routine_folders. Create a new routine folder. The folder will be created at index 0, and all other folders will have their indexes incremented.
// https://api.hevyapp.com/docs/#/RoutineFolders/post_v1_routine_folders
/**
 * POSTS A NEW ROUTINE FOLDER TO HEVY
 * @param title - The title of the routine folder
 * @param apiKey - The hevy api key
 * @returns The routine folder
 */
export const postRoutineFolders = async (title: string, apiKey: string) => {
    const body: TRoutineFolderRequest = {
        routine_folder: {
            title,
        },
    };

    const response = await defaultPost<TRoutineFolderResponse, TRoutineFolderRequest>(
        'https://api.hevyapp.com/v1/routine_folders',
        apiKey,
        body,
    );

    return response;
};




/**
 * POSTS A NEW ROUTINE PROGRAM TO HEVY
 * @param routineProgram - The routine program to post
 * @param week - Week number for folder title
 * @param apiKey - The hevy api key
 * @param programTitle - Optional program title
 * @param onProgress - Optional callback for upload progress (uploaded, total, status)
 * @returns The routine program result
 */
export const postRoutineProgramToHevyOneFolder = async (
    routineProgram: THevyRoutine[],
    week: number,
    apiKey: string,
    programTitle: TProgramTitle[] | undefined,
    onProgress?: HevyUploadProgressCallback,
) => {
    const total = routineProgram.length;
    const folderTitle = `Week ${week} - ${programTitle?.[0]?.title ?? "Proxima Program"}`;

    try {
        for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
            try {
                await postRoutineFolders(folderTitle, apiKey);
                break;
            } catch (error: unknown) {
                if (retry >= RATE_LIMIT_MAX_RETRIES) {
                    return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                }
                console.warn("Rate limited on postRoutineFolders. Retrying...", error);
                await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
            }
        }

        let pageOneRoutineFolders: THevyRoutineFolderResponse | undefined;
        for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
            try {
                pageOneRoutineFolders = await getRoutineFolders(apiKey, 1);
                break;
            } catch (error: unknown) {
                if (retry >= RATE_LIMIT_MAX_RETRIES) {
                    return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                }
                console.warn("Rate limited on getRoutineFolders. Retrying...", error);
                await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
            }
        }

        const folderId = pageOneRoutineFolders?.routine_folders.find((folder) => folder.title === folderTitle);
        if (!folderId) {
            console.error("Could not find routine folder after create");
            return { success: false, data: new Error("Routine folder not found") };
        }

        for (let batchStart = 0; batchStart < routineProgram.length; batchStart += ROUTINES_BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + ROUTINES_BATCH_SIZE, routineProgram.length);
            for (let i = batchStart; i < batchEnd; i++) {
                for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
                    try {
                        onProgress?.(i + 1, total, 'uploading');
                        await postRoutines(convertHevyOutputIntoInput(routineProgram[i], folderId.id), apiKey);
                        break;
                    } catch (error: unknown) {
                        if (retry >= RATE_LIMIT_MAX_RETRIES) {
                            return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                        }
                        console.warn(`Rate limited at index ${i}. Retrying...`, error);
                        await delayWithRateLimitCountdown(i + 1, total, onProgress, 60 * Math.pow(2, retry));
                    }
                }
            }
            if (batchEnd < routineProgram.length) {
                await delayWithRateLimitCountdown(batchEnd, total, onProgress);
            }
        }

        return { success: true, data: [] };
    } catch (error: unknown) {
        console.error("Error saving Routine program to Hevy", error);
        return { success: false, data: error };
    }
};

/**
 * DEPRECATED: This function is no longer used.
 * POSTS A NEW ROUTINE PROGRAM TO HEVY (multi-folder: one folder per week)
 * @param routineProgram - The routine program to post
 * @param apiKey - The hevy api key
 * @param onProgress - Optional callback for upload progress (uploaded, total, status)
 * @returns The routine program result
 */
export const postRoutineProgramToHevy = async (
    routineProgram: THevyRoutine[],
    apiKey: string,
    onProgress?: HevyUploadProgressCallback,
) => {
    const total = routineProgram.length;

    try {
        const weeks = Array.from(
            new Set(
                routineProgram
                    .map((p) => p.folder_id)
                    .filter((week): week is number => typeof week === 'number'),
            ),
        );

        for (let i = 0; i < weeks.length; i++) {
            for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
                try {
                    await postRoutineFolders(`Week ${weeks[i] + 1}`, apiKey);
                    break;
                } catch (error: unknown) {
                    if (retry >= RATE_LIMIT_MAX_RETRIES) {
                        return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                    }
                    console.warn(`Rate limited at week ${weeks[i]}. Retrying...`, error);
                    await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
                }
            }
        }

        let routineFolders: THevyRoutineFolderResponse | undefined;
        for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
            try {
                routineFolders = await getRoutineFolders(apiKey, 1);
                break;
            } catch (error: unknown) {
                if (retry >= RATE_LIMIT_MAX_RETRIES) {
                    return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                }
                console.warn("Rate limited on getRoutineFolders. Retrying...", error);
                await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
            }
        }

        if (weeks.length > 10 && routineFolders?.routine_folders) {
            for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
                try {
                    const pageTwo = await getRoutineFolders(apiKey, 2);
                    if (pageTwo?.routine_folders?.length) {
                        routineFolders.routine_folders.push(...pageTwo.routine_folders);
                    }
                    break;
                } catch (error: unknown) {
                    if (retry >= RATE_LIMIT_MAX_RETRIES) {
                        return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                    }
                    console.warn("Rate limited on getRoutineFolders page 2. Retrying...", error);
                    await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
                }
            }
        }

        for (let batchStart = 0; batchStart < routineProgram.length; batchStart += ROUTINES_BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + ROUTINES_BATCH_SIZE, routineProgram.length);
            for (let j = batchStart; j < batchEnd; j++) {
                const folderId = routineFolders?.routine_folders.find(
                    (folder) => folder.title === `Week ${Number(routineProgram[j].folder_id) + 1}`,
                );
                if (!folderId) continue;
                for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
                    try {
                        onProgress?.(j + 1, total, 'uploading');
                        await postRoutines(convertHevyOutputIntoInput(routineProgram[j], folderId.id), apiKey);
                        break;
                    } catch (error: unknown) {
                        if (retry >= RATE_LIMIT_MAX_RETRIES) {
                            return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                        }
                        console.warn(`Rate limited at index ${j}. Retrying...`, error);
                        await delayWithRateLimitCountdown(j + 1, total, onProgress, 60 * Math.pow(2, retry));
                    }
                }
            }
            if (batchEnd < routineProgram.length) {
                await delayWithRateLimitCountdown(batchEnd, total, onProgress);
            }
        }
        return { success: true, data: [] };
    } catch (error: unknown) {
        console.error("Error saving Routine program to Hevy", error);
        return { success: false, data: error };
    }
};
