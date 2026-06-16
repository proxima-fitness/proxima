import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";

declare global {
// Here we will define the global types for the project and the union types

// Generic Types


type TGenericCard = TCard | THevyCard;
type TGenericDialog = TDialog | THevyDialog;
type TGenericAddExercise = TAddExercise | THevyAddExercise;
type TGenericRepsTypes = TRepsTypes | THevyRepsTypes;
type TGenericIntensityTypes = TIntensityTypes | THevyIntensityTypes;
type TGenericDay = TProgramCreatorDay | THevyRoutine;

// Universal Types

type TBreadcrumb = {
    href: string;
    label: string;
}

type TQuote = {
    quote: string;
    author: string;
}

type TUserDetails = {
    first_name: string;
    last_name: string;
    username: string;
    bio: string;
    created_at: string;
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

type TFilterGroupOption = {
    component: "badge" | "slider" | "combobox";
    type: "program_length" | "workout_duration" | "equipment" | "specialization" | "difficulty";
    title: "Program Length" | "Workout Duration" | "Equipment" | "Specialization" | "Difficulty";
    values: string[];
}

type TProgramFilters = {
    specialization?: string[];
    difficulty?: string[];
    program_length?: string;
    workout_duration?: string;
    equipment?: string;
    title?: string;
};

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
    daysPerWeek: string; // used in the buildWeek function
    specificDays: string; // Ignore for now
    programLength: string; // used in the buildWeek function
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
    splitType: string; // Questionnaire: preferred split (option id, e.g. ppl, ul).
    exerciseVariability: string; // Questionnaire: exercise variability (little | lots | custom).
    progressionSystem: string; // Questionnaire: progression system option id.
    deloadWeek: string; // Questionnaire: deload week (yes | no).
    peakWeek: string; // Questionnaire: peak week (yes | no).
    programTitle: string; // goes into AI Prompt
    explore: string; // goes into AI Prompt
}

type TMessage = {
    id: number;
    role: "user" | "assistant";
    content: string;
}


type TFeatureLimits = {
    user_id: string;
    tier: string;
    has_active_subscription: boolean | null;
    max_monthly_exports: number;
    monthly_exports_used: number;
    remaining_exports: number;
    max_monthly_llm_requests: number;
    monthly_llm_requests_used: number;
    remaining_llm_requests: number;
};


/** One completed workout from `GET /v1/workouts` or `GET /v1/workouts/{id}`. */
type THevyWorkoutExercise = {
    index: number;
    title: string;
    notes?: string;
    exercise_template_id: string;
    superset_id?: number | null;
    sets: THevySets[];
};

type THevyWorkout = {
    id: string;
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    exercises: THevyWorkoutExercise[];
    updated_at?: string;
    created_at?: string;
};

type THevyWorkoutsResponse = {
    page: number;
    page_count: number;
    workouts: THevyWorkout[];
};

type TWorkoutHistoryDb = SupabaseClient<Database>;

type TImportHevyWorkoutResult =
    | { status: "inserted"; workoutId: string }
    | { status: "skipped"; workoutId: string }
    | { status: "error"; message: string };

type TSyncChunkResult = {
    backedUpCount: number;
    hevyCount: number;
    syncError: string | null;
    done: boolean;
    /** True when Hevy returned 429; client should back off and retry (not a terminal failure). */
    rateLimited?: boolean;
};

type TWorkoutSyncProgress = Pick<TSyncChunkResult, "backedUpCount" | "hevyCount" | "syncError" | "rateLimited"> & {
    /** User paused background sync for this browser session. */
    paused?: boolean;
};

type TWorkoutHistoryQueryOptions = {
    limit?: number;
    since?: string;
    canonicalExerciseIds?: string[];
};

type TWorkoutExerciseRow = Database["public"]["Tables"]["workout_exercises"]["Row"] & {
    canonical_exercises: Database["public"]["Tables"]["canonical_exercises"]["Row"];
    workout_sets: Database["public"]["Tables"]["workout_sets"]["Row"][];
};

type TBackedUpWorkout = Database["public"]["Tables"]["workouts"]["Row"] & {
    workout_exercises: TWorkoutExerciseRow[];
};

type THevyExerciseTemplateRow = Pick<
    Database["public"]["Tables"]["hevy_exercise_templates"]["Row"],
    | "id"
    | "title"
    | "normalized_title"
    | "type"
    | "primary_muscle_group"
    | "secondary_muscle_groups"
    | "equipment"
>;

type TRoutineResponse = {
    routine: TRoutine;
  };


type TExerciseStallResult = {
    name: string;
    weight: number;
    color: "green" | "yellow" | "red";
    trend: number[];
    hasStall: boolean;
    sessions: Array<{
        workoutId: string;
        date: string;
        totalVolume: number;
        maxWeight: number;
        /** Total reps in the workout (for bodyweight display when totalVolume is 0). */
        totalReps?: number;
    }>;
};

type TSelectOption = {
    [key: string]: string | boolean | undefined;
    value: string;
    label: string;
    disable?: boolean;
    fixed?: boolean;
};

type TMultiSelectRef = {
    selectedValue: TSelectOption[];
    input: HTMLInputElement;
    focus: () => void;
    reset: () => void;
};

type TQuestionOption = {
    id: string;
    label: string;
};

type TQuestion = {
    id: string;
    question: string;
    options: TQuestionOption[];
    allowOther?: boolean;
    type?: "select" | "multi-select" | "text-with-quickfill";
    subtitle?: { text: string; link?: string };
};

type TQuestionsPayload = {
    questions: TQuestion[];
    userRequest?: string;
    initialAnswers?: Record<string, string | string[]>;
};

type THevyProgramItem = {
    program_title: string;
    program: THevyRoutine[];
};

type TTestStatus = "passed" | "failed" | "okay" | "running";

type TBlindSpotSortOption = "most_activity" | "alphabetical";

type TBlindSpotStatusFilter = "all" | "progressing" | "stalling" | "stalled";

type TBlindSpotAnalysisSectionProps = {
    hevyPrograms?: THevyProgramItem[] | undefined;
    isLoadingHevy?: boolean;
};

type TLandingSectionVariant = "white" | "tint";

type TPrescriptionDisplayOptions = {
    selected?: boolean;
};

type THevyPromoBannerProps = {
    className?: string;
    onJumpToCheckout?: () => void;
};

type TConversationMessage = {
    role: "user" | "assistant" | "system" | "data" | "tool";
    content: string;
};

interface IPoundsOrKgContextValue {
	isInLbs: boolean;
	toggleModePreference: () => void;
}


interface IFollowersRow {
    follower_id: string | null;
    users: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

interface IFollowingRow {
    following_id: string | null;
    users: { first_name: string | null; last_name: string | null; email: string | null } | null;
}

/** Blocked users row from blocked_users table. */
interface IBlockedUserRow {
    blocked_id: string | null;
}

interface IProfilePictureContextValue {
	profilePicture: Blob | null;
	setProfilePicture: (newPicture: Blob | null) => void;
}

interface ISkillMetadata {
    name: string;
    description: string;
    path: string;
    allowedTools?: string[];
}

interface ISandbox {
    readFile(path: string, encoding: 'utf-8'): Promise<string>;
    readdir(
        path: string,
        opts: { withFileTypes: true },
    ): Promise<{ name: string; isDirectory(): boolean }[]>;
    exec(command: string): Promise<{ stdout: string; stderr: string }>;
}


/** A Hevy Routine in the Program Builder is defined as: */
/***********************************************************/

// A Hevy routine is the equivalent of a Proxima Workout
// A Hevy routine folder groups routines like a Proxima Program groups Workouts
// Except the routine folders will have to be labeled and organized programmatically
// to represent weeks in a program

// Hevy Routine Types

type THevyRoutineFolderResponse = {
    page: number;
    page_count: number;
    routine_folders: THevyRoutineFolder[];
}

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
    notes: string; // Routine notes on the routine
    /* This field are used for the drag and drop but not stored in the DB */
    order?: string // The day this Routine is assigned on (1-indexed)
}

type THevyExercise = {
    index: number; // 0-based position in the routine's exercises[] array.
    title: string; // Title of the exercise
    notes: string; // Routine notes on the exercise
    rest_seconds: string | null; // The rest time in seconds
    exercise_template_id: string; // The id of the exercise template. This can be used to fetch the exercise template.
    supersets_id: number | null; // The id of the superset that the exercise belongs to. A value of null indicates the exercise is not part of a superset.
    sets: THevySets[];
    /** UI-only: short explanation why this exercise was selected. Must not be sent to Hevy or other external systems. */
    reason?: string;
}

type THevySets = {
    index: number; // 0-based position in the exercise's sets[] array.
    type: string; // The type of set. This can be one of 'normal', 'warmup', 'dropset', 'failure'
    weight_kg: number | null; // Weight lifted in kilograms
    reps: number | null; // Number of reps logged for the set
    distance_meters: number | null; // Number of meters logged for the set
    duration_seconds: number | null; // Number of seconds logged for the set
    rpe: number | null; // The RPE logged for the set
    custom_metric: number | null; // Custom metric logged for the set (Currently only used to log floors or steps for stair machine exercises)
    rep_range: THevyRepRange | null;
}

type THevyRepRange = {
    start: number;
    end: number;
}


type THevyPostExerciseTemplateRequest = {
    exercise: THevyPostExerciseTemplate;
}

type THevyPostExerciseTemplate = {
    title: string;
    exercise_type: "weight_reps" | "reps_only" | "bodyweight_reps" | "bodyweight_assisted_reps" | "duration" | "weight_duration" | "distance_duration" | "short_distance_weight";
    equipment_category: "none" | "barbell" | "dumbbell" | "kettlebell" | "machine" | "plate" | "resistance_band" | "suspension" | "other";
    muscle_group: "abdominals" | "shoulders" | "biceps" | "triceps" | "forearms" | "quadriceps" | "hamstrings" | "calves" | "glutes" | "abductors" | "adductors" | "lats" | "upper_back" | "traps" | "lower_back" | "chest" | "cardio" | "neck" | "full_body" | "other";
    other_muscles: ("abdominals" | "shoulders" | "biceps" | "triceps" | "forearms" | "quadriceps" | "hamstrings" | "calves" | "glutes" | "abductors" | "adductors" | "lats" | "upper_back" | "traps" | "lower_back" | "chest" | "cardio" | "neck" | "full_body" | "other")[];
}

/** Success body for `POST /v1/exercise_templates`. OpenAPI documents `{ id: number }` but the live API may return a raw UUID string body. */
type THevyPostCustomExerciseResponse = {
    id: number | string;
};

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
    normalized_title: string; // The normalized title of the exercise
    gif_id: string; // The GIF ID of the exercise
    instructions: string[]; // The instructions of the exercise
}

type THevyDialog = {
    folder_id: number;
    dayOrder: number;
    isOpen: boolean;
    exerciseIndex?: number; // location of exercise to be edited
    editExercise?: THevyAddExercise; // current value of exercise to be edited
}

type THevyAddExercise = {
    selectedExercise: THevyExerciseTemplate;
    repTypeValue: "reps" | "reps_range" | "distance_meters" | "duration_seconds" | "custom_metric";
    reps: number[] | null; // DATA for fixed reps / distance / time / custom (not rep range)
    /** Per-set rep range start when `repTypeValue` is `"reps_range"`. */
    repRangeStart?: number[] | null;
    /** Per-set rep range end when `repTypeValue` is `"reps_range"`. */
    repRangeEnd?: number[] | null;
    /** Per-set kg, index-aligned with `setTypes`. All blank → `null`. */
    weightKg: (number | null)[] | null;
    /** Per-set RPE, index-aligned with `setTypes`. All blank → `null`. */
    rpe: (number | null)[] | null;
    setTypes: ("normal" | "warmup" | "dropset" | "failure")[];
    restSeconds: string | null;
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


type THevyCard = {
    title: string,
    order: string,
    day_title: string,
    exercises: THevyExercise[],
    id: string,
    folder_id: number,
}


type THevyRoutineRequestObject = {
    routine: THevyRoutineRequest;
}

type THevyRoutineRequest = {
    title: string; // The routine title
    folder_id: number | null; // An ID for the folder this routine corresponds to. (Also used to choose the week routine is assigned in drag and drop)
    notes: string;
    updated_at?: string; // ISO 8601 timestamp of when the routine was last updated. example: 2021-09-14T12:00:00Z
    created_at?: string; // ISO 8601 timestamp of when the routine was created. example: 2021-09-14T12:00:00Z
    exercises: THevyExerciseRequest[];
}

type THevyExerciseRequest = {
    exercise_template_id: string;
    superset_id: number | null;
    rest_seconds: number;
    notes: string;
    sets: THevySetRequest[];
}

type THevySetRequest = {
    type: string;
    weight_kg: number | null;
    reps: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    custom_metric: number | null;
    rep_range?: THevyRepRange | null;
}

type TRoutineFolderResponse = {
    id: number;
    index: number;
    title: string;
    updated_at: string;
    created_at: string;
  };

type THevyRoutine = {
    id: string; // The routine ID
    title: string; // The routine title
    folder_id: number | null; // An ID for the folder this routine corresponds to. (Also used to choose the week routine is assigned in drag and drop)
    updated_at?: string; // ISO 8601 timestamp of when the routine was last updated. example: 2021-09-14T12:00:00Z
    created_at?: string; // ISO 8601 timestamp of when the routine was created. example: 2021-09-14T12:00:00Z
    exercises: THevyExercise[];
    notes: string;

    /* This field are used for the drag and drop but not stored in the DB */
    order?: string // The day this Routine is assigned on (1-indexed)
  }

type THevyExerciseHistory = {
    exercise_history: THevyExerciseHistoryEntry[];
}

type THevyExerciseHistoryEntry = {
    workout_id: string;
    workout_title: string;
    workout_start_time: string;
    workout_end_time: string;
    exercise_template_id: string;
    weight_kg: number | null;
    reps: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    rpe: number | null;
    custom_metric: number | null;
    set_type: string; // (warmup, normal, dropset, failure)
}

type TRoutineFolderRequest = {
    routine_folder: {
        title: string;
    }
}


type TProgramTitle = {
    id: string;
    title: string;
}

// Interfaces
/**********************************************************/

interface IIsHevyContextType {
    isHevy: boolean;
    setIsHevy: (value: boolean) => void;
}









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
    is_coach: boolean;
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

/** buildWeek tool result shape: full week of routines plus aggregate counts, optional error. */
interface IBuildWeekOutput {
    routines?: THevyRoutine[];
    totalDays?: number;
    routineCount?: number;
    exerciseCount?: number;
    setCount?: number;
    error?: string;
    message?: string;
}
}

export {};
