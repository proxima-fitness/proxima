/**
 * @module useNavigateToEditHevyProgram
 *
 * Shared Edit-path handoff from profile (**Hevy mirror**, blind-spot Hevy picker).
 * Refetches Hevy programs, seeds builder draft from the selected folder routines,
 * navigates to Edit arrival.
 *
 * **Edit current week** (ADR 0013 / 01): pass `programId` + `nthWeek` and the seed
 * is ordered by the **Program–Hevy link** and the arrival carries `program` + `week`
 * alongside `folder`. Hevy-only Edit (no program/week) uses the same **Edit
 * session** and `hevyRoutineId` split (ADR 0013 / 04). Neither path writes the
 * New-path **Builder draft** key.
 *
 * Depends on: next/navigation, react-query, UserContext, useHevySecret,
 *             normalizeRoutineTitlesForBuilder, edit-current-week-arrival,
 *             EditSessionContext
 * Used by: ProgramOverviewWeekList, ProgramOverviewHevyMirror,
 *          BlindSpotAnalysisSection, HevyProgramsGrid
 */

"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useHevySecret } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { normalizeRoutineTitlesForBuilder } from "@/components/program-builder/utils/format-responses";
import {
    buildEditArrivalParams,
    orderRoutinesByLink,
} from "@/hooks/edit-current-week-arrival";
import { useEditSession } from "@/contexts/EditSessionContext";

export type TNavigateToEditHevyProgramOptions = {
    /** Extra query params (e.g. stall-analysis `search=`). */
    extraParams?: Record<string, string>;
    /** Proxima program id — set with `nthWeek` for **Edit current week**. */
    programId?: number;
    /** 1-based week this Hevy folder is the **Hevy week copy** of. */
    nthWeek?: number;
    /** Link `hevy_routine_ids`, ordered by day — authoritative over titles. */
    hevyRoutineIds?: readonly string[];
};

/**
 * Returns async navigate fn for Hevy-folder Edit arrival.
 */
export function useNavigateToEditHevyProgram() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { startEditSession } = useEditSession();

    return useCallback(
        async (
            program: THevyProgramItem,
            options: TNavigateToEditHevyProgramOptions = {},
        ): Promise<void> => {
            if (user && hevyApiKey) {
                await queryClient.refetchQueries({ queryKey: ["hevy-programs"] });
            }

            const { programId, nthWeek, hevyRoutineIds, extraParams } = options;
            const isEditCurrentWeek = programId != null && nthWeek != null;

            // Linked week → the link owns week/day identity. Hevy-only still
            // runs the same hevyRoutineId split (ADR 0013 / 04).
            const source =
                isEditCurrentWeek && hevyRoutineIds?.length
                    ? program.program
                    : normalizeRoutineTitlesForBuilder(program.program);
            const identityIds =
                isEditCurrentWeek && hevyRoutineIds?.length
                    ? hevyRoutineIds
                    : source.map((routine) => routine.hevyRoutineId ?? routine.id);
            const seed = orderRoutinesByLink(source, identityIds);

            const rawFolderId = program.program[0]?.folder_id;
            const folderId =
                rawFolderId != null && !Number.isNaN(Number(rawFolderId))
                    ? Number(rawFolderId)
                    : null;

            // In-memory handoff — never the New-path draft key (ADR 0013 / 02, / 04).
            if (isEditCurrentWeek) {
                startEditSession({
                    routines: seed,
                    initialFolderId: folderId,
                    programId,
                    nthWeek,
                });
            } else {
                startEditSession({
                    routines: seed,
                    initialFolderId: folderId,
                });
            }

            const params = buildEditArrivalParams({
                programId,
                nthWeek,
                folderId,
                extraParams,
            });

            router.push(`/build-program?${params}`);
        },
        [hevyApiKey, queryClient, router, startEditSession, user],
    );
}
