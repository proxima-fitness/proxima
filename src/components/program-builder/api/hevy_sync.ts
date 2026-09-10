/**
 * @module hevy_sync
 *
 * Sync engine for **Edit path** (ADR 0013 / 03). Callers pass an Edit session
 * plus the working week; this module decides which Hevy writes to make and,
 * on a linked week, how to rewrite live `hevy_routine_ids`.
 *
 * Design constraints that are easy to miss:
 *
 * - Hevy has no DELETE. A builder-removed day is emptied in place: title
 *   `[Removed] {original}`, `exercises: []`, notes `" "`. The `[Removed]`
 *   prefix is the only empty signal — empty exercises alone are a new day
 *   the athlete is still building.
 * - Identity is the Hevy routine UUID. Edit current week stores it on
 *   `hevyRoutineId`. Hevy-only still parks it on `id` until SP4; we coerce
 *   a UUID `id` so those days PUT rather than POST as duplicates.
 * - Writes always run empty → PUT → POST. PUT must omit `folder_id` (Hevy
 *   would move the routine). POST uses `initialFolderId`, never the builder's
 *   `folder_id` (that field is a week index, usually 0).
 * - After every Hevy write succeeds, a linked session rewrites the compact
 *   planned ID list (Folder reconcile). Failures leave the link alone so
 *   **Day complete** still matches the last good IDs. Hevy-only has no link.
 *
 * Chrome (toolbar, dialog, toasts) is SP4. This file is callable from tests.
 *
 * Depends on: hevy (HTTP + custom-exercise resolve), hevy_export (PUT payload),
 *             program-hevy-links (live ID update), uuid
 * Used by: Sync UI (ADR 0013 / 04)
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { User } from "@supabase/supabase-js";
import { validate as validateUuid } from "uuid";
import type { Database } from "@/hooks/supabase";
import {
    getProgramHevyWeekLink,
    updateProgramHevyWeekRoutineIds,
} from "@/api/program-hevy-links";
import { convertHevyOutputIntoInput } from "./hevy_export";
import {
    RATE_LIMIT_MAX_RETRIES,
    ROUTINES_BATCH_SIZE,
    delay,
    delayWithRateLimitCountdown,
    emptyRoutineOnHevy,
    extractHevyCreatedRoutineId,
    isHevyRateLimitError,
    postRoutine,
    putRoutine,
    resolveCustomExerciseTemplatesForHevyUpload,
    type THevyUploadProgressCallback,
} from "./hevy";

type TSupabase = SupabaseClient<Database>;

/** Hevy empty signal. Title prefix only; empty exercises are not enough. */
export const REMOVED_ROUTINE_PREFIX = "[Removed] ";

export type THevyRoutinePutPayload = Omit<THevyRoutineRequest, "folder_id">;

export type TSyncPlanItemEmpty = {
    hevyRoutineId: string;
    originalTitle: string;
};

export type TSyncPlanItemPut = {
    hevyRoutineId: string;
    routine: THevyRoutine;
};

export type TSyncPlanItemPost = {
    routine: THevyRoutine;
};

/** Three Hevy write buckets. Callers execute them in this field order. */
export type TSyncPlan = {
    empty: TSyncPlanItemEmpty[];
    put: TSyncPlanItemPut[];
    post: TSyncPlanItemPost[];
};

export type TBuildSyncPlanInput = {
    completedHevyRoutineIds?: readonly string[];
    initialHevyProgram: readonly THevyRoutine[];
    initialRoutineIds: readonly string[];
    workingRoutines: readonly THevyRoutine[];
};

export type TBuildLiveHevyRoutineIdsInput = {
    initialRoutineIds: readonly string[];
    postedByBuilderId: ReadonlyMap<string, string>;
    previousLinkIds: readonly string[];
    skippedCompleteIds?: readonly string[];
    workingRoutines: readonly THevyRoutine[];
};

export type TBuildRollbackPlanInput = {
    currentFolderRoutineIds: readonly string[];
    initialHevyProgram: readonly THevyRoutine[];
    postedDuringSyncIds: readonly string[];
};

export type TSyncEditSession = {
    initialFolderId: number | null;
    initialHevyProgram: THevyRoutine[];
    initialRoutineIds: string[];
    nthWeek?: number | null;
    programId?: number | null;
};

export type TSyncFailure = {
    error: string;
    hevyRoutineId?: string;
    op: "empty" | "put" | "post";
    title: string;
};

export type TSyncResult = {
    emptyCount: number;
    failures: TSyncFailure[];
    /**
     * Set only after a linked Sync successfully rewrote the week row.
     * Absent on Hevy-only, missing link, or any Hevy failure.
     */
    liveHevyRoutineIds?: string[];
    postCount: number;
    postedRoutineIds: string[];
    putCount: number;
    success: boolean;
};

export type TSyncHevyApi = {
    emptyRoutineOnHevy: (
        routineId: string,
        originalTitle: string,
        apiKey: string,
    ) => Promise<unknown>;
    extractHevyCreatedRoutineId: (response: unknown) => string | null;
    postRoutine: (payload: THevyRoutineRequest, apiKey: string) => Promise<unknown>;
    putRoutine: (
        routineId: string,
        payload: THevyRoutinePutPayload,
        apiKey: string,
    ) => Promise<unknown>;
    resolveCustomExerciseTemplatesForHevyUpload: (
        user: User | null | undefined,
        apiKey: string,
        routines: THevyRoutine[],
        onProgress?: THevyUploadProgressCallback,
    ) => ReturnType<typeof resolveCustomExerciseTemplatesForHevyUpload>;
    wait: (ms: number) => Promise<void>;
};

export type TSyncProgramToHevyInput = {
    apiKey: string;
    completedHevyRoutineIds?: readonly string[];
    hevyApi?: Partial<TSyncHevyApi>;
    linkClient?: TSupabase;
    onProgress?: THevyUploadProgressCallback;
    session: TSyncEditSession | null;
    user?: User | null;
    workingRoutines: readonly THevyRoutine[];
};

type THevyWriteBatch = {
    api: TSyncHevyApi;
    apiKey: string;
    emptyCount: number;
    failures: TSyncFailure[];
    finished: number;
    onProgress?: THevyUploadProgressCallback;
    postCount: number;
    postedByBuilderId: Map<string, string>;
    postedRoutineIds: string[];
    putCount: number;
    total: number;
};

type TRetryResult<T> =
    | { error: unknown; ok: false }
    | { ok: true; value: T };

// ── Title / identity ────────────────────────────────────────────────────────

/**
 * Strips a leading `[Removed] ` so empty titles never double-prefix.
 *
 * @param title - Routine title, possibly already emptied
 */
export function stripRemovedPrefix(title: string): string {
    return title.startsWith(REMOVED_ROUTINE_PREFIX)
        ? title.slice(REMOVED_ROUTINE_PREFIX.length)
        : title;
}

/**
 * Builds the Hevy empty title. Safe to call twice.
 *
 * @param title - Original (or already-removed) routine title
 */
export function toRemovedTitle(title: string): string {
    return `${REMOVED_ROUTINE_PREFIX}${stripRemovedPrefix(title)}`;
}

/**
 * True when Hevy already treats this routine as emptied. Empty `exercises`
 * without the prefix is *not* removed — the athlete may be assembling a day.
 *
 * @param routine - Title + exercises from Hevy or the builder
 */
export function isRemovedRoutine(routine: {
    exercises: unknown[];
    title: string;
}): boolean {
    return routine.title.startsWith(REMOVED_ROUTINE_PREFIX);
}

/**
 * Hevy UUID this day should PUT/empty against.
 *
 * Prefer `hevyRoutineId`. If that is missing and `id` is a UUID, use `id` —
 * Hevy-only Edit still stores the Hevy id there, and treating it as "new"
 * would POST a duplicate of every existing day.
 *
 * @param routine - Builder day
 */
export function resolveHevyRoutineId(routine: THevyRoutine): string | undefined {
    if (routine.hevyRoutineId) {
        return routine.hevyRoutineId;
    }
    if (validateUuid(routine.id)) {
        return routine.id;
    }
    return undefined;
}

/**
 * PUT body: same conversion as Week Export, with `folder_id` stripped.
 * Including `folder_id` on PUT can move the routine out of its week folder.
 *
 * @param routine - Builder routine
 */
export function routineToHevyPutPayload(routine: THevyRoutine): THevyRoutinePutPayload {
    const converted = convertHevyOutputIntoInput(routine, 0);
    return {
        title: converted.title,
        notes: converted.notes,
        exercises: converted.exercises,
    };
}

/**
 * Arrival snapshot IDs, plus any UUID we can coerce off the snapshot routines.
 *
 * Hevy-only sessions often have an empty `initialRoutineIds` because the
 * session captured `hevyRoutineId` (unset) rather than the UUID on `id`.
 */
function arrivalHevyIds(
    initialRoutineIds: readonly string[],
    initialHevyProgram: readonly THevyRoutine[],
): Set<string> {
    const ids = new Set(initialRoutineIds);
    for (const routine of initialHevyProgram) {
        const id = resolveHevyRoutineId(routine);
        if (id) {
            ids.add(id);
        }
    }
    return ids;
}

function workingHevyIds(workingRoutines: readonly THevyRoutine[]): Set<string> {
    const ids = new Set<string>();
    for (const routine of workingRoutines) {
        const id = resolveHevyRoutineId(routine);
        if (id) {
            ids.add(id);
        }
    }
    return ids;
}

function findInitialRoutine(
    initialHevyProgram: readonly THevyRoutine[],
    hevyRoutineId: string,
): THevyRoutine | undefined {
    return initialHevyProgram.find(
        (routine) => resolveHevyRoutineId(routine) === hevyRoutineId,
    );
}

// ── Diff (pure) ─────────────────────────────────────────────────────────────

/**
 * Compare normalized Hevy PUT payloads, not builder objects.
 * Ordinal `id`, `folder_id` 0, and other builder-only fields must not count
 * as a change — those would PUT every day on every Sync.
 */
function routineContentChanged(
    working: THevyRoutine,
    initial: THevyRoutine,
): boolean {
    return (
        JSON.stringify(routineToHevyPutPayload(working)) !==
        JSON.stringify(routineToHevyPutPayload(initial))
    );
}

/**
 * In the folder at arrival, never on the Program–Hevy link, not created by
 * this Sync. Edit loads these; they must not become **Linked days**.
 */
function isAthleteAddedRoutine(
    hevyId: string,
    arrivalIds: ReadonlySet<string>,
    previousLinkIds: ReadonlySet<string>,
    postedIds: ReadonlySet<string>,
): boolean {
    return arrivalIds.has(hevyId) && !previousLinkIds.has(hevyId) && !postedIds.has(hevyId);
}

/**
 * Diff the working week against arrival snapshots.
 *
 * **Day complete** days are locked in the UI; we still refuse empty/PUT here
 * so a stale client cannot clobber a logged routine. Athlete-added days PUT
 * if edited (they have a Hevy id) and never POST (POST is builder-minted).
 *
 * @param input - Working routines plus Edit session snapshots
 */
export function buildSyncPlan(input: TBuildSyncPlanInput): TSyncPlan {
    const completed = new Set(input.completedHevyRoutineIds ?? []);
    const arrivalIds = arrivalHevyIds(input.initialRoutineIds, input.initialHevyProgram);
    const presentIds = workingHevyIds(input.workingRoutines);

    const empty: TSyncPlanItemEmpty[] = [];
    for (const hevyRoutineId of arrivalIds) {
        if (presentIds.has(hevyRoutineId) || completed.has(hevyRoutineId)) {
            continue;
        }
        const original = findInitialRoutine(input.initialHevyProgram, hevyRoutineId);
        if (original && isRemovedRoutine(original)) {
            continue;
        }
        empty.push({
            hevyRoutineId,
            originalTitle: original?.title ?? "Routine",
        });
    }

    const put: TSyncPlanItemPut[] = [];
    const post: TSyncPlanItemPost[] = [];
    for (const routine of input.workingRoutines) {
        const hevyRoutineId = resolveHevyRoutineId(routine);
        if (!hevyRoutineId) {
            post.push({ routine });
            continue;
        }
        if (completed.has(hevyRoutineId)) {
            continue;
        }
        const initial = findInitialRoutine(input.initialHevyProgram, hevyRoutineId);
        if (!initial) {
            continue;
        }
        if (routineContentChanged(routine, initial)) {
            put.push({ hevyRoutineId, routine });
        }
    }

    return { empty, put, post };
}

/**
 * Compact planned Hevy IDs after a successful Sync, in builder order.
 *
 * Drops emptied IDs and IDs already missing from the folder (Hevy-app
 * delete). Inserts POST results. Leaves **Athlete-added** IDs off the list
 * even if the athlete edited them. `skippedCompleteIds` are days we refused
 * to empty — they stay on the link so **Day complete** still matches.
 *
 * @param input - Working set, arrival folder IDs, previous link IDs, POST results
 */
export function buildLiveHevyRoutineIds(input: TBuildLiveHevyRoutineIdsInput): string[] {
    const previous = new Set(input.previousLinkIds);
    const arrival = new Set(input.initialRoutineIds);
    const posted = new Set(input.postedByBuilderId.values());
    const live: string[] = [];
    const seen = new Set<string>();

    for (const routine of input.workingRoutines) {
        const hevyId =
            resolveHevyRoutineId(routine) ?? input.postedByBuilderId.get(routine.id);
        if (!hevyId || seen.has(hevyId)) {
            continue;
        }
        if (isAthleteAddedRoutine(hevyId, arrival, previous, posted)) {
            continue;
        }
        live.push(hevyId);
        seen.add(hevyId);
    }

    for (const id of input.skippedCompleteIds ?? []) {
        if (!seen.has(id)) {
            live.push(id);
            seen.add(id);
        }
    }

    return live;
}

/**
 * Restore Hevy toward `initialHevyProgram` after a partial Sync.
 *
 * PUT every snapshot routine still in the folder (covers both changed and
 * emptied). Empty anything this Sync POSTed. Prefer PUT over POST: emptied
 * routines still have their Hevy id. SP4 invokes this; we only build the plan.
 *
 * @param input - Snapshot plus current folder / POST IDs from the failed run
 */
export function buildRollbackPlan(input: TBuildRollbackPlanInput): TSyncPlan {
    const current = new Set(input.currentFolderRoutineIds);
    const posted = new Set(input.postedDuringSyncIds);
    const put: TSyncPlanItemPut[] = [];
    const empty: TSyncPlanItemEmpty[] = [];

    for (const routine of input.initialHevyProgram) {
        const hevyRoutineId = resolveHevyRoutineId(routine);
        if (!hevyRoutineId || !current.has(hevyRoutineId)) {
            continue;
        }
        put.push({ hevyRoutineId, routine });
    }

    for (const hevyRoutineId of posted) {
        if (!current.has(hevyRoutineId)) {
            continue;
        }
        empty.push({ hevyRoutineId, originalTitle: "Routine" });
    }

    return { empty, put, post: [] };
}

// ── Hevy writes ─────────────────────────────────────────────────────────────

function isLinkedSession(
    session: TSyncEditSession,
): session is TSyncEditSession & { nthWeek: number; programId: number } {
    const programId = session.programId;
    const nthWeek = session.nthWeek;
    return (
        typeof programId === "number" &&
        Number.isInteger(programId) &&
        programId > 0 &&
        typeof nthWeek === "number" &&
        Number.isInteger(nthWeek) &&
        nthWeek > 0
    );
}

function resolveHevyApi(overrides?: Partial<TSyncHevyApi>): TSyncHevyApi {
    return {
        emptyRoutineOnHevy,
        extractHevyCreatedRoutineId,
        postRoutine,
        putRoutine,
        resolveCustomExerciseTemplatesForHevyUpload,
        wait: delay,
        ...overrides,
    };
}

function errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function syncResult(
    batch: Pick<
        THevyWriteBatch,
        "emptyCount" | "failures" | "postCount" | "postedRoutineIds" | "putCount"
    >,
    extra: { liveHevyRoutineIds?: string[]; success: boolean },
): TSyncResult {
    return {
        success: extra.success,
        failures: batch.failures,
        emptyCount: batch.emptyCount,
        putCount: batch.putCount,
        postCount: batch.postCount,
        postedRoutineIds: batch.postedRoutineIds,
        ...(extra.liveHevyRoutineIds ? { liveHevyRoutineIds: extra.liveHevyRoutineIds } : {}),
    };
}

/**
 * Sleep out a 429. Production uses Export's second-by-second countdown so
 * the Sync dialog can show remaining wait. Tests replace `wait` and skip
 * that UI path — we detect the real `delay` by function identity.
 */
async function waitOutRateLimit(
    api: TSyncHevyApi,
    uploaded: number,
    total: number,
    retry: number,
    onProgress?: THevyUploadProgressCallback,
): Promise<void> {
    const seconds = 60 * Math.pow(2, retry);
    if (api.wait === delay) {
        await delayWithRateLimitCountdown(uploaded, total, onProgress, seconds);
        return;
    }
    onProgress?.(uploaded, total, "rate_limited", seconds);
    await api.wait(seconds * 1000);
}

/**
 * Retry only HTTP 429, same budget as Week Export. Other errors fail the
 * op immediately; the batch continues so later days still write.
 */
async function runWithRateLimitRetry<T>(
    run: () => Promise<T>,
    api: TSyncHevyApi,
    uploaded: number,
    total: number,
    onProgress?: THevyUploadProgressCallback,
): Promise<TRetryResult<T>> {
    for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
        try {
            return { ok: true, value: await run() };
        } catch (error: unknown) {
            if (!isHevyRateLimitError(error) || retry >= RATE_LIMIT_MAX_RETRIES) {
                return { ok: false, error };
            }
            await waitOutRateLimit(api, uploaded, total, retry, onProgress);
        }
    }
    return { ok: false, error: new Error("Hevy rate limit retries exhausted") };
}

/** Same 40-routine burst pause as Week Export. Tests' fake `wait` is a no-op. */
async function pauseIfBatchBoundary(batch: THevyWriteBatch): Promise<void> {
    if (batch.finished === 0 || batch.finished % ROUTINES_BATCH_SIZE !== 0) {
        return;
    }
    if (batch.finished >= batch.total) {
        return;
    }
    if (batch.api.wait === delay) {
        await delayWithRateLimitCountdown(batch.finished, batch.total, batch.onProgress);
        return;
    }
    await batch.api.wait(0);
}

async function performHevyWrite<T>(
    batch: THevyWriteBatch,
    run: () => Promise<T>,
): Promise<TRetryResult<T>> {
    batch.onProgress?.(batch.finished + 1, batch.total, "uploading");
    const result = await runWithRateLimitRetry(
        run,
        batch.api,
        batch.finished + 1,
        batch.total,
        batch.onProgress,
    );
    batch.finished += 1;
    await pauseIfBatchBoundary(batch);
    return result;
}

/** Book-keeping for an op that never hit Hevy (missing folder id, etc.). */
async function skipHevyWrite(batch: THevyWriteBatch): Promise<void> {
    batch.onProgress?.(batch.finished + 1, batch.total, "uploading");
    batch.finished += 1;
    await pauseIfBatchBoundary(batch);
}

async function emptyRemovedRoutines(
    batch: THevyWriteBatch,
    items: readonly TSyncPlanItemEmpty[],
): Promise<void> {
    for (const item of items) {
        const result = await performHevyWrite(batch, () =>
            batch.api.emptyRoutineOnHevy(item.hevyRoutineId, item.originalTitle, batch.apiKey),
        );
        if (result.ok) {
            batch.emptyCount += 1;
            continue;
        }
        batch.failures.push({
            op: "empty",
            hevyRoutineId: item.hevyRoutineId,
            title: toRemovedTitle(item.originalTitle),
            error: errorMessage(result.error),
        });
    }
}

async function putChangedRoutines(
    batch: THevyWriteBatch,
    items: readonly TSyncPlanItemPut[],
    resolvedByBuilderId: ReadonlyMap<string, THevyRoutine>,
): Promise<void> {
    for (const item of items) {
        const routine = resolvedByBuilderId.get(item.routine.id) ?? item.routine;
        const result = await performHevyWrite(batch, () =>
            batch.api.putRoutine(
                item.hevyRoutineId,
                routineToHevyPutPayload(routine),
                batch.apiKey,
            ),
        );
        if (result.ok) {
            batch.putCount += 1;
            continue;
        }
        batch.failures.push({
            op: "put",
            hevyRoutineId: item.hevyRoutineId,
            title: routine.title,
            error: errorMessage(result.error),
        });
    }
}

async function postNewRoutines(
    batch: THevyWriteBatch,
    items: readonly TSyncPlanItemPost[],
    resolvedByBuilderId: ReadonlyMap<string, THevyRoutine>,
    initialFolderId: number | null,
): Promise<void> {
    for (const item of items) {
        const routine = resolvedByBuilderId.get(item.routine.id) ?? item.routine;
        if (initialFolderId == null) {
            batch.failures.push({
                op: "post",
                title: routine.title,
                error: "Sync POST requires initialFolderId",
            });
            await skipHevyWrite(batch);
            continue;
        }
        const payload = convertHevyOutputIntoInput(routine, initialFolderId);
        const result = await performHevyWrite(batch, () =>
            batch.api.postRoutine(payload, batch.apiKey),
        );
        if (!result.ok) {
            batch.failures.push({
                op: "post",
                title: routine.title,
                error: errorMessage(result.error),
            });
            continue;
        }
        const createdId = batch.api.extractHevyCreatedRoutineId(result.value);
        if (!createdId) {
            // Hevy wrote the routine but we cannot put it on the link. Treat as
            // failure so we do not persist a planned list that's missing a day.
            batch.failures.push({
                op: "post",
                title: routine.title,
                error: "Hevy POST returned no routine id",
            });
            continue;
        }
        batch.postCount += 1;
        batch.postedByBuilderId.set(routine.id, createdId);
        batch.postedRoutineIds.push(createdId);
    }
}

/**
 * Remap Proxima custom template IDs onto the user's Hevy account, same as
 * Week Export. Runs before any PUT/POST. Empty does not need it.
 */
async function remapCustomExercises(
    api: TSyncHevyApi,
    user: User | null | undefined,
    apiKey: string,
    plan: TSyncPlan,
    onProgress?: THevyUploadProgressCallback,
): Promise<
    | { ok: true; byBuilderId: Map<string, THevyRoutine> }
    | { error: Error; ok: false }
> {
    const toResolve = [
        ...plan.put.map((item) => item.routine),
        ...plan.post.map((item) => item.routine),
    ];
    const resolved = await api.resolveCustomExerciseTemplatesForHevyUpload(
        user,
        apiKey,
        toResolve,
        onProgress,
    );
    if (resolved.success === false) {
        return { ok: false, error: resolved.error };
    }
    return {
        ok: true,
        byBuilderId: new Map(resolved.routines.map((routine) => [routine.id, routine])),
    };
}

/**
 * Linked sessions only. Never inserts a week row — that is Week Export.
 * Returns the IDs written, or undefined when there is no row to update.
 */
async function persistLiveLinkIds(input: {
    completedHevyRoutineIds: readonly string[];
    linkClient?: TSupabase;
    nthWeek: number;
    postedByBuilderId: ReadonlyMap<string, string>;
    programId: number;
    session: TSyncEditSession;
    workingRoutines: readonly THevyRoutine[];
}): Promise<string[] | undefined> {
    const arrivalIds = arrivalHevyIds(
        input.session.initialRoutineIds,
        input.session.initialHevyProgram,
    );
    const presentIds = workingHevyIds(input.workingRoutines);
    // Days we skipped emptying because they were already complete. Dropping
    // them from the link would break Day complete matching on the next sync.
    const skippedCompleteIds = input.completedHevyRoutineIds.filter(
        (id) => arrivalIds.has(id) && !presentIds.has(id),
    );

    const link = await getProgramHevyWeekLink(
        input.programId,
        input.nthWeek,
        input.linkClient,
    );
    if (!link) {
        return undefined;
    }

    const liveHevyRoutineIds = buildLiveHevyRoutineIds({
        workingRoutines: input.workingRoutines,
        initialRoutineIds: [...arrivalIds],
        previousLinkIds: link.hevy_routine_ids ?? [],
        postedByBuilderId: input.postedByBuilderId,
        skippedCompleteIds,
    });

    await updateProgramHevyWeekRoutineIds(
        input.programId,
        input.nthWeek,
        liveHevyRoutineIds,
        input.linkClient,
    );
    return liveHevyRoutineIds;
}

/**
 * Write the Sync plan to Hevy, then rewrite live `hevy_routine_ids` when
 * the session is linked and every Hevy op succeeded.
 *
 * Throws if `session` is null. Partial Hevy success still returns
 * `success: false` and does not touch the link.
 *
 * @param input - Working routines, Edit session, Hevy key, optional fakes
 */
export async function syncProgramToHevy(
    input: TSyncProgramToHevyInput,
): Promise<TSyncResult> {
    if (!input.session) {
        throw new Error("Sync requires an Edit session");
    }

    const session = input.session;
    const completedHevyRoutineIds = input.completedHevyRoutineIds ?? [];
    const plan = buildSyncPlan({
        workingRoutines: input.workingRoutines,
        initialRoutineIds: session.initialRoutineIds,
        initialHevyProgram: session.initialHevyProgram,
        completedHevyRoutineIds,
    });

    const api = resolveHevyApi(input.hevyApi);
    const remapped = await remapCustomExercises(
        api,
        input.user,
        input.apiKey,
        plan,
        input.onProgress,
    );
    if (!remapped.ok) {
        return {
            success: false,
            failures: [
                {
                    op: "put",
                    title: "custom exercises",
                    error: remapped.error.message,
                },
            ],
            emptyCount: 0,
            putCount: 0,
            postCount: 0,
            postedRoutineIds: [],
        };
    }

    const batch: THevyWriteBatch = {
        api,
        apiKey: input.apiKey,
        onProgress: input.onProgress,
        failures: [],
        emptyCount: 0,
        putCount: 0,
        postCount: 0,
        postedByBuilderId: new Map(),
        postedRoutineIds: [],
        total: plan.empty.length + plan.put.length + plan.post.length,
        finished: 0,
    };

    await emptyRemovedRoutines(batch, plan.empty);
    await putChangedRoutines(batch, plan.put, remapped.byBuilderId);
    await postNewRoutines(batch, plan.post, remapped.byBuilderId, session.initialFolderId);

    if (batch.failures.length > 0) {
        return syncResult(batch, { success: false });
    }

    if (!isLinkedSession(session)) {
        return syncResult(batch, { success: true });
    }

    const liveHevyRoutineIds = await persistLiveLinkIds({
        session,
        workingRoutines: input.workingRoutines,
        completedHevyRoutineIds,
        postedByBuilderId: batch.postedByBuilderId,
        programId: session.programId,
        nthWeek: session.nthWeek,
        linkClient: input.linkClient,
    });

    return syncResult(batch, { success: true, liveHevyRoutineIds });
}
