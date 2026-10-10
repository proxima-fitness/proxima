// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module lib/hevy-share/share-adapter
 *
 * Turns Hevy web-share JSON into builder-ready `THevyRoutine[]` for **Hevy share fetch**
 * and **Hevy share import**. Direct hydrate, not a `buildProgram` rebuild - titles, exercises,
 * sets, supersets and notes come across as written.
 *
 * Two entry points, one per link family: {@link adaptHevyShareToRoutines} for a shared folder
 * or routine (a prescription), and {@link adaptHevyWorkoutToRoutines} for a public completed
 * workout (a log). They share all exercise and set handling and differ only in the container -
 * a workout titles itself with `name`, carries session metadata, and is gated on being public.
 *
 * Two rules define the output:
 *  - **Foreign identity is stripped.** The share's Hevy routine ID, folder ID and short id
 *    never reach builder state; each day gets a sequential **builder routine key** instead.
 *    Exercise template IDs are the deliberate exception - they are kept so Week Export can
 *    resolve or mint them (sub-plan 4), and the sharer-owned ones travel with the metadata
 *    that minting needs.
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

/**
 * An account's own Hevy customs are identified by a UUID; the library's templates are 8 hex
 * characters (`79D0BB3A`) and Proxima's supplemental ones are `WU`-prefixed. Only a UUID is
 * therefore possibly the sharer's to own, and only those carry mint metadata - claiming a shared
 * template that already resolves on every account would have Week Export duplicate it.
 */
const HEVY_CUSTOM_TEMPLATE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Keys that may wrap a completed-workout payload one level down. */
const WORKOUT_CONTAINER_KEYS = ["workout", "data", "result"];

/**
 * `type` values that mean anyone holding the link may read the workout.
 *
 * Fail-closed: an unrecognised value is treated as private. Hevy 404s a non-public workout
 * already, so this only ever matters if that changes - and a wrong guess here would republish
 * someone's private log.
 */
const PUBLIC_WORKOUT_TYPES = new Set(["public"]);

/** Result of adapting one share payload. */
export type THevyShareAdaptResult = {
    /** Shared folder (or routine) title, when the payload carried one. */
    title: string | null;
    /** Week-0 seed days, ordered Day 1..N. */
    routines: THevyRoutine[];
    /** Session facts, for a completed-workout link only - a prescription has none. */
    workout?: THevyShareWorkoutMeta;
};

/**
 * What a completed workout has that a routine does not: who logged it, when, and for how long.
 *
 * Kept beside the routines rather than folded into them - the seed is a prescription for the
 * builder grid, so log timestamps stay out of builder state and travel as context instead.
 */
export type THevyShareWorkoutMeta = {
    /** Hevy username of whoever logged it. */
    username: string | null;
    /** ISO 8601 session start, converted from Hevy's unix-seconds `start_time`. */
    startedAt: string | null;
    /** Wall-clock length of the session in seconds, when both ends are known. */
    durationSeconds: number | null;
    /** Hevy's own volume estimate for the session, in kilograms. */
    estimatedVolumeKg: number | null;
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
 * ordinary weight/rep work. `buildProgram` writes `null` for the same "not prescribed" state
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

    // Mirror buildProgram: a start === end range renders as "5-5", so keep it as a fixed rep count.
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

/** Muscle names from the share, dropping anything that is not a plain string. */
function readMuscleNames(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value.filter((entry): entry is string => typeof entry === "string" && entry.trim() !== "");
}

/**
 * Reads the mint metadata for a sharer-owned template, or `null` when the exercise needs none.
 *
 * The share sends the exact fields `POST /v1/exercise_templates` wants, so a **Hevy-native custom**
 * of the sharer's can be recreated faithfully on the importer's account instead of being guessed
 * at from its title. Library templates and untitled rows carry nothing: the first needs no mint,
 * the second gives Week Export nothing to mint from.
 */
function readSharedTemplate(
    source: Record<string, unknown>,
    templateId: string,
    title: string,
): THevySharedTemplate | null {
    if (!HEVY_CUSTOM_TEMPLATE_ID.test(templateId)) return null;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) return null;

    return {
        title: trimmedTitle,
        exercise_type: readString(source.exercise_type),
        equipment_category: readString(source.equipment_category),
        muscle_group: readString(source.muscle_group),
        other_muscles: readMuscleNames(source.other_muscles),
    };
}

/**
 * Adapts one exercise row.
 *
 * `exercise_template_id` is carried over verbatim - the share's template may be another
 * user's Hevy-native custom, which Week Export mints as a **Custom movement** (sub-plan 4)
 * using the `shared_template` metadata attached here.
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
    const title = readString(source.title) ?? "";
    const templateId = readString(source.exercise_template_id) ?? "";
    const sharedTemplate = readSharedTemplate(source, templateId, title);

    return {
        index,
        title,
        notes: readString(source.notes) ?? "",
        rest_seconds: readRestSeconds(source.rest_seconds),
        exercise_template_id: templateId,
        supersets_id: rawSupersetId === null ? null : supersetKeys.get(rawSupersetId) ?? null,
        sets: Array.isArray(source.sets) ? source.sets.map(adaptShareSet) : [],
        ...(sharedTemplate ? { shared_template: sharedTemplate } : {}),
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
    // Routines title themselves with `title`; a completed workout names itself with `name`.
    const rawTitle = readString(raw.title) ?? readString(raw.name);

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

/**
 * Finds the completed-workout object in a `GET /workout/{id}` payload.
 *
 * Same defensive probe as {@link findShareContainer} - the endpoint returns the workout bare
 * today, but it is undocumented, so one level of plausible wrapper keys is checked too.
 */
function findWorkoutObject(payload: unknown): Record<string, unknown> | null {
    if (!isRecord(payload)) return null;
    if (looksLikeRoutine(payload)) return payload;

    for (const key of WORKOUT_CONTAINER_KEYS) {
        const candidate = payload[key];
        if (looksLikeRoutine(candidate)) return candidate;
    }

    return null;
}

/**
 * Refuses a workout that is not public.
 *
 * The share pipeline exists to read links people chose to publish; a private log reached
 * through a leaked or guessed id is not ours to relay. Reported as `not_found` because from
 * the user's side there is nothing readable at that link either way.
 *
 * @throws {HevyShareError} `not_found` when the payload says private, or says nothing we know
 */
function assertWorkoutIsPublic(workout: Record<string, unknown>): void {
    const type = readString(workout.type);
    const isPublicType = type === null || PUBLIC_WORKOUT_TYPES.has(type.toLowerCase());

    if (workout.is_private === true || !isPublicType) {
        throw new HevyShareError(
            "not_found",
            "That Hevy workout is not public, so it cannot be read from its link.",
        );
    }
}

/** Unix seconds (Hevy's `start_time`/`end_time` spelling) as an ISO timestamp. */
function readUnixSecondsAsIso(value: unknown): string | null {
    const seconds = readFiniteNumber(value);
    if (seconds === null || seconds <= 0) return null;

    const date = new Date(seconds * 1000);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/** Session facts a completed workout carries alongside its exercises. */
function readWorkoutMeta(workout: Record<string, unknown>): THevyShareWorkoutMeta {
    const startSeconds = readFiniteNumber(workout.start_time);
    const endSeconds = readFiniteNumber(workout.end_time);
    const hasSpan = startSeconds !== null && endSeconds !== null && endSeconds > startSeconds;

    return {
        username: readString(workout.username),
        startedAt: readUnixSecondsAsIso(workout.start_time) ?? readString(workout.create_at),
        durationSeconds: hasSpan ? endSeconds - startSeconds : null,
        estimatedVolumeKg: readFiniteNumber(workout.estimated_volume_kg),
    };
}

/**
 * Adapts a public completed workout into a one-day builder seed.
 *
 * The exercises and sets are read exactly as the folder/routine adapter reads them, so a logged
 * session lands on the grid the same way a shared routine does - with one difference worth
 * knowing about: every weight, rep and RPE here is what the sharer **actually lifted**, not a
 * prescription. Nothing about that is rewritten; callers frame it, using {@link THevyShareWorkoutMeta}.
 *
 * Hevy names a workout after the routine it was logged from, so a session run off a
 * Proxima-exported routine arrives with the same `"N - "` day ordinal, stripped here as well.
 *
 * @param payload - Raw JSON from `workout/{id}`
 * @param now - Injectable clock for deterministic tests
 * @returns The workout name (when it had one), a single week-0 day, and its session metadata
 * @throws {HevyShareError} `not_found` when the workout is not public, `malformed` when the
 *         payload holds no workout we can read
 */
export function adaptHevyWorkoutToRoutines(
    payload: unknown,
    now: Date = new Date(),
): THevyShareAdaptResult {
    const workout = findWorkoutObject(payload);

    if (!workout) {
        throw new HevyShareError(
            "malformed",
            "That Hevy workout had nothing we could read - Hevy's share format may have changed.",
        );
    }

    assertWorkoutIsPublic(workout);

    const title = readString(workout.name);

    return {
        title: title === null ? null : stripDayOrdinalPrefix(title),
        routines: [adaptShareRoutine(workout, 1, now.toISOString())],
        workout: readWorkoutMeta(workout),
    };
}
