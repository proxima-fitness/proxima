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

type TProgramDetails = {
    id?: string;
    title?: string;
    schedule_workouts: {
        nthDay: number;
        nthWeek: number;
        day_title?: string;
        program_workout_exercises: TSavedWorkoutExercise[];
    }[];
}

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

type TExercise = {
    id: string;
    gif_id?: string;
    instructions?: string[];
    name_english: string;
    name_espanol: string;
    name_portugues: string;
    name_francais: string;
}

type TProgramFilters = {
    specialization?: string[];
    difficulty?: string[];
    program_length?: string;
    workout_duration?: string;
    equipment?: string;
    title?: string;
};

type TFilterGroup = {
    title: "Program Length" | "Workout Duration" | "Equipment" | "Specialization" | "Difficulty";
    value: "program_length" | "workout_duration" | "equipment" | "specialization" | "difficulty";
}

type TFilterGroupOption = {
    type: "badge" | "slider" | "combobox";
    group: "program_length" | "workout_duration" | "equipment" | "specialization" | "difficulty";
    value: string[];
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
