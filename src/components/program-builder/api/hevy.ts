// File for endpoints to the Hevy App Public API
import { v4 as uuidv4 } from "uuid";
import { supabase } from "../../../api";
import { getExerciseIdForHevyExercise, getMaxFolderId } from "@/components/program-builder/utils";
import { getExercises } from "../../../api/exercises";
import { User } from "@supabase/supabase-js";

export const defaultFetch = async <T>(url: string, apiKey: string): Promise<T> => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
        },
    });

    if (!response.ok) {
        console.error(`HTTP error! Status: ${response.status}`);
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
        return undefined;
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


// GET Hevy EXERCISES STORED BY PROXIMA FITNESS (CACHES IN LOCALSTORAGE)
export const getHevyExercises = async () => {
    const cacheKey = 'hevy-exercises';

    try {
            const cachedData = localStorage.getItem(cacheKey);

            if (cachedData && cachedData.length > 0) {
                const { exercises, timestamp } = JSON.parse(cachedData);

                // Check if cache is still valid (1 hour)
                if (new Date().getTime() - timestamp < 3600000) {
                    return exercises as THevyExerciseTemplate[];
                }
            }

            const { data: hevyExercises, error: hevyExercisesError } = await supabase
                .from('hevy_exercise_templates')
                .select('id, title, type, primary_muscle_group, secondary_muscle_groups, is_custom, equipment, normalized_title')
                .order("title", { ascending: true});

            if (hevyExercisesError) {
                console.error('Error fetching existing exercises:', hevyExercisesError);
                return [];
            }

            // TODO: USE THIS CODE IN THE PROXIMA APP TO FETCH CUSTOM EXERCISES FOR USERS
            // const requests = Array.from({ length: 5}, (_, i) => {
            //     const page = i + 1;
            //     return defaultFetch<THevyExerciseTemplates>(`https://api.hevyapp.com/v1/exercise_templates?page=${page}&pageSize=100`, hevyApiKey);
            // });

            // const results = await Promise.all(requests);
            // const exercises = results.flatMap((res) => res.exercise_templates);

            localStorage.setItem(
                cacheKey,
                JSON.stringify({ exercises: hevyExercises, timestamp: new Date().getTime() }),
            );

            return hevyExercises as THevyExerciseTemplate[];
    } catch (error) {
        console.error('Error fetching hevy exercises:', error);
        return [];
    }
};

export const postHevyRoutineProgram = async (id: string, hevyRoutines: THevyRoutine[], prompt: string, request: TTextToJsonRequest) => {
    const weeks = getMaxFolderId(hevyRoutines) + 1;
    const BATCH_SIZE = 50; // Process exercises in batches of 50

    try {
        const programUploadObject = {
            id,
            hevy_routines: hevyRoutines,
            title: request?.programTitle ?? "My AI Program",
            details: request?.search ?? "",
            program_length: weeks,
            workout_duration: request?.workoutDuration ? Number(request.workoutDuration) : null,
            equipment: request?.equipment ?? null,
            specialization: request?.specialization ? request.specialization.split(',').map(s => s.trim()) : null,
            difficulty: request?.difficultyLevel ? request.difficultyLevel.split(',').map(s => s.trim()) : null,
            explore: request?.explore === "true" ? true : false,
            prompt,
        };

        // STEP 1: Insert into programs table
        const { error: programsError } = await supabase.from('programs').insert([programUploadObject]);
        if (programsError) {
            console.error('Error inserting into programs:', programsError);
            return programsError;
        }

        // STEP 2: Prepare and insert schedule uploads in batches
        const scheduleUploads = hevyRoutines.map((routine) => ({
            id: uuidv4(),
            nthWeek: routine.folder_id + 1,
            nthDay: Number(routine?.order || '1'),
            day_title: routine.title,
            day_notes: routine?.notes ?? "",
            program_id: id,
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

        const proximaExercises = await getExercises();

        // STEP 3: Process exercises in batches
        const allWorkoutUploads: { [key: string]: unknown }[] = [];

        for (let i = 0; i < hevyRoutines.length; i += BATCH_SIZE) {
            const routineBatch = hevyRoutines.slice(i, i + BATCH_SIZE);

            // Process each routine in the batch
            for (const routine of routineBatch) {
                const schedule = scheduleUploads[i + routineBatch.indexOf(routine)];
                if (!schedule) continue;

                const exercisePromises = (routine.exercises ?? []).map(async (exercise) => {
                    const exerciseId = await getExerciseIdForHevyExercise(exercise.title, proximaExercises);
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

        return { status: "success" };
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
        console.error("Error saving Hevy API Key", error);
        return { success: false, data: error };
    }
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
                return "";
            } else {
                return hevyApiKey;
            }
        }
    } catch (error: unknown) {
        console.error("Error accessing Hevy API key", error);
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

/**
 * DELAYS FOR A SPECIFIC AMOUNT OF TIME
 * @param ms - The amount of time to delay
 * @returns The delayed time
 */
export const delay = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
