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
    index: number; // Index indicating the order of the exercise in the routine.
    title: string; // Title of the exercise
    notes: string; // Routine notes on the exercise
    rest_seconds: string | null; // The rest time in seconds
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
    repTypeValue: "reps" | "distance_meters" | "duration_seconds" | "custom_metric";
    intensityValue: "rpe" | "weight_kg";
    reps: number[] | null; // DATA for any rep type that is not a range
    intensityData: number[] | null; // DATA for any intensity that is not a range
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

// Interfaces
/**********************************************************/

interface IIsHevyContextType {
    isHevy: boolean;
    setIsHevy: (value: boolean) => void;
}

interface IPreviewContextType {
    isPreview: boolean;
    setIsPreview: (value: boolean) => void;
}
