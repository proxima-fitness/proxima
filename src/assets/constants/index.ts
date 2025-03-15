import { people03, people02, people01, people04, people05, people06, instagram, linkedin, star, reddit, twitter } from "public";
import humanizeDuration from "humanize-duration";
import { Option } from '@/components/ui/multi-select';

export const programLengths = ["1","2","3","4","5","6","7","8","9","10","11","12"];
export const repMaxes = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15"];
export const durations = ["0","10","20","30","40","50","60","70","80","90","100","110","120","130","140","150","160","170", "180"];
export const hevy_rep_types = [{label: "Reps", value: "reps"}, {label: "Distance (m)", value: "distance_meters"}, {label: "Time (s)", value: "duration_seconds"}, { label: "Custom Metric", value: "custom_metric"}];
export const hevy_intensities = [{label: "RPE", value: "rpe"}, {label: "Weight (kg)", value: "weight_kg"}];
export const rep_types = [{label: "Reps", value: "reps"},{label: "Reps Max", value: "reps_max"},{label: "Reps Range", value: "reps_range"},{label: "Time", value: "time_taken"},{label: "Time Range", value:"time_range"},{label: "AMRAP", value: "amrap"}];
export const intensities = [{label: "RPE", value: "rpe"},{ label: "% 1RM", value: "percent_rm" },{ label: "RPE Range", value: "rpe_range" }, {label: "Weights", value: "weights" }];
export const lightColours = ["#DCF9C2", "#F4D1BD", "#E2F2F2", "#E0E1B9", "#D7FEC5", "#EEDACA", "#C5E0EA", "#EADEB5", "#CAC8D9", "#C2EAE6"];

export const MuscleGroups = [
    { label: "All", value: "All Muscle Groups" },
    { label: "Chest", value: "Chest" },
    { label: "Front Delts", value: "Front Delts" },
    { label: "Middle Delts", value: "Middle Delts" },
    { label: "Rear Delts", value:"Rear Delts" },
    { label: "Biceps", value: "Biceps" },
    { label: "Triceps", value: "Triceps" },
    { label: "Forearms", value: "Forearms" },
    { label: "Lats", value: "Lats" },
    { label: "Upper Back", value: "Upper Back" },
    { label: "Lower Back", value: "Lower Back" },
    { label: "Neck", value: "Neck" },
    { label: "Abs", value: "Abs" },
    { label: "Glutes", value: "Glutes" },
    { label: "Hamstrings", value: "Hamstrings" },
    { label: "Quadriceps", value: "Quadriceps" },
    { label: "Abductors", value: "Abductors" },
    { label: "Adductors", value: "Adductors" },
    { label: "Calves", value: "Calves" },
    { label: "Olympic", value: "Olympic" },
    { label: "Full Body", value: "Full Body" },
    { label: "Plyometrics", value: "Plyometrics" },
    { label: "Stretching", value: "Stretching" },
    { label: "Cardio", value: "Cardio" },
    { label: "Other", value: "Other" },
];

export const Equipment = [
    { label: "All Equipment", value: "All Equipment" },
    { label: "Barbell", value: "Barbell" },
    { label: "Dumbbell", value: "Dumbbell" },
    { label: "Kettlebell", value: "Kettlebell" },
    { label: "Machine", value:"Machine" },
    { label: "Bodyweight", value: "Bodyweight" },
    { label: "Smith Machine", value: "Smith Machine" },
    { label: "Cable", value: "Cable" },
    { label: "Cardio", value: "Cardio" },
    { label: "Other", value: "Other" },
];

export const exampleHevyRoutineProgram: THevyRoutine[] = [
    {
        id: "1",
        title: "Push Day",
        folder_id: 0,
        updated_at: "2025-03-07T12:00:00Z",
        created_at: "2025-03-01T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Bench Press (Barbell)",
            notes: "Focus on slow eccentric movement",
            exercise_template_id: "79D0BB3A",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 8,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Overhead Press (Barbell)",
            notes: "Keep core tight",
            exercise_template_id: "7B8D84E8",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 6,
                custom_metric: 0,
                },
            ],
            },
        ],
    },
    {
        id: "2",
        title: "Leg Day",
        folder_id: 0,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "3",
        title: "Leg Day",
        folder_id: 1,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 100,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "4",
        title: "Leg Day",
        folder_id: 1,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "5",
        title: "Leg Day",
        folder_id: 2,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "6",
        title: "Leg Day",
        folder_id: 2,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "7",
        title: "Leg Day",
        folder_id: 3,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "8",
        title: "Leg Day",
        folder_id: 3,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 100,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "9",
        title: "Leg Day",
        folder_id: 4,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "10",
        title: "Leg Day",
        folder_id: 4,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "11",
        title: "Leg Day",
        folder_id: 5,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "12",
        title: "Leg Day",
        folder_id: 5,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "13",
        title: "Leg Day",
        folder_id: 6,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "14",
        title: "Leg Day",
        folder_id: 6,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "15",
        title: "Leg Day",
        folder_id: 7,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "16",
        title: "Leg Day",
        folder_id: 7,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "17",
        title: "Leg Day",
        folder_id: 8,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "18",
        title: "Leg Day",
        folder_id: 8,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "19",
        title: "Leg Day",
        folder_id: 9,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "20",
        title: "Leg Day",
        folder_id: 9,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "21",
        title: "Leg Day",
        folder_id: 10,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "22",
        title: "Leg Day",
        folder_id: 10,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "23",
        title: "Leg Day",
        folder_id: 11,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
    {
        id: "24",
        title: "Leg Day",
        folder_id: 11,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [
            {
            index: 1,
            title: "Squat (Barbell)",
            notes: "Use belt for heavier sets",
            exercise_template_id: "D04AC939",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "warmup",
                weight_kg: 0,
                reps: 10,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 5,
                custom_metric: 0,
                },
                {
                index: 2,
                type: "normal",
                weight_kg: 0,
                reps: 6,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 8,
                custom_metric: 0,
                },
            ],
            },
            {
            index: 2,
            title: "Leg Press (Machine)",
            notes: "Slow negatives",
            exercise_template_id: "C7973E0E",
            supersets_id: null,
            sets: [
                {
                index: 1,
                type: "normal",
                weight_kg: 0,
                reps: 12,
                distance_meters: 0,
                duration_seconds: 0,
                rpe: 7,
                custom_metric: 0,
                },
            ],
        },
    ],
    },
];


export const exampleProximaProgram: TProgramCreatorDay[][] = [
    [
        {
            "order": "1",
            "day_title": "Test",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "day_title": "Other test",
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "day_title": "another title",
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "day_title": "mofo title",
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "day_title": "Test Day",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
    [
        {
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
        {
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
                        "name_english": "Arm Circle",
                        "name_espanol": "Círculos de Brazo",
                        "name_portugues": "Círculo de braço",
                        "name_francais": "Cercle de Bras",
                        "gif_id": "1428",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_max": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "percent_rm": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
                        "name_english": "Chest Fly (Cable)",
                        "name_espanol": "Fly de Pecho (Cable)",
                        "name_portugues": "Voador de Peito (Cabo)",
                        "name_francais": "Écarté de Poitrine (Câble)",
                        "gif_id": "0227",
                    },
                    "sets": 4,
                    "reps_type": {
                        "reps_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe_range": [
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                            [
                                9,
                                10,
                            ],
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
                        "name_english": "Front Lever",
                        "name_espanol": "Levantamiento Frontal",
                        "name_portugues": "Alavanca Frontal",
                        "name_francais": "Front Lever",
                        "gif_id": "3296",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_taken": [
                            8,
                            8,
                            8,
                            8,
                        ],
                    },
                    "intensity": {
                        "weights": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "957bd715-f994-4031-8b67-5871c805715d",
                        "name_english": "Kettlebell Swing",
                        "name_espanol": "Swing con Kettlebell",
                        "name_portugues": "Swing com Kettlebell",
                        "name_francais": "Swing avec Kettlebell",
                        "gif_id": "0549",
                    },
                    "sets": 4,
                    "reps_type": {
                        "time_range": [
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                            [
                                8,
                                12,
                            ],
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
                {
                    "exercise": {
                        "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
                        "name_english": "Behind The Neck Press (Smith Machine)",
                        "name_espanol": "Prensa Trasera (Máquina Smith)",
                        "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
                        "name_francais": "Développé Nuque (Smith Machine)",
                        "gif_id": "0747",
                    },
                    "sets": 4,
                    "reps_type": {
                        "amrap": [
                            "amrap",
                            "amrap",
                            "amrap",
                            "amrap",
                        ],
                    },
                    "intensity": {
                        "rpe": [
                            9,
                            9,
                            9,
                            9,
                        ],
                    },
                },
            ],
        },
    ],
];


export const shortEnglishHumanizer = humanizeDuration.humanizer({
    language: "shortEn",
    languages: {
      shortEn: {
        y: () => "Yrs",
        mo: () => "Mnths",
        w: () => "Wks",
        d: () => "Days",
        h: () => "Hrs",
        m: () => "Mins",
        s: () => "Secs",
        ms: () => "mSecs",
      },
    },
} );

export const filterGroupOptions: TFilterGroupOption[] = [
    {
        component: "combobox",
        type: "program_length",
        title: "Program Length",
        values: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"],
    },
    {
        component: "combobox",
        type: "workout_duration",
        title: "Workout Duration",
        values: Array.from({ length: 18 }, (_, i) => (i * 10 + 10).toString()),
    },
    {
        component: "badge",
        type: "equipment",
        title: "Equipment",
        values: ["Full Gym", "Garage Gym", "Dumbbells Only", "Bodyweight"],
    },
    {
        component: "badge",
        type: "specialization",
        title: "Specialization",
        values: ["Bodybuilding", "Powerbuilding", "Powerlifting", "Athletics", "Bodyweight Training", "Olympic Weightlifting", "Calisthenics"],
    },
    {
        component: "badge",
        type: "difficulty",
        title: "Difficulty",
        values: ["Beginner", "Novice", "Intermediate", "Advanced"],
    },
];

export const navLinks = [
    {
        id: "programs",
        title: "Programs",
    },
    {
        id: "about",
        title: "About Us",
    },
    //   {
    //     id: "pricing",
    //     title: "Pricing",
    //   },
    {
        id: "program-builder",
        title: "AI Program Builder",
    },
    {
        id: "log-in",
        title: "Log in",
    },
    {
        id: "cta",
        title: "Download App",
    },
];

export const features = [
  {
    id: "feature-1",
    icon: star.src,
    title: "Think your program is killing your gains ?",
    content:
      "Your fellow Gym-goers can share their workouts for free, allowing you to follow along. Learn from the expertise of your peers!",
  },
  {
    id: "feature-2",
    icon: star.src,
    title: "Want to run a program to beat your current plateau ?",
    content:
      "Follow proven programs that are open sourced on reddit and other locations.",
  },
{
    id: "feature-2",
    icon: star.src,
    title: "You're a coach and you want to grow your following ?",
    content:
      "You can post your own programs to Proxima, and help other lifters with your expertise",
  },
];

export const feedback = [
    {
        id: "feedback-1",
        content:
            "Lots of cool programs, and super easy to use UI. Would definitely recommend trying out the free version",
        name: "Scott Hanlon",
        title: "Proxima Member · 2024.05.03",
        img: people03.src,
    },
    {
        id: "feedback-2",
        content: "Literally the best fitness app I've used so far. It's simple and the PR cards are sick",
        name: "Marco Zanotto",
        title: "Proxima Member · 2024.04.12",
        img: people02.src,
      },
      {
        id: "feedback-3",
        content:
        "Best free gym app I've found. So many programs I can just click and train. Crazy amount of features for a Free app",
        name: "Sina Banki",
        title: "Proxima Member · 2024.05.25",
        img: people01.src,
      },
      {
        id: "feedback-4",
        content:
          "I've been lifting for over a decade and I usually avoid gym apps. Proxima is the first that I think is actually pretty good. It has a generous amount of features in the free tier, and suits my needs",
        name: "Jordan Van De Sande",
        title: "Proxima Member · 2024.09.14",
        img: people04.src,
      },
      {
        id: "feedback-5",
        content:
        "I train 5-6 days a week for the military, this app has helped me stay in shape for work. 10/10",
        name: "Rob Roy Mackenzie",
        title: "Proxima Member · 2024.09.06",
        img: people05.src,
      },
      {
        id: "feedback-6",
        content:
        "Makes it super easy to build programs myself, and is very flexible with custom exercises and different types of units like RPE, %1RM etc",
        name: "Milton Quintana",
        title: "Proxima Member · 2024.01.18",
        img: people06.src,
      },
];

export const stats = [
  {
    id: "stats-1",
    title: "Proxima Pro Members",
    value: 100,
  },
  {
    id: "stats-2",
    title: "Workouts Tracked",
    value: 2000,
  },
  {
    id: "stats-3",
    title: "Programs Created",
    value: 100,
  },
];

export const footerLinks = [
  {
    title: "Useful Links",
    links: [
      {
        name: "Terms of Use",
        link: "https://app.proximafitness.com/terms-of-use",
      },
      {
        name: "Privacy Policy",
        link: "https://app.proximafitness.com/privacy",
      },
      {
        name: "Blog",
        link: "/blog",
      },
    ],
  },
  {
    title: "Contact Us",
    links: [
      {
        name: "Email",
        link: "mailto:jack@proximafitness.com",
      },
    ],
  },
  {
    title: "Coaches",
    links: [
      {
        name: "Become a Coach",
        link: "https://app.proximafitness.com/becoming-a-coach",
      },
    ],
  },
];

export const socialMedia = [
  {
    id: "social-media-1",
    icon: instagram.src,
    link: "https://www.instagram.com/proximafitnessapp/",
  },
  {
    id: "social-media-2",
    icon: twitter.src,
    link: "https://www.twitter.com/jacklhanlon",
  },
  {
    id: "social-media-3",
    icon: linkedin.src,
    link: "https://www.linkedin.com/company/proxima-fitness/",
  },
  {
    id: "social-media-4",
    icon: reddit.src,
    link: "https://www.reddit.com/r/ProximaFitness/",
  },
];

export const coolQuotes: TQuote[] = [
    { quote: "We take on the strength of that which we overcome", author: "Unknown" },
    { quote: "Don't be bitter, be better", author: "Unknown"},
    { quote: "The results come days after you stop counting", author: "Unknown"},
    { quote: "There's no final victory and no final defeat, only the same fight to be fought again and again and again.", author: "Unknown"},
    { quote: "It's a good idea to ask - what am I not doing?", author: "Unknown"},
    { quote: "Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights.", author: "Ronnie Coleman"},
    { quote: "Light weight BABY!!!", author: "Ronnie Coleman"},
    { quote: "Yeah Buddy!", author: "Ronnie Coleman"},
    { quote: "Ain't nothin but a peanut", author: "Ronnie Coleman"},
    { quote: "A well built physique is a status symbol. It reflects you worked hard for it. No money can buy it. You cannot borrow it, you cannot inherit it, you cannot steal it. You cannot hold onto it without constant work. It shows discipline, it shows self respect, it shows patience, work ethic, and passion. That is why I do what I do.", author: "Arnold Schwarzenegger"},
    { quote: "No citizen has a right to be an amateur in the matter of physical training... what a disgrace it is for a man to grow old without ever seeing the beauty and strength of which his body is capable.", author: "Socrates"},
    { quote: "Lifting isn’t a hobby, it’s a journey. And that journey often begins with feelings of inadequacy and ends with feelings of inadequacy but now you can’t wear jeans and you sink in pools.", author: "Casually Explained"},
    { quote: "The day you start lifting is the day you become forever smol, because you will never be as big as you want to be.", author: "Dom Mazetti"},
    { quote: "You can't climb the ladder of success with your hands in your pockets", author: "Unknown"},
    { quote: "Swole is the goal, size is the prize, it's gain o'clock MF ... LET'S GO", author: "Robert Frank"},
    { quote: "The Iron never lies to you. You can walk outside and listen to all kinds of talk, get told that you're a god or a total bastard. The Iron will always kick you the real deal. The Iron is the great reference point, the all-knowing perspective giver. Always there like a beacon in the pitch black. I have found the Iron to be my greatest friend. It never freaks out on me, never runs. Friends may come and go. But two hundred pounds is always two hundred pounds.", author: "Henry Rollins"},
    { quote: "You can't sculpt a pebble", author: "Unknown" },
    { quote: "If you're gonna wear gloves while you lift, just make sure they match your purse", author: "Unknown"},
    { quote: "Don't move the weight, work the muscle", author: "Unknown"},
    { quote: "Live an extraordinary life… Don’t settle for an ordinary life… It’s easy to be ordinary anybody can do that. Find your magnificent obsession. Whatever it is and let nothing or no one tell you that you can’t do it. Tell them to sit back and watch me. Just sit back and watch me do it. Find your obsession go after that… I could care less what anybody else says and don’t let anything stop you from getting it.", author: "CT Fletcher"},
    { quote: "Man cannot remake himself without Suffering, for he is both the Marble and the Sculptor", author: "Alexis Carrel" },
    { quote: "I hated every minute of training, but I said, ‘Don’t Quit. Suffer now and live the rest of your life as a Champion!", author: "Muhammad Ali"},
    { quote: "U mirin brah ?", author: "Zyzz (RIP)"},
];

export const sexOptions: Option[] = [
    { label: "Male", value: "male"},
    { label: "Female", value: "female"},
];

export const ageOptions: Option[] = Array.from({ length: 100 - 14 + 1 }, (_, i) => {
    const age = (i + 14).toString();
    return { label: age, value: age };
} );

export const dayPerWeekOptions: Option[] = [
    { label: "1x per week", value: "1"},
    { label: "2x per week", value: "2" },
    { label: "3x per week", value: "3" },
    { label: "4x per week", value: "4" },
    { label: "5x per week", value: "5" },
    { label: "6x per week", value: "6" },
    { label: "7x per week", value: "7" },
];

export const specificDaysOptions: Option[] = [
    { label: "Mon", value: "monday"},
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" },
    { label: "Sun", value: "sunday" },
];

export const programLengthOptions: Option[] = Array.from({ length: 12 }, (_, i) => {
    const programLength = (i + 1).toString();
    return { label: `${programLength} Week${programLength === "1" ? "": "s"}`, value: programLength };
} );

export const workoutDurationOptions: Option[] = Array.from({ length: 18 }, (_, i) => {
    const duration = ((i+1)*10).toString();
    return { label: `${duration} Mins`, value: duration };
} );

export const activityLevelOptions: Option[] = [
    { label: "Sedentary", value: "sedentary"},
    { label: "Light activity", value: "light activity" },
    { label: "Moderate activity", value: "moderate activity" },
    { label: "High activity", value: "high activity" },
    { label: "Extreme activity", value: "extreme activity" },
];

export const goalsOptions: Option[] = [
    { label: "Build muscle", value: "build muscle"},
    { label: "Improve fitness", value: "improve fitness" },
    { label: "Reduce back pain", value: "reduce back pain" },
    { label: "Agility", value: "agility" },
    { label: "Optimize workouts", value: "optmimize workouts" },
    { label: "Relieve stress", value: "relieve stress" },
    { label: "Balance", value: "balance" },
    { label: "Weight loss", value: "weight loss" },
    { label: "Boost libido", value: "boost libido" },
    { label: "Boost mental strength", value: "boost mental strength" },
    { label: "Flexibility", value: "flexibility" },
    { label: "Increase endurance", value: "increase endurance" },
    { label: "Burn fat", value: "burn fat" },
];

export const specializationOptions: Option[] = [
    { label: "Bodybuilding", value: "bodybuilding"},
    { label: "Powerbuilding", value: "powerbuilding" },
    { label: "Powerlifting", value: "powerlifting"},
    { label: "Athletics", value: "athletics" },
    { label: "Bodyweight training", value: "bodyweight training" },
    { label: "Olympic weightlifting", value: "olympic weightlifting" },
    { label: "Calisthenics", value: "calisthenics" },
];

export const equipmentOptions: Option[] = [
    { label: "Barbell", value: "barbell"},
    { label: "Dumbbell", value: "dumbbell"},
    { label: "Kettlebell", value: "kettlebell"},
    { label: "Machine", value: "machine"},
    { label: "Bodyweight", value: "bodyweight"},
    { label: "Smith machine", value: "smith machine"},
    { label: "Cable", value: "cable"},
    { label: "Cardio", value: "cardio"},
];

export const focusAreasOptions: Option[] = [
    { label: "Back", value: "back"},
    { label: "Arms", value: "arms"},
    { label: "Shoulders", value: "shoulders"},
    { label: "Abs", value: "abs"},
    { label: "Chest", value: "chest"},
    { label: "Legs", value: "legs"},
    { label: "Glutes", value: "glutes"},
    { label: "Full body", value: "full body"},
];

export const difficultyOptions: Option[] = [
    { label: "Beginner", value: "beginner"},
    { label: "Novice", value: "novice"},
    { label: "Intermediate", value: "intermediate"},
    { label: "Advanced", value: "advanced"},
];

export const healthIssuesOptions: Option[] = [
    { label: "Post-covid recovery", value: "post-covid recovery"},
    { label: "Cannot jump", value: "cannot jump"},
    { label: "Back or hernia", value: "back or hernia"},
    { label: "Arms and shoulders", value: "arms and shoulders"},
    { label: "Hip joints", value: "hip joints"},
    { label: "Knee injuries", value: "knee injuries"},
];
