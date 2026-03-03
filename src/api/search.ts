/**
 * @module api/search
 *
 * Program search functionality backed by a Supabase RPC (`search_programs_by_prefix`)
 * that performs prefix-based text matching against program titles. Results are
 * enriched with thumbnails before being returned to the caller.
 *
 * Depends on: ./index (supabase client), ./programs (getProgramThumbnailByID)
 * Used by: search bar / explore page search input
 */
import { supabase } from ".";
import { getProgramThumbnailByID } from "./programs";

/**
 * Searches for programs whose titles match the given prefix and attaches
 * a thumbnail blob to each result.
 *
 * @param searchQuery - The user-typed search prefix (trimmed before use)
 * @returns Array of matching programs with thumbnails, or empty array on error
 */
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

