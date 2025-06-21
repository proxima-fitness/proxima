import { amrapAsNumber, getExerciseFromLocalStorageByID } from "@/utils/general/helpers";

// Used to add week order and Id to program days for the drag and drop
export const appendWeekOrderAndIdToProgramDays = (program: TProgramCreatorDay[][]) => {

    if (!program || program.length === 0) return [];

    let idCounter = 1;

    const updatedProgram = program.map((week, index) =>
        week.map((day) => ({
            ...day,
            weekOrder: String(index), // Weeks are 0-indexed and days are 1-indexed. Someone please fix this monstrosity.
            id: String(idCounter++),
        })));
    return updatedProgram;
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


// Re-orders the day order field on the Hevy routine program
export const reorderHevy = (routines: THevyRoutine[]): THevyRoutine[] => {
    // Group routines by folder_id
    const groupedByFolder: Record<number, THevyRoutine[]> = routines.reduce((acc, item) => {
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

// Sorting by day order not by order in the array
export const sortHevyByOrder = (routines: THevyRoutine[]): THevyRoutine[] => {
    const groupedByFolder: Record<number, THevyRoutine[]> = routines.reduce((acc, item) => {
        if (!acc[item.folder_id]) acc[item.folder_id] = [];
        acc[item.folder_id].push(item);
        return acc;
    }, {} as Record<number, THevyRoutine[]>);

    const sortedRoutines = Object.values(groupedByFolder).flatMap((group) =>
        group.sort((a, b) => Number(a.order) - Number(b.order))
    );

    return sortedRoutines;
};


export const removeOrderHevy = (routines: THevyRoutine[]): Omit<THevyRoutine, 'order'>[] => {
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
    if (routines.length === 0) return 12;

    const folderIds = routines.map(routine => routine.folder_id);
    const minFolderId = Math.min(...folderIds);
    const maxFolderId = Math.max(...folderIds);

    return maxFolderId - minFolderId + 1;
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

    return {
        exercise: await getExerciseFromLocalStorageByID(addExercise.id),
        sets: sets,
        sets_type: addExercise.setTypes,
        reps_type: { [ addExercise.repTypeValue ] : addReps },
        intensity: { [ addExercise.intensityValue ]: addIntensity},
    } as TProgramCreatorExercise;

};

// Convertes TAddExercise to THevyExercise type
export const hevyAddExerciseToHevySetsConverter = (addExercise: THevyAddExercise): THevySets[] => {
    const sets: THevySets[] = (addExercise.reps ?? []).map((rep, setIndex) => {
        return {
            index: setIndex,
            type: addExercise.setTypes[setIndex],
            weight_kg: addExercise.intensityValue === "weight_kg" ? addExercise.intensityData?.[setIndex] ?? null: null,
            reps: addExercise.repTypeValue.includes("reps") ? rep ?? null : null,
            distance_meters: addExercise.repTypeValue.includes("distance_meters") ? rep ?? null : null,
            duration_seconds: addExercise.repTypeValue.includes("duration_seconds") ? rep ?? null : null,
            rpe: addExercise.intensityValue.includes("rpe") ? addExercise.intensityData?.[setIndex] ?? null : null,
            custom_metric: addExercise.repTypeValue.includes("custom_metric") ? rep ?? null : null,
        };
    });

    return sets;
};


// Converts THevyExercise into THevyAddExercise
export const convertHevyExerciseIntoHevyAddExercise = (exercise: THevyExercise): THevyAddExercise => {

    // Determine the repTypeValue based on the first non-zero value in a rep-type field
    const firstSet = exercise.sets[0];

    let repTypeValue: THevyAddExercise["repTypeValue"] = "reps";
    if (firstSet?.distance_meters !== null && firstSet?.distance_meters > 0) {
      repTypeValue = "distance_meters";
    } else if (firstSet?.duration_seconds !== null && firstSet?.duration_seconds > 0) {
      repTypeValue = "duration_seconds";
    } else if (firstSet?.custom_metric !== null && firstSet?.custom_metric > 0) {
      repTypeValue = "custom_metric";
    }

    // Determine intensityValue
    const intensityValue: THevyAddExercise["intensityValue"] =
      firstSet?.weight_kg ?? 0 > 0 ? "weight_kg" : "rpe";

    const rawReps = exercise.sets.map(set => {
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
    const filteredReps = rawReps.filter((val): val is number => val !== null && val !== undefined);
    const reps: number[] | null = filteredReps.length > 0 ? filteredReps : null;

    const rawIntensityValues = exercise.sets.map(set => intensityValue === "weight_kg" ? set.weight_kg : set.rpe);
    const filteredIntensityData = rawIntensityValues.filter(
        (val): val is number => val !== null && val !== undefined
    );
    const intensityData: number[] | null = filteredIntensityData.length > 0 ? filteredIntensityData : null;

    return {
        id: exercise.exercise_template_id,
        repTypeValue,
        intensityValue,
        reps,
        intensityData,
        restSeconds: exercise.rest_seconds,
        setTypes: exercise.sets.map(set => (set.type) as ("normal" | "warmup" | "dropset" | "failure")),
    };
};


// Converts TProgramCreatorExercise into TAddExercise type
export const convertProgramCreatorExerciseToAddExercise = (programCreatorExercise: TProgramCreatorExercise): TAddExercise => {

    if (!programCreatorExercise.exercise) {
      throw new Error("Missing exercise data.");
    }

    const { exercise, reps_type, intensity, sets_type } = programCreatorExercise;

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
      setTypes: sets_type ?? ["normal","normal","normal","normal"],
      reps,
      intensityData,
      repsWithTimeAndRepRange,
      intensityDataWithRPERange,
    };
};
