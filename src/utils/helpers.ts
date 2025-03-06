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
        sets = addExercise.repsWithTimeAndRepRange.length
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
    const reps = reps_type?.reps || reps_type?.reps_max || reps_type.time_taken || amrapAsNumber(reps_type.amrap) || []; // AMRAP NEEDS TO BE FIXED HERE
    const intensityData = intensity?.percent_rm || intensity?.rpe || intensity.weights || [];
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
        })))
    return updatedProgram;
};

// Flattens program into days with weekOrder and dayOrder fields. Will then be sorted with the drag and drop and upon output will be re-constructed into the proxima_program_schema
export const flattenProgram = (program: TProgramCreatorDay[][]) => {
    return program.flat();
};

// Re-orders the day order field on the de-structured proxima program
export const reorder = (days: TProgramCreatorDay[]) => {

    const groupedByWeek: Record<number, TProgramCreatorDay[]> = days.reduce((acc, item) => {
        if (!acc[item.weekOrder]) acc[item.weekOrder] = [];
        acc[item.weekOrder].push(item);
        return acc;
    }, {} as Record<number, TProgramCreatorDay[]>);

    days = Object.values(groupedByWeek).flatMap((group) =>
        group.map((item, index) => ({
            ...item,
            order: String(index + 1), // 1-based order per weekOrder
        }))
    );

    return days;
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
      }, {})
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
                exercises: exercise.exercise
            }))
        }))
    );
};
