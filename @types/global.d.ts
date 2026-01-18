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

// type TTextToJsonResponse = {
//     workout_days: {
//         day_title: string;
//         exercises: {
//             sets: {
//                 type: string;
//                 reps: number;
//                 rpe: number;
//             }[];
//             title: string;
//             exercise_template_id?: string; // Optional for backward compatibility, but should be provided by AI
//             supersets_id: number | null;
//         }[];
//     }[];
// }

type TProgramResponse = {
    program: {
      program_length_weeks: number;
      weeks: TWeekResponse[];
    };
  };

  type TWeekResponse = {
    week_number: number;
    week_title?: string;
    notes?: string;
    workout_days: TWorkoutDayResponse[];
  };

  type TWorkoutDayResponse = {
    day_number: number; // 1-7 for day of week
    day_title: string;
    notes?: string;
    exercises: TExerciseResponse[];
  };

  type TExerciseResponse = {
    exercise_template_id: string;
    supersets_id: number | null;
    notes?: string;
    sets: TSetResponse[];
  };

  type TSetResponse = {
    type: "normal" | "warmup" | "dropset" | "failure";
    weight_kg
    reps: number;
    rpe: number;
    rest_seconds?: number;
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
