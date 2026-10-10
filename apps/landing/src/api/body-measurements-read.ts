/**
 * @module api/body-measurements-read
 *
 * Shared read path for backed-up body measurements: latest entry + paginated history.
 *
 * Depends on: @/hooks/supabase types
 * Used by: Edit profile (SP7), agent tool (SP9), peek (SP8)
 */
import type { Database } from "@/hooks/supabase";

/** Default history page size for browse / agent-style reads. */
export const DEFAULT_BODY_MEASUREMENTS_LIMIT = 30;

export type TBodyMeasurementRow = Database["public"]["Tables"]["body_measurements"]["Row"];

export type TBodyMeasurementsPage = {
    measurements: TBodyMeasurementRow[];
    /** Keyset cursor: next page uses `cursorMeasuredOn` + `cursorId`. */
    nextCursor: { measuredOn: string; id: string } | null;
};

export type TBodyMeasurementsQueryOptions = {
    /** Max rows to return (default {@link DEFAULT_BODY_MEASUREMENTS_LIMIT}). */
    limit?: number;
    /** Inclusive lower bound on `measured_on` (YYYY-MM-DD). */
    since?: string;
    /** Inclusive upper bound on `measured_on` (YYYY-MM-DD). */
    until?: string;
    /** Keyset cursor `measured_on` (with {@link TBodyMeasurementsQueryOptions.cursorId}). */
    cursorMeasuredOn?: string;
    /** Keyset cursor row `id` tiebreaker. */
    cursorId?: string;
};

/**
 * Returns the newest backed-up body measurement for a user, or null when none exist.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 */
export async function getLatestBodyMeasurement(
    db: TBodyMeasurementsDb,
    userId: string,
): Promise<TBodyMeasurementRow | null> {
    const { data, error } = await db
        .from("body_measurements")
        .select("*")
        .eq("user_id", userId)
        .order("measured_on", { ascending: false })
        .order("id", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(error.message);
    }

    return data ?? null;
}

/**
 * Returns paginated body-measurement history for a user, newest-first.
 *
 * @param db - Supabase client (user or service role)
 * @param userId - Proxima user ID
 * @param options - Limit, date window, and keyset cursor
 */
export async function getBodyMeasurementsForUser(
    db: TBodyMeasurementsDb,
    userId: string,
    options: TBodyMeasurementsQueryOptions = {},
): Promise<TBodyMeasurementsPage> {
    const limit = options.limit ?? DEFAULT_BODY_MEASUREMENTS_LIMIT;

    let query = db
        .from("body_measurements")
        .select("*")
        .eq("user_id", userId)
        .order("measured_on", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);

    if (options.since) {
        query = query.gte("measured_on", options.since);
    }

    if (options.until) {
        query = query.lte("measured_on", options.until);
    }

    if (options.cursorMeasuredOn && options.cursorId) {
        query = query.or(
            `measured_on.lt.${options.cursorMeasuredOn},and(measured_on.eq.${options.cursorMeasuredOn},id.lt.${options.cursorId})`,
        );
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(error.message);
    }

    const rows = (data ?? []) as TBodyMeasurementRow[];
    const hasMore = rows.length > limit;
    const measurements = hasMore ? rows.slice(0, limit) : rows;
    const last = measurements[measurements.length - 1];

    return {
        measurements,
        nextCursor:
            hasMore && last
                ? { measuredOn: last.measured_on, id: last.id }
                : null,
    };
}
