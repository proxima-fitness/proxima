// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramOverviewWeekPreviewModel
 *
 * Pure helpers for Week preview days from Program prescription (ADR 0020 / 03).
 * Mobile compact list summary (`summarizeExercisePrescription`) is presentation
 * for the under-md Week preview (layout v3); desktop still uses HevyDayCard.
 *
 * Depends on: ProgramOverviewExportWeek.slicePrescriptionWeekForExport,
 *             hevyPrescriptionDisplay (rep-range helpers)
 * Used by: ProgramOverviewWeekPreview.tsx, ProgramOverviewMobileDayList.tsx,
 *          unit tests
 */

import {
    formatHevyRepRange,
    repRangesEqual,
} from "@/components/program-builder/hevy/hevyPrescriptionDisplay";
import { slicePrescriptionWeekForExport } from "./ProgramOverviewExportWeek";

/** Exercises shown before "+N more" on the mobile Week preview list. */
export const MOBILE_DAY_LIST_PREVIEW_COUNT = 3;

function routineSortKey(routine: THevyRoutine): number {
    if (routine.order != null && routine.order !== "") {
        const n = Number(routine.order);
        if (Number.isFinite(n)) {
            return n;
        }
    }
    return Number.POSITIVE_INFINITY;
}

/**
 * Prescription days (full Hevy routines) for week N, sorted for display.
 *
 * @param prescriptionRoutines - Full Program prescription as Hevy routines
 * @param nthWeek - 1-based Selected week
 */
export function slicePrescriptionWeekDays(
    prescriptionRoutines: readonly THevyRoutine[],
    nthWeek: number,
): THevyRoutine[] {
    return slicePrescriptionWeekForExport([...prescriptionRoutines], nthWeek).sort((a, b) => {
        const byOrder = routineSortKey(a) - routineSortKey(b);
        if (byOrder !== 0) {
            return byOrder;
        }
        return a.title.localeCompare(b.title);
    });
}

/**
 * Stable id for read-only HevyDayCard when prescription routines lack Hevy ids.
 *
 * @param day - Prescription day routine
 * @param nthWeek - 1-based week
 * @param index - Position within the week
 */
export function weekPreviewDayKey(day: THevyRoutine, nthWeek: number, index: number): string {
    if (day.id && day.id.length > 0) {
        return day.id;
    }
    return `preview-w${nthWeek}-d${day.order ?? index}-${day.title}`;
}

/**
 * One-line sets · reps (or distance/duration) for the mobile exercise row.
 * Omits Lbs/RPE. Empty when there are no sets.
 *
 * @param sets - Exercise sets from a Hevy routine exercise
 */
export function summarizeExercisePrescription(
    sets: readonly THevySets[] | undefined | null,
): string | null {
    const safeSets = (sets ?? []).filter((s): s is THevySets => s != null);
    if (safeSets.length === 0) {
        return null;
    }

    const setPart = `${safeSets.length} set${safeSets.length === 1 ? "" : "s"}`;
    const first = safeSets[0]!;

    if (
        safeSets.some(
            (s) => s.rep_range != null || (s.reps !== null && s.reps > 0),
        )
    ) {
        const allRange =
            safeSets.every((s) => s.rep_range != null) &&
            safeSets.every((s) => repRangesEqual(s.rep_range, first.rep_range));
        const allFixed =
            safeSets.every((s) => s.rep_range == null) &&
            safeSets.every((s) => s.reps !== null && s.reps > 0) &&
            safeSets.every((s) => s.reps === first.reps);

        if (allRange && first.rep_range) {
            return `${setPart} · ${formatHevyRepRange(first.rep_range)} reps`;
        }
        if (allFixed && first.reps != null && first.reps > 0) {
            return `${setPart} · ${first.reps} reps`;
        }

        const labels = safeSets.map((s) => {
            if (s.rep_range != null) {
                return formatHevyRepRange(s.rep_range);
            }
            if (s.reps !== null && s.reps > 0) {
                return String(s.reps);
            }
            return null;
        });
        const firstLabel = labels.find((l) => l != null);
        if (firstLabel != null) {
            return `${setPart} · ${firstLabel} reps`;
        }
        return setPart;
    }

    if (first.distance_meters != null && first.distance_meters > 0) {
        if (safeSets.every((s) => s.distance_meters === first.distance_meters)) {
            return `${setPart} · ${first.distance_meters} m`;
        }
        return setPart;
    }

    if (first.duration_seconds != null && first.duration_seconds > 0) {
        if (safeSets.every((s) => s.duration_seconds === first.duration_seconds)) {
            return `${setPart} · ${first.duration_seconds} s`;
        }
        return setPart;
    }

    return setPart;
}
