/**
 * @module useProgramWeekComplete
 *
 * Manual + auto Week complete for Program overview (ADR 0011 / 04).
 * Persists `completed_at` on Program–Hevy link. Auto-mark via React Query
 * (no useEffect) when schedule history shows all days done.
 *
 * Depends on: markProgramWeekComplete(s), React Query, PROGRAM_HEVY_LINKS_QUERY_KEY
 * Used by: ProgramOverviewWeekList, ProgramOverviewExportWeekCTA
 */

"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    markProgramWeekComplete,
    markProgramWeeksComplete,
} from "@/api/program-hevy-links";
import { PROGRAM_HEVY_LINKS_QUERY_KEY } from "@/api/hooks";

export const AUTO_MARK_WEEK_COMPLETE_QUERY_KEY = [
    "auto-mark-week-complete",
] as const;

/**
 * Manual Mark week complete → update link + invalidate links query.
 *
 * @param programId - Proxima program id
 */
export function useMarkProgramWeekComplete(programId: number) {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (nthWeek: number) => markProgramWeekComplete(programId, nthWeek),
        onSuccess: async () => {
            await queryClient.invalidateQueries({
                queryKey: [...PROGRAM_HEVY_LINKS_QUERY_KEY, programId],
            });
        },
    });
}

/**
 * Auto-mark weeks that schedule history says are done but link lacks completed_at.
 * Shared queryKey dedupes in-flight writes (client-swr-dedup).
 *
 * @param programId - Proxima program id
 * @param weeksToMark - Linked weeks ready to persist as complete
 */
export function useAutoMarkProgramWeeksComplete(
    programId: number,
    weeksToMark: readonly number[],
): void {
    const queryClient = useQueryClient();
    const sorted = [...weeksToMark].sort((a, b) => a - b);

    useQuery({
        queryKey: [...AUTO_MARK_WEEK_COMPLETE_QUERY_KEY, programId, sorted.join(",")],
        queryFn: async () => {
            await markProgramWeeksComplete(programId, sorted);
            await queryClient.invalidateQueries({
                queryKey: [...PROGRAM_HEVY_LINKS_QUERY_KEY, programId],
            });
            return sorted;
        },
        enabled: sorted.length > 0,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
