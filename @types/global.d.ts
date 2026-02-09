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


type THevyWorkoutsResponse = {
    page: number;
    page_count: number;
    workouts: THevyWorkouts[];
};

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
    }>
}
