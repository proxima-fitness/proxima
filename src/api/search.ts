import { supabase } from ".";
import { getProgramThumbnailByID } from "./programs";

/***** GET REQUESTS *****/

// GET SEARCH RESULTS FOR PROGRAMS
export const getProgramsSearchResultsWithThumbnail = async (searchQuery: string) => {
    try {
        const { data: searchResults, error: searchError } = await supabase
            .rpc('search_programs_by_prefix', { prefix: searchQuery.trim() });
        if (searchError) {
            console.error("Error fetching program search results", searchError);
            return [];
        }

        if (!searchResults || searchResults.length === 0) {
            return [];
        }

        const programsWithThumbnails = await Promise.all(
            // TODO: give program a proper type
            searchResults.map(async (program: TProgram) => {
                const thumbnail = await getProgramThumbnailByID(program?.id);
                return { ...program, thumbnail };
            }),
        );

        return programsWithThumbnails;

    } catch (error: unknown) {
        console.error("Error fetching program search results", error);
        return [];
    }
};

