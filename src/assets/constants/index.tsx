/* eslint-disable @next/next/no-img-element */
/**
 * Central app constants module for Proxima.
 *
 * What it contains:
 * - Program builder options (suggestion groups, quick triggers, export options, program lengths, rep types, intensities, muscle groups, equipment, fallback programs, empty program templates).
 * - Form options (sex, age, days per week, program length, workout duration, activity level, goals, specialization, equipment, focus areas, difficulty, health issues, etc.).
 * - UI and marketing content such as nav links, features, stats, footer links, social media links, quotes, and filter options.
 *
 * Depends on:
 * - Public assets exported from `public/index.ts`.
 * - `humanize-duration` for human readable durations.
 * - UI types from `multi-select` and `questions`.
 * - Icons from `lucide-react`.
 *
 * Used by:
 * - `PromptTemplate` and other program builder components.
 * - Navigation and layout including `Navbar`, authenticated nav, sidebars, and footer.
 * - Landing and marketing pages throughout the app.
 */
import { people03, people02, people04, people05, people06, discord, instagram, linkedin, star, reddit, twitter, hevy_logo, google_sheets_logo_icon } from "public";
import humanizeDuration from "humanize-duration";
import { IOption } from '@/components/ui/multi-select';
import { BicepsFlexedIcon, BookOpenIcon, Calculator, Crown, FileText, FootprintsIcon, SquarePowerIcon, Table } from "lucide-react";
import { IQuestion } from "@/components/ui/questions";

/** Suggestion groups for common program builder starting points. */
export const suggestionGroups = [
    {
        label: "Start from scratch",
        highlight: "Empty Template",
        items: [
            "Empty Template",
        ],
        icon: <BookOpenIcon />,
    },
    {
      label: "Bodybuilding",
      highlight: "Bodybuilding",
      items: [
        "Make a program like GZCL (GZCLP)",
        "Make a program like nSuns",
        "Make a program like PHUL (Power Hypertrophy Upper/Lower)",
        "Make a program like Reddit's r/Fitness Basic Beginner Routine",
      ],
      icon: <BicepsFlexedIcon />,
    },
    {
      label: "Powerlifting",
      highlight: "Powerlifting",
      items: [
        "Make a program like Candito 6‑Week Program",
        "Make a program like Calgary Barbell",
        "Make a program like Bryce Lewis Greatest Hits",
        "Make a program like Conjugate / Westside Barbell Method",
      ],
      icon: <SquarePowerIcon />,
    },
    {
        label: "Weight Loss",
        highlight: "Weight Loss",
        items: [
            "Make a program like Couch to 5K (C25K)",
            "Make a program like r/Fitness Basic Beginner Routine (FBR)",
            "Make a HIIT training program",

        ],
        icon: <Calculator />,
      },
    {
      label: "Athletic Training",
      highlight: "Athletic Training",
      items: [
        "Make a program like Westside for Athletes / Conjugate Training",
        "Make a program like JuggernautAI Sport Performance / Juggernaut Field Athlete",
        "Make a program like The Vertical Jump Bible",
        "Make a program like DeFranco's Westside for Skinny Bastards (WS4SB)",

      ],
      icon: <FootprintsIcon />,
    },

];

/** Quick chip suggestions for one-tap program prompts. */
export const quickTriggerSuggestionChips = [
  "Not Sure What to Build",
  "Hypertrophy PPL",
  "Powerlifting Peak",
  "Beginner SBD",
  "Weight Loss",
  "Body Recomp",
];



/** Export destinations available for generated programs. */
export const exportOptions = [
    {
        id: "hevy",
        name: "Hevy",
        icon: (
            <div className="flex items-center gap-2">
                <Crown className="w-6 h-6 text-lightGold" />
                <img
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    src={(hevy_logo as any).src}
                    alt="Hevy"
                    className="w-full h-6 object-contain"
                />
            </div>
        ),
        subtitle: "Upload your program to Hevy so you can train from the app",
        brand: true,
    },
    {
        id: "pdf",
        name: "PDF",
        icon: <FileText className="w-6 h-6" />,
        subtitle: "Download a printable PDF of your program",
        brand: false,
    },
    // {
    //     id: "macrofactor",
    //     name: "Macrofactor",
    //     icon: (
    //         <img
    //             // eslint-disable-next-line @typescript-eslint/no-explicit-any
    //             src={(macrofactor_logo as any).src}
    //             alt="Macrofactor"
    //             className="w-full h-5 object-contain"
    //         />
    //     ),
    //     subtitle: "Download a .XLSX you can import into Macrofactor Workouts",
    //     brand: true,
    //     disabled: true,
    // },
    {
        id: "google_sheets",
        name: "Google Sheets",
        icon: (
            <img
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                src={(google_sheets_logo_icon as any).src}
                alt="Google Sheets"
                className="w-full h-8 object-contain"
            />
        ),
        subtitle: "Sync your program to a  Google Sheet",
        brand: false,
        disabled: true,
    },
    {
        id: "spreadsheet",
        name: "Spreadsheet",
        icon: <Table className="w-6 h-6" />,
        subtitle: "Download your program as a CSV file",
        brand: false,
    },
];


/** Program length options in weeks for the program builder. */
export const programLengths = ["1","2","3","4","5","6","7","8","9","10","11","12"];
/** One-rep max choices used in strength-related prompts. */
export const repMaxes = ["1","2","3","4","5","6","7","8","9","10","11","12","13","14","15"];
/** Session duration options in minutes for program design. */
export const durations = ["0","10","20","30","40","50","60","70","80","90","100","110","120","130","140","150","160","170", "180"];
/** Hevy-specific repetition measurement types for export. */
export const hevy_rep_types = [{label: "Reps", value: "reps"}, {label: "Rep Range", value: "reps_range"}, {label: "Distance (m)", value: "distance_meters"}, {label: "Time (s)", value: "duration_seconds"}, { label: "Custom Metric", value: "custom_metric"}];
/** Hevy-specific intensity types (RPE and load) for export. */
export const hevy_intensities = [{label: "RPE", value: "rpe"}, {label: "Weight (kg)", value: "weight_kg"}];
/** Internal repetition measurement types supported by the program builder. */
export const rep_types = [{label: "Reps", value: "reps"},{label: "Reps Max", value: "reps_max"},{label: "Reps Range", value: "reps_range"},{label: "Time", value: "time_taken"},{label: "Time Range", value:"time_range"},{label: "AMRAP", value: "amrap"}];
/** Intensity scales such as RPE, percentage of 1RM, and weights. */
export const intensities = [{label: "RPE", value: "rpe"},{ label: "% 1RM", value: "percent_rm" },{ label: "RPE Range", value: "rpe_range" }, {label: "Weights", value: "weights" }];
/** Light color palette used to visually separate program elements. */
export const lightColours = ["#DCF9C2", "#F4D1BD", "#E2F2F2", "#E0E1B9", "#D7FEC5", "#EEDACA", "#C5E0EA", "#EADEB5", "#CAC8D9", "#C2EAE6"];

/** Ordered steps for the multi-step program builder flow. */
export const programBuilderSteps = [
    { title: "Step 1", description: "Prompt your Program" },
    { title: "Step 2", description: "Edit and Refine" },
    { title: "Step 3", description: "Sign in to save" },
    { title: "Step 4", description: "Export program" },
];

/** Primary muscle groups used for tagging exercises and programs. */
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
/** Mapping of common health issues to sensitive muscle groups. */
export const healthIssuesMuscles = [
    {label: "Post-covid recovery", value: ["cardio"]},
    {label: "Cannot jump", value: ["quadriceps", "glutes", "hamstrings"]},
    {label: "Back or hernia", value: ["upper_back", "lower_back", "traps", "neck", "abdominals", "lats"]},
    {label: "Arms and shoulders", value: ["biceps", "triceps", "forearms", "shoulders", "traps"]},
    {label: "Hip joints", value: ["glutes", "abdominals"]},
    {label: "Knee injuries", value: ["quadriceps", "hamstrings", "glutes"]}
];

/** Detailed list of muscle groups for focus and filtering. */
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

/** Supported equipment options used in exercises and program filters. */
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

/** Fallback upper/lower split program when AI generation fails. */
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

/** Fallback seven-day program template when AI generation is unavailable. */
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


/** Fallback Calgary Barbell style program template. */
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


/** Fallback single-day full-body program template. */
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
/** Fallback push/pull/legs (PPL) program template. */
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


/** Empty Hevy routine template used as a starting point for exports. */
export const emptyHevyProgram: THevyRoutine[] = [
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


// export const exampleProximaProgram: TProgramCreatorDay[][] = [
//     [
//         {
//             "order": "1",
//             "day_title": "",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "gif_id": "2404",
//                         "normalized_name_english": "21s bar ez",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "day_title": "",
//             "notes": "",
//             "order": "2",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "day_title": "",
//             "notes": "",
//             "order": "1",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "day_title": "",
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
//     [
//         {
//             "order": "1",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//         {
//             "order": "2",
//             "notes": "",
//             "exercises": [
//                 {
//                     "exercise": {
//                         "id": "76fe28c9-cdde-44ec-ab77-99564cfbfeb3",
//                         "name_english": "21s (EZ Bar)",
//                         "name_espanol": "21s (EZ Bar)",
//                         "name_portugues": "21s (EZ Bar)",
//                         "name_francais": "21s (EZ Bar)",
//                         "normalized_name_english": "21s bar ez",
//                         "gif_id": "2404",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8bd8b3ec-af2c-4876-8eb4-31e43010fb63",
//                         "name_english": "Arm Circle",
//                         "name_espanol": "Círculos de Brazo",
//                         "name_portugues": "Círculo de braço",
//                         "name_francais": "Cercle de Bras",
//                         "normalized_name_english": "arm circle",
//                         "gif_id": "1428",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_max": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "percent_rm": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "8d6e55b1-9db7-46e7-8a99-662828674528",
//                         "name_english": "Chest Fly (Cable)",
//                         "name_espanol": "Fly de Pecho (Cable)",
//                         "name_portugues": "Voador de Peito (Cabo)",
//                         "name_francais": "Écarté de Poitrine (Câble)",
//                         "normalized_name_english": "cable chest fly",
//                         "gif_id": "0227",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "reps_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe_range": [
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                             [
//                                 9,
//                                 10,
//                             ],
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "12c19386-ce7b-446c-a843-725aa5f842dc",
//                         "name_english": "Front Lever",
//                         "name_espanol": "Levantamiento Frontal",
//                         "name_portugues": "Alavanca Frontal",
//                         "name_francais": "Front Lever",
//                         "normalized_name_english": "front lever",
//                         "gif_id": "3296",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_taken": [
//                             8,
//                             8,
//                             8,
//                             8,
//                         ],
//                     },
//                     "intensity": {
//                         "weights": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "957bd715-f994-4031-8b67-5871c805715d",
//                         "name_english": "Kettlebell Swing",
//                         "name_espanol": "Swing con Kettlebell",
//                         "name_portugues": "Swing com Kettlebell",
//                         "name_francais": "Swing avec Kettlebell",
//                         "normalized_name_english": "kettlebell swing",
//                         "gif_id": "0549",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "time_range": [
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                             [
//                                 8,
//                                 12,
//                             ],
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//                 {
//                     "exercise": {
//                         "id": "2e00037f-97d9-4550-bac0-3b2b3ca9be91",
//                         "name_english": "Behind The Neck Press (Smith Machine)",
//                         "name_espanol": "Prensa Trasera (Máquina Smith)",
//                         "name_portugues": "Prensa atrás do pescoço (máquina Smith)",
//                         "name_francais": "Développé Nuque (Smith Machine)",
//                         "normalized_name_english": "behind machine neck press smith the",
//                         "gif_id": "0747",
//                     },
//                     "sets": 4,
//                     "reps_type": {
//                         "amrap": [
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                             "amrap",
//                         ],
//                     },
//                     "intensity": {
//                         "rpe": [
//                             9,
//                             9,
//                             9,
//                             9,
//                         ],
//                     },
//                 },
//             ],
//         },
//     ],
// ];

/** Empty Proxima program template used as a starting point in the builder. */
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

/** Humanizer configured for short English duration strings. */
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

/** Filter group options for narrowing down programs and content. */
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

/** Navigation links shown to authenticated users. */
export const authenticatedNavLinks = [
    {
        id: "home",
        title: "Home",
    },
    {
        id: "programs",
        title: "Explore"
    },

    // {
    //     id: "program-builder",
    //     title: "AI Program Builder",
    // },
    {
        id: "profile",
        title: "Profile"
    },
    {
        id: "pricing",
        title: "Upgrade",
    },
    // {
    //     id: "cta",
    //     title: "Download App",
    // },
];

/** Public landing page navigation links. */
export const navLinks = [
    {
        id: "home",
        title: "Home",
    },
    {
        id: "programs",
        title: "Explore",
    },
    {
        id: "about",
        title: "About Us",
    },
    {
        id: "pricing",
        title: "Pricing",
    },
    // {
    //     id: "program-builder",
    //     title: "AI Program Builder",
    // },
    // {
    //     id: "cta",
    //     title: "Download App",
    // },
];

/** Nav link id to URL. Used by Navbar and AppSidebar for consistent routing. */
export const navIdToUrl: Record<string, string> = {
    home: "/",
    programs: "/programs",
    about: "/about",
    pricing: "/pricing",
    profile: "/profile",
    "log-in": "/auth/login",
};

/** Marketing feature descriptions displayed on the landing page. */
export const features = [
  {
    id: "feature-1",
    icon: star.src,
    title: "Follow programs shared by other lifters",
    content:
      "Members share their workouts for free. Follow along and learn from real lifters and coaches.",
  },
  {
    id: "feature-2",
    icon: star.src,
    title: "Break through plateaus with proven programs",
    content:
      "Run proven programs from Reddit and the community—no guesswork.",
  },
  {
    id: "feature-3",
    icon: star.src,
    title: "Share your programs and grow your following",
    content:
      "Post your programs on Proxima and help other lifters. Build your audience with your expertise.",
  },
];

/** User testimonial content used in marketing sections. */
export const feedback = [
    {
        id: "feedback-1",
        content:
            "Lots of cool programs, and super easy to use UI. Would definitely recommend trying out the pro version",
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

/** Key product and community statistics for marketing. */
export const stats = [
  {
    id: "stats-1",
    title: "Proxima Members",
    value: 1000,
  },
  {
    id: "stats-2",
    title: "Workouts Tracked",
    value: 2000,
  },
  {
    id: "stats-3",
    title: "Programs Created",
    value: 8000,
  },
];

/** User-facing messages and error copy. */
export const PROFANITY_ERROR_MESSAGE = "Content contains profanity that does not meet our community guidelines";

/** NSFW detection threshold for profile pictures (score >= this value rejects the image). */
export const PROFILE_PICTURE_NSFW_THRESHOLD = 0.97;

/** Error message when profile picture fails NSFW check. */
export const PROFILE_PICTURE_NSFW_MESSAGE = "Image does not meet our community guideline standards";

/** Reason shown when an exercise is skipped during Hevy upload (not in library). */
export const HEVY_OMIT_REASON = "Exercise not found in library and will be omitted from your saved program.";

/** Error message when Hevy upload fails after rate-limit retries. */
export const RATE_LIMIT_EXHAUSTED_MESSAGE = "Upload failed. Rate limited after 3 retries.";

/** Prompt used for blind-spot stall analysis. */
export const STALL_PROMPT = "I have stalled on this exercise can you modify my existing program to fix this plateau. Check my existing program first and then make changes you think would fix this plateau. Explain to me what you're going to do. Then return three new lines then ask me `Would you like me to make these changes to your program now?` and then exit.";

/** Link groups rendered in the site footer. */
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

/** Social media link metadata for the footer and marketing sections. */
export const socialMedia = [
  {
    id: "social-media-1",
    label: "Proxima Fitness on Instagram",
    icon: instagram.src,
    link: "https://www.instagram.com/proximafitnessapp/",
  },
  {
    id: "social-media-2",
    label: "Proxima Fitness on Discord",
    icon: discord.src,
    link: "https://discord.com/invite/4AhEd3eZpb",
  },
  {
    id: "social-media-3",
    label: "Proxima Fitness on Twitter",
    icon: twitter.src,
    link: "https://www.twitter.com/jacklhanlon",
  },
  {
    id: "social-media-4",
    label: "Proxima Fitness on LinkedIn",
    icon: linkedin.src,
    link: "https://www.linkedin.com/company/proxima-fitness/",
  },
  {
    id: "social-media-5",
    label: "Proxima Fitness on Reddit",
    icon: reddit.src,
    link: "https://www.reddit.com/r/ProximaFitness/",
  },
];

/** Curated quotes displayed across the marketing experience. */
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

/** Sex options used in onboarding and goal forms. */
export const sexOptions: IOption[] = [
    { label: "Male", value: "male"},
    { label: "Female", value: "female"},
];

/** Age options (in years) used in onboarding and program tailoring. */
export const ageOptions: IOption[] = Array.from({ length: 100 - 14 + 1 }, (_, i) => {
    const age = (i + 14).toString();
    return { label: age, value: age };
} );

/** Training frequency options for days per week. */
export const dayPerWeekOptions: IOption[] = [
    { label: "1x per week", value: "1"},
    { label: "2x per week", value: "2" },
    { label: "3x per week", value: "3" },
    { label: "4x per week", value: "4" },
    { label: "5x per week", value: "5" },
    { label: "6x per week", value: "6" },
    { label: "7x per week", value: "7" },
];

/** Specific weekday selection options for scheduling workouts. */
export const specificDaysOptions: IOption[] = [
    { label: "Mon", value: "monday"},
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" },
    { label: "Sun", value: "sunday" },
];

/** Program length options (in weeks) used in forms. */
export const programLengthOptions: IOption[] = Array.from({ length: 12 }, (_, i) => {
    const programLength = (i + 1).toString();
    return { label: `${programLength} Week${programLength === "1" ? "": "s"}`, value: programLength };
} );

/** Workout duration options (in minutes) used in forms. */
export const workoutDurationOptions: IOption[] = Array.from({ length: 18 }, (_, i) => {
    const duration = ((i+1)*10).toString();
    return { label: `${duration} Mins`, value: duration };
} );

/** Self-reported activity level choices for personalization. */
export const activityLevelOptions: IOption[] = [
    { label: "Sedentary", value: "sedentary"},
    { label: "Light activity", value: "light activity" },
    { label: "Moderate activity", value: "moderate activity" },
    { label: "High activity", value: "high activity" },
    { label: "Extreme activity", value: "extreme activity" },
];

/** High-level training goal options (strength, hypertrophy, etc.). */
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

/** Specialization focus options such as specific lifts or sports. */
export const specializationOptions: IOption[] = [
    { label: "Bodybuilding", value: "bodybuilding"},
    { label: "Powerbuilding", value: "powerbuilding" },
    { label: "Powerlifting", value: "powerlifting"},
    { label: "Athletics", value: "athletics" },
    { label: "Bodyweight training", value: "bodyweight training" },
    { label: "Olympic weightlifting", value: "olympic weightlifting" },
    { label: "Calisthenics", value: "calisthenics" },
];

/** Available equipment options used to constrain program design. */
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

/** Focus area options such as body regions or performance attributes. */
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

/** Difficulty level options from beginner to advanced. */
export const difficultyOptions: IOption[] = [
    { label: "Beginner", value: "beginner"},
    { label: "Novice", value: "novice"},
    { label: "Intermediate", value: "intermediate"},
    { label: "Advanced", value: "advanced"},
];

/** Health issue flags surfaced in safety and modification questions. */
export const healthIssuesOptions: IOption[] = [
    { label: "Post-covid recovery", value: "post-covid recovery"},
    { label: "Cannot jump", value: "cannot jump"},
    { label: "Back or hernia", value: "back or hernia"},
    { label: "Arms and shoulders", value: "arms and shoulders"},
    { label: "Hip joints", value: "hip joints"},
    { label: "Knee injuries", value: "knee injuries"},
];


/** Sample prompt questions used to inspire users in the program builder. */
export const sampleQuestions: IQuestion[] = [
    {
      id: "program-length",
      question: "Program length?",
      options: programLengthOptions.map(opt => ({
        id: opt.value,
        label: opt.label === "8 Weeks" ? "8 Weeks (Recommended)" : opt.label
      })),
      allowOther: false,
    },
    {
      id: "days-per-week",
      question: "Days per week?",
      options: dayPerWeekOptions.map(opt => ({
        id: opt.value,
        label: opt.label
      })),
      allowOther: false,
    },
    {
      id: "exclude-equipment",
      question: "Exclude equipment?",
      subtitle: { text: "Selected equipment will be excluded from your program—not included." },
      type: "multi-select",
      options: equipmentOptions.map(opt => ({
        id: opt.value,
        label: opt.label
      })),
      allowOther: false,
    },
    {
      id: "health-issues",
      question: "Health issues to consider?",
      type: "text-with-quickfill",
      options: healthIssuesOptions.map(opt => ({
        id: opt.value,
        label: opt.label
      })),
      allowOther: false,
    },
    {
      id: "split-type",
      question: "Preferred split?",
      options: [
        { id: "default", label: "Based on your goals (Recommended)" },
        { id: "ppl", label: "PPL (Push, Pull, Legs)" },
        { id: "pplul", label: "PPLUL (Push, Pull, Legs, Upper, Lower)" },
        { id: "ul", label: "UL (Upper, Lower)" },
        { id: "fb", label: "FB (Full Body)" },
        { id: "other", label: "Other" },
      ],
      allowOther: true,
    },
    {
      id: "exercise-variability",
      question: "Exercise variability?",
      options: [
        { id: "little", label: "Don't vary the exercises (Recommended for strength and hypertrophy programs)" },
        { id: "lots", label: "Vary the exercises (Recommended if you get bored easily)" },
      ],
      allowOther: true,
    },
    {
      id: "progression-system",
      question: "Add progressive overload system?",
      subtitle: {
        text: "Learn more",
        link: "https://jackproxima.substack.com/p/demystifying-progressive-overload"
      },
      options: [
        { id: "default", label: "Based on your goals (Recommended)" },
        { id: "linear", label: "Linear" },
        { id: "double", label: "Double " },
        { id: "rpe-based", label: "RPE-based" },
        { id: "wave-loading", label: "Wave-loading" },
        { id: "density", label: "Density" },
        { id: "other", label: "Other" },
      ],
      allowOther: true,
    },
    {
      id: "deload-week",
      question: "Add a Deload week?",
      options: [
        { id: "yes", label: "Yes ( Add an easier week at the end of the program)" },
        { id: "no", label: "No ( No deload week at the end of the program)" },
      ],
      allowOther: false,
    },
  ];

export const SIDEBAR_POSITION_KEY = "andy-sidebar-position";
export const SIDEBAR_SIZE_KEY = "andy-sidebar-size";
export const PENDING_ATTACHMENTS_KEY = "pending-attachments";
export const PENDING_INITIAL_PROMPT_KEY = "pending-initial-prompt";
export const LONG_PROMPT_PLACEHOLDER = "__long_prompt__";
export const COLLAPSED_SIZE = 30;
export const EXPANDED_SIZE = 70;
export const CHAT_MESSAGES_KEY = "messages";
