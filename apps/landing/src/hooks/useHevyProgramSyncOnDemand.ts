// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module useHevyProgramSyncOnDemand
 *
 * On Program overview: invoke hevy-program-sync via React Query when Hevy is
 * connected (ADR 0011). No useEffect — query `enabled` + shared queryKey dedupe
 * (vercel-react-best-practices / client-swr-dedup).
 *
 * Depends on: triggerHevyProgramSyncOnDemand, React Query
 * Used by: ProgramOverviewSection
 */

"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { triggerHevyProgramSyncOnDemand } from "@/api/hevy-program-sync";
import { WORKOUT_ROUTINE_IDS_QUERY_KEY } from "@/api/workout-routine-ids";

export const HEVY_PROGRAM_SYNC_ON_DEMAND_QUERY_KEY = [
    "hevy-program-sync-on-demand",
] as const;

/**
 * Runs on-demand program sync when enabled (user + Hevy key).
 * Remounts share one in-flight request; server gates redundant edge invokes.
 * After the POST (backup ran even when the edge is skipped), invalidate
 * workout routine IDs so Day complete can re-read the backup.
 *
 * @param enabled - Typically signed-in user with Hevy API key
 * @param userId - Owner id for query key scoping
 */
export function useHevyProgramSyncOnDemand(
    enabled: boolean,
    userId: string | undefined,
): void {
    const queryClient = useQueryClient();

    useQuery({
        queryKey: [...HEVY_PROGRAM_SYNC_ON_DEMAND_QUERY_KEY, userId ?? "anon"],
        queryFn: async () => {
            const result = await triggerHevyProgramSyncOnDemand();
            if (result.status === "synced" || result.status === "skipped") {
                await queryClient.invalidateQueries({
                    queryKey: WORKOUT_ROUTINE_IDS_QUERY_KEY,
                });
            }
            if (result.status === "error") {
                console.warn("On-demand hevy-program-sync:", result.error);
            }
            return result;
        },
        enabled: enabled && Boolean(userId),
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: false,
    });
}
