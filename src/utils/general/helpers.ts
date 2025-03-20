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

export const amrapAsNumber = (amrap: string[] = []) => {
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

