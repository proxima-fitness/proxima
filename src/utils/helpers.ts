import { getExercises } from "@/api/exercises";
import { getHevyExercises } from "@/api/hevy";
import Fuse from "fuse.js";

export function convertSupabaseDateToReadable(inputDate: string | undefined): string {

    let formattedDate = "";
    if (inputDate) {
        const date = new Date(inputDate);
        const options: Intl.DateTimeFormatOptions = { year: "numeric", month: "short", day: "numeric" };
        formattedDate = date.toLocaleDateString('en-US', options);
    }

    return formattedDate;
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


export const getExerciseFromLocalStorageByID = async (id?: string) => {
    const cachedExercises = localStorage.getItem("existing-exercises");

    if (!cachedExercises) {
        return undefined;
    }

    if (cachedExercises && cachedExercises.length > 0) {
        const { exercises } = JSON.parse(cachedExercises);
        const exercise: TExercise | undefined = exercises?.find((exercise: TExercise) => exercise.id === id);
        return exercise;
    }
};

export const getExerciseFromLocalStorageByName = async (name_english: string) => {
    const cachedExercises = localStorage.getItem("existing-exercises");

    if (!cachedExercises) {
        return undefined;
    }

    if (cachedExercises && cachedExercises.length > 0) {
        const { exercises } = JSON.parse(cachedExercises);
        const exercise: TExercise | undefined = exercises?.find((exercise: TExercise) => exercise.name_english === name_english);
        return exercise;
    }
};

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


// Converts TAddExercise type into TProgramCreatorExercise type
export const addExerciseToProgramCreatorExerciseConverter = async (addExercise: TAddExercise) => {
    let addReps = [];
    let addIntensity = [];
    let sets = 0;
    if (addExercise.repTypeValue === "amrap") {
        addReps = addExercise.reps.map(() => addExercise.repTypeValue);
        sets = addExercise.reps.length;
    } else if (addExercise.repTypeValue === "reps_range" || addExercise.repTypeValue === "time_range") {
        addReps = addExercise.repsWithTimeAndRepRange;
        sets = addExercise.repsWithTimeAndRepRange.length;
    } else {
        addReps = addExercise.reps;
        sets = addExercise.reps.length;
    }
    if (addExercise.intensityValue === "rpe_range") {
        addIntensity = addExercise.intensityDataWithRPERange;
    } else {
        addIntensity = addExercise.intensityData;
    }

    const newExercise = {
        exercise: await getExerciseFromLocalStorageByID(addExercise.id),
        sets: sets,
        reps_type: { [ addExercise.repTypeValue ] : addReps },
        intensity: { [ addExercise.intensityValue ]: addIntensity},
    } as TProgramCreatorExercise;

    return newExercise;
};

// Convertes TAddExercise to THevyExercise type
export const hevyAddExerciseToHevySetsConverter = (addExercise: THevyAddExercise): THevySets[] => {
    const sets: THevySets[] = addExercise.reps.map((rep, setIndex) => {
        return {
            index: setIndex,
            type: "normal", // Defaulting to normal, TODO: allow user to select this
            weight_kg: addExercise.intensityValue === "weight_kg" ? addExercise.intensityData[setIndex] || 0 : 0,
            reps: addExercise.repTypeValue.includes("reps") ? rep || 0 : 0,
            distance_meters: addExercise.repTypeValue.includes("distance_meters") ? rep || 0 : 0,
            duration_seconds: addExercise.repTypeValue.includes("duration_seconds") ?  rep || 0 : 0,
            rpe: addExercise.intensityValue.includes("rpe") ? addExercise.intensityData[setIndex] || 0 : 0,
            custom_metric: addExercise.repTypeValue.includes("custom_metric") ? rep || 0 : 0,
        };
    });

    return sets;
};


// Converts THevyExercise into THevyAddExercise
export const convertHevyExerciseIntoHevyAddExercise = (exercise: THevyExercise): THevyAddExercise => {

    // Determine the repTypeValue based on the first non-zero value in a rep-type field
    const firstSet = exercise.sets[0];

    let repTypeValue: THevyAddExercise["repTypeValue"] = "reps";
    if (firstSet.distance_meters > 0) {
      repTypeValue = "distance_meters";
    } else if (firstSet.duration_seconds > 0) {
      repTypeValue = "duration_seconds";
    } else if (firstSet.custom_metric > 0) {
      repTypeValue = "custom_metric";
    }

    // Determine intensityValue
    const intensityValue: THevyAddExercise["intensityValue"] =
      firstSet.weight_kg > 0 ? "weight_kg" : "rpe";

    // Map values from sets
    const reps = exercise.sets.map(set => {
      switch (repTypeValue) {
        case "reps":
          return set.reps;
        case "distance_meters":
          return set.distance_meters;
        case "duration_seconds":
          return set.duration_seconds;
        case "custom_metric":
          return set.custom_metric;
      }
    });

    const intensityData = exercise.sets.map(set =>
      intensityValue === "weight_kg" ? set.weight_kg : set.rpe,
    );

    return {
      id: exercise.exercise_template_id,
      repTypeValue,
      intensityValue,
      reps,
      intensityData,
    };
};


// Converts TProgramCreatorExercise into TAddExercise type
export const convertProgramCreatorExerciseToAddExercise = (programCreatorExercise: TProgramCreatorExercise): TAddExercise => {

    if (!programCreatorExercise.exercise) {
      throw new Error("Missing exercise data.");
    }

    const { exercise, reps_type, intensity } = programCreatorExercise;

    // Determine repTypeValue
    const repTypeValue =
      reps_type?.reps ? "reps" :
      reps_type?.reps_max ? "reps_max" :
      reps_type?.reps_range ? "reps_range" :
      reps_type?.time_taken ? "time_taken" :
      reps_type?.time_range ? "time_range" :
      reps_type?.amrap ? "amrap" :
      undefined;

    if (!repTypeValue) {
      throw new Error("Invalid or missing reps_type.");
    }

    // Determine intensityValue
    const intensityValue =
      intensity?.percent_rm ? "percent_rm" :
      intensity?.rpe_range ? "rpe_range" :
      intensity?.rpe ? "rpe" :
      intensity?.weights ? "weights" :
      undefined;

    if (!intensityValue) {
      throw new Error("Invalid or missing intensity.");
    }

    // Populate data fields
    const reps = reps_type?.reps || reps_type?.reps_max || reps_type?.time_taken || amrapAsNumber(reps_type?.amrap) || []; // AMRAP NEEDS TO BE FIXED HERE
    const intensityData = intensity?.percent_rm || intensity?.rpe || intensity?.weights || [];
    const repsWithTimeAndRepRange =
      reps_type?.reps_range || reps_type?.time_range || [];
    const intensityDataWithRPERange = intensity?.rpe_range || [];

    // Return the mapped TAddExercise object
    return {
      id: exercise.id,
      repTypeValue,
      intensityValue,
      reps,
      intensityData,
      repsWithTimeAndRepRange,
      intensityDataWithRPERange,
    };
};

const amrapAsNumber = (amrap: string[] = []) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return amrap.map((item) => 999); // amrap string is defined as 999
};


// Returns the initials of an exercise
export const getInitials = (name: string) => {
    const words = name.trim().split(" ");
    const initials = words.map(word => word[0].toUpperCase());
    if (initials.length > 2) {
        return initials.slice(0, 2).join("");
    }
    return initials.join("");
};

// Used to add week order and Id to program days for the drag and drop
export const appendWeekOrderAndIdToProgramDays = (program: TProgramCreatorDay[][]) => {

    let idCounter = 1;

    const updatedProgram = program.map((week, index) =>
        week.map((day) => ({
            ...day,
            weekOrder: String(index), // Weeks are 0-indexed and days are 1-indexed. Someone please fix this monstrosity.
            id: String(idCounter++),
        })));
    return updatedProgram;
};

export const getMaxFolderId = (routines: THevyRoutine[]): number => {

    if (routines.length === 0) return null;

    return routines.reduce((max, routine) => {
        return routine.folder_id > max ? routine.folder_id : max;
        }, routines[0].folder_id);
};


export const appendOrderToHevyRoutines = (routines: THevyRoutine[]): THevyRoutine[] => {

    const sortedRoutines = [...routines].sort((a, b) => a.folder_id - b.folder_id);

    let currentFolderId = sortedRoutines[0].folder_id;
    let orderCounter = 1;

    const updatedRoutines: THevyRoutine[] = sortedRoutines.map((routine) => {
        if (routine.folder_id !== currentFolderId) {
            currentFolderId = routine.folder_id;
            orderCounter = 1; // Reset order for each new folder
        }

        const updatedRoutine = {
            ...routine,
            order: String(orderCounter),
        };

        orderCounter++;
        return updatedRoutine;
    });

    return updatedRoutines;
};


// Flattens program into days with weekOrder and dayOrder fields. Will then be sorted with the drag and drop and upon output will be re-constructed into the proxima_program_schema
export const flattenProgram = (program: TProgramCreatorDay[][]) => {
    return program.flat();
};

// Re-orders the day order field on the de-structured proxima program
export const reorder = (days: TProgramCreatorDay[]) => {

    const groupedByWeek: Record<number, TProgramCreatorDay[]> = days.reduce((acc, item) => {
        if (typeof item.weekOrder !== "string") return acc;
        const wkOrder = Number(item.weekOrder);
        if (!acc[wkOrder]) acc[wkOrder] = [];
        acc[wkOrder].push(item);
        return acc;
    }, {} as Record<number, TProgramCreatorDay[]>);


    days = Object.values(groupedByWeek).flatMap((group) =>
        group.map((item, index) => ({
            ...item,
            order: String(index + 1), // 1-based order per weekOrder
        })),
    );

    return days;
};

// Turns one routine returned from AI into a program
// Turns one routine returned from AI into a program
export const buildPushPullLegsRoutine = async (push: THevyRoutine, pull: THevyRoutine, legs: THevyRoutine, programLength: number, numberOfDaysPerWeek: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    if (numberOfDaysPerWeek === 3) {
        for (let week = 0; week < programLength; week++) {
            const weekRoutines = [
                {
                    ...structuredClone(push),
                    id: String(currentId++),
                    folder_id: week,
                    order: "1",
                    exercises: replaceHevyExercises(push.exercises, hevyExercises),
                },
                {
                    ...structuredClone(pull),
                    id: String(currentId++),
                    folder_id: week,
                    order: "2",
                    exercises: replaceHevyExercises(pull.exercises, hevyExercises),
                },
                {
                    ...structuredClone(legs),
                    id: String(currentId++),
                    folder_id: week,
                    order: "3",
                    exercises: replaceHevyExercises(legs.exercises, hevyExercises),
                },
            ];

          routines.push(...weekRoutines);
        }
    } else if (numberOfDaysPerWeek === 6) {
        for (let week = 0; week < programLength; week++) {
            const weekRoutines = [
                {
                    ...structuredClone(push),
                    id: String(currentId++),
                    folder_id: week,
                    order: "1",
                    exercises: replaceHevyExercises(push.exercises, hevyExercises),
                },
                {
                    ...structuredClone(pull),
                    id: String(currentId++),
                    folder_id: week,
                    order: "2",
                    exercises: replaceHevyExercises(pull.exercises, hevyExercises),
                },
                {
                    ...structuredClone(legs),
                    id: String(currentId++),
                    folder_id: week,
                    order: "3",
                    exercises: replaceHevyExercises(legs.exercises, hevyExercises),
                },
                {
                    ...structuredClone(push),
                    id: String(currentId++),
                    folder_id: week,
                    order: "4",
                    exercises: replaceHevyExercises(push.exercises, hevyExercises),
                },
                {
                    ...structuredClone(pull),
                    id: String(currentId++),
                    folder_id: week,
                    order: "5",
                    exercises: replaceHevyExercises(pull.exercises, hevyExercises),
                },
                {
                    ...structuredClone(legs),
                    id: String(currentId++),
                    folder_id: week,
                    order: "6",
                    exercises: replaceHevyExercises(legs.exercises, hevyExercises),
                },
            ];

          routines.push(...weekRoutines);
        }

    }

    return routines;
};

export const buildUpperLowerRoutine = async (upper: THevyRoutine, lower: THevyRoutine, programLength: number, numberOfDaysPerWeek: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    if (numberOfDaysPerWeek === 2) {
        for (let week = 0; week < programLength; week++) {
            const weekRoutines = [
                {
                    ...structuredClone(upper),
                    id: String(currentId++),
                    folder_id: week,
                    order: "1",
                    exercises: replaceHevyExercises(upper.exercises, hevyExercises),
                },
                {
                    ...structuredClone(lower),
                    id: String(currentId++),
                    folder_id: week,
                    order: "2",
                    exercises: replaceHevyExercises(lower.exercises, hevyExercises),
                },

            ];

          routines.push(...weekRoutines);
        }
    } else if (numberOfDaysPerWeek === 4) {
        for (let week = 0; week < programLength; week++) {
            const weekRoutines = [
                {
                    ...structuredClone(upper),
                    id: String(currentId++),
                    folder_id: week,
                    order: "1",
                    exercises: replaceHevyExercises(upper.exercises, hevyExercises),
                },
                {
                    ...structuredClone(lower),
                    id: String(currentId++),
                    folder_id: week,
                    order: "2",
                    exercises: replaceHevyExercises(lower.exercises, hevyExercises),
                },
                {
                    ...structuredClone(upper),
                    id: String(currentId++),
                    folder_id: week,
                    order: "3",
                    exercises: replaceHevyExercises(upper.exercises, hevyExercises),
                },
                {
                    ...structuredClone(lower),
                    id: String(currentId++),
                    folder_id: week,
                    order: "4",
                    exercises: replaceHevyExercises(lower.exercises, hevyExercises),
                },

            ];

          routines.push(...weekRoutines);
        }
    }

    return routines;
};


export const buildFiveDayRoutine = async (chest: THevyRoutine, back: THevyRoutine, legs: THevyRoutine, shoulders: THevyRoutine, arms: THevyRoutine, programLength: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    for (let week = 0; week < programLength; week++) {
        const weekRoutines = [
            {
                ...structuredClone(chest),
                id: String(currentId++),
                folder_id: week,
                order: "1",
                exercises: replaceHevyExercises(chest.exercises, hevyExercises),
            },
            {
                ...structuredClone(back),
                id: String(currentId++),
                folder_id: week,
                order: "2",
                exercises: replaceHevyExercises(back.exercises, hevyExercises),
            },
            {
                ...structuredClone(legs),
                id: String(currentId++),
                folder_id: week,
                order: "3",
                exercises: replaceHevyExercises(legs.exercises, hevyExercises),
            },
            {
                ...structuredClone(shoulders),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(shoulders.exercises, hevyExercises),
            },
            {
                ...structuredClone(arms),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(arms.exercises, hevyExercises),
            },
        ];

        routines.push(...weekRoutines);
    }

    return routines;
};


export const buildSevenDayRoutine = async (push: THevyRoutine, pull: THevyRoutine, legs: THevyRoutine, cardio: THevyRoutine, programLength: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    for (let week = 0; week < programLength; week++) {
        const weekRoutines = [
            {
                ...structuredClone(push),
                id: String(currentId++),
                folder_id: week,
                order: "1",
                exercises: replaceHevyExercises(push.exercises, hevyExercises),
            },
            {
                ...structuredClone(pull),
                id: String(currentId++),
                folder_id: week,
                order: "2",
                exercises: replaceHevyExercises(pull.exercises, hevyExercises),
            },
            {
                ...structuredClone(legs),
                id: String(currentId++),
                folder_id: week,
                order: "3",
                exercises: replaceHevyExercises(legs.exercises, hevyExercises),
            },
            {
                ...structuredClone(push),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(push.exercises, hevyExercises),
            },
            {
                ...structuredClone(pull),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(pull.exercises, hevyExercises),
            },
            {
                ...structuredClone(legs),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(legs.exercises, hevyExercises),
            },
            {
                ...structuredClone(cardio),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(cardio.exercises, hevyExercises),
            },
        ];

        routines.push(...weekRoutines);
    }

    return routines;
};


export const buildOneDayRoutine = async (day: THevyRoutine, programLength: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    for (let week = 0; week < programLength; week++) {
        const weekRoutines = [
            {
                ...structuredClone(day),
                id: String(currentId++),
                folder_id: week,
                order: "1",
                exercises: replaceHevyExercises(day.exercises, hevyExercises),
            },

        ];

        routines.push(...weekRoutines);
    }

    return routines;
};



// Re-orders the day order field on the Hevy routine program
export const reorderHevy = (routines: THevyRoutine[]): THevyRoutine[] => {
    // Group routines by folder_id
    const groupedByFolder: Record<number, THevyRoutine[]> = routines.reduce((acc, item) => {
        // if (typeof item.folder_id !== "number") return acc;
        if (!acc[item.folder_id]) acc[item.folder_id] = [];
        acc[item.folder_id].push(item);
        return acc;
    }, {} as Record<number, THevyRoutine[]>);

    // Reorder the routines and add an order based on folder_id grouping
    const updatedRoutines = Object.values(groupedByFolder).flatMap((group) =>
        group.map((item, index) => ({
            ...item,
            order: String(index + 1), // 1-based order within each folder_id group
        })),
    );

    return updatedRoutines;
};

export const removeOrderHevy = (routines: THevyRoutine[]): Omit<THevyRoutine, 'order'>[] => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return routines?.map(({ order, ...rest }) => rest);
};

export const deFlattenHevyRoutine = (routines: THevyRoutine[]): THevyRoutine[][] => {
    return Object.entries(
      routines.reduce<Record<number, THevyRoutine[]>>((acc, routine) => {
        const folderId = routine.folder_id;

        if (!acc[folderId]) {
          acc[folderId] = [];
        }

        acc[folderId].push(routine);
        return acc;
      }, {}),
    )
      // Sort folder groups by folder_id
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      // Return just the routines sorted by their order within each folder
      .map(([, group]) => group.sort((a, b) => parseInt(a.order ?? "1") - parseInt(b.order ?? "1")));
  };


export const deFlattenProgram = (flattenedProgram: TProgramCreatorDay[]): TProgramCreatorDay[][] => {
    return Object.entries(
      flattenedProgram.reduce<Record<number, TProgramCreatorDay[]>>((acc, day) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { weekOrder, id, ...rest } = day; // Destructure to remove weekOrder
        const week = parseInt(weekOrder || '0'); // Ensure it's treated as a number

        if (!acc[week]) {
          acc[week] = [];
        }

        acc[week].push(rest); // Push the rest of the day (without weekOrder) to the correct week
        return acc;
      }, {}),
    )
      // Sort the weeks based on weekOrder (keys)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      // Map the entries to return just the days in the correct week order
      .map(([, days]) => days.sort((a, b) => parseInt(a.order) - parseInt(b.order))); // Sort days by order
  };


// Converts TProgramCreatorDay[][] into TScheduleWorkouts[][]
export const programCreatorDayToScheduleWorkouts = (program: TProgramCreatorDay[][]): TScheduleWorkouts[][] => {
    return program.map((week, weekIndex) =>
        week.map((day) => ({
            nthDay: Number(day.order),
            nthWeek: weekIndex,
            day_title: day.day_title,
            program_workout_exercises: (day.exercises || []).map(exercise => ({
                reps: exercise.reps_type?.reps,
                reps_max: exercise.reps_type?.reps_max,
                reps_range: exercise.reps_type?.reps_range,
                time_taken: exercise.reps_type?.time_taken,
                time_range: exercise.reps_type?.time_range,
                amrap: exercise.reps_type?.amrap,
                rpe: exercise.intensity?.rpe,
                rpe_range: exercise.intensity?.rpe_range,
                percent_rm: exercise.intensity?.percent_rm,
                weights: exercise.intensity?.weights,
                exercises: exercise.exercise,
            })),
        })),
    );
};

export const getNumberRoutineFolders = (routines: THevyRoutine[]): number => {
    if (routines.length === 0) return 0;

    const folderIds = routines.map(routine => routine.folder_id);
    const minFolderId = Math.min(...folderIds);
    const maxFolderId = Math.max(...folderIds);

    return maxFolderId - minFolderId + 1;
};

// Swaps an exercise generated by AI with the most similar exercise in hevy exercises
export const replaceHevyExercises = (exercises: THevyExercise[], hevyExercises: THevyExerciseTemplate[]) : THevyExercise[] => {
    // Fuse Fuzzy match options
    const options = {
        isCaseSensitive: false,
        includeScore: false,
        minMatchCharLength: 2,
        shouldSort: true,
        threshold: 0.6,
        keys: [
            "title",
        ],
    };

    const fuse = new Fuse(hevyExercises, options);

    const updatedExercises = exercises.map((exercise) => {
        const fuseResults = fuse.search(exercise.title, { limit: 1});
        const match = fuseResults?.[0]?.item;

        if (match) {
            return {
                ...exercise,
                title: match.title,
                exercise_template_id: match.id,
            };
        }

        return exercise;
    });

    return updatedExercises;
};

// Returns the proxima exercise gif_id for a specific hevy exercise using fuzzy matching
export const getExerciseGifIdForHevyExercise = async (exercise_name: string) => {

    // Fuse Fuzzy match options
    const options = {
        isCaseSensitive: false,
        includeScore: false,
        minMatchCharLength: 2,
        shouldSort: true,
        threshold: 0.2,
        keys: [
            "name_english",
        ],
    };

    const proximaExercises = await getExercises();

    const fuse = new Fuse(proximaExercises, options);
    const fuseResults = fuse?.search(exercise_name, { limit: 1});
    if (!fuseResults) {
        return "";
    }

    return fuseResults?.[0]?.item?.gif_id ?? "";
};

// Returns the proxima exercise exercise_id for a specific hevy exercise using fuzzy matching
export const getExerciseIdForHevyExercise = async (exercise_name: string) => {

    // Fuse Fuzzy match options
    const options = {
        isCaseSensitive: false,
        includeScore: false,
        minMatchCharLength: 2,
        shouldSort: true,
        threshold: 0.2,
        keys: [
            "name_english",
        ],
    };

    const proximaExercises = await getExercises();

    const fuse = new Fuse(proximaExercises, options);
    const fuseResults = fuse?.search(exercise_name, { limit: 1});
    if (!fuseResults) {
        return "";
    }

    return fuseResults?.[0]?.item?.id ?? "";
};

