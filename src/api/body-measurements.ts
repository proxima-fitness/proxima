/**
 * @module api/body-measurements
 *
 * Persists backed-up body measurements from connected fitness apps into
 * `body_measurements` (one row per user + source + dated entry).
 *
 * Depends on: @/hooks/supabase (generated types)
 * Used by: body measurements sync orchestration (SP6), optional import scripts
 */
import type { TablesInsert } from "@/hooks/supabase";

export const HEVY_BODY_MEASUREMENT_SOURCE = "hevy" as const;

/** Default page size for Hevy list fetches (API max is 10). */
export const HEVY_BODY_MEASUREMENTS_PAGE_SIZE = 10;

/**
 * Maps a Hevy body-measurement payload to a `body_measurements` insert/upsert row.
 * Hevy has no separate entry id — `external_id` is the measurement date (YYYY-MM-DD).
 *
 * @param entry - Body measurement from the Hevy API
 * @param userId - Proxima user ID owning the backup row
 * @returns Insert payload for the `body_measurements` table
 */
export function mapHevyBodyMeasurementToInsert(
    entry: THevyBodyMeasurement,
    userId: string,
): TablesInsert<"body_measurements"> {
    return {
        user_id: userId,
        source: HEVY_BODY_MEASUREMENT_SOURCE,
        external_id: entry.date,
        measured_on: entry.date,
        weight_kg: entry.weight_kg ?? null,
        lean_mass_kg: entry.lean_mass_kg ?? null,
        fat_percent: entry.fat_percent ?? null,
        neck_cm: entry.neck_cm ?? null,
        shoulder_cm: entry.shoulder_cm ?? null,
        chest_cm: entry.chest_cm ?? null,
        left_bicep_cm: entry.left_bicep_cm ?? null,
        right_bicep_cm: entry.right_bicep_cm ?? null,
        left_forearm_cm: entry.left_forearm_cm ?? null,
        right_forearm_cm: entry.right_forearm_cm ?? null,
        abdomen: entry.abdomen ?? null,
        waist: entry.waist ?? null,
        hips: entry.hips ?? null,
        left_thigh: entry.left_thigh ?? null,
        right_thigh: entry.right_thigh ?? null,
        left_calf: entry.left_calf ?? null,
        right_calf: entry.right_calf ?? null,
    };
}

/**
 * Imports one Hevy body-measurement entry into the backup table.
 * Idempotent upsert on `(user_id, source, external_id)` — re-imports overwrite fields.
 *
 * @param db - Supabase client (user or service role)
 * @param params - Import context
 * @param params.userId - Proxima user ID owning the backup
 * @param params.entry - Body measurement from the Hevy API
 * @returns Upsert outcome: `upserted` with row id, or `error`
 */
export async function importHevyBodyMeasurement(
    db: TBodyMeasurementsDb,
    params: { userId: string; entry: THevyBodyMeasurement },
): Promise<TImportHevyBodyMeasurementResult> {
    const { userId, entry } = params;

    if (!entry.date) {
        return { status: "error", message: "Hevy body measurement missing date" };
    }

    try {
        const row = mapHevyBodyMeasurementToInsert(entry, userId);
        const { data, error } = await db
            .from("body_measurements")
            .upsert(row, { onConflict: "user_id,source,external_id" })
            .select("id")
            .maybeSingle();

        if (error) {
            return { status: "error", message: error.message };
        }

        if (!data?.id) {
            return { status: "error", message: "Upsert returned no row id" };
        }

        return { status: "upserted", id: data.id };
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown import error";
        return { status: "error", message };
    }
}
