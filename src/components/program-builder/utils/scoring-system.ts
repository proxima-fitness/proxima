import { healthIssuesMuscles, primaryMuscleGroups } from "@/assets/constants";
import Fuse, { FuseResult } from "fuse.js";

export const bestMatch = (exercises: FuseResult<THevyExerciseTemplate>[], title: string) => {
    const parsedTitle = parseExerciseTitle(title);
    const bestMatch = exercises.reduce((best, current) => {
        return nlpScore(parsedTitle, parseExerciseTitle(current.item.normalized_title)) > nlpScore(parsedTitle, parseExerciseTitle(best.item.normalized_title)) ? current : best;
    }, exercises[0]);
    return bestMatch;
}

const BASE_MOVEMENTS = [
  "squat", "press", "row", "curl", "deadlift", "lunge", "lunges", "extension", "raise", "fly", "pull", "push", "crunch", "plank", "dip", "dips", "shrug", "up"
];
const MODIFIERS = [
  // Equipment
  "barbell", "dumbbell", "machine", "kettlebell", "band", "cable", "smith", "trap bar", "bodyweight",
  // Form/Technique
  "sumo", "bulgarian", "preacher", "romanian", "incline", "decline", "goblet", "front", "rear", "seated", "lying", "standing", "single", "split", "kipping", "pendlay",
  // Grip/Width
  "wide", "narrow", "neutral", "overhand", "underhand", "neutral grip", "diamond"
];

export const parseExerciseTitle = (title: string): { base: string, modifiers: string[] } => {
  // Remove parentheses and tokenize
  const tokens = title.replace(/[()-]/g, " ").toLowerCase().split(/\s+/);

  let base = "";
  const modifiers: string[] = [];

  for (const token of tokens) {
    if (BASE_MOVEMENTS.includes(token)) {
      base = token;
    } else if (MODIFIERS.includes(token)) {
      modifiers.push(token);
    } else {
      // Optionally: treat unknowns as generic modifiers
      modifiers.push(token);
    }
  }

  // If no base found, fallback to last token (often the movement)
  if (!base && tokens.length > 0) {
    base = tokens[tokens.length - 1];
    modifiers.pop(); // Remove from modifiers if it was added
  }

  // Remove duplicates and ensure base is not in modifiers
  return { base, modifiers: Array.from(new Set(modifiers)).filter(m => m !== base) };
};


// Modifier weights for scoring exercise similarity
const MODIFIER_WEIGHTS = {
    form: { missing: -5, match: 3 },
    equipment: { missing: -3, match: 2 },
    grip: { missing: -2, match: 2 },
    default: { missing: -2, match: 2 }
  };

  const categorizeModifier = (mod: string): keyof typeof MODIFIER_WEIGHTS => {
    const m = mod.toLowerCase();
    if (["sumo", "bulgarian", "preacher", "romanian", "incline", "decline", "goblet", "front", "rear", "seated", "lying", "standing", "single", "split", "kipping", "pendlay"].includes(m)) return "form";
    if (["barbell", "dumbbell", "machine", "kettlebell", "band", "cable", "smith", "trap bar", "bodyweight"].includes(m)) return "equipment";
    if (["wide", "narrow", "neutral", "overhand", "underhand", "neutral grip", "diamond"].includes(m)) return "grip";
    return "default";
  }

  /**
   * Scores the similarity between two parsed exercise objects (with base and modifiers)
   * @param llmParsed { base: string, modifiers: string[] }
   * @param dbParsed { base: string, modifiers: string[] }
   * @returns {number} score
   */
  export const nlpScore = (
    llmParsed: { base: string, modifiers: string[] },
    dbParsed: { base: string, modifiers: string[] }
  ): number => {
    let score = 0;
    if (llmParsed.base === dbParsed.base) score += 10;

    for (const dbMod of dbParsed.modifiers) {
      const category = categorizeModifier(dbMod);
      const weights = MODIFIER_WEIGHTS[category];
      if (llmParsed.modifiers.includes(dbMod)) {
        score += weights.match;
      } else {
        score += weights.missing;
      }
    }

    // Extra credit if both LLM and DB are minimal/generic
    if (llmParsed.modifiers.length === 0 && dbParsed.modifiers.length === 0) score += 2;

    return score;
  }


export const normalizeExerciseTitle = (title: string): string => {
    return title
    .toLowerCase()
    .replace(/[()]/g, '')
    .split(/[\s-]+/)
    .sort()
    .join(' ');
};

/* Replaces the exercises pulled from the AI edge function text-to-json into a hevy exercise array */
export const replaceTextToJsonExercisesHevy = (exercises: {
    sets: {
        type: string;
        reps: number;
        rpe: number;
    }[];
    title: string;
    supersets_id: number | null;
    }[],
    hevyExercises: THevyExerciseTemplate[],
    excludeAreas: string,
    excludeEquipment: string,
    healthIssues: string,
):
    THevyExercise[] => {

    // Fuse Fuzzy match options
    const options = {
        isCaseSensitive: false,
        includeScore: false,
        minMatchCharLength: 2,
        shouldSort: true,
        threshold: 0.5,
        keys: [
            "normalized_title",
        ],
    };

    let filteredHevyExercises: THevyExerciseTemplate[] = [...hevyExercises];
    // Enforce excluding equipment, focusAreas and health issues from the options in hevyExercises.
    const excludedEq = excludeEquipment.split(",").map((e) => e.trim().toLowerCase());
    const excludedAreas = excludeAreas.split(",").map((e) => e.trim().toLowerCase());
    const excludedHealthIssues = healthIssues.split(",").map((e) => e.trim().toLowerCase());

    if (excludedEq && excludedEq.some(eq => eq.trim() !== "")) {
        filteredHevyExercises = filteredHevyExercises.filter((ex) => {
            const title = ex.title.toLowerCase();
            return !excludedEq.some((eq: string) => title.includes(eq));
        });
    }

    if (excludedAreas && excludedAreas.some(eq => eq.trim() !== "")) {
        const excludedMuscleGroups = primaryMuscleGroups
        .filter(group => excludedAreas.includes(group.label.toLowerCase()))
        .flatMap(group => group.value);

        filteredHevyExercises = filteredHevyExercises.filter((ex) => {
            const primaryMuscle = ex.primary_muscle_group;
            return !excludedMuscleGroups.includes(primaryMuscle);
        });
    }

    if (excludedHealthIssues && excludedHealthIssues.some(eq => eq.trim() !== "") ) {
        const filteredHealthIssues = healthIssuesMuscles
            .filter(group => excludedHealthIssues.includes(group.label.toLowerCase()))
            .flatMap(group => group.value);

        filteredHevyExercises = filteredHevyExercises.filter((ex) => {
            const primaryMuscle = ex.primary_muscle_group;
            return !filteredHealthIssues.includes(primaryMuscle);
        })
    }

    const fuse = new Fuse(filteredHevyExercises, options);
    let updatedExercises: THevyExercise[] = [];

    if (exercises && exercises.length > 0) {
        updatedExercises = exercises.flatMap((exercise, index) => {
            const fuseResults = fuse && fuse?.search(normalizeExerciseTitle(exercise?.title ?? ""), { limit : 5});
            const match = fuseResults?.[0]?.item;
            const selectedMatch = bestMatch(fuseResults, exercise?.title ?? "");

            console.log("{expected:",normalizeExerciseTitle(exercise?.title ?? ""), ",actual:", selectedMatch.item.normalized_title, "},");

            if (!match) return [];
                return [{
                    index: index,
                    title: selectedMatch?.item?.title ?? "",
                    notes: "",
                    exercise_template_id: selectedMatch?.item?.id ?? "",
                    rest_seconds: null,
                    supersets_id: exercise?.supersets_id ?? null,
                    sets: Array.from({length: exercise.sets.length}, (_, setIndex) => ({
                        index: setIndex,
                        type: exercise?.sets[setIndex]?.type ?? "normal",
                        weight_kg: null,
                        reps: exercise?.sets[setIndex]?.reps ?? 8,
                        distance_meters: null,
                        duration_seconds: null,
                        rpe: exercise?.sets[setIndex]?.rpe ?? 9,
                        custom_metric: null,
                    })),
                }];
        });
    }

    return updatedExercises;

};



// Replaces the exercises pulled from the AI edge function text-to-json into an TProgramCreatorExercise array
export const replaceTextToJsonExercises = (request_exercises: {
    sets: {
        type: string;
        reps: number;
        rpe: number;
    }[];
    title: string;
    }[],
    exercises: TExercise[]): TProgramCreatorExercise[] => {

    // Fuse Fuzzy match options
    const options = {
        isCaseSensitive: false,
        includeScore: false,
        minMatchCharLength: 2,
        shouldSort: true,
        threshold: 0.5,
        keys: [
            "name_english",
        ],
    };

    const fuse = new Fuse(exercises, options);
    let updatedExercises: TProgramCreatorExercise[] = [];

    if (request_exercises && request_exercises.length > 0) {
        updatedExercises = request_exercises.flatMap((exercise) => {
            const fuseResults = fuse && fuse?.search(exercise?.title ?? "", { limit : 1});
            const match = fuseResults?.[0]?.item;

            if (!match) return [];

                return [{
                    exercise: match,
                    sets: exercise.sets.length,
                    reps_type: { reps: exercise.sets.map(set => set.reps) },
                    intensity: { rpe: exercise.sets.map(set => set.rpe) }
                }];
        });
    }

    return updatedExercises;
};
