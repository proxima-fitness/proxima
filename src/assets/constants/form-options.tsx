/** Sex options used in onboarding and goal forms. */
export const sexOptions: TSelectOption[] = [
    { label: "Male", value: "male"},
    { label: "Female", value: "female"},
];

/** Age options (in years) used in onboarding and program tailoring. */
export const ageOptions: TSelectOption[] = Array.from({ length: 100 - 14 + 1 }, (_, i) => {
    const age = (i + 14).toString();
    return { label: age, value: age };
} );

/** Training frequency options for days per week. */
export const dayPerWeekOptions: TSelectOption[] = [
    { label: "1x per week", value: "1"},
    { label: "2x per week", value: "2" },
    { label: "3x per week", value: "3" },
    { label: "4x per week", value: "4" },
    { label: "5x per week", value: "5" },
    { label: "6x per week", value: "6" },
    { label: "7x per week", value: "7" },
];

/** Specific weekday selection options for scheduling workouts. */
export const specificDaysOptions: TSelectOption[] = [
    { label: "Mon", value: "monday"},
    { label: "Tue", value: "tuesday" },
    { label: "Wed", value: "wednesday" },
    { label: "Thu", value: "thursday" },
    { label: "Fri", value: "friday" },
    { label: "Sat", value: "saturday" },
    { label: "Sun", value: "sunday" },
];

/** Program length options (in weeks) used in forms. */
export const programLengthOptions: TSelectOption[] = Array.from({ length: 12 }, (_, i) => {
    const programLength = (i + 1).toString();
    return { label: `${programLength} Week${programLength === "1" ? "": "s"}`, value: programLength };
} );

/** Workout duration options (in minutes) used in forms. */
export const workoutDurationOptions: TSelectOption[] = Array.from({ length: 18 }, (_, i) => {
    const duration = ((i+1)*10).toString();
    return { label: `${duration} Mins`, value: duration };
} );

/** Self-reported activity level choices for personalization. */
export const activityLevelOptions: TSelectOption[] = [
    { label: "Sedentary", value: "sedentary"},
    { label: "Light activity", value: "light activity" },
    { label: "Moderate activity", value: "moderate activity" },
    { label: "High activity", value: "high activity" },
    { label: "Extreme activity", value: "extreme activity" },
];

/** High-level training goal options (strength, hypertrophy, etc.). */
export const goalsOptions: TSelectOption[] = [
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
export const specializationOptions: TSelectOption[] = [
    { label: "Bodybuilding", value: "bodybuilding"},
    { label: "Powerbuilding", value: "powerbuilding" },
    { label: "Powerlifting", value: "powerlifting"},
    { label: "Athletics", value: "athletics" },
    { label: "Bodyweight training", value: "bodyweight training" },
    { label: "Olympic weightlifting", value: "olympic weightlifting" },
    { label: "Calisthenics", value: "calisthenics" },
];

/** Available equipment options used to constrain program design. */
export const equipmentOptions: TSelectOption[] = [
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
export const focusAreasOptions: TSelectOption[] = [
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
export const difficultyOptions: TSelectOption[] = [
    { label: "Beginner", value: "beginner"},
    { label: "Novice", value: "novice"},
    { label: "Intermediate", value: "intermediate"},
    { label: "Advanced", value: "advanced"},
];

/** Health issue flags surfaced in safety and modification questions. */
export const healthIssuesOptions: TSelectOption[] = [
    { label: "Post-covid recovery", value: "post-covid recovery"},
    { label: "Cannot jump", value: "cannot jump"},
    { label: "Back or hernia", value: "back or hernia"},
    { label: "Arms and shoulders", value: "arms and shoulders"},
    { label: "Hip joints", value: "hip joints"},
    { label: "Knee injuries", value: "knee injuries"},
];


/** Sample prompt questions used to inspire users in the program builder. */
export const sampleQuestions: TQuestion[] = [
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
    {
      id: "peak-week",
      question: "Do you want a Peak week?",
      options: [
        { id: "yes", label: "Yes ( Include a higher-intensity week in the program)" },
        { id: "no", label: "No" },
      ],
      allowOther: false,
    },
    {
      id: "warmup-exercises",
      question: "Add warmup exercises?",
      options: [
        { id: "yes", label: "Yes ( Include 1–2 prep movements at the start of each day)" },
        { id: "no", label: "No ( Skip separate warmup exercises)" },
      ],
      allowOther: false,
    },
  ];


