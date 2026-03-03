/**
 * @module scoring-system
 * DEPRECATED: This module is no longer used.
 * Provides exercise-matching logic that maps free-text exercise names from AI
 * output to canonical Hevy exercise templates. The pipeline works in two stages:
 *
 * 1. **Fuse.js fuzzy search** narrows the ~1 000-exercise Hevy library down to
 *    a shortlist of ≤10 candidates by normalized title similarity.
 * 2. **NLP scoring** (parseExerciseTitle + nlpScore) re-ranks candidates by
 *    decomposing each title into a base movement and weighted modifiers
 *    (equipment, form, grip, muscle group), then comparing overlap.
 *
 * The module also enforces user constraints (excluded equipment, focus areas,
 * health issues) by pre-filtering the exercise pool before fuzzy matching.
 *
 * Depends on: fuse.js, @/assets/constants (muscle-group / health-issue maps)
 * Used by: Agent text-to-JSON pipeline (replaceTextToJsonExercisesHevy)
 */

import { healthIssuesMuscles, primaryMuscleGroups } from "@/assets/constants";
import Fuse, { FuseResult } from "fuse.js";

/**
 * Selects the single best match from a Fuse.js result set by re-scoring
 * each candidate with the NLP-based similarity scorer.
 *
 * @param exercises - Fuse.js candidate results (pre-sorted by fuzzy score)
 * @param title - The original AI-generated exercise title being matched
 * @returns The FuseResult entry with the highest nlpScore
 */
export const bestMatch = (exercises: FuseResult<THevyExerciseTemplate>[], title: string) => {
    const parsedTitle = parseExerciseTitle(title);
    const bestMatch = exercises.reduce((best, current) => {
        return nlpScore(parsedTitle, parseExerciseTitle(current.item.normalized_title)) > nlpScore(parsedTitle, parseExerciseTitle(best.item.normalized_title)) ? current : best;
    }, exercises[0]);
    return bestMatch;
}

/**
 * Canonical base movement verbs/nouns used to identify the core exercise pattern.
 * Includes common plural forms so tokenization doesn't need a separate stemmer.
 */
const BASE_MOVEMENTS = [
  "squat", "squats", "press", "presses", "row", "rows", "curl", "curls", "deadlift", "deadlifts", "lunge", "lunges", "extension", "extensions", "raise", "raises", "fly", "flies", "pull", "pulls", "push", "pushes", "crunch", "crunches", "plank", "planks", "dip", "dips", "shrug", "shrugs", "up", "ups",
  "pull up", "pull ups", "push up", "push ups", "plank", "planks", "twist", "twists"
];
/** Modifier tokens that qualify a base movement (equipment, form, grip, muscle). */
const MODIFIERS = [
  // Equipment
  "barbell", "dumbbell", "machine", "kettlebell", "band", "cable", "smith", "trap bar", "bodyweight",
  // Form/Technique
  "assisted","romanian","bulgarian","russian","negative", "sumo", "preacher", "romanian", "incline", "decline", "goblet", "front", "rear", "seated", "lying", "standing", "single", "split", "kipping", "pendlay", "lateral",
  // Grip/Width
  "wide", "narrow", "neutral", "overhand", "underhand", "neutral grip", "diamond",
    //Muscle
    "tricep", "triceps", "bicep", "biceps", "chest", "shoulder", "shoulders", "back", "legs", "quads", "hamstrings", "calves", "abs", "core",
];

/**
 * Decomposes an exercise title string into a canonical base movement and a list
 * of modifier tokens. Unknown tokens are treated as generic modifiers so no
 * information is lost.
 *
 * @param title - Raw exercise title (e.g. "Incline Dumbbell Bench Press")
 * @returns Object with `base` (singular movement verb) and `modifiers` (qualifiers)
 */
export const parseExerciseTitle = (title: string): { base: string, modifiers: string[] } => {
  // First normalize hyphenated exercises
  const normalizedTitle = title
    .replace(/push-up/gi, "push up")
    .replace(/pull-up/gi, "pull up")
    .replace(/[()]/g, " ")
    .toLowerCase();

  // Then tokenize
  const tokens = normalizedTitle.split(/\s+/);

  let base = "";
  const modifiers: string[] = [];

  // Helper function to check if a token is a base movement (including plural forms)
  const isBaseMovement = (token: string) => {
    return BASE_MOVEMENTS.some(movement => {
      // Check exact match
      if (movement === token) return true;
      // Check if one is plural of the other
      if (movement.endsWith('s') && movement.slice(0, -1) === token) return true;
      if (token.endsWith('s') && token.slice(0, -1) === movement) return true;
      return false;
    });
  };

  for (const token of tokens) {
    if (isBaseMovement(token)) {
      // Store the singular form if it's a plural
      base = token.endsWith('s') ? token.slice(0, -1) : token;
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


/**
 * Scoring weights per modifier category. Missing a muscle modifier is heavily
 * penalized (-8) because it likely means a completely different exercise,
 * while a missing grip modifier (-2) is more tolerable.
 */
const MODIFIER_WEIGHTS = {
    form: { missing: -5, match: 3 },
    equipment: { missing: -3, match: 2 },
    grip: { missing: -2, match: 2 },
    muscle: { missing: -8, match: 5 },  // New category for muscle groups
    default: { missing: -2, match: 2 }
};

/** Classifies a modifier token into a weight category for scoring. */
const categorizeModifier = (mod: string): keyof typeof MODIFIER_WEIGHTS => {
    const m = mod.toLowerCase();
    if (["negative", "sumo", "bulgarian", "preacher", "romanian", "incline", "decline", "goblet", "front", "rear", "seated", "lying", "standing", "single", "split", "kipping", "pendlay", "lateral", "russian", "romanian", "bulgarian"].includes(m)) return "form";
    if (["barbell", "dumbbell", "machine", "kettlebell", "band", "cable", "smith", "trap bar", "bodyweight"].includes(m)) return "equipment";
    if (["wide", "narrow", "neutral", "overhand", "underhand", "neutral grip", "diamond"].includes(m)) return "grip";
    if (["tricep", "triceps", "bicep", "biceps", "chest", "shoulder", "shoulders", "back", "legs", "quads", "hamstrings", "calves", "abs", "core"].includes(m)) return "muscle";
    return "default";
}

/**
 * Scores the structural similarity between two parsed exercise titles. The score
 * is dominated by base-movement agreement (+25), then adjusted by per-modifier
 * category weights (see MODIFIER_WEIGHTS). Higher scores indicate better matches.
 *
 * @param llmParsed - Parsed title from the AI-generated exercise name
 * @param dbParsed - Parsed title from the Hevy exercise template library
 * @returns Numeric similarity score (can be negative if many modifiers are missing)
 */
export const nlpScore = (
  llmParsed: { base: string, modifiers: string[] },
  dbParsed: { base: string, modifiers: string[] }
): number => {
  let score = 0;
  if (llmParsed.base === dbParsed.base) score += 25;

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


/**
 * Normalizes an exercise title for Fuse.js lookup by lowercasing, stripping
 * parentheses, and alphabetically sorting tokens. Sorting makes the comparison
 * order-insensitive (e.g. "Bench Press Incline" matches "Incline Bench Press").
 *
 * @param title - Raw exercise title string
 * @returns Normalized, sorted, lowercase string
 */
export const normalizeExerciseTitle = (title: string): string => {
    return title
    .toLowerCase()
    .replace(/[()]/g, '')
    .split(/\s+/)  // Only split on spaces, preserve hyphens
    .sort()
    .join(' ');
};

/**
 * Maps AI-generated exercise objects (from the text-to-JSON edge function) to
 * canonical Hevy exercise templates. If the AI provides an `exercise_template_id`,
 * it is used for a direct lookup; otherwise, Fuse.js fuzzy search + NLP scoring
 * finds the best match. The exercise pool is pre-filtered to exclude equipment,
 * muscle groups, or health-issue-related movements per user preferences.
 *
 * @param exercises - Array of AI-parsed exercise objects with title and sets
 * @param hevyExercises - Full Hevy exercise template library
 * @param excludeAreas - Comma-separated body areas to exclude (e.g. "shoulders,chest")
 * @param excludeEquipment - Comma-separated equipment to exclude (e.g. "barbell,machine")
 * @param healthIssues - Comma-separated health issues to respect (e.g. "lower back,knee")
 * @returns Array of THevyExercise objects with resolved template IDs and sets
 */
export const replaceTextToJsonExercisesHevy = (exercises: {
    sets: {
        type: string;
        reps: number;
        rpe: number;
    }[];
    title: string;
    exercise_template_id?: string;
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
        threshold: 0.7,  // Increased threshold to be less strict
        keys: [
            "normalized_title",
        ],
    };

    // Narrow the candidate pool before fuzzy search so excluded equipment, body areas,
    // and health-issue-related muscle groups never appear in results — even as partial matches.
    let filteredHevyExercises: THevyExerciseTemplate[] = [...hevyExercises];
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
            // If exercise_template_id is provided, use it directly (no fuzzy matching needed)
            if (exercise.exercise_template_id) {
                const matchedExercise = filteredHevyExercises.find(ex => ex.id === exercise.exercise_template_id);
                if (matchedExercise) {
                    return [{
                        index: index,
                        title: matchedExercise.title,
                        notes: "",
                        exercise_template_id: matchedExercise.id,
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
                }
            }

            // No direct ID match — use Fuse.js fuzzy search (limit 10 candidates)
            // then re-rank with NLP scoring via bestMatch for the final selection.
            const fuseResults = fuse && fuse?.search(normalizeExerciseTitle(exercise?.title ?? ""), { limit : 10});
            const match = fuseResults?.[0]?.item;
            const selectedMatch = bestMatch(fuseResults, exercise?.title ?? "");

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
