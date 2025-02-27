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
    if (addExercise.repTypeValue === "amrap") {
        addReps = addExercise.reps.map(() => addExercise.repTypeValue);
    } else if (addExercise.repTypeValue === "reps_range" || addExercise.repTypeValue === "time_range") {
        addReps = addExercise.repsWithTimeAndRepRange;
    } else {
        addReps = addExercise.reps;
    }
    if (addExercise.intensityValue === "rpe_range") {
        addIntensity = addExercise.intensityDataWithRPERange;
    } else {
        addIntensity = addExercise.intensityData;
    }

    const newExercise = {
        exercise: await getExerciseFromLocalStorageByID(addExercise.id),
        sets: addExercise.reps.length,
        reps_type: { [ addExercise.repTypeValue ] : addReps },
        intensity: { [ addExercise.intensityValue ]: addIntensity},
    } as TProgramCreatorExercise;

    return newExercise;
}

// Returns the initials of an exercise
export const getInitials = (name: string) => {
    const words = name.trim().split(" ");
    const initials = words.map(word => word[0].toUpperCase());
    if (initials.length > 2) {
        return initials.slice(0, 2).join("");
    }
    return initials.join("");
};
