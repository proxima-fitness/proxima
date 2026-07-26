/**
 * @module useNavigateToEditHevyProgram
 *
 * Shared Edit-path handoff from profile (**Hevy mirror**, blind-spot Hevy picker).
 * Refetches Hevy programs, seeds builder draft from the selected folder routines,
 * navigates to Edit arrival. Full router-state hydration lands in ADR 0002 / 0013.
 *
 * Depends on: next/navigation, react-query, UserContext, useHevySecret,
 *             normalizeRoutineTitlesForBuilder
 * Used by: ProgramOverviewHevyMirror, BlindSpotAnalysisSection, HevyProgramsGrid
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useHevySecret } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { normalizeRoutineTitlesForBuilder } from "@/components/program-builder/utils/format-responses";

export type TNavigateToEditHevyProgramOptions = {
    /** Extra query params (e.g. stall-analysis `search=`). */
    extraParams?: Record<string, string>;
};

/**
 * Returns async navigate fn for Hevy-folder Edit arrival.
 */
export function useNavigateToEditHevyProgram() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);

    return useCallback(
        async (
            program: THevyProgramItem,
            options: TNavigateToEditHevyProgramOptions = {},
        ): Promise<void> => {
            if (user && hevyApiKey) {
                await queryClient.refetchQueries({ queryKey: ["hevy-programs"] });
            }

            const normalized = normalizeRoutineTitlesForBuilder(program.program);
            localStorage.setItem("hevy-program-in-progress", JSON.stringify(normalized));

            const folderId = program.program[0]?.folder_id;
            const params = new URLSearchParams({
                resume: "true",
                edit: "true",
                hevy: "true",
                ...options.extraParams,
            });
            if (folderId != null && !Number.isNaN(Number(folderId))) {
                params.set("folder", String(folderId));
            }

            router.push(`/build-program?${params.toString()}`);
        },
        [hevyApiKey, queryClient, router, user],
    );
}
