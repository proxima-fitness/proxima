/**
 * @module api/trending
 *
 * Fetches curated trending program categories from the `trending` table.
 * Each row contains localized titles (English, Spanish, Portuguese, French)
 * and an array of program IDs that belong to that category. Used on the
 * explore page to highlight popular content.
 *
 * Depends on: ./index (supabase client)
 * Used by: explore page trending carousel
 */
import { supabase } from ".";

/**
 * Fetches all trending category rows, each containing localized titles and
 * the program IDs grouped under that trend.
 *
 * @returns Array of trending category objects, or undefined on error
 */
export const getTrendingPrograms = async () => {
    try {
        const { data, error } = await supabase
        .from('trending')
        .select('id,title_english, title_espanol, title_portugues, title_francais, program_ids');
        if (error) {
            console.error('Error fetching trending programs:', error);
        } else if (data && data.length > 0 ) {
            return data;
        }
    } catch (error: unknown) {
        console.error('Error fetching trending programs:', error);
    }
};
