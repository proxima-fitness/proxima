/**
 * @module overview-start
 *
 * Program overview landing from **Start** (ADR 0016 / 02): honor `?programId=`
 * so overview selects that **Proxima program**, and highlight **Export** while
 * that program has zero **Program–Hevy links**. No new callout sentence.
 *
 * Depends on: builder-start (coerceProgramId)
 * Used by: ProgramOverviewSection, ProgramOverviewCtas
 */

import { coerceProgramId } from "@/hooks/builder-start";

/** Query param **Start** puts on `/profile` so overview can select that program. */
export const OVERVIEW_PROGRAM_ID_PARAM = "programId";

export interface IResolveOverviewProgramIdInput {
    activeProgramIds: readonly number[];
    pickedProgramId: number | null;
    queryProgramId: number | null;
}

export interface IShouldHighlightOverviewExportInput {
    hevyLinkCount: number;
    linksLoading: boolean;
}

/**
 * Reads the **Start** program id from overview search params.
 *
 * @param searchParams - Profile URL search params
 */
export function parseOverviewProgramId(
    searchParams: { get(key: string): string | null },
): number | null {
    return coerceProgramId(searchParams.get(OVERVIEW_PROGRAM_ID_PARAM));
}

/**
 * Picker click wins; otherwise the **Start** query if it is an active program;
 * otherwise the first active program (today's `/profile` fallback).
 *
 * @param input.activeProgramIds - Loaded Proxima program ids
 * @param input.pickedProgramId - Tab the user clicked, or null
 * @param input.queryProgramId - `?programId=` from **Start**, or null
 */
export function resolveOverviewProgramId(
    input: IResolveOverviewProgramIdInput,
): number | null {
    const { activeProgramIds, pickedProgramId, queryProgramId } = input;
    if (pickedProgramId != null && activeProgramIds.includes(pickedProgramId)) {
        return pickedProgramId;
    }
    if (queryProgramId != null && activeProgramIds.includes(queryProgramId)) {
        return queryProgramId;
    }
    return activeProgramIds[0] ?? null;
}

/**
 * Zero-link overview emphasizes **Export** on this load. Unknown (loading) and
 * any existing **Program–Hevy link** must not highlight. Empty profile is not
 * this state — callers only pass a loaded program.
 *
 * @param input.hevyLinkCount - Link row count for the selected program
 * @param input.linksLoading - True while the link query has not settled
 */
export function shouldHighlightOverviewExport(
    input: IShouldHighlightOverviewExportInput,
): boolean {
    if (input.linksLoading) {
        return false;
    }
    return input.hevyLinkCount === 0;
}
