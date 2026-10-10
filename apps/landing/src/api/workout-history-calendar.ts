// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module api/workout-history-calendar
 *
 * Re-export shim — source of truth is `@proxima/athlete-read` (ADR 0034 slice 10).
 * Depends on: @proxima/athlete-read
 * Used by: workout-history-read, ProfileCalendarSection, tests
 */

export {
    getLocalMonthUtcBounds,
    getLocalDateKey,
    formatLocalDateKey,
    buildSundayStartCalendarGrid,
    groupWorkoutsByLocalDate,
} from "@proxima/athlete-read";

export type { TCalendarDayCell } from "@proxima/athlete-read";
