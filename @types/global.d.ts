/** A Proxima Program in the Program Builder is defined as: */
/***********************************************************/
type TProgramCreatorDay = {
    order: string, // 1-indexed
    day_title?: string;
    exercises?: TProgramCreatorExercise[];
    /* These two fields are used for the drag and drop but not stored in the DB */
    weekOrder?: string; // 0-indexed
    id?: string;
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

// A Hevy routine is the equivalent of a Proxima Workout
// A Hevy routine folder groups routines like a Proxima Program groups Workouts
// Except the routine folders will have to be labeled and organized programmatically
// to represent weeks in a program

type TTextToJsonResponse = {
    workout_days: {
        day_title: string;
        exercises: {
            reps: number;
            rpe: number;
            sets: number;
            title: string;
        }[];
    }[];
}

type TTextToJsonSchema =
    "workout_history_schema" |
    "program_creator_day_schema" |
    "saved_workout_schema" |
    "one_day_schema" | // Schema for 1 Workout
    "ppl_schema" | // Schema for Push, Pull, Legs Split
    "ul_schema" | // Schema for Upper Lower Split
    "cblsa_schema" | // Schema for Chest, Back, Legs, Shoulders, Arms Split
    "pplc_schema" | // Schema for Push, Pull, Legs, Cardio Split
    "hevy_routine_schema";

type TTextToJsonRequest = {
    empty: string; // used to open a program builder with no AI
    search: string; // goes into AI Prompt
    sex: string; // goes into AI Prompt
    age: string; // goes into AI Prompt
    daysPerWeek: string; // used in the buildRoutine function
    specificDays: string; // Ignore for now
    programLength: string; // used in the buildRoutine function
    workoutDuration: string; // Ignore for now
    activityLevel: string;  // goes into AI Prompt
    goals: string; // goes into AI Prompt
    specialization: string; // goes into AI Prompt
    equipment: string; // goes into AI Prompt
    focusAreas: string; // goes into AI Prompt
    difficultyLevel: string; // goes into AI Prompt
    excludeAreas: string; // goes into AI Prompt
    excludeEquipment: string; // goes into AI Prompt
    excludeSpecializations: string; // goes into AI Prompt
    healthIssues: string; // goes into AI Prompt
}

type THevyRoutineAIResponse = {
    routine: THevyRoutine;
};


type THevyRoutineFolder = {
    id: number; // The routine folder ID
    index: number; // The routine folder index. Describes the order of the folder in the list.
    title: string; // The routine folder title
    updated_at: string; // ISO 8601 timestamp of when the routine was last updated. example: 2021-09-14T12:00:00Z
    created_at: string; // ISO 8601 timestamp of when the routine was created. example: 2021-09-14T12:00:00Z
}

type THevyRoutine = {
    id: string; // The routine ID
    title: string; // The routine title
    folder_id: number; // An ID for the folder this routine corresponds to. (Also used to choose the week routine is assigned in drag and drop)
    updated_at?: string; // ISO 8601 timestamp of when the routine was last updated. example: 2021-09-14T12:00:00Z
    created_at?: string; // ISO 8601 timestamp of when the routine was created. example: 2021-09-14T12:00:00Z
    exercises: THevyExercise[];

    /* This field are used for the drag and drop but not stored in the DB */
    order?: string // The day this Routine is assigned on (1-indexed)
}

type THevyExercise = {
    index: number; // Index indicating the order of the exercise in the routine.
    title: string; // Title of the exercise
    notes: string; // Routine notes on the exercise
    exercise_template_id: string; // The id of the exercise template. This can be used to fetch the exercise template.
    supersets_id: number | null; // The id of the superset that the exercise belongs to. A value of null indicates the exercise is not part of a superset.
    sets: THevySets[];

}

type THevySets = {
    index: number; // Index indicating the order of the set in the routine.
    type: string; // The type of set. This can be one of 'normal', 'warmup', 'dropset', 'failure'
    weight_kg: number | null; // Weight lifted in kilograms
    reps: number | null; // Number of reps logged for the set
    distance_meters: number | null; // Number of meters logged for the set
    duration_seconds: number | null; // Number of seconds logged for the set
    rpe: number | null; // The RPE logged for the set
    custom_metric: number | null; // Custom metric logged for the set (Currently only used to log floors or steps for stair machine exercises)
}

type THevyExerciseTemplates = {
    page: number; // Current page number
    page_count: number; // Total number of pages
    exercise_templates: THevyExerciseTemplate[]
}

type THevyExerciseTemplate = {
    id: string; // The exercise template ID.
    title: string; // The exercise title.
    type: string; // The exercise type.
    primary_muscle_group: string; // The primary muscle group of the exercise
    secondary_muscle_groups: string[]; // The secondary muscle groups of the exercise
    is_custom: boolean; // indicating whether the exercise is a custom exercise
    equipment: string; // The exercise equipment
}

type THevyDialog = {
    folder_id: number;
    dayOrder: number;
    isOpen: boolean;
    exerciseIndex?: number; // location of exercise to be edited
    editExercise?: THevyAddExercise; // current value of exercise to be edited
}

type THevyAddExercise = {
    id: string;
    repTypeValue: "reps" | "distance_meters" | "duration_seconds" | "custom_metric";
    intensityValue: "rpe" | "weight_kg";
    reps: number[] | null; // DATA for any rep type that is not a range
    intensityData: number[] | null; // DATA for any intensity that is not a range
}

type THevyRepsTypes = {
    reps?: number[],
    distance_meters?: number[],
    duration_seconds?: number[],
    custom_metric?: number[],
}

type THevyIntensityTypes = {
    rpe?: number[],
    weight_kg?: number[],
}

interface IIsHevyContextType {
    isHevy: boolean;
    setIsHevy: (value: boolean) => void;
}

interface IPreviewContextType {
    isPreview: boolean;
    setIsPreview: (value: boolean) => void;
}

/***********************************************************/

type TProgramPage = {
    program: TProgram[];
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
    content: object;
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
type TCard = {
    title: string,
    order: string,
    day_title: string,
    exercises: TProgramCreatorExercise[],
    id: string,
    weekOrder: string,
}

type THevyCard = {
    title: string,
    order: string,
    day_title: string,
    exercises: THevyExercise[],
    id: string,
    folder_id: number,
}

type TBreadcrumb = {
    href: string;
    label: string;
}
