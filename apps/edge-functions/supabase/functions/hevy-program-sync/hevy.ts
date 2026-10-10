// SPDX-License-Identifier: AGPL-3.0-only

import { HttpError } from "./errors.ts";
import { THevyExerciseHistory, THevyExerciseTemplate, THevyRoutine, THevyRoutineFolderResponse, THevyRoutineRequest, THevyRoutineRequestObject, THevySets, THevyWorkouts, THevyWorkoutsResponse, TProgramTitle, TRoutineFolderRequest, TRoutineFolderResponse, TRoutineResponse, TRoutineSet, TSavedWorkoutExercise, TScheduleWorkouts } from "./types.ts";
import { supabase } from "./supabase.ts";
import { getIncompleteDaysForWeek } from "./db.ts";


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
      throw new HttpError(`defaultPost HTTP error! Status: ${response.status} - ${response.statusText}`, response.status);
    }

    return (await response.json()) as T;
  };

  export const defaultPut = async <T, U = unknown>(url: string, apiKey: string, body: U): Promise<T> => {
    const requestBody = JSON.stringify(body);
    
    console.log(`[defaultPut] Making PUT request:`, {
      url,
      bodySize: requestBody.length,
      bodyPreview: requestBody.substring(0, 500), // First 500 chars
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 8)}...` : 'missing'
    });

    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'api-key': apiKey,
        },
        body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        url,
        errorText,
        headers: Object.fromEntries(response.headers.entries()),
        requestBody: requestBody.substring(0, 1000) // First 1000 chars for debugging
      };
      throw new HttpError(
        `defaultPut HTTP error! Status: ${response.status} - ${errorText}. Details: ${JSON.stringify(errorDetails, null, 2)}`,
        response.status
      );
    }

    return (await response.json()) as T;
  };

  export const defaultFetch = async <T>(url: string, apiKey: string): Promise<T> => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
        },
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorDetails = {
        status: response.status,
        statusText: response.statusText,
        url,
        errorText,
        headers: Object.fromEntries(response.headers.entries())
      };
      throw new HttpError(
        `defaultFetch HTTP error! Status: ${response.status} - ${errorText}. Details: ${JSON.stringify(errorDetails, null, 2)}`,
        response.status
      );
    }

    return (await response.json()) as T;
};
  
/**
 * FETCHES THE WORKOUTS COUNT FROM THE HEVY API
 * @param hevyApiKey - The Hevy API key
 * @returns The workouts count
 */
export async function getHevyWorkoutsCount(hevyApiKey: string): Promise<number> {
    const hevyApiUrl = "https://api.hevyapp.com/v1/workouts/count";
    const hevyResponse = await fetch(hevyApiUrl, {
        method: "GET",
        headers: {
            "accept": "application/json",
            "api-key": hevyApiKey,
        },
    });

    if (!hevyResponse.ok) {
        console.error(`Hevy API error: ${hevyResponse.status} ${hevyResponse.statusText}`);
        const errorText = await hevyResponse.text();
        throw new HttpError(`Failed to fetch workouts count: ${hevyResponse.status} - ${errorText}`, 500);
    }

    const workoutsCountResponse = await hevyResponse.json();
    const workoutsCount = workoutsCountResponse.workout_count;
    return workoutsCount;
}


/**
 * FETCHES RECENTLY COMPLETED WORKOUTS FROM THE HEVY API
 * Hevy caps pageSize at 10 — paginate until `limit` workouts collected.
 *
 * @param hevyApiKey - The Hevy API key
 * @param limit - How many newest workouts to return (default: 1)
 * @returns The recently completed workouts (newest-first pages concatenated)
 */
export async function getRecentlyCompletedWorkouts(
    hevyApiKey: string,
    limit: number = 1,
): Promise<THevyWorkoutsResponse> {
    const target = Math.max(1, Math.floor(limit));
    const pageSize = 10;
    const workouts: THevyWorkoutsResponse["workouts"] = [];
    let page = 1;
    let pageCount = 1;

    while (workouts.length < target && page <= pageCount) {
        const hevyApiUrlWorkouts =
            `https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=${pageSize}`;
        const hevyResponseWorkouts = await fetch(hevyApiUrlWorkouts, {
            method: "GET",
            headers: {
                "accept": "application/json",
                "api-key": hevyApiKey,
            },
        });

        if (!hevyResponseWorkouts.ok) {
            console.error(
                `Hevy API error: ${hevyResponseWorkouts.status} ${hevyResponseWorkouts.statusText}`,
            );
            const errorText = await hevyResponseWorkouts.text();
            throw new HttpError(
                `Failed to fetch recently completed workouts: ${hevyResponseWorkouts.status} - ${errorText}`,
                500,
            );
        }

        const batch: THevyWorkoutsResponse = await hevyResponseWorkouts.json();
        pageCount = batch.page_count ?? page;
        if (!batch.workouts?.length) {
            break;
        }
        workouts.push(...batch.workouts);
        page += 1;
    }

    return {
        page: 1,
        page_count: pageCount,
        workouts: workouts.slice(0, target),
    };
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
        const errorText = await routineResponse.text();
        throw new HttpError(`Failed to fetch routine: ${routineResponse.status} - ${errorText}`, 500);
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
        throw new HttpError(`No folder_id found`, 500);
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
        const errorText = await folderResponse.text();
        throw new HttpError(`Failed to fetch folder: ${folderResponse.status} - ${errorText}`, 500);
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



// ADR 0011: kept for possible future auto next-week upload / progression mode.
// Call site in db.ts hevyProgramSync is commented out.
export async function uploadNewWeek(hevyApiKey: string, program_id: string, week_number: number, programTitle: string): Promise<void> {
    const { data: scheduleWorkouts, error: scheduleWorkoutsError } = await supabase
        .from('schedule_workouts')
        .select(`
            nthDay,
            nthWeek,
            day_title,
            program_workout_exercises (
                reps,
                reps_max,
                reps_range,
                time_taken,
                time_range,
                amrap,
                rpe,
                rpe_range,
                percent_rm,
                weights,
                hevy_exercise_templates (
                    id,
                    title,
                    type,
                    primary_muscle_group,
                    secondary_muscle_groups,
                    is_custom,
                    equipment,
                    normalized_title,
                    gif_id,
                    instructions
                )
            )
        `)
        .eq('program_id', program_id)
        .order('nthWeek', { ascending: true })
        .order('nthDay', { ascending: true });

    if (scheduleWorkoutsError) {
        console.error('Failed to retrieve schedule workouts:', scheduleWorkoutsError.message);
        throw new HttpError(`Failed to retrieve schedule workouts: ${scheduleWorkoutsError.message}`, 500);
    }

    if (!scheduleWorkouts || scheduleWorkouts.length === 0) {
        throw new HttpError(`No schedule workouts found for program_id: ${program_id}, week_number: ${week_number}`, 404);
    }

    // Sort workouts by week and day
    const sortedWorkoutsByWeek = sortWorkouts(scheduleWorkouts);
    
    // Convert all workouts to Hevy routines
    const allHevyRoutines = await convertToHevyRoutine(sortedWorkoutsByWeek);

    // Filter for the specific week (folder_id is 0-indexed, week_number is 1-indexed)
    // So week_number 1 = folder_id 0, week_number 2 = folder_id 1, etc.
    const weekHevyRoutines = allHevyRoutines.filter((routine) => routine.folder_id === week_number - 1);

    if (weekHevyRoutines.length === 0) {
        throw new HttpError(`No routines found for week_number: ${week_number}`, 404);
    }

    // 6. Upload to Hevy
    await postRoutineProgramToHevyOneFolder(weekHevyRoutines, week_number, hevyApiKey, [{ id: program_id, title: programTitle }]);
}

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


/**
 * DELAYS FOR A SPECIFIC AMOUNT OF TIME
 * @param ms - The amount of time to delay
 * @returns The delayed time
 */
export const delay = (ms: number) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

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

// PUT /v1/routines/{routineId}. Update an existing routine
// https://api.hevyapp.com/docs/#/Routines/put_v1_routines__routineId_
/**
 * UPDATES AN EXISTING ROUTINE IN HEVY
 * @param routineId - The routine ID to update
 * @param updateRoutine - The routine data to update
 * @param apiKey - The hevy api key
 * @returns The updated routine
 */
export const putRoutine = async (routineId: string, updateRoutine: THevyRoutineRequest, apiKey: string) => {
    const body: THevyRoutineRequestObject = {
        routine: updateRoutine,
    };

    const response = await defaultPut<THevyRoutineRequest, THevyRoutineRequestObject>(
        `https://api.hevyapp.com/v1/routines/${routineId}`,
        apiKey,
        body,
    );

    return response;
};

/**
 * APPENDS "  ✅" TO THE ROUTINE TITLE OF A COMPLETED ROUTINE
 * @param routineId - The routine ID to update
 * @param currentTitle - The current routine title
 * @param apiKey - The hevy api key
 * @param routine - The full routine object (needed to preserve other fields when updating)
 * @returns The updated routine
 */
export const appendCheckmarkToRoutineTitle = async (
    routineId: string,
    currentTitle: string,
    apiKey: string,
    routine: TRoutineResponse
): Promise<void> => {
    // Check if the title already has the checkmark
    if (currentTitle.endsWith('  ✅')) {
        console.log(`Routine ${routineId} already has checkmark in title. Skipping update.`);
        return;
    }

    // Append the checkmark to the title
    const updatedTitle = `${currentTitle}  ✅`;

    // Prepare the update payload matching the API structure
    // Structure: { routine: { title, notes, exercises: [{ exercise_template_id, superset_id, rest_seconds, notes, sets: [{ type, weight_kg, reps, distance_meters, duration_seconds, custom_metric, rep_range? }] }] } }
    // Note: folder_id is NOT included in PUT request body per API documentation
    // Note: notes cannot be empty string - API requires non-empty value
    const routineNotes = (routine.routine as any).notes;
    const updatePayload: THevyRoutineRequest = {
        title: updatedTitle,
        notes: routineNotes && routineNotes.trim().length > 0 ? routineNotes : ' ',
        exercises: routine.routine.exercises.map((exercise) => ({
            exercise_template_id: exercise.exercise_template_id,
            superset_id: exercise.supersets_id,
            rest_seconds: Number(exercise.rest_seconds) || 90,
            notes: exercise.notes || '',
            sets: exercise.sets.map((set) => {
                const setPayload: any = {
                    type: set.type || 'normal',
                    weight_kg: set.weight_kg,
                    reps: set.reps,
                    distance_meters: set.distance_meters,
                    duration_seconds: set.duration_seconds,
                    custom_metric: set.custom_metric,
                };
                // Include rep_range if it exists (API accepts it in request body even though not in type)
                if (set.rep_range) {
                    setPayload.rep_range = set.rep_range;
                }
                return setPayload;
            }),
        })),
    };

    try {
        await putRoutine(routineId, updatePayload, apiKey);
        console.log(`Successfully appended checkmark to routine ${routineId} title: "${updatedTitle}"`);
    } catch (error) {
        console.error(`Failed to update routine ${routineId} title:`, error);
        throw error;
    }
};


/**
 * POSTS A NEW ROUTINE PROGRAM TO HEVY
 * @param routineProgram - The routine program to post
 * @param apiKey - The hevy api key
 * @returns The routine program
 */
export const postRoutineProgramToHevyOneFolder = async (routineProgram: THevyRoutine[], week: number, apiKey: string, programTitle: TProgramTitle[] | undefined) => {
    const folderTitle = `Week ${week} - ${programTitle?.[0]?.title ?? "Proxima Program"}`;

    try {
        // Check if folder already exists to prevent duplicate creation
        let pageOneRoutineFolders = await getRoutineFolders(apiKey, 1);
        let targetFolder = pageOneRoutineFolders?.routine_folders.find((folder) => folder.title === folderTitle);
        
        if (!targetFolder) {
            // Only create folder if it doesn't exist
            await postRoutineFolders(folderTitle, apiKey);
            // Refresh folder list after creation
            pageOneRoutineFolders = await getRoutineFolders(apiKey, 1);
            targetFolder = pageOneRoutineFolders?.routine_folders.find((folder) => folder.title === folderTitle);
        }
        
        if (!targetFolder) {
            throw new Error(`Failed to find or create folder "${folderTitle}"`);
        }

        let rateLimited = 0;

        for (let i = 0; i < routineProgram.length; i++) {
            try {
                await postRoutines(convertHevyOutputIntoInput(routineProgram[i], targetFolder.id), apiKey);
            } catch (error: unknown) {
                console.warn(`Rate limited at index ${i}. Retrying in ${(160000 + rateLimited) / 1000} s...`, error);
                await delay(160000 + rateLimited);
                rateLimited += 40000;
                i--;
            }
        }

        return { success: true, data: []};
    } catch (error: unknown) {
        console.error("Error saving Routine program to Hevy", error);
        return { success: false, data: error };
    }
};



/**
 * Converts a Hevy routine output format into a Hevy routine request format.
 *
 * Transforms a THevyRoutine object (used internally) into a THevyRoutineRequest
 * (format required by Hevy API). Removes duplicate exercises, sets default values
 * for missing fields, and ensures all required fields are present.
 *
 * @param routine - The Hevy routine object to convert
 * @param folderId - The folder ID to assign to the routine for organization
 * @returns A Hevy routine request object ready to be sent to the Hevy API
 */
export const convertHevyOutputIntoInput = (routine: THevyRoutine, folderId: number): THevyRoutineRequest => {

    // TODO: This is a temporary fix to avoid duplicate exercise_template_ids in the Hevy routine. Add better handling in landing page.
    const uniqueExercises = routine?.exercises?.filter((exercise, index, self) =>
        index === self.findIndex((e) => e.exercise_template_id === exercise.exercise_template_id),
    ) || [];

    return {
        title: routine?.title?.length > 0 ? routine.title : "Proxima AI Routine",
        folder_id: folderId,
        notes: routine?.notes?.length > 0 ? routine.notes : "Built with Proxima AI",
        exercises: uniqueExercises.map((exercise) => ({
            exercise_template_id: exercise?.exercise_template_id,
            superset_id: exercise?.supersets_id,
            rest_seconds: 90,
            notes: exercise?.notes?.length > 0 ? exercise?.notes : "...",
            sets: exercise?.sets?.map((set) => ({
                type: set?.type?.length > 0 ? set?.type : "normal",
                weight_kg: set?.weight_kg ?? null,
                reps: set?.reps ?? null,
                distance_meters: set?.distance_meters ?? null,
                duration_seconds: set?.duration_seconds ?? null,
                custom_metric: set?.custom_metric ?? null,
            })),
        })),
    };
};

/**
 * Converts Proxima schedule workouts into Hevy routine format.
 *
 * Takes a 2D array of schedule workouts (organized by week and day) and converts
 * them into Hevy routines. Each workout day becomes a separate routine, with
 * exercises mapped to Hevy exercise templates. Routines are organized by week
 * using folder IDs.
 *
 * @param scheduleWorkouts - A 2D array where each inner array represents a week,
 *                           and each element in the week represents a workout day
 * @returns A promise that resolves to an array of Hevy routines, where each routine
 *          represents a workout day with its exercises, sets, and metadata
 */
export const convertToHevyRoutine = async (scheduleWorkouts: TScheduleWorkouts[][]): Promise<THevyRoutine[]> => {

    const routines = await Promise.all(
        scheduleWorkouts.flatMap((week, weekIndex) =>
            week.map(async (day, dayIndex) => {

                const exercises = await Promise.all(
                    day.program_workout_exercises.map(async (exercise, exIndex) => ({
                        index: exIndex,
                        title: exercise.hevy_exercise_templates?.title || "Unknown Exercise",
                        notes: "",
                        exercise_template_id: exercise.hevy_exercise_templates?.id || "",
                        supersets_id: null,
                        sets: generateHevySets(exercise),
                    })),
                );

                return {
                    id: "",
                    title: day.day_title ? `${dayIndex + 1} - ${day.day_title}` : `${dayIndex + 1} - Day ${dayIndex + 1}`,
                    folder_id: weekIndex, // Assign week number as folder ID
                    updated_at: new Date().toISOString(),
                    created_at: new Date().toISOString(),
                    notes: "",
                    exercises,
                    order: String(dayIndex + 1), // 1-indexed day order
                };
            }),
        ),
    );

    for(let i = 0; i < routines.length; i++) {
        routines[i].id = String(i + 1);
    }

    return routines;
};

/**
 * Generates Hevy sets from a Proxima saved workout exercise.
 *
 * Converts Proxima exercise data (reps, weights, time, RPE, etc.) into Hevy set format.
 * Handles various Proxima data formats including single values, ranges, and arrays.
 * The number of sets is determined by the maximum length of any exercise property array.
 *
 * @param exercise - The Proxima saved workout exercise containing sets data
 * @returns An array of Hevy sets with weight, reps, duration, RPE, and other metrics
 */
export const generateHevySets = (exercise: TSavedWorkoutExercise): THevySets[] => {
    const sets: THevySets[] = [];
    const maxSets = Math.max(
        exercise?.reps?.length || 0,
        exercise?.weights?.length || 0,
        exercise?.time_taken?.length || 0,
        exercise?.reps_range?.length || 0,
        exercise?.reps_max?.length || 0,
        exercise?.amrap?.length || 0,
        exercise?.percent_rm?.length || 0,
        exercise?.rpe?.length || 0,
        exercise?.rpe_range?.length || 0,
        exercise?.time_range?.length || 0,
    );

    for (let i = 0; i < maxSets; i++) {
        sets.push({
            index: i,
            type: "normal", // Assuming all sets are normal
            weight_kg: exercise.weights?.[i] || 0,
            reps: exercise?.reps ? exercise.reps?.[i] || 0 : exercise?.reps_range && exercise?.reps_range?.[i]?.[1] || 0,
            distance_meters: 0, // No distance tracking by default
            duration_seconds: exercise?.time_taken ? exercise.time_taken?.[i] || 0 : exercise?.time_range && exercise.time_range?.[i]?.[1] || 0,
            rpe: exercise?.rpe ? exercise.rpe?.[i] || 0 : exercise?.rpe_range && exercise.rpe_range?.[i]?.[1] || 0,
            custom_metric: 0, // Placeholder for custom metric
        });
    }

    return sets;
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
            .select('id, title, type, is_custom')
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
const getProgressionMetadata = (exerciseType: string): {
    progressionAmount: number;
    progressionUnit: string;
    completedUnit: string;
    fieldToUpdate: 'weight_kg' | 'reps' | 'distance_meters' | 'duration_seconds' | 'custom_metric' | null;
} => {
    switch (exerciseType) {
        case 'weight_reps':
            return { progressionAmount: 2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
        case 'distance_duration':
            return { progressionAmount: 0.25, progressionUnit: 'km', completedUnit: 'km', fieldToUpdate: 'distance_meters' };
        case 'reps_only':
            return { progressionAmount: 2, progressionUnit: 'reps', completedUnit: 'reps', fieldToUpdate: 'reps' };
        case 'duration':
            return { progressionAmount: 30, progressionUnit: 'seconds', completedUnit: 'seconds', fieldToUpdate: 'duration_seconds' };
        case 'bodyweight_weighted':
            return { progressionAmount: 2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
        case 'bodyweight_assisted':
            return { progressionAmount: -2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
        case 'short_distance_weight':
            return { progressionAmount: 2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
        case 'floors_duration':
            return { progressionAmount: 100, progressionUnit: 'floors', completedUnit: 'floors', fieldToUpdate: 'custom_metric' };
        case 'steps_duration':
            return { progressionAmount: 100, progressionUnit: 'steps', completedUnit: 'steps', fieldToUpdate: 'custom_metric' };
        default:
            return { progressionAmount: 0, progressionUnit: '', completedUnit: '', fieldToUpdate: null };
    }
};

/**
 * APPLIES DOUBLE PROGRESSION TO A SINGLE SET BASED ON EXERCISE TYPE
 * @param exerciseType - The type of exercise (weight_reps, distance_duration, etc.)
 * @param routineSet - The routine set to apply progression to (modified in place)
 * @param exerciseTemplateId - The exercise template ID (for logging)
 */
const applyProgressionToSet = (
    exerciseType: string,
    routineSet: TRoutineSet,
    exerciseTemplateId: string
): void => {
    let progressionAmount = 0;
    let currentValue = 0;
    let useFloor = false;
    let conversionFactor = 1;
    let fieldToUpdate: 'weight_kg' | 'reps' | 'distance_meters' | 'duration_seconds' | 'custom_metric' | null = null;

    switch (exerciseType) {
        case 'weight_reps':
            progressionAmount = 2.5; // +2.5kg
            currentValue = routineSet.weight_kg ?? 0;
            fieldToUpdate = 'weight_kg';
            break;

        case 'distance_duration':
            progressionAmount = 0.25; // +0.25km = +250m
            currentValue = routineSet.distance_meters ?? 0;
            conversionFactor = 1000; // Convert km to meters
            fieldToUpdate = 'distance_meters';
            break;

        case 'reps_only':
            progressionAmount = 2; // +2 reps
            currentValue = routineSet.reps ?? 0;
            useFloor = true; // Use floor for integer values
            fieldToUpdate = 'reps';
            break;

        case 'duration':
            progressionAmount = 30; // +30 seconds
            currentValue = routineSet.duration_seconds ?? 0;
            fieldToUpdate = 'duration_seconds';
            break;

        case 'bodyweight_weighted':
            progressionAmount = 2.5; // +2.5kg
            currentValue = routineSet.weight_kg ?? 0;
            fieldToUpdate = 'weight_kg';
            break;

        case 'bodyweight_assisted':
            progressionAmount = -2.5; // -2.5kg (reducing assistance)
            currentValue = routineSet.weight_kg ?? 0;
            let newValue = currentValue + progressionAmount;
            
            // Gut check: ensure we don't go negative or make too large a jump
            if (newValue < 0) {
                newValue = 0;
            } else if (currentValue > 0 && newValue < currentValue * 0.8) {
                // If reducing by more than 20%, limit the reduction
                newValue = currentValue * 0.8;
            }
            routineSet.weight_kg = newValue;
            return; // Early return for special case

        case 'short_distance_weight':
            progressionAmount = 2.5; // +2.5kg
            currentValue = routineSet.weight_kg ?? 0;
            fieldToUpdate = 'weight_kg';
            break;

        case 'floors_duration':
            progressionAmount = 100; // +100 floors
            currentValue = routineSet.custom_metric ?? 0;
            fieldToUpdate = 'custom_metric';
            break;

        case 'steps_duration':
            progressionAmount = 100; // +100 steps
            currentValue = routineSet.custom_metric ?? 0;
            fieldToUpdate = 'custom_metric';
            break;

        default:
            console.warn(`Unknown exercise type: ${exerciseType} for exercise ${exerciseTemplateId}`);
            return;
    }

    // Apply gut check once after switch statement
    const adjustedProgression = progressionAmount * conversionFactor;
    let newValue = currentValue + adjustedProgression;
    
    // Gut check: if (current_value + jump) > current_value * 1.2, half the jump
    if (newValue > currentValue * 1.2) {
        const halvedProgression = useFloor 
            ? Math.floor(progressionAmount / 2)
            : progressionAmount / 2;
        newValue = currentValue + (halvedProgression * conversionFactor);
    }
    
    // Update the appropriate field
    if (fieldToUpdate) {
        (routineSet as any)[fieldToUpdate] = newValue;
    }
};

/**
 * APPLIES DOUBLE PROGRESSION FOR A COMPLETED EXERCISE
 * Applies progressions to incomplete routines in the current week (or next week if current week is complete)
 *
 * ADR 0011: call site in index.ts is commented out (not deleted). Reserved for future auto-weight-progression mode.
 *
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
export const doubleProgression = async (
    workout: THevyWorkouts, 
    routine: TRoutineResponse, 
    program_id: string,
    programHistoryId: string,
    user_id: string,
    weekNumber: number, 
    nthDay: number, 
    hevyApiKey: string,
    hevyExercises: THevyExerciseTemplate[],
    folder_id: number | null): Promise<ProgressedExercise[]> => {

    // An Exercise type can be one of the following options: 
    // 1. weight_reps (e.g. Squat (Barbell)), 
    // 2. distance_duration (Sled Push), 
    // 3. reps_only (e.g. Kipping Pullup), 
    // 4. duration (e.g. Boxing) , 
    // 5. bodyweight_weighted (e.g. Decline Crunch (Weighted)), 
    // 6. bodyweight_assisted (e.g. Pull Up (Band)), 
    // 7. short_distance_weight (e.g. Walking lunge dumbbell), 
    // 8. floors_duration (Stair Machine Floors), 
    // 9. steps_duration (Stair Machine Steps)
    // For each option it will have a different progression increement amount.
    // 1. weight_reps: +2.5kg
    // 2. distance_duration: +0.25km
    // 3. reps_only: +2 reps
    // 4. duration: +30 s
    // 5. bodyweight_weighted: +2.5kg
    // 6. bodyweight_assisted: -2.5kg
    // 7. short_distance_weight: +2.5kg
    // 8. floors_duration: +100 floors
    // 9. steps_duration: +100 steps

    // We also want to gut check that we're not making a massive leap in difficulty
    // for example we can apply a rule such as if (current_weight + jump) > current_weight * 1.2 then we half the jump amount.
    // This prevents the algo from making a massive leap in difficulty. E.g. adding 2.5kg to a 10kg exercise would be too much of a jump.

    // Track which exercises progressed and their types
    const progressedExercises: ProgressedExercise[] = [];

    for (const exercise of workout.exercises) {
        // Find the matching exercise in the routine by exercise_template_id
        const routineExercise = routine.routine.exercises.find(
            (rEx) => rEx.exercise_template_id === exercise.exercise_template_id
        );

        if (!routineExercise) continue;

        // Fetch exercise template to get the exercise type
        const exerciseTemplate = hevyExercises.find(ex => ex.id === exercise.exercise_template_id);
        if (!exerciseTemplate) {
            console.warn(`Could not fetch exercise template for ${exercise.exercise_template_id}`);
            continue;
        }

        const exerciseType = exerciseTemplate.type;
        const progressionMetadata = getProgressionMetadata(exerciseType);

        // Compare sets: check if all workout sets have reps >= routine target reps
        // Also capture what the user completed
        let allSetsProgressed = true;
        let completedValue: number | null = null;
        let completedUnit = progressionMetadata.completedUnit;

        // For most exercises, we check if reps >= target reps
        // For distance_duration, we check if duration >= target duration
        // For duration, we check if duration >= target duration
        if (exerciseType === 'distance_duration') {
            // For distance exercises, check duration and capture distance
            allSetsProgressed = exercise.sets.every((workoutSet, index) => {
                const routineSet = routineExercise.sets[index];
                if (!routineSet) return false;

                const routineTargetDuration = routineSet.duration_seconds ?? 0;
                const workoutDuration = workoutSet.duration_seconds ?? 0;

                // Capture the distance from the first set
                if (index === 0 && workoutSet.distance_meters !== null && workoutSet.distance_meters !== undefined) {
                    completedValue = workoutSet.distance_meters / 1000; // Convert to km
                }

                return workoutDuration >= routineTargetDuration;
            });
        } else if (exerciseType === 'duration') {
            // For duration exercises, capture the target duration
            allSetsProgressed = exercise.sets.every((workoutSet, index) => {
                const routineSet = routineExercise.sets[index];
                if (!routineSet) return false;

                const routineTargetDuration = routineSet.duration_seconds ?? 0;
                const workoutDuration = workoutSet.duration_seconds ?? 0;

                // Capture the target duration from the first set
                if (index === 0) {
                    completedValue = routineTargetDuration;
                }

                return workoutDuration >= routineTargetDuration;
            });
        } else {
            // For reps-based exercises (weight_reps, reps_only, etc.), check reps and capture target reps
            allSetsProgressed = exercise.sets.every((workoutSet, index) => {
                const routineSet = routineExercise.sets[index];
                if (!routineSet) return false;

                // Get target reps from routine (rep_range end, or default to 12 for 8-12 range if not set)
                const routineTargetReps = routineSet.rep_range?.end ?? 12;
                const workoutReps = workoutSet.reps ?? 0;

                // Capture the target reps from the first set (what they needed to complete)
                if (index === 0) {
                    completedValue = routineTargetReps;
                    completedUnit = 'reps';
                }

                return workoutReps >= routineTargetReps;
            });
        }

        if (allSetsProgressed && completedValue !== null) {

            progressedExercises.push({
                exercise_template_id: exercise.exercise_template_id,
                exercise_name: exerciseTemplate.title,
                exerciseType,
                completed_value: completedValue,
                completed_unit: completedUnit,
                progression_amount: progressionMetadata.progressionAmount,
                progression_unit: progressionMetadata.progressionUnit
            });

            console.log(`Progression detected for exercise ${exercise.exercise_template_id} ${exercise.title} (${exerciseType})`);
        }
    }

    if (progressedExercises.length === 0) {
        console.log('No progressions detected, skipping update');
        return progressedExercises;
    }
    if (folder_id === null) {
        console.warn('No folder_id provided, cannot apply progressions');
        return progressedExercises;
    }

    // Get incomplete days for the current week
    const incompleteDays = await getIncompleteDaysForWeek(user_id, programHistoryId, weekNumber, program_id);

    if (incompleteDays.length === 0) {
        console.log(`No incomplete days found for week ${weekNumber}, skipping progression updates`);
        return progressedExercises;
    }

    // Get all routines in the current week's folder
    const routinesInFolder = await getRoutinesInFolder(hevyApiKey, folder_id);

    if (routinesInFolder.length === 0) {
        console.log(`No routines found in folder ${folder_id} for week ${weekNumber}`);
        return progressedExercises;
    }

    // For each incomplete day, find and update the routine
    for (const incompleteDay of incompleteDays) {
        const routineId = findRoutineByDay(routinesInFolder, incompleteDay.nthDay);

        if (!routineId) {
            console.warn(`Could not find routine for day ${incompleteDay.nthDay} in week ${weekNumber}`);
            continue;
        }

        try {
            // Fetch the full routine
            const targetRoutine = await getRoutine(hevyApiKey, routineId);

            // Track if any progressions were applied to this routine
            let routineUpdated = false;

            // Create a copy of the routine exercises to modify
            const updatedExercises = targetRoutine.routine.exercises.map(exercise => {
                // Check if this exercise matches any progressed exercise
                const progressedExercise = progressedExercises.find(
                    pe => pe.exercise_template_id === exercise.exercise_template_id
                );

                if (!progressedExercise) {
                    // No progression for this exercise, return as-is
                    return exercise;
                }

                // Apply progression to matching exercise
                routineUpdated = true;
                const updatedSets = exercise.sets.map((set) => {
                    // Create a copy of the set and apply progression
                    const updatedSet: TRoutineSet = {
                        ...set,
                        rep_range: set.rep_range ? { ...set.rep_range } : null
                    };

                    // Apply progression based on exercise type
                    applyProgressionToSet(progressedExercise.exerciseType, updatedSet, exercise.exercise_template_id);

                    return updatedSet;
                });

                return {
                    ...exercise,
                    sets: updatedSets
                };
            });

            // Only update if at least one exercise was progressed
            if (routineUpdated) {
                const routineNotes = (targetRoutine.routine as any).notes;
                const updatePayload: THevyRoutineRequest = {
                    title: targetRoutine.routine.title,
                    notes: routineNotes && routineNotes.trim().length > 0 ? routineNotes : ' ',
                    exercises: updatedExercises.map((exercise) => ({
                        exercise_template_id: exercise.exercise_template_id,
                        superset_id: exercise.supersets_id,
                        rest_seconds: Number(exercise.rest_seconds) || 90,
                        notes: exercise.notes || ' ',
                        sets: exercise.sets.map((set) => {
                            const setPayload: any = {
                                type: set.type || 'normal',
                                weight_kg: set.weight_kg,
                                reps: set.reps,
                                distance_meters: set.distance_meters,
                                duration_seconds: set.duration_seconds,
                                custom_metric: set.custom_metric,
                            };
                            // Include rep_range if it exists
                            if (set.rep_range) {
                                setPayload.rep_range = set.rep_range;
                            }
                            return setPayload;
                        }),
                    })),
                };

                // Log request details before making the PUT request
                console.log(`[putRoutine] Preparing to update routine:`, {
                    routineId,
                    url: `https://api.hevyapp.com/v1/routines/${routineId}`,
                    payload: JSON.stringify(updatePayload, null, 2),
                    payloadSize: JSON.stringify(updatePayload).length,
                    exercisesCount: updatePayload.exercises?.length || 0,
                    day: incompleteDay.nthDay,
                    week: weekNumber,
                    apiKeyPrefix: hevyApiKey ? `${hevyApiKey.substring(0, 8)}...` : 'missing'
                });

                await putRoutine(routineId, updatePayload, hevyApiKey);
                console.log(`Successfully updated routine ${routineId} (day ${incompleteDay.nthDay}, week ${weekNumber}) with progressions`);
            }
        } catch (error) {
            console.error(`[putRoutine] Failed to update routine for day ${incompleteDay.nthDay} in week ${weekNumber}:`, {
                error: error instanceof Error ? error.message : String(error),
                errorStack: error instanceof Error ? error.stack : undefined,
                routineId,
                day: incompleteDay.nthDay,
                week: weekNumber
            });
            // Continue with other days even if one fails
        }
    }
    
    return progressedExercises;
};