/** A Proxima Program in the Program Builder is defined as: */
/***********************************************************/
type TProgramCreatorDay = {
    order: string,
    day_title?: string;
    exercises?: TProgramCreatorExercise[];
}

type TProgramCreatorExercise = {
    exercise?: TExercise;
    sets?: number;
    reps_type?: TRepsTypes;
    intensity?: TIntensityTypes;
}

type TIntensityTypes = {
    rpe?: number[];
    rpe_range?: number[][];
    percent_rm?: number[];
    weights?: number[];
}

type TRepsTypes = {
    reps?: number[];
    reps_range?: number[][];
    reps_max?: number[];
    amrap?: string[];
    time_taken?: number[];
    time_range?: number[][];
}

type TExercise = {
    id: string;
    gif_id?: string;
    instructions?: string[];
    name_english: string;
    name_espanol: string;
    name_portugues: string;
    name_francais: string;
}

/** A Hevy Routine in the Program Builder is defined as: */
/***********************************************************/

type THevyRoutineDay = {

}

/***********************************************************/

type TProgramPage = {
    program: TProgram[];
    thumbnail: Blob;
    schedule: TProgramDetails[];
}

type TProgram = {
    id: string;
    title: string;
    details: string;
    program_length: number;
    workout_duration: number;
    equipment: string;
    specialization: string[];
    difficulty: string[];
    user_id: string;
    thumbnail?: Blob;
}

type TAddExerciseDialog = {
    currentWeek: number;
    currentDay: number;
    isOpen: boolean;
}

type TAddExercise = {
    id: string;
    repTypeValue: "reps" | "reps_max" | "reps_range" | "time" | "time_range" | "amrap" ;
    intensityValue: "percent_rm" | "rpe_range" | "rpe";
    reps: number[]; // DATA for any rep type that is not a range
    intensityData: number[]; // DATA for any intensity that is not a range
    repsWithTimeAndRepRange: number[][]; // DATA for rep/time range
    intensityDataWithRPERange: number[][]; // DATA for rpe range
}

type TQuote = {
    quote: string;
    author: string;
}

type TProgramDetails = {
    id?: string;
    title?: string;
    schedule_workouts: TScheduleWorkouts[];
}

type TScheduleWorkouts = {
    nthDay: number;
    nthWeek: number;
    day_title?: string;
    program_workout_exercises: TSavedWorkoutExercise[];
}

type TAPIProgramWorkoutExercises = {
    reps?: number[];
    weights?: number[];
    reps_max?: number[];
    reps_range?: number[][] ;
    rpe?: number[];
    rpe_range?: number[][];
    time_taken?: number[];
    time_range?: number[][];
    amrap?: string[];
    percent_rm?: number[];
    exercises: TExercise;
};

type TSavedWorkoutExercise = {
    reps?: number[];
    reps_max?: number[];
    reps_range?: number[][];
    time_taken?: number[];
    time_range?: number[][];
    amrap?: string[];
    rpe?: number[];
    rpe_range?: number[][];
    percent_rm?: number[];
    weights?: number[];
    exercises?: TExercise;
}

type TProgramFilters = {
    specialization?: string[];
    difficulty?: string[];
    program_length?: string;
    workout_duration?: string;
    equipment?: string;
    title?: string;
};

type TFilterGroupOption = {
    component: "badge" | "slider" | "combobox";
    type: "program_length" | "workout_duration" | "equipment" | "specialization" | "difficulty";
    title: "Program Length" | "Workout Duration" | "Equipment" | "Specialization" | "Difficulty";
    values: string[];
}

type TBlog = {
    id: number;
    created_at: string;
    updated_at: string;
    title: string;
    subtitle: string;
    content: Object;
    time: number;
    media_url: string; // just the filename (icon.png)
    image_url?: string; // the public url e.g. (https://api.blog.co/icon.png)
}

type TUserDetails = {
    first_name: string;
    last_name: string;
    username: string;
    bio: string;
    created_at: string;
}
