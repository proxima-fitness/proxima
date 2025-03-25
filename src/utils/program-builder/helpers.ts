import { getExercises } from "@/api/exercises";
import Fuse from "fuse.js";

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
            "name_english",
        ],
    };

    const proximaExercises = await getExercises();

    const fuse = new Fuse(proximaExercises, options);
    const fuseResults = fuse?.search(exercise_name, { limit: 1});
    if (!fuseResults) {
        return "";
    }

    return fuseResults?.[0]?.item?.gif_id ?? "";
};

// Returns the proxima exercise exercise_id for a specific hevy exercise using fuzzy matching
export const getExerciseIdForHevyExercise = async (exercise_name: string) => {

    // Return early if exercise_name is empty or invalid
    if (!exercise_name || exercise_name.trim() === '') {
        console.warn('Invalid exercise name:', exercise_name);
        return null;
    }

    // Fuse Fuzzy match options
    const options = {
        isCaseSensitive: false,
        includeScore: false,
        minMatchCharLength: 2,
        shouldSort: true,
        threshold: 0.8,
        keys: [
            "name_english",
        ],
    };

    try {
        const proximaExercises = await getExercises();

        if (!proximaExercises || proximaExercises.length === 0) {
            console.warn('No exercises found.');
            return null;
        }

        const fuse = new Fuse(proximaExercises, options);
        const fuseResults = fuse.search(exercise_name, { limit: 1 });

        if (!fuseResults || fuseResults.length === 0) {
            console.warn('No matching exercises found for:', exercise_name);
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


