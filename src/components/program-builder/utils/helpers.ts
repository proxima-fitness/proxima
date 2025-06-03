import { getExercises } from "@/api/exercises";
import nlp from "compromise";
import Fuse from "fuse.js";
import { normalizeExerciseTitle } from "./scoring-system";

// Returns the proxima exercise gif_id for a specific hevy exercise using fuzzy matching
export const getExerciseGifIdForHevyExercise = async (exercise_name: string) => {

    // Fuse Fuzzy match options
    const options = {
        isCaseSensitive: false,
        includeScore: false,
        minMatchCharLength: 2,
        shouldSort: true,
        threshold: 0.2,
        keys: [
            "normalized_name_english",
        ],
    };

    const proximaExercises = await getExercises();

    const fuse = new Fuse(proximaExercises, options);
    const fuseResults = fuse?.search(normalizeExerciseTitle(exercise_name), { limit: 1});
    if (!fuseResults) {
        return "";
    }

    return fuseResults?.[0]?.item?.gif_id ?? "";
};

// Returns the proxima exercise exercise_id for a specific hevy exercise using fuzzy matching
export const getExerciseIdForHevyExercise = async (exercise_name: string, proximaExercises: TExercise[]) => {

    if (!exercise_name || exercise_name.trim() === '') {
        console.warn('Invalid exercise name:', exercise_name);
        return null;
    }

    const options = {
        isCaseSensitive: false,
        includeScore: false,
        minMatchCharLength: 2,
        shouldSort: true,
        threshold: 0.8,
        keys: [
            "normalized_name_english",
        ],
    };

    try {

        if (!proximaExercises || proximaExercises.length === 0) {
            console.warn('No exercises found.');
            return null;
        }

        const fuse = new Fuse(proximaExercises, options);
        const fuseResults = fuse.search(normalizeExerciseTitle(exercise_name), { limit: 1 });

        if (!fuseResults || fuseResults.length === 0) {
            console.warn('No matching exercises found for:', normalizeExerciseTitle(exercise_name));
            return null;
        }

        return fuseResults?.[0]?.item?.id ?? null;

    } catch (error) {
        console.error('Error during fuzzy search:', error);
        return null;
    }
};

export const getMaxFolderId = (routines: THevyRoutine[]): number => {

    if (routines.length === 0) return 0;

    return routines.reduce((max, routine) => {
        return routine.folder_id > max ? routine.folder_id : max;
        }, routines[0].folder_id);
};


export const inferDaysPerWeek = (text: string) => {
    const normalized = text.toLowerCase();

    // Hardcoded common expressions
    if (/every\s+day/.test(normalized)) return "7";
    if (/every\s+other\s+day/.test(normalized))  return "3";
    if (/weekends\s+only/.test(normalized)) return "2";
    if (/couple\s+(times|days)/.test(normalized)) return "2";
    if (/(few|several)\s+(days|times)/.test(normalized)) return "3";
    if (/once\s+(a|per)?\s*week/.test(normalized)) return "1";

    // Pattern: 3x/week, 4x/wk, 5x per week
    const xPerWeekMatch = normalized.match(/(\d)\s*x\s*(\/|\s*(a|per)\s*)?(week|wk)/);
    if (xPerWeekMatch) {
        const num = parseInt(xPerWeekMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 7) {
            return num.toString();
        }
    }

    // Other direct patterns
    const directMatch = normalized.match(/(\d)\s*(x|\*)?\s*(day(s)?|times)?\s*(a|per)?\s*(week|program)?/);
    if (directMatch) {
        const num = parseInt(directMatch[1], 10);
        if (!isNaN(num) && num >= 1 && num <= 7) {
            return num.toString();
        }
    }

    // Pattern like "program should be 5 days" or "build a 4 day program"
    const programMatch = normalized.match(/(?:build|program|train|should be)\s*(a\s*)?(\d)\s*(day|times)?/);
    if (programMatch) {
        const num = parseInt(programMatch[2], 10);
        if (!isNaN(num) && num >= 1 && num <= 7) {
            return num.toString();
        }
    }

    // NLP fallback
    const doc = nlp(text);
    const json = doc.json();

    for (const sentence of json) {
        for (const term of sentence.terms) {
            if (term.tags.includes("Value")) {
                const val = term.number || parseInt(term.normal, 10);
                if (!isNaN(val) && val >= 1 && val <= 7) {
                    const termIndex = sentence.terms.indexOf(term);
                    const nextFew = sentence.terms.slice(termIndex, termIndex + 4).map((t: { normal: string; }) => t.normal).join(" ");
                    if (/(day|days|times).*(week|program)?/.test(nextFew)) {
                        return val.toString();
                    }
                }
            }
        }
    }

    return "";
};

