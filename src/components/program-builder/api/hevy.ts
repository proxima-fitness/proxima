// File for endpoints to the Hevy App Public API
import { v4 as uuidv4 } from "uuid";
import { validate as validateUuid } from "uuid";
import { getMaxFolderId } from "@/components/program-builder/utils";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/api/index";
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

/** One exercise omitted from the saved program (e.g. not found in library). Caller should show a warning toast. */
export type SkippedExercise = { exerciseName: string; reason: string };

/** Success shape returned by postHevyRoutineProgram when the program is saved. */
export type PostHevyRoutineProgramSuccess = {
    status: "success";
    id: number;
    /** Exercises that were omitted; UI should show a warning toast per item. */
    skippedExercises?: SkippedExercise[];
};

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
            program_id: newProgramId,
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

        // STEP 3: Load exercise template lookup (valid IDs + title/normalized_title -> id for fallback)
        const { data: exerciseTemplates, error: templatesError } = await supabase
            .from('hevy_exercise_templates')
            .select('id, title, normalized_title');
        if (templatesError) {
            console.error('Error fetching hevy_exercise_templates:', templatesError);
            return templatesError;
        }
        const templates = exerciseTemplates ?? [];
        const validExerciseIds = new Set(templates.map((t) => t.id));
        const titleToId = new Map<string, string>();
        for (const t of templates) {
            const keyTitle = (t.title ?? '').trim().toLowerCase();
            const keyNorm = (t.normalized_title ?? '').trim().toLowerCase();
            if (keyTitle && !titleToId.has(keyTitle)) titleToId.set(keyTitle, t.id);
            if (keyNorm && !titleToId.has(keyNorm)) titleToId.set(keyNorm, t.id);
        }

        const skippedExercises: SkippedExercise[] = [];
        const OMIT_REASON = "Exercise not found in library and will be omitted from your saved program.";

        // STEP 4: Process exercises and build insert rows (resolve exercise_id by ID then by title; sanitize UUIDs)
        const allWorkoutUploads: { [key: string]: unknown }[] = [];

        for (let i = 0; i < hevyRoutines.length; i += BATCH_SIZE) {
            const routineBatch = hevyRoutines.slice(i, i + BATCH_SIZE);

            for (const routine of routineBatch) {
                const schedule = scheduleUploads[i + routineBatch.indexOf(routine)];
                if (!schedule) continue;

                const scheduleId = schedule.id;
                const scheduleIdValid =
                    typeof scheduleId === "string" &&
                    scheduleId !== "null" &&
                    validateUuid(scheduleId);
                if (!scheduleIdValid) {
                    console.warn('Invalid schedule_id skipped (invalid UUID or "null" string):', scheduleId);
                    continue;
                }

                for (const exercise of routine.exercises ?? []) {
                    const rawId = exercise.exercise_template_id;
                    const title = (exercise.title ?? '').trim();
                    const isEmptyOrNullId =
                        rawId == null ||
                        (typeof rawId === "string" && (rawId === "" || rawId === "null"));

                    let exerciseId: string | null = null;
                    if (!isEmptyOrNullId && typeof rawId === "string" && validExerciseIds.has(rawId)) {
                        exerciseId = rawId;
                    } else if (title) {
                        const lookupKey = title.toLowerCase();
                        exerciseId = titleToId.get(lookupKey) ?? null;
                    }

                    if (!exerciseId) {
                        skippedExercises.push({
                            exerciseName: title || rawId || "Unknown exercise",
                            reason: OMIT_REASON,
                        });
                        if (title || rawId) {
                            console.warn('Exercise omitted from saved program:', { title, rawId });
                        }
                        continue;
                    }

                    const reps = exercise.sets?.map((set) => set.reps) ?? null;
                    const timeTaken = exercise.sets?.map((set) => set.duration_seconds) ?? null;
                    const weights = exercise.sets?.map((set) => set.weight_kg) ?? null;
                    const rpe = exercise.sets?.map((set) => set.rpe) ?? null;

                    allWorkoutUploads.push({
                        schedule_id: scheduleId,
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
                    });
                }
            }
        }

        // STEP 5: Insert workouts in batches
        for (let i = 0; i < allWorkoutUploads.length; i += BATCH_SIZE) {
            const batch = allWorkoutUploads.slice(i, i + BATCH_SIZE);
            if (batch.length > 0) {
                const { error: workoutError } = await supabase.from('program_workout_exercises').insert(batch);
                if (workoutError) {
                    console.error('Error inserting program workout exercises batch:', {
                        code: workoutError.code,
                        message: workoutError.message,
                        details: workoutError.details,
                        fullError: workoutError,
                    });
                    return workoutError;
                }
            }
        }

        return {
            status: "success",
            id: newProgramId,
            ...(skippedExercises.length > 0 ? { skippedExercises } : {}),
        };
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
 * GET EXERCISE HISTORY FOR A SPECIFIC EXERCISE TEMPLATE (HEVY API)
 * @param apiKey - The Hevy API key
 * @param exerciseTemplateId - The exercise template ID
 * @param start_date - Optional start date (ISO 8601)
 * @param end_date - Optional end date (ISO 8601)
 * @returns Exercise history entries for that template
 */
export const getHevyExerciseHistory = async (
    apiKey: string,
    exerciseTemplateId: string,
    start_date?: string,
    end_date?: string,
): Promise<THevyExerciseHistory> => {
    const params = new URLSearchParams();
    if (start_date) params.set("start_date", start_date);
    if (end_date) params.set("end_date", end_date);
    const query = params.toString();
    const url = `https://api.hevyapp.com/v1/exercise_history/${encodeURIComponent(exerciseTemplateId)}${query ? `?${query}` : ""}`;
    const response = await defaultFetch<THevyExerciseHistory>(url, apiKey);
    return response ?? { exercise_history: [] };
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
// export const updateLastKnownHevyWorkoutCount = async (user: User, count: number): Promise<boolean> => {
//     try {
//         if (user) {
//             // Use upsert to insert or update
//             const { error } = await supabase
//                 .from('hevy_workouts_count')
//                 .upsert({
//                     user_id: user.id,
//                     last_known_workout_count: count,
//                     updated_at: new Date().toISOString(),
//                 }, {
//                     onConflict: 'user_id',
//                 });

//             if (error) {
//                 console.error("Error updating last known Hevy workout count", error);
//                 return false;
//             }

//             return true;
//         }
//         return false;
//     } catch (error: unknown) {
//         console.error("Error updating last known Hevy workout count", error);
//         return false;
//     }
// };

/**
 * CALCULATES THE DIFFERENCE BETWEEN CURRENT AND LAST KNOWN HEVY WORKOUT COUNT
 * Updates the database with the current count and returns the difference
 * @param apiKey - The hevy api key
 * @param user - The user
 * @returns The difference (current - last known), or null if error
 */
// export const getHevyWorkoutCountDiff = async (apiKey: string, user: User): Promise<{ diff: number; currentCount: number } | null> => {
//     try {
//         if (!apiKey || !user) {
//             return null;
//         }

//         // Get current count from Hevy API
//         const currentCount = await getHevyWorkoutCount(apiKey);
//         if (currentCount === undefined || currentCount === null) {
//             return null;
//         }

//         // Get last known count from database
//         const lastKnownCount = await getLastKnownHevyWorkoutCount(user);

//         // If no last known count exists, set current count as baseline and return 0 diff
//         if (lastKnownCount === null) {
//             await updateLastKnownHevyWorkoutCount(user, currentCount);
//             return { diff: 0, currentCount };
//         }

//         // Calculate difference
//         const diff = currentCount - lastKnownCount;

//         // Update database with current count (only if count increased or stayed same)
//         if (diff >= 0) {
//             await updateLastKnownHevyWorkoutCount(user, currentCount);
//         }

//         return { diff, currentCount };
//     } catch (error: unknown) {
//         console.error("Error calculating Hevy workout count diff", error);
//         return null;
//     }
// };






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

/**
 * FETCHES RECENTLY COMPLETED WORKOUTS FROM THE HEVY API
 * @param hevyApiKey - The Hevy API key
 * @param pageSize - The number of workouts to fetch (default: 1)
 * @returns The recently completed workouts
 */
export async function getRecentlyCompletedWorkouts(hevyApiKey: string, pageSize: number = 1): Promise<THevyWorkoutsResponse> {
    // only can handle max 10 workouts completed in a day (probably fine)
    const hevyApiUrlWorkouts = `https://api.hevyapp.com/v1/workouts?page=1&pageSize=${pageSize}`;
    const hevyResponseWorkouts = await fetch(hevyApiUrlWorkouts, {
        method: "GET",
        headers: {
            "accept": "application/json",
            "api-key": hevyApiKey,
        },
    });


    if (!hevyResponseWorkouts.ok) {
        console.error(`Hevy API error: ${hevyResponseWorkouts.status} ${hevyResponseWorkouts.statusText}`);
    }

    const recentlyCompletedWorkouts: THevyWorkoutsResponse = await hevyResponseWorkouts.json();

    return recentlyCompletedWorkouts;

}


/**
 * FETCHES THE ROUTINE FROM THE HEVY API
 * @param hevyApiKey - The Hevy API key
 * @param routine_id - The routine ID to fetch the routine for
 * @returns The routine
 */
export async function getRoutine(hevyApiKey: string, routine_id: string): Promise<TRoutineResponse> {
    const routineResponse = await fetch(`https://api.hevyapp.com/v1/routines/${routine_id}`, {
        method: "GET",
        headers: {
            "accept": "application/json",
            "api-key": hevyApiKey,
        },
    });

    if (!routineResponse.ok) {
        console.error(`Hevy API error: ${routineResponse.status} ${routineResponse.statusText}`);
    }

    const routine: TRoutineResponse = await routineResponse.json();

    return routine;

}


/**
 * FETCHES THE ROUTINE FOLDER FROM THE HEVY API
 * @param hevyApiKey - The Hevy API key
 * @param folder_id - The folder ID to fetch the routine folder for
 * @returns The routine folder
 */
export async function getRoutineFolder(hevyApiKey: string, folder_id: number | null): Promise<TRoutineFolderResponse> {
    if (!folder_id) {
        console.error(`No folder_id found`);
    }

    const folderResponse = await fetch(`https://api.hevyapp.com/v1/routine_folders/${folder_id}`, {
        method: "GET",
        headers: {
            "accept": "application/json",
            "api-key": hevyApiKey,
        },
    });

    if (!folderResponse.ok) {
        console.error(`Hevy API error: ${folderResponse.status} ${folderResponse.statusText}`);
    }

    const folder: TRoutineFolderResponse = await folderResponse.json();

    return folder;

}

/**
 * CALLS GET /v1/routines FOR ALL ROUTINES AND RETURNS ONLY THOSE WITH folder_id = folder_id
 * Excludes the current routine if excludeRoutineId is provided
 * @param hevyApiKey - The Hevy API key
 * @param folder_id - The folder ID to filter routines by
 * @param excludeRoutineId - Optional routine ID to exclude from results
 * @returns Array of routines with id and title that match the folder_id (excluding the current routine if provided)
 */
export async function getRoutinesInFolder(hevyApiKey: string, folder_id: number): Promise<Array<{ id: string; title: string }>> {
    const routines: Array<{ id: string; title: string }> = [];
    let page = 1;
    let hasMore = true;

    // Fetch all routines page by page
    while (hasMore) {
        try {
            const response = await defaultFetch<{
                page: number;
                page_count: number;
                routines: Array<{ id: string; title: string; folder_id: number | null }>;
            }>(`https://api.hevyapp.com/v1/routines?page=${page}&pageSize=10`, hevyApiKey);

            if (!response || !response.routines) {
                hasMore = false;
                break;
            }

            // Filter routines by folder_id and exclude the current routine if provided
            const filteredRoutines = response.routines
                .filter(routine => routine.folder_id === folder_id)
                .map(routine => ({ id: routine.id, title: routine.title }));

            routines.push(...filteredRoutines);

            // Check if there are more pages
            hasMore = page < (response.page_count || 1);
            page++;
        } catch (error) {
            console.error(`Error fetching routines page ${page}:`, error);
            hasMore = false;
        }
    }

    return routines;
}

/**
 * FINDS A ROUTINE BY DAY NUMBER FROM AN ARRAY OF ROUTINES
 * Matches routine title pattern like "1 - Day 1" or "1 - {day_title}"
 * @param routines - Array of routines with id and title
 * @param nthDay - The day number to find
 * @returns The routine ID if found, null otherwise
 */
export function findRoutineByDay(
    routines: Array<{ id: string; title: string }>,
    nthDay: number,
): string | null {
    for (const routine of routines) {
        // Match pattern like "1 - Day 1" or "1 - {day_title}"
        const pattern = new RegExp(`^${nthDay}\\s*-\\s*(.+)$`);
        const match = routine.title.match(pattern);

        if (match) {
          return routine.id;
        }
    }

    return null;
}


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



// export async function uploadNewWeek(hevyApiKey: string, program_id: string, week_number: number, programTitle: string): Promise<void> {
//     const { data: scheduleWorkouts, error: scheduleWorkoutsError } = await supabase
//         .from('schedule_workouts')
//         .select(`
//             nthDay,
//             nthWeek,
//             day_title,
//             program_workout_exercises (
//                 reps,
//                 reps_max,
//                 reps_range,
//                 time_taken,
//                 time_range,
//                 amrap,
//                 rpe,
//                 rpe_range,
//                 percent_rm,
//                 weights,
//                 hevy_exercise_templates (
//                     id,
//                     title,
//                     type,
//                     primary_muscle_group,
//                     secondary_muscle_groups,
//                     is_custom,
//                     equipment,
//                     normalized_title,
//                     gif_id,
//                     instructions
//                 )
//             )
//         `)
//         .eq('program_id', program_id)
//         .order('nthWeek', { ascending: true })
//         .order('nthDay', { ascending: true });

//     if (scheduleWorkoutsError) {
//         console.error('Failed to retrieve schedule workouts:', scheduleWorkoutsError.message);
//         throw new HttpError(`Failed to retrieve schedule workouts: ${scheduleWorkoutsError.message}`, 500);
//     }

//     if (!scheduleWorkouts || scheduleWorkouts.length === 0) {
//         throw new HttpError(`No schedule workouts found for program_id: ${program_id}, week_number: ${week_number}`, 404);
//     }

//     // Sort workouts by week and day
//     const sortedWorkoutsByWeek = sortWorkouts(scheduleWorkouts);

//     // Convert all workouts to Hevy routines
//     const allHevyRoutines = await convertToHevyRoutine(sortedWorkoutsByWeek);

//     // Filter for the specific week (folder_id is 0-indexed, week_number is 1-indexed)
//     // So week_number 1 = folder_id 0, week_number 2 = folder_id 1, etc.
//     const weekHevyRoutines = allHevyRoutines.filter((routine) => routine.folder_id === week_number - 1);

//     if (weekHevyRoutines.length === 0) {
//         throw new HttpError(`No routines found for week_number: ${week_number}`, 404);
//     }

//     // 6. Upload to Hevy
//     await postRoutineProgramToHevyOneFolder(weekHevyRoutines, week_number, hevyApiKey, [{ id: program_id, title: programTitle }]);
// }



// PUT /v1/routines/{routineId}. Update an existing routine
// https://api.hevyapp.com/docs/#/Routines/put_v1_routines__routineId_
/**
 * UPDATES AN EXISTING ROUTINE IN HEVY
 * @param routineId - The routine ID to update
 * @param updateRoutine - The routine data to update
 * @param apiKey - The hevy api key
 * @returns The updated routine
 */
// export const putRoutine = async (routineId: string, updateRoutine: THevyRoutineRequest, apiKey: string) => {
//     const body: THevyRoutineRequestObject = {
//         routine: updateRoutine,
//     };

//     const response = await defaultPut<THevyRoutineRequest, THevyRoutineRequestObject>(
//         `https://api.hevyapp.com/v1/routines/${routineId}`,
//         apiKey,
//         body,
//     );

//     return response;
// };

/**
 * APPENDS "  ✅" TO THE ROUTINE TITLE OF A COMPLETED ROUTINE
 * @param routineId - The routine ID to update
 * @param currentTitle - The current routine title
 * @param apiKey - The hevy api key
 * @param routine - The full routine object (needed to preserve other fields when updating)
 * @returns The updated routine
 */
// export const appendCheckmarkToRoutineTitle = async (
//     routineId: string,
//     currentTitle: string,
//     apiKey: string,
//     routine: TRoutineResponse
// ): Promise<void> => {
//     // Check if the title already has the checkmark
//     if (currentTitle.endsWith('  ✅')) {
//         console.log(`Routine ${routineId} already has checkmark in title. Skipping update.`);
//         return;
//     }

//     // Append the checkmark to the title
//     const updatedTitle = `${currentTitle}  ✅`;

//     // Prepare the update payload matching the API structure
//     // Structure: { routine: { title, notes, exercises: [{ exercise_template_id, superset_id, rest_seconds, notes, sets: [{ type, weight_kg, reps, distance_meters, duration_seconds, custom_metric, rep_range? }] }] } }
//     // Note: folder_id is NOT included in PUT request body per API documentation
//     // Note: notes cannot be empty string - API requires non-empty value
//     const routineNotes = (routine.routine as any).notes;
//     const updatePayload: THevyRoutineRequest = {
//         title: updatedTitle,
//         notes: routineNotes && routineNotes.trim().length > 0 ? routineNotes : ' ',
//         exercises: routine.routine.exercises.map((exercise) => ({
//             exercise_template_id: exercise.exercise_template_id,
//             superset_id: exercise.supersets_id,
//             rest_seconds: Number(exercise.rest_seconds) || 90,
//             notes: exercise.notes || '',
//             sets: exercise.sets.map((set) => {
//                 const setPayload: any = {
//                     type: set.type || 'normal',
//                     weight_kg: set.weight_kg,
//                     reps: set.reps,
//                     distance_meters: set.distance_meters,
//                     duration_seconds: set.duration_seconds,
//                     custom_metric: set.custom_metric,
//                 };
//                 // Include rep_range if it exists (API accepts it in request body even though not in type)
//                 if (set.rep_range) {
//                     setPayload.rep_range = set.rep_range;
//                 }
//                 return setPayload;
//             }),
//         })),
//     };

//     try {
//         await putRoutine(routineId, updatePayload, apiKey);
//         console.log(`Successfully appended checkmark to routine ${routineId} title: "${updatedTitle}"`);
//     } catch (error) {
//         console.error(`Failed to update routine ${routineId} title:`, error);
//         throw error;
//     }
// };




/**
 * Type for tracking which exercises progressed and their types
 */
export type ProgressedExercise = {
    exercise_template_id: string;
    exercise_name: string;
    exerciseType: string;
    completed_value: number; // The value the user completed (e.g., 12 reps)
    completed_unit: string; // The unit (reps, kg, meters, seconds, etc.)
    progression_amount: number; // The amount being added (e.g., +2, +2.5)
    progression_unit: string; // The unit for progression (reps, kg, meters, seconds, etc.)
};

/**
 * GETS PROGRESSION METADATA FOR AN EXERCISE TYPE
 * @param exerciseType - The type of exercise (weight_reps, distance_duration, etc.)
 * @returns Object with progression amount, unit, and field to update
 */
// const getProgressionMetadata = (exerciseType: string): {
//     progressionAmount: number;
//     progressionUnit: string;
//     completedUnit: string;
//     fieldToUpdate: 'weight_kg' | 'reps' | 'distance_meters' | 'duration_seconds' | 'custom_metric' | null;
// } => {
//     switch (exerciseType) {
//         case 'weight_reps':
//             return { progressionAmount: 2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
//         case 'distance_duration':
//             return { progressionAmount: 0.25, progressionUnit: 'km', completedUnit: 'km', fieldToUpdate: 'distance_meters' };
//         case 'reps_only':
//             return { progressionAmount: 2, progressionUnit: 'reps', completedUnit: 'reps', fieldToUpdate: 'reps' };
//         case 'duration':
//             return { progressionAmount: 30, progressionUnit: 'seconds', completedUnit: 'seconds', fieldToUpdate: 'duration_seconds' };
//         case 'bodyweight_weighted':
//             return { progressionAmount: 2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
//         case 'bodyweight_assisted':
//             return { progressionAmount: -2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
//         case 'short_distance_weight':
//             return { progressionAmount: 2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
//         case 'floors_duration':
//             return { progressionAmount: 100, progressionUnit: 'floors', completedUnit: 'floors', fieldToUpdate: 'custom_metric' };
//         case 'steps_duration':
//             return { progressionAmount: 100, progressionUnit: 'steps', completedUnit: 'steps', fieldToUpdate: 'custom_metric' };
//         default:
//             return { progressionAmount: 0, progressionUnit: '', completedUnit: '', fieldToUpdate: null };
//     }
// };

/**
 * APPLIES DOUBLE PROGRESSION TO A SINGLE SET BASED ON EXERCISE TYPE
 * @param exerciseType - The type of exercise (weight_reps, distance_duration, etc.)
 * @param routineSet - The routine set to apply progression to (modified in place)
 * @param exerciseTemplateId - The exercise template ID (for logging)
 */
// const applyProgressionToSet = (
//     exerciseType: string,
//     routineSet: TRoutineSet,
//     exerciseTemplateId: string
// ): void => {
//     let progressionAmount = 0;
//     let currentValue = 0;
//     let useFloor = false;
//     let conversionFactor = 1;
//     let fieldToUpdate: 'weight_kg' | 'reps' | 'distance_meters' | 'duration_seconds' | 'custom_metric' | null = null;

//     switch (exerciseType) {
//         case 'weight_reps':
//             progressionAmount = 2.5; // +2.5kg
//             currentValue = routineSet.weight_kg ?? 0;
//             fieldToUpdate = 'weight_kg';
//             break;

//         case 'distance_duration':
//             progressionAmount = 0.25; // +0.25km = +250m
//             currentValue = routineSet.distance_meters ?? 0;
//             conversionFactor = 1000; // Convert km to meters
//             fieldToUpdate = 'distance_meters';
//             break;

//         case 'reps_only':
//             progressionAmount = 2; // +2 reps
//             currentValue = routineSet.reps ?? 0;
//             useFloor = true; // Use floor for integer values
//             fieldToUpdate = 'reps';
//             break;

//         case 'duration':
//             progressionAmount = 30; // +30 seconds
//             currentValue = routineSet.duration_seconds ?? 0;
//             fieldToUpdate = 'duration_seconds';
//             break;

//         case 'bodyweight_weighted':
//             progressionAmount = 2.5; // +2.5kg
//             currentValue = routineSet.weight_kg ?? 0;
//             fieldToUpdate = 'weight_kg';
//             break;

//         case 'bodyweight_assisted':
//             progressionAmount = -2.5; // -2.5kg (reducing assistance)
//             currentValue = routineSet.weight_kg ?? 0;
//             let newValue = currentValue + progressionAmount;

//             // Gut check: ensure we don't go negative or make too large a jump
//             if (newValue < 0) {
//                 newValue = 0;
//             } else if (currentValue > 0 && newValue < currentValue * 0.8) {
//                 // If reducing by more than 20%, limit the reduction
//                 newValue = currentValue * 0.8;
//             }
//             routineSet.weight_kg = newValue;
//             return; // Early return for special case

//         case 'short_distance_weight':
//             progressionAmount = 2.5; // +2.5kg
//             currentValue = routineSet.weight_kg ?? 0;
//             fieldToUpdate = 'weight_kg';
//             break;

//         case 'floors_duration':
//             progressionAmount = 100; // +100 floors
//             currentValue = routineSet.custom_metric ?? 0;
//             fieldToUpdate = 'custom_metric';
//             break;

//         case 'steps_duration':
//             progressionAmount = 100; // +100 steps
//             currentValue = routineSet.custom_metric ?? 0;
//             fieldToUpdate = 'custom_metric';
//             break;

//         default:
//             console.warn(`Unknown exercise type: ${exerciseType} for exercise ${exerciseTemplateId}`);
//             return;
//     }

//     // Apply gut check once after switch statement
//     const adjustedProgression = progressionAmount * conversionFactor;
//     let newValue = currentValue + adjustedProgression;

//     // Gut check: if (current_value + jump) > current_value * 1.2, half the jump
//     if (newValue > currentValue * 1.2) {
//         const halvedProgression = useFloor
//             ? Math.floor(progressionAmount / 2)
//             : progressionAmount / 2;
//         newValue = currentValue + (halvedProgression * conversionFactor);
//     }

//     // Update the appropriate field
//     if (fieldToUpdate) {
//         (routineSet as any)[fieldToUpdate] = newValue;
//     }
// };

/**
 * APPLIES DOUBLE PROGRESSION FOR A COMPLETED EXERCISE
 * Applies progressions to incomplete routines in the current week (or next week if current week is complete)
 * @param workout - The completed workout
 * @param routine - The routine of the completed workout
 * @param program_id - The program ID
 * @param programHistoryId - The program history ID
 * @param user_id - The user ID
 * @param weekNumber - The week number
 * @param nthDay - The day number
 * @param hevyApiKey - The hevy api key
 *
 * @returns An array of ProgressedExercise objects
 */
// export const doubleProgression = async (
//     workout: THevyWorkouts,
//     routine: TRoutineResponse,
//     program_id: string,
//     programHistoryId: string,
//     user_id: string,
//     weekNumber: number,
//     nthDay: number,
//     hevyApiKey: string,
//     hevyExercises: THevyExerciseTemplate[],
//     folder_id: number | null): Promise<ProgressedExercise[]> => {

//     // An Exercise type can be one of the following options:
//     // 1. weight_reps (e.g. Squat (Barbell)),
//     // 2. distance_duration (Sled Push),
//     // 3. reps_only (e.g. Kipping Pullup),
//     // 4. duration (e.g. Boxing) ,
//     // 5. bodyweight_weighted (e.g. Decline Crunch (Weighted)),
//     // 6. bodyweight_assisted (e.g. Pull Up (Band)),
//     // 7. short_distance_weight (e.g. Walking lunge dumbbell),
//     // 8. floors_duration (Stair Machine Floors),
//     // 9. steps_duration (Stair Machine Steps)
//     // For each option it will have a different progression increement amount.
//     // 1. weight_reps: +2.5kg
//     // 2. distance_duration: +0.25km
//     // 3. reps_only: +2 reps
//     // 4. duration: +30 s
//     // 5. bodyweight_weighted: +2.5kg
//     // 6. bodyweight_assisted: -2.5kg
//     // 7. short_distance_weight: +2.5kg
//     // 8. floors_duration: +100 floors
//     // 9. steps_duration: +100 steps

//     // We also want to gut check that we're not making a massive leap in difficulty
//     // for example we can apply a rule such as if (current_weight + jump) > current_weight * 1.2 then we half the jump amount.
//     // This prevents the algo from making a massive leap in difficulty. E.g. adding 2.5kg to a 10kg exercise would be too much of a jump.

//     // Track which exercises progressed and their types
//     const progressedExercises: ProgressedExercise[] = [];

//     for (const exercise of workout.exercises) {
//         // Find the matching exercise in the routine by exercise_template_id
//         const routineExercise = routine.routine.exercises.find(
//             (rEx) => rEx.exercise_template_id === exercise.exercise_template_id
//         );

//         if (!routineExercise) continue;

//         // Fetch exercise template to get the exercise type
//         const exerciseTemplate = hevyExercises.find(ex => ex.id === exercise.exercise_template_id);
//         if (!exerciseTemplate) {
//             console.warn(`Could not fetch exercise template for ${exercise.exercise_template_id}`);
//             continue;
//         }

//         const exerciseType = exerciseTemplate.type;
//         const progressionMetadata = getProgressionMetadata(exerciseType);

//         // Compare sets: check if all workout sets have reps >= routine target reps
//         // Also capture what the user completed
//         let allSetsProgressed = true;
//         let completedValue: number | null = null;
//         let completedUnit = progressionMetadata.completedUnit;

//         // For most exercises, we check if reps >= target reps
//         // For distance_duration, we check if duration >= target duration
//         // For duration, we check if duration >= target duration
//         if (exerciseType === 'distance_duration') {
//             // For distance exercises, check duration and capture distance
//             allSetsProgressed = exercise.sets.every((workoutSet, index) => {
//                 const routineSet = routineExercise.sets[index];
//                 if (!routineSet) return false;

//                 const routineTargetDuration = routineSet.duration_seconds ?? 0;
//                 const workoutDuration = workoutSet.duration_seconds ?? 0;

//                 // Capture the distance from the first set
//                 if (index === 0 && workoutSet.distance_meters !== null && workoutSet.distance_meters !== undefined) {
//                     completedValue = workoutSet.distance_meters / 1000; // Convert to km
//                 }

//                 return workoutDuration >= routineTargetDuration;
//             });
//         } else if (exerciseType === 'duration') {
//             // For duration exercises, capture the target duration
//             allSetsProgressed = exercise.sets.every((workoutSet, index) => {
//                 const routineSet = routineExercise.sets[index];
//                 if (!routineSet) return false;

//                 const routineTargetDuration = routineSet.duration_seconds ?? 0;
//                 const workoutDuration = workoutSet.duration_seconds ?? 0;

//                 // Capture the target duration from the first set
//                 if (index === 0) {
//                     completedValue = routineTargetDuration;
//                 }

//                 return workoutDuration >= routineTargetDuration;
//             });
//         } else {
//             // For reps-based exercises (weight_reps, reps_only, etc.), check reps and capture target reps
//             allSetsProgressed = exercise.sets.every((workoutSet, index) => {
//                 const routineSet = routineExercise.sets[index];
//                 if (!routineSet) return false;

//                 // Get target reps from routine (rep_range end, or default to 12 for 8-12 range if not set)
//                 const routineTargetReps = routineSet.rep_range?.end ?? 12;
//                 const workoutReps = workoutSet.reps ?? 0;

//                 // Capture the target reps from the first set (what they needed to complete)
//                 if (index === 0) {
//                     completedValue = routineTargetReps;
//                     completedUnit = 'reps';
//                 }

//                 return workoutReps >= routineTargetReps;
//             });
//         }

//         if (allSetsProgressed && completedValue !== null) {

//             progressedExercises.push({
//                 exercise_template_id: exercise.exercise_template_id,
//                 exercise_name: exerciseTemplate.title,
//                 exerciseType,
//                 completed_value: completedValue,
//                 completed_unit: completedUnit,
//                 progression_amount: progressionMetadata.progressionAmount,
//                 progression_unit: progressionMetadata.progressionUnit
//             });

//             console.log(`Progression detected for exercise ${exercise.exercise_template_id} ${exercise.title} (${exerciseType})`);
//         }
//     }

//     if (progressedExercises.length === 0) {
//         console.log('No progressions detected, skipping update');
//         return progressedExercises;
//     }
//     if (folder_id === null) {
//         console.warn('No folder_id provided, cannot apply progressions');
//         return progressedExercises;
//     }

//     // Get incomplete days for the current week
//     const incompleteDays = await getIncompleteDaysForWeek(user_id, programHistoryId, weekNumber, program_id);

//     if (incompleteDays.length === 0) {
//         console.log(`No incomplete days found for week ${weekNumber}, skipping progression updates`);
//         return progressedExercises;
//     }

//     // Get all routines in the current week's folder
//     const routinesInFolder = await getRoutinesInFolder(hevyApiKey, folder_id);

//     if (routinesInFolder.length === 0) {
//         console.log(`No routines found in folder ${folder_id} for week ${weekNumber}`);
//         return progressedExercises;
//     }

//     // For each incomplete day, find and update the routine
//     for (const incompleteDay of incompleteDays) {
//         const routineId = findRoutineByDay(routinesInFolder, incompleteDay.nthDay);

//         if (!routineId) {
//             console.warn(`Could not find routine for day ${incompleteDay.nthDay} in week ${weekNumber}`);
//             continue;
//         }

//         try {
//             // Fetch the full routine
//             const targetRoutine = await getRoutine(hevyApiKey, routineId);

//             // Track if any progressions were applied to this routine
//             let routineUpdated = false;

//             // Create a copy of the routine exercises to modify
//             const updatedExercises = targetRoutine.routine.exercises.map(exercise => {
//                 // Check if this exercise matches any progressed exercise
//                 const progressedExercise = progressedExercises.find(
//                     pe => pe.exercise_template_id === exercise.exercise_template_id
//                 );

//                 if (!progressedExercise) {
//                     // No progression for this exercise, return as-is
//                     return exercise;
//                 }

//                 // Apply progression to matching exercise
//                 routineUpdated = true;
//                 const updatedSets = exercise.sets.map((set) => {
//                     // Create a copy of the set and apply progression
//                     const updatedSet: TRoutineSet = {
//                         ...set,
//                         rep_range: set.rep_range ? { ...set.rep_range } : null
//                     };

//                     // Apply progression based on exercise type
//                     applyProgressionToSet(progressedExercise.exerciseType, updatedSet, exercise.exercise_template_id);

//                     return updatedSet;
//                 });

//                 return {
//                     ...exercise,
//                     sets: updatedSets
//                 };
//             });

//             // Only update if at least one exercise was progressed
//             if (routineUpdated) {
//                 const routineNotes = (targetRoutine.routine as any).notes;
//                 const updatePayload: THevyRoutineRequest = {
//                     title: targetRoutine.routine.title,
//                     notes: routineNotes && routineNotes.trim().length > 0 ? routineNotes : ' ',
//                     exercises: updatedExercises.map((exercise) => ({
//                         exercise_template_id: exercise.exercise_template_id,
//                         superset_id: exercise.supersets_id,
//                         rest_seconds: Number(exercise.rest_seconds) || 90,
//                         notes: exercise.notes || ' ',
//                         sets: exercise.sets.map((set) => {
//                             const setPayload: any = {
//                                 type: set.type || 'normal',
//                                 weight_kg: set.weight_kg,
//                                 reps: set.reps,
//                                 distance_meters: set.distance_meters,
//                                 duration_seconds: set.duration_seconds,
//                                 custom_metric: set.custom_metric,
//                             };
//                             // Include rep_range if it exists
//                             if (set.rep_range) {
//                                 setPayload.rep_range = set.rep_range;
//                             }
//                             return setPayload;
//                         }),
//                     })),
//                 };

//                 // Log request details before making the PUT request
//                 console.log(`[putRoutine] Preparing to update routine:`, {
//                     routineId,
//                     url: `https://api.hevyapp.com/v1/routines/${routineId}`,
//                     payload: JSON.stringify(updatePayload, null, 2),
//                     payloadSize: JSON.stringify(updatePayload).length,
//                     exercisesCount: updatePayload.exercises?.length || 0,
//                     day: incompleteDay.nthDay,
//                     week: weekNumber,
//                     apiKeyPrefix: hevyApiKey ? `${hevyApiKey.substring(0, 8)}...` : 'missing'
//                 });

//                 await putRoutine(routineId, updatePayload, hevyApiKey);
//                 console.log(`Successfully updated routine ${routineId} (day ${incompleteDay.nthDay}, week ${weekNumber}) with progressions`);
//             }
//         } catch (error) {
//             console.error(`[putRoutine] Failed to update routine for day ${incompleteDay.nthDay} in week ${weekNumber}:`, {
//                 error: error instanceof Error ? error.message : String(error),
//                 errorStack: error instanceof Error ? error.stack : undefined,
//                 routineId,
//                 day: incompleteDay.nthDay,
//                 week: weekNumber
//             });
//             // Continue with other days even if one fails
//         }
//     }

//     return progressedExercises;
// };
