/**
 * @module edit-current-week-arrival
 *
 * Router-state shape for **Edit current week** arrival (ADR 0013 / 01): the
 * builder is handed `program` (Proxima program id) + `week` (1-based) alongside
 * the existing `folder` (Hevy folder id from the **Program–Hevy link**), and the
 * week's routines are ordered from that link so the grid shows exactly one week
 * in the same day order `hevy-program-sync` uses.
 *
 * Pure — no React, no Supabase. Sub-plans 3–4 read `folder` as the Sync target.
 * Nothing in ADR 0013 writes the **Program prescription** — that is **Edit program**.
 *
 * Depends on: nothing
 * Used by: useNavigateToEditHevyProgram, BuildProgram
 */

/** Query param carrying the Proxima program id on Edit current week arrival. */
export const EDIT_WEEK_PROGRAM_PARAM = "program";
/** Query param carrying the 1-based week number on Edit current week arrival. */
export const EDIT_WEEK_PARAM = "week";

export type TEditCurrentWeekArrival = {
    /** Proxima program id, or null when this is a Hevy-only Edit path entry. */
    programId: number | null;
    /** 1-based week number (same grain as `schedule_workouts.nthWeek`). */
    nthWeek: number | null;
};

/**
 * Reads a positive integer query param, or null when absent/malformed.
 *
 * @param searchParams - URL search params from the builder route
 * @param key - Param name to read
 */
function readPositiveInt(
    searchParams: { get(key: string): string | null },
    key: string,
): number | null {
    const raw = searchParams.get(key);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/**
 * Parses Edit current week router state. Both fields must be present for the
 * arrival to be a Proxima-program week edit; a lone `program` or `week` is
 * treated as absent so a half-written URL can't mis-scope a later write.
 *
 * @param searchParams - URL search params from the builder route
 */
export function parseEditCurrentWeekArrival(
    searchParams: { get(key: string): string | null },
): TEditCurrentWeekArrival {
    const programId = readPositiveInt(searchParams, EDIT_WEEK_PROGRAM_PARAM);
    const nthWeek = readPositiveInt(searchParams, EDIT_WEEK_PARAM);
    if (programId == null || nthWeek == null) {
        return { programId: null, nthWeek: null };
    }
    return { programId, nthWeek };
}

/**
 * Orders one week's Hevy folder for the builder using the **Program–Hevy link**
 * as the authority: day = position in `hevy_routine_ids`, matched by routine id.
 *
 * Title inference (`normalizeRoutineTitlesForBuilder`) is the no-link fallback
 * and must not run here. It sorts by `created_at`, so a routine renamed or
 * recreated in Hevy drifts the builder's day N away from the day
 * `hevy-program-sync` marks complete via `hevy_routine_ids.indexOf(...)`.
 *
 * Routines present in the folder but absent from the link (added in Hevy after
 * Week Export) are kept, appended after the linked days — the folder is the
 * **Hevy week copy**, so dropping the athlete's own additions would hide real work.
 *
 * Also splits routine identity (ADR 0013 / 02): the Hevy UUID moves to
 * `hevyRoutineId` and `id` becomes an ordinal builder key. The builder mints new
 * day ids from `Math.max(...Number(id))`, which yields `NaN` — and collides — when
 * `id` holds a UUID.
 *
 * @param routines - Routines fetched for the linked Hevy folder
 * @param hevyRoutineIds - Link routine ids, ordered by day
 * @returns New array on `folder_id` 0 with ordinal `id`, 1-based `order`, Hevy UUID on `hevyRoutineId`
 */
export function orderRoutinesByLink(
    routines: THevyRoutine[],
    hevyRoutineIds: readonly string[],
): THevyRoutine[] {
    if (!routines || routines.length === 0) return [];

    const dayByRoutineId = new Map<string, number>();
    hevyRoutineIds.forEach((routineId, index) => {
        if (routineId) {
            dayByRoutineId.set(String(routineId), index);
        }
    });

    const linked: { routine: THevyRoutine; day: number }[] = [];
    const addedInHevy: THevyRoutine[] = [];

    for (const routine of routines) {
        // Re-entry safe: once split, the UUID lives on hevyRoutineId, not id.
        const hevyId = routine.hevyRoutineId ?? routine.id;
        const day = dayByRoutineId.get(String(hevyId));
        if (day == null) {
            addedInHevy.push(routine);
        } else {
            linked.push({ routine, day });
        }
    }

    linked.sort((a, b) => a.day - b.day);

    return [...linked.map((entry) => entry.routine), ...addedInHevy].map((routine, index) => ({
        ...routine,
        id: String(index + 1),
        hevyRoutineId: routine.hevyRoutineId ?? routine.id,
        folder_id: 0,
        order: String(index + 1),
    }));
}

export type TBuildEditCurrentWeekParamsInput = {
    /** Proxima program id; omit for Hevy-only Edit path. */
    programId?: number;
    /** 1-based week number; omit for Hevy-only Edit path. */
    nthWeek?: number;
    /** Hevy folder id from the Program–Hevy link. */
    folderId?: number | null;
    /** Extra params (e.g. stall-analysis `search=`). */
    extraParams?: Record<string, string>;
};

/**
 * Builds the `/build-program` query string for an Edit arrival.
 *
 * @param input - Program/week/folder identity plus any extra params
 * @returns Serialized query string (no leading `?`)
 */
export function buildEditArrivalParams({
    programId,
    nthWeek,
    folderId,
    extraParams = {},
}: TBuildEditCurrentWeekParamsInput): string {
    const params = new URLSearchParams({
        resume: "true",
        edit: "true",
        hevy: "true",
        ...extraParams,
    });

    if (folderId != null && Number.isFinite(Number(folderId))) {
        params.set("folder", String(folderId));
    }
    if (programId != null && nthWeek != null) {
        params.set(EDIT_WEEK_PROGRAM_PARAM, String(programId));
        params.set(EDIT_WEEK_PARAM, String(nthWeek));
    }

    return params.toString();
}
