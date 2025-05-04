// File for endpoints to the Hevy App Public API
import { v4 as uuidv4 } from "uuid";
import { supabase } from ".";
import { getExerciseIdForHevyExercise, getMaxFolderId } from "@/utils/program-builder";
import { getExercises } from "./exercises";

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

export const postHevyRoutineProgram = async (id: string, hevyRoutines: THevyRoutine[], prompt: string) => {
    const weeks = getMaxFolderId(hevyRoutines) + 1;

    try {
        const programUploadObject = {
            id,
            hevy_routines: hevyRoutines,
            title: 'My AI Program',
            details: null,
            program_length: weeks,
            workout_duration: null,
            equipment: null,
            specialization: null,
            difficulty: null,
            explore: false,
            prompt,
        };

        // STEP 1: Insert into programs table
        const { error: programsError } = await supabase.from('programs').insert([programUploadObject]);
        if (programsError) {
            console.error('Error inserting into programs:', programsError);
            return programsError;
        }

        // Ensure the program exists before proceeding
        const { data: programExists, error: fetchError } = await supabase
            .from('programs')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError || !programExists) {
            console.error('Program not found after insert:', fetchError);
            return fetchError || new Error('Program insertion failed');
        }

        // STEP 2: Prepare schedule uploads
        const scheduleUploads = hevyRoutines.map((routine) => ({
            id: uuidv4(),
            nthWeek: routine.folder_id + 1, // Assuming folder_id is 0-indexed
            nthDay: Number(routine?.order || '1'), // Default to 1 if missing
            day_title: routine.title,
            program_id: id,
        }));

        // Insert schedules in batch
        const { error: scheduleError } = await supabase.from('schedule_workouts').insert(scheduleUploads);
        if (scheduleError) {
            console.error('Error inserting schedule workouts:', scheduleError);
            return scheduleError;
        }

        const proximaExercises = await getExercises();
        // STEP 3: Collect all exercise lookup promises in parallel
        const exerciseLookups = hevyRoutines.flatMap((routine, routineIndex) =>
            (routine.exercises ?? []).map((exercise, exerciseIndex) => ({
                promise: getExerciseIdForHevyExercise(exercise.title, proximaExercises),
                routineIndex,
                exerciseIndex,
            }))
        );

        const resolvedExerciseIds = await Promise.all(exerciseLookups.map((lookup) => lookup.promise));

        // STEP 4: Build workout uploads based on resolved exercise IDs
        const workoutUploads: { [key: string]: unknown }[] = [];

        for (let i = 0; i < exerciseLookups.length; i++) {
            const exerciseId = resolvedExerciseIds[i];
            const { routineIndex, exerciseIndex } = exerciseLookups[i];
            const schedule = scheduleUploads[routineIndex];
            const routine = hevyRoutines[routineIndex];
            const exercise = routine.exercises?.[exerciseIndex];

            if (exercise && exerciseId && schedule) {
                const reps = exercise.sets?.map((set) => set.reps) ?? null;
                const timeTaken = exercise.sets?.map((set) => set.duration_seconds) ?? null;
                const weights = exercise.sets?.map((set) => set.weight_kg) ?? null;
                const rpe = exercise.sets?.map((set) => set.rpe) ?? null;

                workoutUploads.push({
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
                });
            }
        }

        // Insert workouts in batch if any exist
        if (workoutUploads.length > 0) {
            const { error: workoutError } = await supabase.from('program_workout_exercises').insert(workoutUploads);
            if (workoutError) {
                console.error('Error inserting program workout exercises:', workoutError);
                return workoutError;
            }
        }

        return { status: "success" };
    } catch (error) {
        console.error('Unexpected error:', error);
        return error;
    }
};
