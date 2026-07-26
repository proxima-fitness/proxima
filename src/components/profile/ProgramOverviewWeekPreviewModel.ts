/**
 * @module ProgramOverviewWeekPreviewModel
 *
 * Pure helpers for Week preview days from Program prescription (ADR 0020 / 03).
 *
 * Depends on: ProgramOverviewExportWeek.slicePrescriptionWeekForExport
 * Used by: ProgramOverviewWeekPreview.tsx, unit tests
 */

import { slicePrescriptionWeekForExport } from "./ProgramOverviewExportWeek";

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
