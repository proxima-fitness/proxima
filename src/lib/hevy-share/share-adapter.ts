/**
 * @module lib/hevy-share/share-adapter
 *
 * Turns Hevy web-share JSON into builder-ready `THevyRoutine[]` for **Hevy share fetch**
 * and **Hevy share import**. Direct hydrate, not a `buildWeek` rebuild - titles, exercises,
 * sets, supersets and notes come across as written.
 *
 * Two rules define the output:
 *  - **Foreign identity is stripped.** The share's Hevy routine ID, folder ID and short id
 *    never reach builder state; each day gets a sequential **builder routine key** instead.
 *    Exercise template IDs are the deliberate exception - they are kept so Week Export can
 *    resolve or mint them (sub-plan 4).
 *  - **One-week seed.** Every shared routine lands in week 0 (`folder_id: 0`) as `Day 1..N`.
 *    Multi-week expand is a separate ask.
 *
 * The endpoints are undocumented, so every field is read defensively and the container
 * shape is probed rather than assumed (same spirit as normalizeHevyApiRoutine). A captured
 * response lives in `__tests__/shareable-folder.fixture.ts` - three of its quirks drive
 * code here: set type arrives as `indicator`, unused metrics are zero-filled rather than
 * null, and a Proxima-exported routine title carries a `"N - "` day ordinal.
 *
 * Depends on: lib/hevy-share/share-errors
 * Used by: lib/hevy-share/load-share
 */
import { HevyShareError } from "./share-errors";

/** Set types the builder renders; anything else from the share collapses to `normal`. */
const KNOWN_SET_TYPES = new Set(["normal", "warmup", "dropset", "failure"]);

/** Keys that may wrap the folder/routine payload one level down. */
const CONTAINER_KEYS = ["shareable_folder", "routine_folder", "folder", "data", "result", "share"];

/**
 * Leading day ordinal on a routine title (`"1 - Push Day"`).
 *
 * Proxima writes this prefix on Week Export, so a share of a Proxima-built folder comes
 * back carrying it. The builder shows the ordinal itself as `Day N` next to the title, so
 * keeping the prefix would double it up. Only stripped when a real title remains.
 */
const DAY_ORDINAL_PREFIX = /^\s*\d{1,2}\s*-\s*(?=\S)/;

/** Result of adapting one share payload. */
export type THevyShareAdaptResult = {
    /** Shared folder (or routine) title, when the payload carried one. */
    title: string | null;
    /** Week-0 seed days, ordered Day 1..N. */
    routines: THevyRoutine[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | null {
    return typeof value === "string" && value.trim() !== "" ? value : null;
}

function readFiniteNumber(value: unknown): number | null {
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value);
        if (Number.isFinite(parsed)) return parsed;
    }
    return null;
}

/**
 * Reads a metric Hevy zero-fills when it does not apply.
 *
 * Share sets carry `distance_meters: 0`, `duration_seconds: 0` and `custom_metric: 0` on
 * ordinary weight/rep work. `buildWeek` writes `null` for the same "not prescribed" state
 * and the grid treats `<= 0` as unset, so collapse the sentinel rather than seed zeroes.
 */
function readOptionalMetric(value: unknown): number | null {
    const numeric = readFiniteNumber(value);
    return numeric === null || numeric === 0 ? null : numeric;
}

/** Builder stores rest as a string (or null); the share may send either. */
function readRestSeconds(value: unknown): string | null {
    if (typeof value === "string") return value.trim() === "" ? null : value;
    const numeric = readFiniteNumber(value);
    return numeric === null ? null : String(numeric);
}

function readRepRange(value: unknown): THevyRepRange | null {
    if (!isRecord(value)) return null;
    const start = readFiniteNumber(value.start);
    const end = readFiniteNumber(value.end);
    if (start === null || end === null) return null;
    return { start, end };
}

/** Drops the `"N - "` day ordinal a Proxima-exported routine title carries. */
function stripDayOrdinalPrefix(title: string): string {
    return title.replace(DAY_ORDINAL_PREFIX, "");
}

/** True when the object looks like a routine rather than a wrapper. */
function looksLikeRoutine(value: unknown): value is Record<string, unknown> {
    return isRecord(value) && Array.isArray(value.exercises);
}

/**
 * Finds the object that actually holds the share's routines.
 *
 * Probes the payload itself and one level of known wrapper keys, in order, so a
 * `{ shareable_folder: { routines: [...] } }` response and a bare `{ routines: [...] }`
 * both resolve.
 */
function findShareContainer(payload: unknown): Record<string, unknown> | null {
    if (!isRecord(payload)) return null;

    const candidates: unknown[] = [payload];
    for (const key of CONTAINER_KEYS) {
        if (key in payload) candidates.push(payload[key]);
    }

    for (const candidate of candidates) {
        if (!isRecord(candidate)) continue;
        if (Array.isArray(candidate.routines)) return candidate;
        if (looksLikeRoutine(candidate.routine)) return candidate;
        if (looksLikeRoutine(candidate)) return candidate;
    }

    return null;
}

/** Pulls the raw routine objects out of a container, in the share's own order. */
function readRawRoutines(container: Record<string, unknown>): Record<string, unknown>[] {
    if (Array.isArray(container.routines)) {
        return container.routines.filter(looksLikeRoutine);
    }
    if (looksLikeRoutine(container.routine)) {
        return [container.routine];
    }
    if (looksLikeRoutine(container)) {
        return [container];
    }
    return [];
}

/** Folder title, when the share carried one. A single shared routine has no folder title. */
function readContainerTitle(
    container: Record<string, unknown>,
    rawRoutines: Record<string, unknown>[],
): string | null {
    if (rawRoutines.length === 1 && rawRoutines[0] === container) return null;
    return readString(container.title) ?? readString(container.name);
}

/**
 * Sorts by the share's own `index` when every routine has one; otherwise keeps
 * payload order. Day numbers come from this order.
 */
function sortRawRoutines(rawRoutines: Record<string, unknown>[]): Record<string, unknown>[] {
    const indexed = rawRoutines.map((routine, position) => ({
        routine,
        position,
        index: readFiniteNumber(routine.index),
    }));

    if (indexed.some(entry => entry.index === null)) return rawRoutines;

    return indexed
        .sort((a, b) => (a.index! - b.index!) || (a.position - b.position))
        .map(entry => entry.routine);
}

function adaptShareSet(raw: unknown, index: number): THevySets {
    const source = isRecord(raw) ? raw : {};
    // The share endpoints name the set type `indicator`; `type`/`set_type` are the public-API spellings.
    const rawType =
        readString(source.indicator) ?? readString(source.type) ?? readString(source.set_type);
    const repRange = readRepRange(source.rep_range);
    const reps = readFiniteNumber(source.reps);

    // Mirror buildWeek: a start === end range renders as "5-5", so keep it as a fixed rep count.
    const isDegenerateRange = repRange !== null && repRange.start === repRange.end;

    return {
        index,
        type: rawType && KNOWN_SET_TYPES.has(rawType) ? rawType : "normal",
        weight_kg: readFiniteNumber(source.weight_kg),
        reps: isDegenerateRange ? (reps ?? repRange.start) : reps,
        distance_meters: readOptionalMetric(source.distance_meters),
        duration_seconds: readOptionalMetric(source.duration_seconds),
        rpe: readFiniteNumber(source.rpe),
        custom_metric: readOptionalMetric(source.custom_metric),
        rep_range: isDegenerateRange ? null : repRange,
    };
}

/**
 * Adapts one exercise row.
 *
 * `exercise_template_id` is carried over verbatim - the share's template may be another
 * user's Hevy-native custom, which Week Export mints as a **Custom movement** (sub-plan 4).
 *
 * @param supersetKeys - Per-routine map from the share's superset id to a 0-indexed group
 */
function adaptShareExercise(
    raw: unknown,
    index: number,
    supersetKeys: Map<number, number>,
): THevyExercise {
    const source = isRecord(raw) ? raw : {};
    const rawSupersetId = readFiniteNumber(source.supersets_id ?? source.superset_id);

    return {
        index,
        title: readString(source.title) ?? "",
        notes: readString(source.notes) ?? "",
        rest_seconds: readRestSeconds(source.rest_seconds),
        exercise_template_id: readString(source.exercise_template_id) ?? "",
        supersets_id: rawSupersetId === null ? null : supersetKeys.get(rawSupersetId) ?? null,
        sets: Array.isArray(source.sets) ? source.sets.map(adaptShareSet) : [],
    };
}

/**
 * Renumbers the share's superset ids to the 0-indexed groups the builder expects,
 * preserving which exercises belong together.
 */
function buildSupersetKeys(rawExercises: unknown[]): Map<number, number> {
    const keys = new Map<number, number>();

    for (const exercise of rawExercises) {
        if (!isRecord(exercise)) continue;
        const supersetId = readFiniteNumber(exercise.supersets_id ?? exercise.superset_id);
        if (supersetId === null || keys.has(supersetId)) continue;
        keys.set(supersetId, keys.size);
    }

    return keys;
}

/**
 * Adapts one shared routine into a week-0 builder day.
 *
 * @param dayNumber - 1-based position in the seed; becomes both the **builder routine key** and `order`
 */
function adaptShareRoutine(
    raw: Record<string, unknown>,
    dayNumber: number,
    timestamp: string,
): THevyRoutine {
    const rawExercises = Array.isArray(raw.exercises) ? raw.exercises : [];
    const supersetKeys = buildSupersetKeys(rawExercises);
    const rawTitle = readString(raw.title);

    return {
        // Builder routine key, not the share's Hevy routine ID - foreign identity is dropped.
        id: String(dayNumber),
        title: rawTitle === null ? `Day ${dayNumber}` : stripDayOrdinalPrefix(rawTitle),
        folder_id: 0, // One-week seed: every shared routine lands in week 0.
        order: String(dayNumber),
        notes: readString(raw.notes) ?? "",
        created_at: timestamp,
        updated_at: timestamp,
        exercises: rawExercises.map((exercise, index) =>
            adaptShareExercise(exercise, index, supersetKeys),
        ),
    };
}

/**
 * Adapts a Hevy web-share payload (folder or single routine) into a one-week builder seed.
 *
 * @param payload - Raw JSON from `shareable_folder/{id}` or `routine_with_short_id/{shortId}`
 * @param now - Injectable clock for deterministic tests
 * @returns Folder title (when present) and week-0 days ordered Day 1..N
 * @throws {HevyShareError} `malformed` when the payload holds no readable routines
 */
export function adaptHevyShareToRoutines(payload: unknown, now: Date = new Date()): THevyShareAdaptResult {
    const container = findShareContainer(payload);
    const rawRoutines = container ? readRawRoutines(container) : [];

    if (!container || rawRoutines.length === 0) {
        throw new HevyShareError(
            "malformed",
            "That Hevy share had no routines we could read - Hevy's share format may have changed.",
        );
    }

    const timestamp = now.toISOString();

    return {
        title: readContainerTitle(container, rawRoutines),
        routines: sortRawRoutines(rawRoutines).map((raw, position) =>
            adaptShareRoutine(raw, position + 1, timestamp),
        ),
    };
}
