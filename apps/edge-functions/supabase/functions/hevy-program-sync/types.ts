

export type TProgramHistory = {
    id: string;
    program_id: string;
    title: string;
    program_length: number;
    user_id: string;
    created_at: string;
}

export type TProgramScheduleHistory = {
    id: string;
    created_at: string;
    nthWeek: number;
    nthDay: number;
    program_history_id: string;
    user_id: string;
}

export type TProgram = {
    id: string;
    title: string;
    program_length: number;
}

/** Program–Hevy link row (`program_hevy_week_links`). ADR 0008 / 0011. */
export type TProgramHevyWeekLink = {
    id: string;
    user_id: string;
    program_id: number;
    nth_week: number;
    hevy_folder_id: number;
    /** Hevy routine IDs for the week, ordered by day (index 0 → nthDay 1). */
    hevy_routine_ids: string[];
    created_at: string;
    updated_at: string;
}

export type THevySet = {
  index: number;
  type: string;
  weight_kg: number | null;
  reps: number | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
};

export type THevyExercise = {
  index: number;
  title: string;
  notes: string;
  exercise_template_id: string;
  supersets_id: number | null;
  sets: THevySet[];
};

export type THevyWorkouts = {
  id: string;
  title: string;
  routine_id: string;
  description: string;
  start_time: string;
  end_time: string;
  updated_at: string;
  created_at: string;
  exercises: THevyExercise[];
};

export type THevyWorkoutsResponse = {
  page: number;
  page_count: number;
  workouts: THevyWorkouts[];
};

export type TRoutineSet = {
  index: number;
  type: string; // 'normal', 'warmup', 'dropset', 'failure' 
  weight_kg: number | null;
  reps: number | null;
  rep_range: TRepRange | null;
  distance_meters: number | null;
  duration_seconds: number | null;
  rpe: number | null;
  custom_metric: number | null;
};

export type TRepRange = {
    start: number | null;
    end: number | null;
}

export type TRoutineExercise = {
  index: number;
  title: string;
  notes: string;
  exercise_template_id: string;
  supersets_id: number | null;
  sets: TRoutineSet[];
  rest_seconds: string;
};

export type TRoutine = {
  id: string;
  title: string;
  folder_id: number | null;
  updated_at: string;
  created_at: string;
  exercises: TRoutineExercise[];
};

export type TRoutineResponse = {
  routine: TRoutine;
};

export type TRoutineFolderResponse = {
  id: number;
  index: number;
  title: string;
  updated_at: string;
  created_at: string;
};

export type TProgramId = {
    program_id: string;
}

export type TScheduleWorkout = {
    id: string;
    program_id: string;
    nthWeek: number;
    nthDay: number;
    day_title: string | null;
    day_notes: string | null;
    created_at: string;
}


export type TRoutineFolderRequest = {
  routine_folder: {
      title: string;
  }
}

export type TProgramSubscriber = {
  id: string;
  user_id: string;
  program_id: string;
}

export type THevyRoutineRequestObject = {
  routine: THevyRoutineRequest;
}

export type THevyRoutineRequest = {
  title: string; // The routine title
  folder_id?: number | null; // An ID for the folder this routine corresponds to. (Also used to choose the week routine is assigned in drag and drop)
  notes: string;
  updated_at?: string; // ISO 8601 timestamp of when the routine was last updated. example: 2021-09-14T12:00:00Z
  created_at?: string; // ISO 8601 timestamp of when the routine was created. example: 2021-09-14T12:00:00Z
  exercises: THevyExerciseRequest[];
}

export type THevyExerciseRequest = {
  exercise_template_id: string; // The id of the exercise template. This can be used to fetch the exercise template.
  superset_id: number | null; // The id of the superset that the exercise belongs to. A value of null indicates the exercise is not part of a superset.
  rest_seconds: number;
  notes: string; // Routine notes on the exercise
  sets: THevySetsRequest[];
}



export type THevySetsRequest = {
  type: string; // The type of set. This can be one of 'normal', 'warmup', 'dropset', 'failure'
  weight_kg: number | null; // Weight lifted in kilograms
  reps: number | null; // Number of reps logged for the set
  distance_meters: number | null; // Number of meters logged for the set
  duration_seconds: number | null; // Number of seconds logged for the set
  // rpe: number; // The RPE logged for the set
  custom_metric: number | null; // Custom metric logged for the set (Currently only used to log floors or steps for stair machine exercises)
}

export type THevyRoutine = {
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

export type THevyExerciseHistory = {
  exercise_history: THevyExerciseHistoryEntry[];
}

export type THevyExerciseHistoryEntry = {
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


export type THevyRoutineFolderResponse = {
  page: number;
  page_count: number;
  routine_folders: THevyRoutineFolder[];
}

export type THevyRoutineFolder = {
  id: number; // The routine folder ID
  index: number; // The routine folder index. Describes the order of the folder in the list.
  title: string; // The routine folder title
  updated_at: string; // ISO 8601 timestamp of when the routine was last updated. example: 2021-09-14T12:00:00Z
  created_at: string; // ISO 8601 timestamp of when the routine was created. example: 2021-09-14T12:00:00Z
}

export type TProgramTitle = {
  id: string;
  title: string;
}

export type THevySets = {
  index: number; // Index indicating the order of the set in the routine.
  type: string; // The type of set. This can be one of 'normal', 'warmup', 'dropset', 'failure'
  weight_kg: number; // Weight lifted in kilograms
  reps: number; // Number of reps logged for the set
  distance_meters: number; // Number of meters logged for the set
  duration_seconds: number; // Number of seconds logged for the set
  rpe: number; // The RPE logged for the set
  custom_metric: number; // Custom metric logged for the set (Currently only used to log floors or steps for stair machine exercises)
}

export type TSavedWorkoutExercise = {
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

export type THevyExerciseTemplates = {
  page: number; // Current page number
  page_count: number; // Total number of pages
  exercise_templates: THevyExerciseTemplate[]
}

export type THevyExerciseTemplate = {
  id: string; // The exercise template ID.
  title: string; // The exercise title.
  type: string; // The exercise type.
  primary_muscle_group: string; // The primary muscle group of the exercise
  secondary_muscle_groups: string[]; // The secondary muscle groups of the exercise
  is_custom: boolean; // indicating whether the exercise is a custom exercise
  equipment: string; // The exercise equipment
  normalized_title: string; // The normalized exercise title.
  gif_id?: string; // The GIF ID of the exercise.
  instructions?: string[]; // The instructions of the exercise.
}

export type TScheduleWorkouts = {
  nthDay: number;
  nthWeek: number;
  day_title?: string;
  program_workout_exercises: TSavedWorkoutExercise[];
}