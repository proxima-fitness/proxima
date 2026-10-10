// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramOverviewExportWeek
 *
 * Overview-triggered Week Export: slice Program prescription week N →
 * gate (C4/C5) → `postProgramToHevyOneFolder` → upsert Program–Hevy link (ADR 0009).
 *
 * Depends on: hevy API, program-hevy-links, programs API, convertToHevyRoutine, sortWorkouts
 * Used by: ProgramOverviewExportWeekCTA (profile / thin overview entry)
 */

import type { User } from "@supabase/supabase-js";
import {
    getCurrentLinkedWeek,
    getProgramHevyWeekLinks,
    upsertProgramHevyWeekLink,
    type TProgramHevyWeekLink,
    type TUpsertProgramHevyWeekLinkInput,
} from "@/api/program-hevy-links";
import { getExplorePageProgramDetails } from "@/api/programs";
import {
    postProgramToHevyOneFolder,
    type THevyOneFolderUploadIds,
    type THevyUploadProgressCallback,
    type TPostProgramToHevyOneFolderResult,
} from "@/components/program-builder/api/hevy";
import { convertToHevyRoutine } from "@/components/program-builder/utils";
import { sortWorkouts } from "@/utils/general/helpers";

export type TWeekExportUploadArgs = {
    /** Routines for week N only (folder_id === nthWeek - 1). */
    hevyRoutines: THevyRoutine[];
    /** 1-based week number for folder title `Week N - …`. */
    week: number;
    programTitle: TProgramTitle[];
    /** Expected Hevy folder title after create. */
    folderTitle: string;
};

export type TWeekExportGateCode =
    | "already_linked"
    | "prior_incomplete"
    | "prior_not_linked"
    | "invalid_week";

export type TWeekExportGateResult =
    | { allowed: true }
    | { allowed: false; code: TWeekExportGateCode; reason: string };

export type TExportProgramWeekResult =
    | {
          success: true;
          data: THevyOneFolderUploadIds;
          link: TProgramHevyWeekLink;
          /** Current week after upsert (= max linked nth_week; C6). */
          currentWeek: number;
          createdNewHevyCustomTemplates: number;
      }
    | { success: false; error: Error };

type TPostOneFolder = (
    hevyRoutines: THevyRoutine[],
    week: number,
    apiKey: string,
    programTitle: TProgramTitle[] | undefined,
    user: User,
    onProgress?: THevyUploadProgressCallback,
) => Promise<TPostProgramToHevyOneFolderResult>;

type TUpsertLink = (
    input: TUpsertProgramHevyWeekLinkInput,
) => Promise<TProgramHevyWeekLink>;

type TGetCurrentWeek = (programId: number) => Promise<number | null>;

type TGetLinks = (programId: number) => Promise<TProgramHevyWeekLink[]>;

/**
 * Next week to attempt after existing links (1 when none).
 * Incomplete Current week whose linked folder is gone is that week (reset),
 * not max(linked)+1.
 *
 * @param linkedWeeks - 1-based weeks that already have a Program–Hevy link
 * @param options.currentWeek - Earliest incomplete linked week
 * @param options.completedWeeks - Weeks marked Week complete
 * @param options.missingFolderWeeks - Incomplete linked weeks whose Hevy folder is gone
 */
export function nextExportableWeek(
    linkedWeeks: readonly number[],
    options: {
        currentWeek?: number | null;
        completedWeeks?: readonly number[];
        missingFolderWeeks?: readonly number[];
    } = {},
): number {
    const currentWeek = options.currentWeek ?? null;
    const completedWeeks = options.completedWeeks ?? [];
    const missingFolderWeeks = options.missingFolderWeeks ?? [];
    if (
        currentWeek != null &&
        currentWeek >= 1 &&
        !completedWeeks.includes(currentWeek) &&
        missingFolderWeeks.includes(currentWeek)
    ) {
        return currentWeek;
    }
    if (linkedWeeks.length === 0) {
        return 1;
    }
    return Math.max(...linkedWeeks) + 1;
}

/**
 * Pure Week Export gate (C4, C5).
 * - C4: link exists for week N → blocked, unless N is incomplete and its folder is gone (reset)
 * - C5: Export N+1 blocked until week N is Week complete
 * Week 1 needs no prior complete. Week complete source is ADR 0011; pass completed weeks in.
 *
 * @param nthWeek - 1-based week to export
 * @param linkedWeeks - Weeks with Program–Hevy links
 * @param completedWeeks - Weeks marked Week complete
 * @param missingFolderWeeks - Incomplete linked weeks whose Hevy folder is gone
 */
export function evaluateWeekExportGate(
    nthWeek: number,
    linkedWeeks: readonly number[],
    completedWeeks: readonly number[],
    missingFolderWeeks: readonly number[] = [],
): TWeekExportGateResult {
    if (!Number.isInteger(nthWeek) || nthWeek < 1) {
        return {
            allowed: false,
            code: "invalid_week",
            reason: "Week number must be a positive integer.",
        };
    }

    const linked = new Set(linkedWeeks);
    const completed = new Set(completedWeeks);

    if (linked.has(nthWeek)) {
        if (!completed.has(nthWeek) && missingFolderWeeks.includes(nthWeek)) {
            return { allowed: true };
        }
        return {
            allowed: false,
            code: "already_linked",
            reason: `Week ${nthWeek} is already exported. Use Edit current week Sync instead of re-Export.`,
        };
    }

    if (nthWeek === 1) {
        return { allowed: true };
    }

    const priorWeek = nthWeek - 1;
    if (!linked.has(priorWeek)) {
        return {
            allowed: false,
            code: "prior_not_linked",
            reason: `Export week ${priorWeek} before week ${nthWeek}.`,
        };
    }

    if (!completed.has(priorWeek)) {
        return {
            allowed: false,
            code: "prior_incomplete",
            reason: `Mark week ${priorWeek} complete before exporting week ${nthWeek}.`,
        };
    }

    return { allowed: true };
}

/**
 * Slice full-program Hevy routines down to prescription week N.
 * `folder_id` is 0-based week index (week 1 → 0), matching `convertToHevyRoutine`.
 *
 * @param prescriptionRoutines - Full Program prescription as Hevy routines
 * @param nthWeek - 1-based week number
 */
export function slicePrescriptionWeekForExport(
    prescriptionRoutines: THevyRoutine[],
    nthWeek: number,
): THevyRoutine[] {
    if (!Number.isInteger(nthWeek) || nthWeek < 1) {
        return [];
    }
    const folderId = nthWeek - 1;
    return prescriptionRoutines.filter((routine) => routine.folder_id === folderId);
}

/**
 * Build args for `postProgramToHevyOneFolder` from a full prescription + week N.
 * Pure — no Hevy / network. Used by unit tests and the overview export action.
 *
 * @param prescriptionRoutines - Full Program prescription as Hevy routines
 * @param nthWeek - 1-based week number
 * @param programId - Proxima program id (title metadata)
 * @param programTitle - Display title for Hevy folder
 */
export function buildWeekExportUploadArgs(
    prescriptionRoutines: THevyRoutine[],
    nthWeek: number,
    programId: number | string,
    programTitle: string,
): TWeekExportUploadArgs {
    const hevyRoutines = slicePrescriptionWeekForExport(prescriptionRoutines, nthWeek);
    const title = programTitle.trim().length > 0 ? programTitle.trim() : "Proxima Program";
    return {
        hevyRoutines,
        week: nthWeek,
        programTitle: [{ id: String(programId), title }],
        folderTitle: `Week ${nthWeek} - ${title}`,
    };
}

/**
 * Load Program prescription from Supabase and convert to Hevy routines.
 *
 * @param programId - Proxima program id
 */
export async function loadPrescriptionHevyRoutines(programId: number): Promise<THevyRoutine[]> {
    const details = await getExplorePageProgramDetails(programId);
    const scheduleWorkouts = details?.[0]?.schedule_workouts;
    if (!scheduleWorkouts?.length) {
        return [];
    }
    const sortedWorkoutsByWeek = sortWorkouts(scheduleWorkouts);
    return convertToHevyRoutine(sortedWorkoutsByWeek);
}

/**
 * Export prescription week N to Hevy as one new folder, then upsert Program–Hevy link.
 * Gate (C4/C5) runs before Hevy. Hevy failure → no link write (C3). Success → current week = max linked (C6).
 *
 * @param params.programId - Proxima program id
 * @param params.programTitle - Program title for folder naming
 * @param params.nthWeek - 1-based week to export
 * @param params.apiKey - User Hevy API key
 * @param params.user - Authenticated user (custom exercise remap)
 * @param params.completedWeeks - Weeks marked Week complete (ADR 0011 owns compute; pass-through here)
 * @param params.missingFolderWeeks - Incomplete linked weeks whose Hevy folder is gone (reset)
 * @param params.onProgress - Optional upload progress callback
 * @param params.prescriptionRoutines - Optional preloaded full prescription (skips fetch)
 * @param params.postOneFolder - Injectable upload (tests)
 * @param params.upsertLink - Injectable upsert (tests)
 * @param params.getCurrentWeek - Injectable current-week read (tests)
 * @param params.getLinks - Injectable link list (tests)
 */
export async function exportProgramWeekToHevy(params: {
    programId: number;
    programTitle: string;
    nthWeek: number;
    apiKey: string;
    user: User;
    completedWeeks?: readonly number[];
    missingFolderWeeks?: readonly number[];
    onProgress?: THevyUploadProgressCallback;
    prescriptionRoutines?: THevyRoutine[];
    postOneFolder?: TPostOneFolder;
    upsertLink?: TUpsertLink;
    getCurrentWeek?: TGetCurrentWeek;
    getLinks?: TGetLinks;
}): Promise<TExportProgramWeekResult> {
    const {
        programId,
        programTitle,
        nthWeek,
        apiKey,
        user,
        completedWeeks = [],
        missingFolderWeeks = [],
        onProgress,
        prescriptionRoutines: preloaded,
        postOneFolder = postProgramToHevyOneFolder,
        upsertLink = upsertProgramHevyWeekLink,
        getCurrentWeek = getCurrentLinkedWeek,
        getLinks = getProgramHevyWeekLinks,
    } = params;

    try {
        const links = await getLinks(programId);
        const linkedWeeks = links.map((link) => link.nth_week);
        const gate = evaluateWeekExportGate(
            nthWeek,
            linkedWeeks,
            completedWeeks,
            missingFolderWeeks,
        );
        if (!gate.allowed) {
            return { success: false, error: new Error(gate.reason) };
        }

        const prescriptionRoutines = preloaded ?? (await loadPrescriptionHevyRoutines(programId));
        const uploadArgs = buildWeekExportUploadArgs(
            prescriptionRoutines,
            nthWeek,
            programId,
            programTitle,
        );

        if (uploadArgs.hevyRoutines.length === 0) {
            return {
                success: false,
                error: new Error(`No routines found for week ${nthWeek} in Program prescription`),
            };
        }

        const result = await postOneFolder(
            uploadArgs.hevyRoutines,
            uploadArgs.week,
            apiKey,
            uploadArgs.programTitle,
            user,
            onProgress,
        );

        if (result.success !== true) {
            const message =
                result.data instanceof Error
                    ? result.data.message
                    : "Failed to upload week to Hevy.";
            return {
                success: false,
                error: result.data instanceof Error ? result.data : new Error(message),
            };
        }

        const link = await upsertLink({
            userId: user.id,
            programId,
            nthWeek,
            hevyFolderId: result.data.hevyFolderId,
            hevyRoutineIds: result.data.hevyRoutineIds,
        });

        const currentWeek = (await getCurrentWeek(programId)) ?? nthWeek;

        return {
            success: true,
            data: result.data,
            link,
            currentWeek,
            createdNewHevyCustomTemplates: result.createdNewHevyCustomTemplates ?? 0,
        };
    } catch (error: unknown) {
        return {
            success: false,
            error: error instanceof Error ? error : new Error(String(error)),
        };
    }
}
