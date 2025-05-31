import { people03, people02, people01, people04, people05, people06, instagram, linkedin, star, reddit, twitter } from "public";
import humanizeDuration from "humanize-duration";
import { IOption } from '@/components/ui/multi-select';

export const programLengths = ["1","2","3","4","5","6","7","8","9","10","11","12"];
export const repMaxes = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15"];
export const durations = ["0","10","20","30","40","50","60","70","80","90","100","110","120","130","140","150","160","170", "180"];
export const hevy_rep_types = [{label: "Reps", value: "reps"}, {label: "Distance (m)", value: "distance_meters"}, {label: "Time (s)", value: "duration_seconds"}, { label: "Custom Metric", value: "custom_metric"}];
export const hevy_intensities = [{label: "RPE", value: "rpe"}, {label: "Weight (kg)", value: "weight_kg"}];
export const rep_types = [{label: "Reps", value: "reps"},{label: "Reps Max", value: "reps_max"},{label: "Reps Range", value: "reps_range"},{label: "Time", value: "time_taken"},{label: "Time Range", value:"time_range"},{label: "AMRAP", value: "amrap"}];
export const intensities = [{label: "RPE", value: "rpe"},{ label: "% 1RM", value: "percent_rm" },{ label: "RPE Range", value: "rpe_range" }, {label: "Weights", value: "weights" }];
export const lightColours = ["#DCF9C2", "#F4D1BD", "#E2F2F2", "#E0E1B9", "#D7FEC5", "#EEDACA", "#C5E0EA", "#EADEB5", "#CAC8D9", "#C2EAE6"];

export const programBuilderSteps = [
    { title: "Step 1", description: "Prompt your Program" },
    { title: "Step 2", description: "Edit and Refine" },
    { title: "Step 3", description: "Finish and Review" },
    { title: "Step 4", description: "Sign in and Start Tracking" },
];

export const primaryMuscleGroups = [
    {label: "Back", value: ["upper_back","lower_back","lats"]},
    {label: "Arms", value: ["biceps", "triceps", "forearms"]},
    {label: "Shoulders", value: ["shoulders", "traps", "neck"]},
    {label: "Abs", value: ["abdominals"]},
    {label: "Chest", value: ["chest", "triceps"]},
    {label: "Legs", value: ["hamstrings", "glutes", "quadriceps"]},
    {label: "Glutes", value: ["glutes"]},
    {label: "Full Body", value: ["full_body"]}
];
export const healthIssuesMuscles = [
    {label: "Post-covid recovery", value: ["cardio"]},
    {label: "Cannot jump", value: ["quadriceps", "glutes", "hamstrings"]},
    {label: "Back or hernia", value: ["upper_back", "lower_back", "traps", "neck", "abdominals", "lats"]},
    {label: "Arms and shoulders", value: ["biceps", "triceps", "forearms", "shoulders", "traps"]},
    {label: "Hip joints", value: ["glutes", "abdominals"]},
    {label: "Knee injuries", value: ["quadriceps", "hamstrings", "glutes"]}
];

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

export const fallbackUpperLower = {
    workout_days: [
        {
            day_title: "Upper Body Workout",
            exercises: [
                { "supersets_id": null, "title": "Bench Press", "sets": [{type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}] },
                { "supersets_id": null,"title": "Pull-Ups", "sets": [{type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}] },
                { "supersets_id": null,"title": "Dumbbell Shoulder Press", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null,"title": "Bent-Over Rows", "sets": [{type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}] },
                { "supersets_id": null,"title": "Bicep Curls", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
                { "supersets_id": null,"title": "Tricep Dips", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
            ],
        },
        {
            day_title: "Lower Body Workout",
            exercises: [
                { "supersets_id": null,"title": "Squats", "sets": [{type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}] },
                { "supersets_id": null,"title": "Deadlifts", "sets": [{type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}] },
                { "supersets_id": null,"title": "Lunges", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null,"title": "Leg Press", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null,"title": "Calf Raises", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
                { "supersets_id": null,"title": "Glute Bridges", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
            ],
        },
    ],
};

export const fallbackSevenDay = {
    workout_days: [
        {
            day_title: "Push Day",
            exercises: [
                { "supersets_id": null, "title": "Bench Press", "sets": [{type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}] },
                { "supersets_id": null, "title": "Overhead Dumbbell Press", "sets": [{type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}] },
                { "supersets_id": null, "title": "Incline Dumbbell Flyes", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
                { "supersets_id": null, "title": "Tricep Dips", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Lateral Raises", "sets": [{type: "normal", reps: 15, rpe: 5}, {type: "normal", reps: 15, rpe: 5}, {type: "normal", reps: 15, rpe: 5}, {type: "normal", reps: 15, rpe: 5}] },
            ],
        },
        {
            day_title: "Pull Day",
            exercises: [
                { "supersets_id": null, "title": "Pull-Ups", "sets": [{type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}] },
                { "supersets_id": null, "title": "Bent Over Row", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Face Pulls", "sets": [{type: "normal", reps: 15, rpe: 5}, {type: "normal", reps: 15, rpe: 5}, {type: "normal", reps: 15, rpe: 5}, {type: "normal", reps: 15, rpe: 5}] },
                { "supersets_id": null, "title": "Bicep Curls", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
                { "supersets_id": null, "title": "Deadlifts", "sets": [{type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}] },
            ],
        },
        {
            day_title: "Leg Day",
            exercises: [
                { "supersets_id": null, "title": "Squats", "sets": [{type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}] },
                { "supersets_id": null, "title": "Leg Press", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Lunges", "sets": [{type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}] },
                { "supersets_id": null, "title": "Calf Raises", "sets": [{type: "normal", reps: 15, rpe: 5}, {type: "normal", reps: 15, rpe: 5}, {type: "normal", reps: 15, rpe: 5}, {type: "normal", reps: 15, rpe: 5}] },
                { "supersets_id": null, "title": "Leg Curls", "sets": [{type: "normal", reps: 12, rpe: 7}, {type: "normal", reps: 12, rpe: 7}, {type: "normal", reps: 12, rpe: 7}, {type: "normal", reps: 12, rpe: 7}] },
            ],
        },
        {
            day_title: "Cardio Day",
            exercises: [
                { "supersets_id": null, "title": "Running", "sets": [{type: "normal", reps: 0, rpe: 7}, {type: "normal", reps: 0, rpe: 7}, {type: "normal", reps: 0, rpe: 7}, {type: "normal", reps: 0, rpe: 7}] },
                { "supersets_id": null, "title": "Jump Rope", "sets": [{type: "normal", reps: 1, rpe: 6}, {type: "normal", reps: 1, rpe: 6}, {type: "normal", reps: 1, rpe: 6}, {type: "normal", reps: 1, rpe: 6}] },
                { "supersets_id": null, "title": "Cycling", "sets": [{type: "normal", reps: 0, rpe: 6}, {type: "normal", reps: 0, rpe: 6}, {type: "normal", reps: 0, rpe: 6}, {type: "normal", reps: 0, rpe: 6}] },
                { "supersets_id": null, "title": "Burpees", "sets": [{type: "normal", reps: 15, rpe: 8}, {type: "normal", reps: 15, rpe: 8}, {type: "normal", reps: 15, rpe: 8}, {type: "normal", reps: 15, rpe: 8}] },
                { "supersets_id": null, "title": "High Knees", "sets": [{type: "normal", reps: 30, rpe: 5}, {type: "normal", reps: 30, rpe: 5}, {type: "normal", reps: 30, rpe: 5}, {type: "normal", reps: 30, rpe: 5}] },
            ],
        },
    ],
};


export const fallbackCBLSA = {
    workout_days: [
        {
            day_title: "Chest Day",
            exercises: [
                { "supersets_id": null, "title": "Bench Press", "sets": [{type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}] },
                { "supersets_id": null, "title": "Incline Dumbbell Press", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Cable Flyes", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
                { "supersets_id": null, "title": "Push-Ups", "sets": [{type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}] },
                { "supersets_id": null, "title": "Dumbbell Pullover", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
            ],
        },
        {
            day_title: "Back Day",
            exercises: [
                { "supersets_id": null, "title": "Deadlift", "sets": [{type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}] },
                { "supersets_id": null, "title": "Pull-Ups", "sets": [{type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}] },
                { "supersets_id": null, "title": "Bent Over Rows", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Lat Pulldowns", "sets": [{type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}] },
                { "supersets_id": null, "title": "Face Pulls", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
            ],
        },
        {
            day_title: "Leg Day",
            exercises: [
                { "supersets_id": null, "title": "Squats", "sets": [{type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}] },
                { "supersets_id": null, "title": "Leg Press", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Lunges", "sets": [{type: "normal", reps: 10, rpe: 7},{type: "normal", reps: 10, rpe: 7},{type: "normal", reps: 10, rpe: 7},{type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Leg Curls", "sets": [{type: "normal", reps: 12, rpe: 6},{type: "normal", reps: 12, rpe: 6},{type: "normal", reps: 12, rpe: 6},{type: "normal", reps: 12, rpe: 6}]},
                { "supersets_id": null, "title": "Calf Raises", "sets": [{type: "normal", reps: 15, rpe: 6},{type: "normal", reps: 15, rpe: 6},{type: "normal", reps: 15, rpe: 6},{type: "normal", reps: 15, rpe: 6}]},
            ],
        },
        {
            day_title: "Shoulder Day",
            exercises: [
                { "supersets_id": null, "title": "Overhead Press", "sets": [{type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}] },
                { "supersets_id": null, "title": "Dumbbell Lateral Raises", "sets": [{type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}] },
                { "supersets_id": null, "title": "Front Raises", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
                { "supersets_id": null, "title": "Shrugs", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Reverse Pec Deck", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
            ],
        },
        {
            day_title: "Arm Day",
            exercises: [
                { "supersets_id": null, "title": "Bicep Curls", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Tricep Dips", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Hammer Curls", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Skull Crushers", "sets": [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { "supersets_id": null, "title": "Cable Tricep Extensions", "sets": [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
            ],
        },
    ],
};


export const fallbackOneDay = {
    workout_days: [
        {
        day_title: "Full Body Day",
        exercises: [
            { "supersets_id": null, "title": "Squat (Barbell)", "sets": [{type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}] },
            { "supersets_id": null, "title": "Deadlift (Barbell)", "sets": [{type: "normal", reps: 10, rpe: 8}, {type: "normal", reps: 10, rpe: 8}, {type: "normal", reps: 10, rpe: 8}, {type: "normal", reps: 10, rpe: 8}] },
            { "supersets_id": null, "title": "Pull ups", "sets": [{type: "normal", reps: 12, rpe: 7}, {type: "normal", reps: 12, rpe: 7}, {type: "normal", reps: 12, rpe: 7}, {type: "normal", reps: 12, rpe: 7}] },
            { "supersets_id": null, "title": "Standing Overhead Press", "sets": [{type: "normal", reps: 10, rpe: 8}, {type: "normal", reps: 10, rpe: 8}, {type: "normal", reps: 10, rpe: 8}, {type: "normal", reps: 10, rpe: 8}] },
            { "supersets_id": null, "title": "Bench Press (Barbell)", "sets": [{type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}] },
        ],
        },
    ],
};
export const fallbackPPL = {
    workout_days: [
        {
            day_title: "Push Day",
            exercises: [
                { supersets_id: null, title: "Bench Press", sets: [{type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}] },
                { supersets_id: null, title: "Overhead Dumbbell Press", sets: [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { supersets_id: null, title: "Incline Dumbbell Flyes", sets: [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
                { supersets_id: null, title: "Tricep Dips", sets: [{type: "normal", reps: 10, rpe: 8}, {type: "normal", reps: 10, rpe: 8}, {type: "normal", reps: 10, rpe: 8}, {type: "normal", reps: 10, rpe: 8}] },
                { supersets_id: null, title: "Lateral Raises", sets: [{type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}] },
            ],
        },
        {
            day_title: "Pull Day",
            exercises: [
                { supersets_id: null, title: "Pull-Ups", sets: [{type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}, {type: "normal", reps: 6, rpe: 8}] },
                { supersets_id: null, title: "Bent Over Row", sets: [{type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}, {type: "normal", reps: 8, rpe: 7}] },
                { supersets_id: null, title: "Face Pulls", sets: [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
                { supersets_id: null, title: "Bicep Curls", sets: [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { supersets_id: null, title: "Lat Pulldowns", sets: [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
            ],
        },
        {
            day_title: "Leg Day",
            exercises: [
                { supersets_id: null, title: "Squats", sets: [{type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}, {type: "normal", reps: 8, rpe: 8}] },
                { supersets_id: null, title: "Leg Press", sets: [{type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}, {type: "normal", reps: 10, rpe: 7}] },
                { supersets_id: null, title: "Lunges", sets: [{type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}, {type: "normal", reps: 12, rpe: 6}] },
                { supersets_id: null, title: "Hamstring Curls", sets: [{type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}, {type: "normal", reps: 10, rpe: 6}] },
                { supersets_id: null, title: "Calf Raises", sets: [{type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}, {type: "normal", reps: 15, rpe: 6}] },
            ],
        },
    ],
};


export const emptyHevyRoutineProgram: THevyRoutine[] = [
    {
        id: "1",
        title: "",
        notes: "",
        folder_id: 0,
        updated_at: "2025-03-07T12:00:00Z",
        created_at: "2025-03-01T12:00:00Z",
        exercises: [],
    },
    {
        id: "2",
        title: "",
        notes: "",
        folder_id: 0,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "3",
        title: "",
        notes: "",
        folder_id: 1,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "4",
        title: "",
        notes: "",
        folder_id: 1,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "5",
        title: "",
        notes: "",
        folder_id: 2,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "6",
        title: "",
        notes: "",
        folder_id: 2,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "7",
        title: "",
        notes: "",
        folder_id: 3,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "8",
        title: "",
        notes: "",
        folder_id: 3,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "9",
        title: "",
        notes: "",
        folder_id: 4,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "10",
        title: "",
        notes: "",
        folder_id: 4,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "11",
        title: "",
        notes: "",
        folder_id: 5,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "12",
        title: "",
        notes: "",
        folder_id: 5,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "13",
        title: "",
        notes: "",
        folder_id: 6,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "14",
        title: "",
        notes: "",
        folder_id: 6,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "15",
        title: "",
        notes: "",
        folder_id: 7,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "16",
        title: "",
        notes: "",
        folder_id: 7,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "17",
        title: "",
        notes: "",
        folder_id: 8,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "18",
        title: "",
        notes: "",
        folder_id: 8,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "19",
        title: "",
        notes: "",
        folder_id: 9,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "20",
        title: "",
        notes: "",
        folder_id: 9,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "21",
        title: "",
        notes: "",
        folder_id: 10,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "22",
        title: "",
        notes: "",
        folder_id: 10,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "23",
        title: "",
        notes: "",
        folder_id: 11,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
    {
        id: "24",
        title: "",
        notes: "",
        folder_id: 11,
        updated_at: "2025-03-07T12:30:00Z",
        created_at: "2025-03-02T12:00:00Z",
        exercises: [],
    },
];


export const exampleProximaProgram: TProgramCreatorDay[][] = [
    [
        {
            "order": "1",
            "day_title": "",
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "gif_id": "2404",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "day_title": "",
            "notes": "",
            "order": "2",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "day_title": "",
            "notes": "",
            "order": "1",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "day_title": "",
            "order": "2",
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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
            "notes": "",
            "exercises": [
                {
                    "exercise": {
                        "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
                        "name_english": "21s (EZ Bar)",
                        "name_espanol": "21s (EZ Bar)",
                        "name_portugues": "21s (EZ Bar)",
                        "name_francais": "21s (EZ Bar)",
                        "normalized_name_english": "21s bar ez",
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
                        "normalized_name_english": "arm circle",
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
                        "normalized_name_english": "cable chest fly",
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
                        "normalized_name_english": "front lever",
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
                        "normalized_name_english": "kettlebell swing",
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
                        "normalized_name_english": "behind machine neck press smith the",
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

export const emptyProximaProgram: TProgramCreatorDay[][] = [
    [
        {
            "order": "1",
            "day_title": "",
            "notes": "",
            "exercises": [],
        },
        {
            "day_title": "",
            "notes": "",
            "order": "2",
            "exercises": [],
        },
    ],
    [
        {
            "day_title": "",
            "notes": "",
            "order": "1",
            "exercises": [],
        },
        {
            "day_title": "",
            "notes": "",
            "order": "2",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
        },
    ],
    [
        {
            "order": "1",
            "notes": "",
            "exercises": [],
        },
        {
            "order": "2",
            "notes": "",
            "exercises": [],
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
    value: 500,
  },
  {
    id: "stats-2",
    title: "Workouts Tracked",
    value: 2000,
  },
  {
    id: "stats-3",
    title: "Programs Created",
    value: 5000,
  },
];

export const footerLinks = [
  {
    title: "Useful Links",
    links: [
      {
        name: "Terms of Use",
        link: "/terms-of-use",
      },
      {
        name: "Privacy Policy",
        link: "/privacy",
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
      {
        name: "Survey",
        link: "https://docs.google.com/forms/d/e/1FAIpQLSffqV8QEZ0fD5GspTsGZxZ1Ic9tjimb8Poxwg-8hDP_c6CCrg/viewform",
      },
      {
        name: "Feedback",
        link: "https://proximafitness.featurebase.app/"
      }
    ],
  },
  {
    title: "Feature Requests",
    links: [
        { name: "Roadmap",
            link: "https://proximafitness.featurebase.app/roadmap"
        },
        {
            name: "Changelog",
            link: "https://proximafitness.featurebase.app/changelog"
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
    { quote: "From the moment I realised the weakness of my flesh, it disgusted me. I craved the strength and certainty of steel. I aspired for the immortal machine.", author: "Unknown"},
    { quote: "Because you might as well be dead. Seriously, if you always put limits on what you can do, physical or anything else, it’ll spread over into the rest of your life. It’ll spread into your work, into your morality, into your entire being. There are no limits. There are plateaus, but you must not stay there, you must go beyond them. If it kills you, it kills you. A man must constantly exceed his level.", author: "Bruce Lee"},
    { quote: "Where your road ends, mine begins", author: "David Goggins"},
];

export const sexOptions: IOption[] = [
    { label: "Male", value: "male"},
    { label: "Female", value: "female"},
];

export const ageOptions: IOption[] = Array.from({ length: 100 - 14 + 1 }, (_, i) => {
    const age = (i + 14).toString();
    return { label: age, value: age };
} );

export const dayPerWeekOptions: IOption[] = [
    { label: "1x per week", value: "1"},
    { label: "2x per week", value: "2" },
    { label: "3x per week", value: "3" },
    { label: "4x per week", value: "4" },
    { label: "5x per week", value: "5" },
    { label: "6x per week", value: "6" },
    { label: "7x per week", value: "7" },
];

export const specificDaysOptions: IOption[] = [
    { label: "Mon", value: "monday"},
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" },
    { label: "Sun", value: "sunday" },
];

export const programLengthOptions: IOption[] = Array.from({ length: 12 }, (_, i) => {
    const programLength = (i + 1).toString();
    return { label: `${programLength} Week${programLength === "1" ? "": "s"}`, value: programLength };
} );

export const workoutDurationOptions: IOption[] = Array.from({ length: 18 }, (_, i) => {
    const duration = ((i+1)*10).toString();
    return { label: `${duration} Mins`, value: duration };
} );

export const activityLevelOptions: IOption[] = [
    { label: "Sedentary", value: "sedentary"},
    { label: "Light activity", value: "light activity" },
    { label: "Moderate activity", value: "moderate activity" },
    { label: "High activity", value: "high activity" },
    { label: "Extreme activity", value: "extreme activity" },
];

export const goalsOptions: IOption[] = [
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

export const specializationOptions: IOption[] = [
    { label: "Bodybuilding", value: "bodybuilding"},
    { label: "Powerbuilding", value: "powerbuilding" },
    { label: "Powerlifting", value: "powerlifting"},
    { label: "Athletics", value: "athletics" },
    { label: "Bodyweight training", value: "bodyweight training" },
    { label: "Olympic weightlifting", value: "olympic weightlifting" },
    { label: "Calisthenics", value: "calisthenics" },
];

export const equipmentOptions: IOption[] = [
    { label: "Barbell", value: "barbell"},
    { label: "Dumbbell", value: "dumbbell"},
    { label: "Kettlebell", value: "kettlebell"},
    { label: "Machine", value: "machine"},
    { label: "Bodyweight", value: "bodyweight"},
    { label: "Smith machine", value: "smith machine"},
    { label: "Cable", value: "cable"},
    { label: "Cardio", value: "cardio"},
    { label: "Band", value: "band"},
    { label: "Suspension", value: "suspension"},
    { label: "Resistance band", value: "resistance_band"},
    { label: "Plate", value: "plate"},
    { label: "Other", value: "other"},
    { label: "None", value: "none"},
];

export const focusAreasOptions: IOption[] = [
    { label: "Back", value: "back"},
    { label: "Arms", value: "arms"},
    { label: "Shoulders", value: "shoulders"},
    { label: "Abs", value: "abs"},
    { label: "Chest", value: "chest"},
    { label: "Legs", value: "legs"},
    { label: "Glutes", value: "glutes"},
    { label: "Full body", value: "full body"},
];

export const difficultyOptions: IOption[] = [
    { label: "Beginner", value: "beginner"},
    { label: "Novice", value: "novice"},
    { label: "Intermediate", value: "intermediate"},
    { label: "Advanced", value: "advanced"},
];

export const healthIssuesOptions: IOption[] = [
    { label: "Post-covid recovery", value: "post-covid recovery"},
    { label: "Cannot jump", value: "cannot jump"},
    { label: "Back or hernia", value: "back or hernia"},
    { label: "Arms and shoulders", value: "arms and shoulders"},
    { label: "Hip joints", value: "hip joints"},
    { label: "Knee injuries", value: "knee injuries"},
];
