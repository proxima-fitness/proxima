// File for endpoints to the Hevy App Public API

import { hevyApiKey, supabase } from ".";

export const defaultFetch = async <T>(url: string, apiKey: string): Promise<T> => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
    }

    return (await response.json()) as T;
};

// GET Hevy EXERCISES STORED BY PROXIMA FITNESS (CACHES IN LOCALSTORAGE)
export const getHevyExercises = async () => {
    const cacheKey = 'hevy-exercises';

    try {
            const cachedData = localStorage.getItem(cacheKey);

            if (cachedData && cachedData.length > 0) {
                const { exercises, timestamp } = JSON.parse(cachedData);

                // Check if cache is still valid (1 hour)
                if (new Date().getTime() - timestamp < 3600000) {
                    return exercises as THevyExerciseTemplate[];
                }
            }

            const { data: hevyExercises, error: hevyExercisesError } = await supabase
                .from('hevy_exercise_templates')
                .select('id, title, type, primary_muscle_group, secondary_muscle_groups, is_custom, equipment')
                .order("title", { ascending: true});

            if (hevyExercisesError) {
                console.error('Error fetching existing exercises:', hevyExercisesError);
                return [];
            }

            // TODO: USE THIS CODE IN THE PROXIMA APP TO FETCH CUSTOM EXERCISES FOR USERS
            // const requests = Array.from({ length: 5}, (_, i) => {
            //     const page = i + 1;
            //     return defaultFetch<THevyExerciseTemplates>(`https://api.hevyapp.com/v1/exercise_templates?page=${page}&pageSize=100`, hevyApiKey);
            // });

            // const results = await Promise.all(requests);
            // const exercises = results.flatMap((res) => res.exercise_templates);

            localStorage.setItem(
                cacheKey,
                JSON.stringify({ exercises: hevyExercises, timestamp: new Date().getTime() }),
            );

            return hevyExercises as THevyExerciseTemplate[];
    } catch (error) {
        console.error('Error fetching hevy exercises:', error);
        return [];
    }
};
