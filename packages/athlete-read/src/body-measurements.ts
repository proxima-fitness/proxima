/**
 * @module @proxima/athlete-read/body-measurements
 *
 * Body measurement history window helpers (defaults, date bounds, keyset page).
 */

import { takeKeysetPage } from "./keyset";

/** Default history page size for browse / agent-style reads. */
export const DEFAULT_BODY_MEASUREMENTS_LIMIT = 30;

export type TBodyMeasurementCursor = {
    measuredOn: string;
    id: string;
};

export type TBodyMeasurementKeysetRow = {
    id: string;
    measured_on: string;
};

/** Normalizes optional date bounds to YYYY-MM-DD for backup queries. */
export function normalizeMeasuredOnBound(value: string | undefined): string | undefined {
    if (!value) return undefined;
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    return trimmed.slice(0, 10);
}

/**
 * Builds a body-measurement history page from a `limit + 1` newest-first fetch.
 *
 * @param rows - Newest-first measurement rows
 * @param limit - Page size
 */
export function paginateBodyMeasurements<T extends TBodyMeasurementKeysetRow>(
    rows: T[],
    limit: number,
): { measurements: T[]; nextCursor: TBodyMeasurementCursor | null } {
    const { items, hasMore } = takeKeysetPage(rows, limit);
    const last = items[items.length - 1];

    return {
        measurements: items,
        nextCursor:
            hasMore && last
                ? { measuredOn: last.measured_on, id: last.id }
                : null,
    };
}
