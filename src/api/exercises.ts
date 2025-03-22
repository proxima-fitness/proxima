import { supabase } from ".";
import { User } from '@supabase/supabase-js';

/***** GET REQUESTS *****/

// GET A SPECIFIC EXERCISE ID (TEMPORARY UNTIL WE HAVE A LOCAL SQLITE DATABASE)
export const getExerciseID = async (user:User, name: string, language: "english" | "espanol" | "portugues" | "francais") => {
    try {
        if (user) {
            const { data: ID, error: IDError } = await supabase
            .from('exercises')
            .select('id')
            .eq(`name_${language}`, name);

            if (IDError) {
                console.error('Error fetching specific exercise ID:', IDError);
            }

            return ID as unknown as string;

        }
    } catch (error: unknown) {
        console.error('Error fetching specific exercise ID:', error);
    }
};

// GET EXISTING EXERCISES STORED BY PROXIMA FITNESS (CACHES IN LOCALSTORAGE)
export const getExercises = async () => {
    const cacheKey = 'existing-exercises';

    try {
            const cachedData = localStorage.getItem(cacheKey);

            if (cachedData && cachedData.length > 0) {
                const { exercises, timestamp } = JSON.parse(cachedData);

                // Check if cache is still valid (1 hour)
                if (new Date().getTime() - timestamp < 3600000) {
                    return exercises as TExercise[];
                }
            }

            const { data: exercises, error: exercisesError } = await supabase
                .from('exercises')
                .select('id,name_english,name_espanol,name_portugues,name_francais,gif_id')
                .order("name_english", { ascending: true});

            if (exercisesError) {
                console.error('Error fetching existing exercises:', exercisesError);
                return [];
            }

            localStorage.setItem(
                cacheKey,
                JSON.stringify({ exercises, timestamp: new Date().getTime() }),
            );

            return exercises as TExercise[];
    } catch (error) {
        console.error('Error fetching existing exercises:', error);
    }
    return [];
};


/***** POST REQUESTS *****/



/***** DELETE REQUESTS *****/
