// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module @proxima/athlete-read/keyset
 *
 * limit+1 → page + hasMore for keyset browse queries.
 */

/**
 * Trims a `limit + 1` fetch to a page and whether a next cursor should be minted.
 *
 * @param rows - Rows from a query that requested `limit + 1`
 * @param limit - Requested page size
 */
export function takeKeysetPage<T>(rows: T[], limit: number): { items: T[]; hasMore: boolean } {
    const hasMore = rows.length > limit;
    return {
        items: hasMore ? rows.slice(0, limit) : rows,
        hasMore,
    };
}
