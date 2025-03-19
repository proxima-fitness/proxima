// File for endpoints to the Hevy App Public API
import { v4 as uuidv4 } from "uuid";
import { getExerciseIdForHevyExercise, getMaxFolderId } from "@/utils/general/helpers";
import { supabase } from ".";

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
                .select('id, title, type, primary_muscle_group, secondary_muscle_groups, is_custom, equipment')
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


// POSTS A PROGRAM TO PROGRAMS TABLE INCLUDING A JSONB COLUMN FOR THE HEVY ROUTINES
// export const postHevyRoutineProgram = async (id: string, hevyRoutines: THevyRoutine[],  ) => {

//     const weeks = getMaxFolderId(hevyRoutines) + 1;

//     try {
//         const programUploadObject: { [key: string]: unknown } = {};
//         programUploadObject['id'] = id;
//         programUploadObject['hevy_routines'] = hevyRoutines;
//         programUploadObject['title'] = "My First Program";
//         programUploadObject['details'] = null;
//         programUploadObject['program_length'] = weeks;
//         programUploadObject['workout_duration'] = null;
//         programUploadObject['equipment'] = null;
//         programUploadObject['specialization'] = null;
//         programUploadObject['difficulty'] = null;
//         programUploadObject['explore'] = false;

//         // STEP 1: POST PROGRAM DETAILS TO programs table
//         const { error: programsError } = await supabase.from('programs').insert([
//             programUploadObject,
//         ]);

//         if (programsError) {
//             return programsError;
//         }

//         } catch (error: unknown) {
//             console.error("Error posting new program: ",error);
//             return error;
//         }

//     if (hevyRoutines) {
//         let currentWeek = 1;
//         for (const week of hevyRoutines) {
//             for (const day of week) {
//                 const schedule_id = uuidv4();
//                 try {
//                     const scheduleUploadObject: { [key: string]: unknown } = {};
//                     scheduleUploadObject['id'] = schedule_id;
//                     scheduleUploadObject['nthWeek'] = currentWeek;
//                     scheduleUploadObject['nthDay'] = day.order;
//                     scheduleUploadObject['day_title'] = day.day_title;
//                     scheduleUploadObject['program_id'] = id;

//                     // STEP 2: POST schedule numbers to schedule_workouts
//                     const { error: scheduleError } = await supabase.from('schedule_workouts').insert([
//                         scheduleUploadObject,
//                     ]);

//                     if (scheduleError) {
//                         return scheduleError;
//                     }

//                 } catch (error: unknown ) {
//                     console.error("Error posting schedule in post program process",error);
//                 }

//                 try {
//                     // STEP 3: POST workout exercises to program_workout_exercises
//                     if (day.exercises) {
//                         const workoutUploadObjectArray: { [key: string]: unknown }[] = [];
//                         for (const exercise of day.exercises) {
//                             const workoutUploadObject: { [key: string]: unknown } = {};
//                             const workoutExerciseID = uuidv4();
//                             workoutUploadObject['id'] = workoutExerciseID;
//                             workoutUploadObject['exercise_id'] = exercise.exercise?.id;
//                             workoutUploadObject['schedule_id'] = schedule_id;
//                             workoutUploadObject['reps'] = exercise.reps_type?.reps ?? null;
//                             workoutUploadObject['weights'] = exercise.intensity?.weights ?? null;
//                             workoutUploadObject['reps_max'] = exercise.reps_type?.reps_max ?? null;
//                             workoutUploadObject['reps_range'] = exercise.reps_type?.reps_range ?? null;
//                             workoutUploadObject['rpe'] = exercise.intensity?.rpe ?? null;
//                             workoutUploadObject['rpe_range'] = exercise.intensity?.rpe_range ?? null;
//                             workoutUploadObject['time_taken'] = exercise.reps_type?.time_taken ?? null;
//                             workoutUploadObject['time_range'] = exercise.reps_type?.time_range ?? null;
//                             workoutUploadObject['amrap'] = exercise.reps_type?.amrap ?? null;
//                             workoutUploadObject['percent_rm'] = exercise.intensity?.percent_rm ?? null;
//                             workoutUploadObjectArray.push(workoutUploadObject);
//                         }
//                         const { error: workoutError } = await supabase.from('program_workout_exercises').insert(workoutUploadObjectArray);
//                         if (workoutError) {
//                             return workoutError;
//                         }
//                     }
//                 } catch (error: unknown) {
//                     console.error("Error posting program workout exercises in post program process",error);
//                 }
//             }
//             currentWeek++;
//         }
//     }
// };
export const postHevyRoutineProgram = async (id: string, hevyRoutines: THevyRoutine[]) => {

    const weeks = getMaxFolderId(hevyRoutines) + 1;

    try {
        const programUploadObject: { [key: string]: unknown } = {
            id,
            hevy_routines: hevyRoutines,
            title: 'My First Program',
            details: null,
            program_length: weeks,
            workout_duration: null,
            equipment: null,
            specialization: null,
            difficulty: null,
            explore: false,
        };

        // STEP 1: Insert into programs table
        const { error: programsError } = await supabase.from('programs').insert([programUploadObject]);
            if (programsError) return programsError;
        } catch (error: unknown) {
            console.error('Error posting new program:', error);
            return error;
        }

        // STEP 2–3: Insert schedule + exercises
        try {
            for (const routine of hevyRoutines) {
                const schedule_id = uuidv4();

                const scheduleUploadObject: { [key: string]: unknown } = {
                    id: schedule_id,
                    nthWeek: routine.folder_id + 1, // Assuming folder_id is 0-indexed
                    nthDay: Number(routine?.order || '1'), // default to 1 if order is missing
                    day_title: routine.title,
                    program_id: id,
                };

                const { error: scheduleError } = await supabase
                    .from('schedule_workouts')
                    .insert([scheduleUploadObject]);
                if (scheduleError) return scheduleError;

                // STEP 3: POST workout exercises to program_workout_exercises
                if (routine.exercises) {
                    const workoutUploadObjectArray: { [key: string]: unknown }[] = [];
                    for (const exercise of routine.exercises) {
                        const workoutUploadObject: { [key: string]: unknown } = {
                            id: uuidv4(),
                            schedule_id,
                            exercise_id: getExerciseIdForHevyExercise(exercise.title),
                            reps: exercise.sets.map((set) => set.reps) ?? null,
                            reps_range: null,
                            reps_max: null,
                            amrap: null,
                            time_taken: exercise.sets.map((set) => set.duration_seconds ) ?? null,
                            time_range: null,
                            weights: exercise.sets.map((set) => set.weight_kg) ?? null,
                            rpe: exercise.sets.map((set) => set.rpe) ?? null,
                            rpe_range: null,
                            percent_rm: null,
                        };
                        workoutUploadObjectArray.push(workoutUploadObject);
                    }

                    const { error: workoutError } = await supabase
                        .from('program_workout_exercises')
                        .insert(workoutUploadObjectArray);
                    if (workoutError) {
                        return workoutError;
                    }
                }
            }
        } catch (error: unknown) {
            console.error('Error posting schedule or exercises:', error);
            return error;
        }
};
