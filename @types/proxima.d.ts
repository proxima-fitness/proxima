/** A Proxima Program in the Program Builder is defined as: */
/***********************************************************/

type TProgramCreatorDay = {
    order: string, // 1-indexed
    day_title?: string;
    exercises?: TProgramCreatorExercise[];
    /* These two fields are used for the drag and drop but not stored in the DB */
    weekOrder?: string; // 0-indexed
    notes: string; // Day notes
    id?: string;
}

type TProgramCreatorExercise = {
    notes?: string;
    hevy_exercise_templates?: THevyExerciseTemplate;
    sets?: number;
    sets_type?: ("normal" | "warmup" | "dropset" | "failure")[];
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


type TProgramPage = {
    program: TProgram[];
    schedule: TProgramDetails[];
}

type TProgram = {
    id: number;
    title: string;
    details: string;
    program_length: number;
    workout_duration: number;
    equipment: string;
    specialization: string[];
    difficulty: string[];
    user_id: string;
    thumbnail?: Blob;
    prompt?: string;
    saves: number;
}

type TDialog = {
    weekOrder: number;
    dayOrder: number;
    isOpen: boolean;
    exerciseIndex?: number; // location of exercise to be edited
    editExercise?: TAddExercise; // current value of exercise to be edited
}

type TAddExercise = {
    id: string;
    repTypeValue: "reps" | "reps_max" | "reps_range" | "time_taken" | "time_range" | "amrap" ;
    intensityValue: "percent_rm" | "rpe_range" | "rpe" | "weights";
    reps: number[]; // DATA for any rep type that is not a range
    intensityData: number[]; // DATA for any intensity that is not a range
    repsWithTimeAndRepRange: number[][]; // DATA for rep/time range
    intensityDataWithRPERange: number[][]; // DATA for rpe range
    setTypes: ("normal" | "warmup" | "dropset" | "failure")[];
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
    hevy_exercise_templates?: THevyExerciseTemplate;
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
    hevy_exercise_templates?: THevyExerciseTemplate;
};

type TCard = {
    title: string,
    order: string,
    day_title: string,
    exercises: TProgramCreatorExercise[],
    id: string,
    weekOrder: string,
}
