import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/hooks/supabase";
import type {
    TProgram as _TProgram,
    TFeatureLimits as _TFeatureLimits,
    TUserDetails as _TUserDetails,
    TBlog as _TBlog,
    TPolicyVersionRow as _TPolicyVersionRow,
    TUserConsentsRow as _TUserConsentsRow,
    TBlockedUserRow as _TBlockedUserRow,
    TFollowersRow as _TFollowersRow,
    TFollowingRow as _TFollowingRow,

    TBackedUpWorkout as _TBackedUpWorkout,
    TWorkoutExerciseRow as _TWorkoutExerciseRow,
    THevyExerciseTemplateRow as _THevyExerciseTemplateRow,
} from "@/types/database";

declare global {
// Here we will define the global types for the project and the union types

// Re-exports from src/types/database.ts (canonical source of truth for Supabase-backed types)
type TProgram = _TProgram;
type TFeatureLimits = _TFeatureLimits;
type TUserDetails = _TUserDetails;
type TBlog = _TBlog;
type TPolicyVersionRow = _TPolicyVersionRow;
type TUserConsentsRow = _TUserConsentsRow;
type TBlockedUserRow = _TBlockedUserRow;
type TFollowersRow = _TFollowersRow;
type TFollowingRow = _TFollowingRow;
type TBackedUpWorkout = _TBackedUpWorkout;
type TWorkoutExerciseRow = _TWorkoutExerciseRow;
type THevyExerciseTemplateRow = _THevyExerciseTemplateRow;

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
    warmupExercises: string; // Questionnaire: warmup exercises (yes | no).
    programTitle: string; // goes into AI Prompt
    explore: string; // goes into AI Prompt
}

type TMessage = {
    id: number;
    role: "user" | "assistant";
    content: string;
}

type TPolicyVersionSummary = {
    id: string;
    versionLabel: string;
    effectiveAt: string;
};

type TCurrentPolicyVersions = {
    terms: TPolicyVersionSummary;
    privacy: TPolicyVersionSummary;
};

type TUserConsentsLegalFields = {
    terms_version_id: string;
    privacy_version_id: string;
};


type TOptionalConsentUpdates = {
    platformImprovementOptIn?: boolean;
    marketingOptIn?: boolean;
};

type TLegalAcceptanceInput = {
    termsVersionId: string;
    privacyVersionId: string;
};

type TOptionalConsentPatch = {
    platform_improvement_opt_in?: boolean;
    platform_improvement_opt_in_at?: string | null;
    marketing_opt_in?: boolean;
    marketing_opt_in_at?: string | null;
    updated_at: string;
};

type TPutUserConsentsInput = {
    termsVersionId?: string;
    privacyVersionId?: string;
} & TOptionalConsentUpdates;


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
    /** Hevy routine this session was logged from. Null for ad-hoc sessions. */
    routine_id?: string | null;
};

type THevyWorkoutsResponse = {
    page: number;
    page_count: number;
    workouts: THevyWorkout[];
};

/**
 * One entry from `GET /v1/workouts/events?since=` — Hevy's delta feed.
 * A created or edited session arrives as `updated` with the full workout; a
 * removed one as `deleted` with only its id. This is the only signal that
 * reports deletions, which never move the workout count.
 */
type THevyWorkoutEvent =
    | { type: "updated"; workout: THevyWorkout }
    | { type: "deleted"; id: string; deleted_at: string };

type THevyWorkoutEventsResponse = {
    page: number;
    page_count: number;
    events: THevyWorkoutEvent[];
};

/** One body-measurement entry from `GET /v1/body_measurements` (Hevy OpenAPI BodyMeasurement). */
type THevyBodyMeasurement = {
    date: string;
    weight_kg?: number | null;
    lean_mass_kg?: number | null;
    fat_percent?: number | null;
    neck_cm?: number | null;
    shoulder_cm?: number | null;
    chest_cm?: number | null;
    left_bicep_cm?: number | null;
    right_bicep_cm?: number | null;
    left_forearm_cm?: number | null;
    right_forearm_cm?: number | null;
    abdomen?: number | null;
    waist?: number | null;
    hips?: number | null;
    left_thigh?: number | null;
    right_thigh?: number | null;
    left_calf?: number | null;
    right_calf?: number | null;
};

type THevyBodyMeasurementsResponse = {
    page: number;
    page_count: number;
    body_measurements: THevyBodyMeasurement[];
};

type TBodyMeasurementsDb = SupabaseClient<Database>;

type TImportHevyBodyMeasurementResult =
    | { status: "upserted"; id: string }
    | { status: "error"; message: string };

type TWorkoutHistoryDb = SupabaseClient<Database>;

type TImportHevyWorkoutResult =
    | { status: "inserted"; workoutId: string }
    | { status: "skipped"; workoutId: string }
    | { status: "patched"; workoutId: string }
    | { status: "error"; message: string };

type TSyncChunkResult = {
    backedUpCount: number;
    hevyCount: number;
    syncError: string | null;
    done: boolean;
    /** True when Hevy returned 429; client should back off and retry (not a terminal failure). */
    rateLimited?: boolean;
    /** Per-chunk diagnostics for logging and UI hints. */
    chunk?: {
        page: number;
        pageCount: number;
        inserted: number;
        skipped: number;
    };
};

type TWorkoutSyncProgress = Pick<TSyncChunkResult, "backedUpCount" | "hevyCount" | "syncError" | "rateLimited"> & {
    /** User paused background sync for this browser session. */
    paused?: boolean;
};

type TWorkoutHistoryCursor = {
    startedAt: string;
    id: string;
};

type TWorkoutHistoryQueryOptions = {
    limit?: number;
    since?: string;
    canonicalExerciseIds?: string[];
    cursorStartedAt?: string;
    cursorId?: string;
};

type TWorkoutHistoryPage = {
    workouts: TBackedUpWorkout[];
    nextCursor: TWorkoutHistoryCursor | null;
};

type TLoggedWorkoutPreviewItem = {
    workout: THevyRoutine;
    totalExerciseCount: number;
};

type TLoggedWorkoutBrowsePage = {
    workouts: TLoggedWorkoutPreviewItem[];
    nextCursor: TWorkoutHistoryCursor | null;
};

type TProfileStatisticsWeekBucket = {
    weekStart: string;
    durationSeconds: number;
    reps: number;
    volumeKg: number;
};

type TProfileStatisticsChart = {
    weeks: 4 | 12;
    thisWeek: {
        durationSeconds: number;
        reps: number;
        volumeKg: number;
    };
    buckets: TProfileStatisticsWeekBucket[];
};

type TProfileStatisticsResponse = TProfileStatisticsChart & {
    weekStreak: number;
    thisWeekWorkouts: number;
    avgWorkoutsPerWeek: number | null;
};

type TProfileCalendarWorkout = {
    id: string;
    title: string;
    started_at: string;
    ended_at: string;
};

type TProfileCalendarResponse = {
    workouts: TProfileCalendarWorkout[];
};

type TMapBackedUpWorkoutOptions = {
    previewMaxExercises?: number;
};


type TRoutineResponse = {
    routine: THevyRoutine;
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
    /** Default `select` (radio list). `dropdown` = Select input. `height` = Imperial/Metric → cm string. */
    type?: "select" | "dropdown" | "multi-select" | "text-with-quickfill" | "height";
    /** Default `core`. Advanced = Training profile fields; collapsed until opened. */
    section?: "core" | "advanced";
    subtitle?: { text: string; link?: string };
};

type TQuestionnaireGateReason = "first-time" | "program-format" | "training-profile" | "none";

type TQuestionsPayload = {
    questions: TQuestion[];
    userRequest?: string;
    initialAnswers?: Record<string, string | string[]>;
    reason?: TQuestionnaireGateReason;
    allowSkip?: boolean;
    completeAction?: "build" | "save";
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
    id: string; // Builder key: ordinal string, minted locally. Not a Hevy id on the Edit path.
    /**
     * Hevy-side routine UUID, set only for routines loaded from a Hevy folder
     * (ADR 0013 / 02). Absent means the day was minted in the builder and has no
     * Hevy counterpart yet — which is how Sync tells a PUT from a POST.
     */
    hevyRoutineId?: string;
    title: string; // The routine title
    folder_id: number | null; // Week folder in builder; null for logged backup workouts
    updated_at?: string; // ISO 8601 timestamp of when the routine was last updated. example: 2021-09-14T12:00:00Z
    created_at?: string; // ISO 8601 timestamp of when the routine was created. example: 2021-09-14T12:00:00Z
    /** Logged workout session start (backup `workouts.started_at`). */
    started_at?: string;
    /** Logged workout session end (backup `workouts.ended_at`). */
    ended_at?: string;
    /** Backup source (`workouts.source`); omitted for program-builder routines. */
    source?: string;
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
    /**
     * Client-only **Builder exercise key**. Assigned on hydrate/commit.
     * Never sent to Hevy or written to the **Program prescription**.
     */
    builder_exercise_key?: number;
    /**
     * Set only by the **Hevy share import** adapter, and only when `exercise_template_id` looks like
     * the sharer's own **Hevy-native custom**. Week Export mints it as a **Custom movement** for the
     * signed-in user and creates it on their Hevy account; without it an unknown template ID is
     * assumed to be valid where it is going. Never sent to Hevy under this key.
     */
    shared_template?: THevySharedTemplate;
}

/**
 * Exercise template metadata a **Hevy share import** carried across, in Hevy's own
 * `POST /v1/exercise_templates` vocabulary.
 *
 * Values are raw share strings - the endpoints are undocumented, so nothing is trusted to be a
 * valid Hevy enum until `mapSharedTemplateToPostExercise` narrows it.
 */
type THevySharedTemplate = {
    title: string;
    exercise_type: string | null;
    equipment_category: string | null;
    muscle_group: string | null;
    other_muscles: string[];
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
    reps_range?: Array<[number, number] | null>;
    reps_max?: number[];
    amrap?: string[];
    time_taken?: number[];
    time_range?: number[][];
}


type TProgramPage = {
    program: TProgram[];
    schedule: TProgramDetails[];
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
    /** Per-set fixed reps; null when that set uses a range. */
    reps?: Array<number | null>;
    reps_max?: number[];
    /** Per-set `[start, end]`; null = no range for that set. Flat DB `real[]` is encode/decode-only. */
    reps_range?: Array<[number, number] | null>;
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
    reps?: Array<number | null>;
    weights?: number[];
    reps_max?: number[];
    reps_range?: Array<[number, number] | null>;
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

// Training profile (CONTEXT catalogs)
// Sex: `"male" | "female" | ""` - empty = prefer-not-to-say / unset (DB NULL). No sentinel.

/** Closed sex catalog; empty = prefer not to say / unset. */
type TTrainingSex = "male" | "female" | "";

/** Experience level catalog (difficultyOptions). */
type TExperienceLevel = "beginner" | "novice" | "intermediate" | "advanced" | "";

/** Physique phase catalog. */
type TPhysiquePhase = "bulk" | "cut" | "maintain" | "recomp" | "";

/**
 * Training focus catalog (CONTEXT **Training focus**).
 * Slugs are storage IDs; UI labels live in training-profile-options (SP2).
 */
type TTrainingFocus =
    | "bodybuilding"
    | "powerbuilding"
    | "powerlifting"
    | "hyrox"
    | "crossfit"
    | "olympic_weightlifting"
    | "calisthenics_bodyweight"
    | "athletics_sport"
    | "fat_loss"
    | "general_fitness"
    | "rehab_pain_aware"
    | "";

/**
 * Activity level catalog - CONTEXT short forms for the existing 5-option set
 * (form-options labels map onto these on save in SP2/SP3).
 */
type TActivityLevel = "sedentary" | "light" | "moderate" | "high" | "extreme" | "";

/** Structured Training profile used by Edit profile, peek, and chat. */
type TTrainingProfile = {
    /** Integer years 14-100; null when unset. */
    age: number | null;
    /** Empty string = prefer not to say / unset. */
    sex: TTrainingSex;
    /** Canonical height in centimeters; null when unset. */
    heightCm: number | null;
    experienceLevel: TExperienceLevel;
    physiquePhase: TPhysiquePhase;
    trainingFocus: TTrainingFocus;
    activityLevel: TActivityLevel;
    /** Session duration cap in minutes (10-180, step 10); null when unset. */
    sessionDurationMin: number | null;
};
}

export {};
