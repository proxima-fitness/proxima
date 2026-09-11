/**
 * @module refreshOverviewQueriesAfterWeekExport
 *
 * After Week Export, refresh the live Hevy folder list before Program–Hevy
 * links. Week preview switches to Hevy week copy as soon as the new link
 * lands; a stale `["hevy-programs"]` cache then looks like an empty folder.
 *
 * Workout backup (`hevy-program-sync`) is not required here. The preview
 * reads Hevy's routine list.
 *
 * Depends on: React Query, HEVY_PROGRAMS_QUERY_KEY, PROGRAM_HEVY_LINKS_QUERY_KEY
 * Used by: ProgramOverviewCtas, ProgramOverviewExportWeekCTA
 */

import type { QueryClient } from "@tanstack/react-query";
import {
    HEVY_PROGRAMS_QUERY_KEY,
    PROGRAM_HEVY_LINKS_QUERY_KEY,
} from "@/api/hooks";

export const HEVY_CUSTOM_EXERCISES_QUERY_KEY = ["hevy-custom-exercises"] as const;

export type TRefreshOverviewQueriesAfterWeekExportOptions = {
    programId: number;
    createdNewHevyCustomTemplates?: number;
};

/**
 * Invalidate Hevy programs, then Program–Hevy links (and custom exercises
 * when Export created templates).
 *
 * @param queryClient - Shared React Query client
 * @param options - Program id and optional template count
 */
export async function refreshOverviewQueriesAfterWeekExport(
    queryClient: QueryClient,
    options: TRefreshOverviewQueriesAfterWeekExportOptions,
): Promise<void> {
    const { programId, createdNewHevyCustomTemplates = 0 } = options;

    await queryClient.invalidateQueries({
        queryKey: HEVY_PROGRAMS_QUERY_KEY,
        refetchType: "all",
    });
    const jobs: Promise<unknown>[] = [
        queryClient.invalidateQueries({
            queryKey: [...PROGRAM_HEVY_LINKS_QUERY_KEY, programId],
            refetchType: "all",
        }),
    ];
    if (createdNewHevyCustomTemplates > 0) {
        jobs.push(
            queryClient.invalidateQueries({
                queryKey: HEVY_CUSTOM_EXERCISES_QUERY_KEY,
                refetchType: "all",
            }),
        );
    }
    await Promise.all(jobs);
}
