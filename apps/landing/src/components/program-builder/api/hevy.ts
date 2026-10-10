// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module hevy
 *
 * Primary integration layer between Proxima and the Hevy workout-tracking app.
 * Provides functions for every Hevy public-API endpoint the app consumes
 * (routines, routine folders, workouts, exercise templates, custom exercise creation, exercise history)
 * as well as Supabase persistence for programs, API-key management, and
 * workout-count tracking.
 *
 * The upload pipeline converts AI-generated THevyRoutine arrays into Hevy API
 * requests via hevy_export, batches them to respect rate limits, and reports
 * progress through an optional callback. Programs are simultaneously saved to
 * the Proxima Supabase schema (programs → schedule_workouts →
 * program_workout_exercises) so the app can display them independently of Hevy.
 *
 * Depends on: hevy_export (convertHevyOutputIntoInput), @/api/index (supabase),
 *             @/api/custom-movements (minting imported share customs),
 *             @/components/program-builder/utils (getMaxFolderId), uuid
 * Used by: program-builder UI components, Agent chat flow, API routes, hevy_sync
 */
import { v4 as uuidv4 } from "uuid";
import { validate as validateUuid } from "uuid";
import { getMaxFolderId } from "@/components/program-builder/utils";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/api/index";
import { mapHevyTemplateToCustomMovement, mintCustomMovement } from "@/api/custom-movements";
import type { TMesocycleBlock } from "@/api/mesocycle-blocks";
import {
    buildRepsRange2DForDb,
    convertHevyOutputIntoInput,
    mapSharedTemplateToPostExercise,
    mapSupabaseExerciseTemplateRowToPostExercise,
} from "./hevy_export";
import { HEVY_OMIT_REASON, RATE_LIMIT_EXHAUSTED_MESSAGE } from "@/assets/constants/ui-constants";

/** Max pages when listing Hevy exercise templates (100 templates per page). */
const HEVY_EXERCISE_TEMPLATES_MAX_PAGES = 40;

/** Chunk size for Supabase `.in("id", ...)` when loading templates for Hevy export. */
const EXPORT_TEMPLATE_IDS_CHUNK_SIZE = 150;

/**
 * Hevy error text, appended so a 400 is diagnosable in the Sync dialog.
 *
 * @param method - GET / POST / PUT
 * @param response - Failed fetch response
 */
async function throwHevyHttpError(method: string, response: Response): Promise<never> {
    const detail = (await response.text()).trim();
    throw new Error(
        detail
            ? `HTTP ${method} error! Status: ${response.status}: ${detail}`
            : `HTTP ${method} error! Status: ${response.status}`,
    );
}

/**
 * Generic authenticated GET request against the Hevy public API.
 *
 * Wraps `fetch` with the required `api-key` header and JSON parsing.
 * All Hevy read endpoints in this module delegate to this helper.
 *
 * @param url - Fully-qualified Hevy API URL to fetch
 * @param apiKey - User's Hevy API key for authentication
 * @returns The parsed JSON response body cast to `T`
 * @throws {Error} On any non-2xx HTTP status
 */
export const defaultFetch = async <T>(url: string, apiKey: string): Promise<T> => {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
        },
    });

    if (!response.ok) {
        await throwHevyHttpError("GET", response);
    }

    return (await response.json()) as T;
};

/** Thrown when Hevy returns HTTP 429 - callers back off instead of persisting the failure. */
export class HevyRateLimitError extends Error {
    constructor(message = "HTTP GET error! Status: 429") {
        super(message);
        this.name = "HevyRateLimitError";
    }
}

/** True when a Hevy fetch error is HTTP 429. */
export function isHevyRateLimitError(error: unknown): boolean {
    const message = error instanceof Error ? error.message : String(error);
    return message.includes("Status: 429");
}

/**
 * Fetches a single exercise template by ID from the Hevy API.
 *
 * Maps to `GET /v1/exercise_templates/{id}`. Used when the `hevy_exercise_templates` mirror
 * misses a template, to tell a stale mirror apart from a genuine custom exercise. 5xx gets a
 * short in-request retry; 429 fails fast so the caller can back off.
 *
 * @param apiKey - User's Hevy API key
 * @param templateId - Hevy `exercise_template_id`
 * @returns The template, or `null` when Hevy does not know the ID
 * @throws {HevyRateLimitError} On HTTP 429
 */
export const getHevyExerciseTemplate = async (
    apiKey: string,
    templateId: string,
): Promise<THevyExerciseTemplate | null> => {
    const url = `https://api.hevyapp.com/v1/exercise_templates/${encodeURIComponent(templateId)}`;

    for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
        try {
            const template = await defaultFetch<THevyExerciseTemplate | null>(url, apiKey);
            return template ?? null;
        } catch (error: unknown) {
            if (isHevyRateLimitError(error)) {
                throw new HevyRateLimitError(
                    error instanceof Error ? error.message : undefined,
                );
            }

            const message = error instanceof Error ? error.message : "";

            if (message.includes("Status: 404")) {
                return null;
            }

            if (!/Status: 5\d\d/.test(message) || retry >= RATE_LIMIT_MAX_RETRIES) {
                throw error;
            }

            await delay(Math.min(8_000, 1_000 * Math.pow(2, retry)));
        }
    }

    throw new Error("Hevy exercise template fetch failed after retries");
};

/**
 * Fetches all user-created custom exercise templates from the Hevy API.
 *
 * Paginates through up to 40 pages (100 templates/page) and filters for
 * `is_custom === true`. Used when the program builder needs to know which
 * exercises exist only in the user's Hevy account (vs. the global library).
 *
 * @param user - Authenticated Supabase user; returns `[]` if absent
 * @param apiKey - User's Hevy API key
 * @returns All custom exercise templates on the account
 */
export const getHevyCustomExercises = async (user: User | undefined | null, apiKey: string): Promise<THevyExerciseTemplate[]> => {
    if (!user) return [];

    const customExercises: THevyExerciseTemplate[] = [];

    for (let i = 1; i <= HEVY_EXERCISE_TEMPLATES_MAX_PAGES; i++) {
        const url = `https://api.hevyapp.com/v1/exercise_templates?page=${i}&pageSize=100`;

        try {
            const result = await defaultFetch<{ exercise_templates: THevyExerciseTemplate[] }>(url, apiKey);
            const exercises = result.exercise_templates;

            if ( !exercises || (exercises && exercises.length === 0) ) {
                break;
            }

            const isCustomExercise = exercises.filter((exercise) => exercise.is_custom);

            customExercises.push(...isCustomExercise);

            // If we get less than 100 exercises, we've reached the last page
            if (exercises.length < 100) {
                break;
            }

        } catch (error) {
            console.error("Error fetching Hevy custom exercises:", error);
            break;
        }

    }

    return customExercises;
};

/** UUID regex used to recognise a bare UUID returned by Hevy on exercise-template creation. */
const HEVY_UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Parses the `POST /v1/exercise_templates` response body.
 *
 * The live Hevy API returns a raw UUID string (Content-Type: text/html) on success,
 * rather than the `{ id }` JSON object documented in the OpenAPI spec. This helper
 * handles both shapes so callers never see a JSON parse error on a successful request.
 */
export function parsePostCustomExerciseBody(text: string): THevyPostCustomExerciseResponse {
    const trimmed = text.trim();
    if (!trimmed) {
        throw new Error("Hevy API returned an empty body when creating a custom exercise");
    }
    try {
        const parsed: unknown = JSON.parse(trimmed);
        if (parsed !== null && typeof parsed === "object" && "id" in (parsed as object)) {
            const id = (parsed as { id: unknown }).id;
            if (typeof id === "number" || typeof id === "string") {
                return { id };
            }
        }
        if (typeof parsed === "string" && HEVY_UUID_PATTERN.test(parsed)) {
            return { id: parsed };
        }
    } catch {
        if (HEVY_UUID_PATTERN.test(trimmed)) {
            return { id: trimmed };
        }
    }
    throw new Error(
        `Unexpected Hevy create-exercise response (first 120 chars): ${trimmed.slice(0, 120)}`,
    );
}

/**
 * Creates a custom exercise template in the user's Hevy account.
 *
 * Maps to `POST /v1/exercise_templates`.
 *
 * Uses a dedicated fetch path instead of `defaultPost` because Hevy returns the new
 * exercise ID as a raw UUID string body (Content-Type: text/html), not JSON, which
 * breaks `response.json()`. The response is parsed with `parsePostCustomExerciseBody`.
 *
 * @see https://api.hevyapp.com/docs/#/ExerciseTemplates/post_v1_exercise_templates
 * @param exercise - Custom exercise fields (title, type, equipment, muscles)
 * @param apiKey - User's Hevy API key
 * @returns `{ id }` for the new template
 */
export const postHevyCustomExercise = async (
    exercise: THevyPostExerciseTemplate,
    apiKey: string,
): Promise<THevyPostCustomExerciseResponse> => {
    const payload: THevyPostExerciseTemplateRequest = { exercise };

    const response = await fetch("https://api.hevyapp.com/v1/exercise_templates", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            "api-key": apiKey,
        },
        body: JSON.stringify(payload),
    });

    const text = await response.text();

    if (!response.ok) {
        let detail = "";
        try {
            const err = JSON.parse(text) as { error?: string };
            if (typeof err?.error === "string") {
                detail = `: ${err.error}`;
            }
        } catch {
            if (text.trim()) {
                detail = `: ${text.trim().slice(0, 200)}`;
            }
        }
        throw new Error(`HTTP POST error! Status: ${response.status}${detail}`);
    }

    return parsePostCustomExerciseBody(text);
};

/**
 * Loads all Hevy routines and groups them into "programs" by routine-folder.
 *
 * A "program" in Proxima maps to a Hevy routine folder: each folder groups the
 * routines that belong to one training program. This function fetches every
 * routine on the account, groups them by `folder_id`, then enriches each group
 * with its folder title from the Hevy API.
 *
 * @param user - Authenticated Supabase user; returns `[]` if absent
 * @param apiKey - User's Hevy API key; returns `[]` if empty
 * @returns Array of `{ program_title, program: THevyRoutine[] }` sorted by folder ID,
 *          or `[]` on any error
 */
export const getHevyPrograms = async (user: User | undefined | null, apiKey: string) => {
    try {
        if (!user) {
            return [];
        }

        if (!apiKey) {
            return [];
        }

        const routines = await getHevyRoutines(user, apiKey);

        if (!routines || routines.length === 0) {
            return [];
        }

        // Group routines by folder_id
        const programsByFolder: { [folderId: number]: THevyRoutine[] } = {};

        routines.forEach((routine) => {
            const folderId = routine.folder_id;
            // Skip routines with invalid folder_id
            if (folderId === undefined || folderId === null || isNaN(folderId)) {
                console.warn("Skipping routine with invalid folder_id:", routine);
                return;
            }
            if (!programsByFolder[folderId]) {
                programsByFolder[folderId] = [];
            }
            programsByFolder[folderId].push(routine);
        });

        // Convert to array of programs, sorted by folder_id
        const programs = Object.keys(programsByFolder)
            .map(Number)
            .sort((a, b) => a - b)
            .map((folderId) => programsByFolder[folderId])
            .filter((program) => program && program.length > 0); // Filter out undefined or empty programs


        // Add program titles by fetching routine folder information
        const programsWithTitles: { program_title: string, program: THevyRoutine[] }[] = [];
        for (const program of programs) {
            // Additional safety check
            if (!program || !Array.isArray(program) || program.length === 0) {
                console.warn("Skipping invalid program:", program);
                continue;
            }

            const folderId = program[0].folder_id;
            if (folderId == null) {
                console.warn("Skipping program without folder_id:", program);
                continue;
            }

            try {
                const routineFolder = await getHevyRoutineFolder(apiKey, folderId);

                programsWithTitles.push({
                    program_title: routineFolder?.title || `Program ${folderId}`,
                    program: program
                });
            } catch (error) {
                console.error(`Error fetching folder for program ${folderId}:`, error);
                // Still add the program with a fallback title
                programsWithTitles.push({
                    program_title: `Program ${folderId}`,
                    program: program
                });
            }
        }

        return programsWithTitles;
    } catch (error) {
        console.error("Error in getHevyPrograms:", error);
        return [];
    }
};

/**
 * Fetches a single routine folder by ID from the Hevy API.
 *
 * @param apiKey - User's Hevy API key
 * @param folderId - Numeric ID of the routine folder to retrieve
 * @returns The routine folder object, or `null` if the request fails
 */
export const getHevyRoutineFolder = async (apiKey: string, folderId: number) => {
    try {
        const url = `https://api.hevyapp.com/v1/routine_folders/${folderId}`;
        const response = await defaultFetch<THevyRoutineFolder>(url, apiKey);
        return response;
    } catch (error) {
        console.error(`Error fetching routine folder ${folderId}:`, error);
        return null;
    }
};

/**
 * Retrieves a single page of routine folders from the Hevy API.
 *
 * Maps to `GET /v1/routine_folders`. Each page returns up to 10 folders.
 * Used during program upload to locate the newly-created folder by title.
 *
 * @see https://api.hevyapp.com/docs/#/RoutineFolders/get_v1_routine_folders
 * @param apiKey - User's Hevy API key
 * @param page - 1-based page number
 * @returns A paginated response containing routine folders, or `undefined` on error
 * @throws Re-throws the fetch error after logging
 */
export const getRoutineFolders = async (apiKey: string, page: number) => {
    try {
        const response = await defaultFetch<THevyRoutineFolderResponse>(`https://api.hevyapp.com/v1/routine_folders?page=${page}&pageSize=10`, apiKey);
        if (response) {
            return response;
        }
    } catch (error: unknown) {
        console.error("Error fetching routine folders", error);
        throw error;
    }
};

/**
 * Fetches all routines from the user's Hevy account, paginating through up to 10 pages.
 *
 * Each page returns up to 10 routines. Used as the data source for
 * {@link getHevyPrograms} which groups these routines by folder.
 *
 * @param user - Authenticated Supabase user; returns `[]` if absent
 * @param apiKey - User's Hevy API key
 * @returns Flat array of every routine on the account
 */
export const getHevyRoutines = async (user: User | undefined | null, apiKey: string) => {

    if  (!user) return [];

    const syncedRoutines: THevyRoutine[] = [];

    for (let i = 1; i <= 10; i++) {
        const url = `https://api.hevyapp.com/v1/routines?page=${i}&pageSize=10`;

        try {
            const result = await defaultFetch<{ routines: THevyRoutine[] }>(url, apiKey);
            const routines = result.routines;

            if ( !routines || (routines && routines.length === 0) ) {
                break;
            }

            syncedRoutines.push(...routines);

            // If we get less than 10 routines, we've reached the last page
            if (routines.length < 10) {
                break;
            }

        } catch (error) {
            console.error("Error fetching Hevy routines:", error);
                break;
            }
        }

    return syncedRoutines;
};

/** One exercise omitted from the saved program (e.g. not found in library). Caller should show a warning toast. */
export type TSkippedExercise = { exerciseName: string; reason: string };

/** Success shape returned by {@link saveProgramToSupabase} when the program is saved. */
export type TSaveProgramToSupabaseSuccess = {
    status: "success";
    id: number;
    /** Exercises that were omitted; UI should show a warning toast per item. */
    skippedExercises?: TSkippedExercise[];
};

/** Type guard for {@link SaveProgramToSupabaseSuccess}. */
export function isSaveProgramToSupabaseSuccess(r: unknown): r is TSaveProgramToSupabaseSuccess {
    return (
        typeof r === "object" &&
        r !== null &&
        "status" in r &&
        (r as { status: string }).status === "success" &&
        "id" in r &&
        typeof (r as { id: unknown }).id === "number"
    );
}

/** Failure shape returned by {@link saveProgramToSupabase} when the save does not complete. */
export type TSaveProgramToSupabaseError = {
    status: "error";
    message: string;
    code?: string;
    details?: string;
    hint?: string;
};

/** Type guard for {@link SaveProgramToSupabaseError}. */
export function isSaveProgramToSupabaseError(r: unknown): r is TSaveProgramToSupabaseError {
    return (
        typeof r === "object" &&
        r !== null &&
        "status" in r &&
        (r as { status: string }).status === "error" &&
        "message" in r &&
        typeof (r as { message: unknown }).message === "string"
    );
}

function postgrestToSaveError(err: {
    message: string;
    code?: string;
    details?: string;
    hint?: string;
}): TSaveProgramToSupabaseError {
    return {
        status: "error",
        message: err.message,
        ...(err.code ? { code: err.code } : {}),
        ...(err.details ? { details: err.details } : {}),
        ...(err.hint ? { hint: err.hint } : {}),
    };
}

function unknownToSaveError(err: unknown): TSaveProgramToSupabaseError {
    if (err && typeof err === "object" && "message" in err && typeof (err as { message: unknown }).message === "string") {
        return postgrestToSaveError(err as { message: string; code?: string; details?: string; hint?: string });
    }
    return {
        status: "error",
        message: err instanceof Error ? err.message : String(err),
    };
}

/** Human-readable detail for toasts and analytics when a save fails. */
export function getSaveProgramToSupabaseFailureDetail(r: unknown): string {
    if (isSaveProgramToSupabaseError(r)) {
        return r.message || r.code || "Unknown error";
    }
    if (r && typeof r === "object" && "message" in r && typeof (r as { message: unknown }).message === "string") {
        const msg = (r as { message: string }).message;
        const code =
            "code" in r && typeof (r as { code: unknown }).code === "string"
                ? (r as { code: string }).code
                : undefined;
        return [code, msg].filter(Boolean).join(": ") || "Unknown error";
    }
    return "Unknown error";
}

const SAVE_TO_SUPABASE_RETRY_DELAY_MS = 2000;
const HEVY_EXERCISE_TEMPLATES_SAVE_QUERY_LIMIT = 10000;

function delayMs(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Persists an AI-generated program to the Proxima Supabase database.
 *
 * Inserts rows into three tables in sequence:
 *   1. `programs` - top-level program metadata (title, equipment, etc.)
 *   2. `schedule_workouts` - one row per workout day per week
 *   3. `program_workout_exercises` - individual exercises linked to schedule rows
 *
 * Exercise template IDs are validated against the `hevy_exercise_templates` table.
 * If an exercise ID is missing or invalid, the function falls back to a
 * title-based lookup; exercises that still can't be resolved are omitted and
 * reported in `skippedExercises` so the UI can display a warning toast.
 *
 * All inserts are batched (50 rows at a time) to stay within Supabase limits.
 *
 * @param hevyRoutines - The AI-generated routines to save (one per workout day)
 * @param prompt - The original user prompt that generated this program
 * @param request - Optional request metadata (title, equipment, difficulty, etc.)
 * @param userId - When set, stored on the program row so saves succeed even if the session JWT is stale
 * @param mesocycleBlocks - First-build Mesocycle blocks for `programs.mesocycle_blocks` (ADR 0032 / 04); omitted → null
 * @returns `{ status: "success", id, skippedExercises? }` on success, or `{ status: "error", ... }`
 */
async function runSaveProgramToSupabase(
    hevyRoutines: THevyRoutine[],
    prompt: string,
    request: TTextToJsonRequest | undefined,
    userId: string | undefined,
    mesocycleBlocks: TMesocycleBlock[] | null | undefined,
): Promise<TSaveProgramToSupabaseSuccess | TSaveProgramToSupabaseError> {
    const weeks = getMaxFolderId(hevyRoutines) + 1;
    const BATCH_SIZE = 50; // Process exercises in batches of 50

    try {
        // Ensure title defaults to "My Proxima Program" if missing, null, undefined, or empty string
        const programTitle = request?.programTitle?.trim();
        const title = programTitle && programTitle.length > 0 ? programTitle : "My Proxima Program";

        const programUploadObject: Record<string, unknown> = {
            title,
            details: request?.search ?? "",
            program_length: weeks,
            workout_duration: request?.workoutDuration ? Number(request.workoutDuration) : null,
            equipment: request?.equipment ?? null,
            specialization: request?.specialization ? request.specialization.split(',').map(s => s.trim()) : null,
            difficulty: request?.difficultyLevel ? request.difficultyLevel.split(',').map(s => s.trim()) : null,
            explore: request?.explore === "true" ? true : false,
            prompt,
            mesocycle_blocks: mesocycleBlocks ?? null,
        };
        if (userId) {
            programUploadObject.user_id = userId;
        }

        // STEP 1: Insert into programs table (id generated by DB) and get the new id
        const { data: programRow, error: programsError } = await supabase
            .from('programs')
            .insert([programUploadObject])
            .select('id')
            .single();
        if (programsError) {
            console.error('Error inserting into programs:', programsError);
            return postgrestToSaveError(programsError);
        }
        const newProgramId = programRow?.id as number;

        // STEP 2: Prepare and insert schedule uploads in batches
        const scheduleUploads = hevyRoutines.map((routine) => ({
            id: uuidv4(),
            nthWeek: (routine.folder_id ?? 0) + 1,
            nthDay: Number(routine?.order || '1'),
            day_title: routine.title,
            day_notes: routine?.notes ?? "",
            program_id: newProgramId,
        }));

        // Insert schedules in batches
        for (let i = 0; i < scheduleUploads.length; i += BATCH_SIZE) {
            const batch = scheduleUploads.slice(i, i + BATCH_SIZE);
            const { error: scheduleError } = await supabase.from('schedule_workouts').insert(batch);
            if (scheduleError) {
                console.error('Error inserting schedule workouts batch:', scheduleError);
                return postgrestToSaveError(scheduleError);
            }
        }

        // STEP 3: Load exercise template lookup (valid IDs + title/normalized_title -> id for fallback)
        const { data: exerciseTemplates, error: templatesError } = await supabase
            .from('hevy_exercise_templates')
            .select('id, title, normalized_title')
            .limit(HEVY_EXERCISE_TEMPLATES_SAVE_QUERY_LIMIT);
        if (templatesError) {
            console.error('Error fetching hevy_exercise_templates:', templatesError);
            return postgrestToSaveError(templatesError);
        }
        const templates = exerciseTemplates ?? [];
        const validExerciseIds = new Set(templates.map((t) => t.id));
        const titleToId = new Map<string, string>();
        for (const t of templates) {
            const keyTitle = (t.title ?? '').trim().toLowerCase();
            const keyNorm = (t.normalized_title ?? '').trim().toLowerCase();
            if (keyTitle && !titleToId.has(keyTitle)) titleToId.set(keyTitle, t.id);
            if (keyNorm && !titleToId.has(keyNorm)) titleToId.set(keyNorm, t.id);
        }

        const skippedExercises: TSkippedExercise[] = [];

        // STEP 4: Process exercises and build insert rows (resolve exercise_id by ID then by title; sanitize UUIDs)
        const allWorkoutUploads: { [key: string]: unknown }[] = [];

        for (let i = 0; i < hevyRoutines.length; i += BATCH_SIZE) {
            const routineBatch = hevyRoutines.slice(i, i + BATCH_SIZE);

            for (const routine of routineBatch) {
                const schedule = scheduleUploads[i + routineBatch.indexOf(routine)];
                if (!schedule) continue;

                const scheduleId = schedule.id;
                const scheduleIdValid =
                    typeof scheduleId === "string" &&
                    scheduleId !== "null" &&
                    validateUuid(scheduleId);
                if (!scheduleIdValid) {
                    console.warn('Invalid schedule_id skipped (invalid UUID or "null" string):', scheduleId);
                    continue;
                }

                for (const exercise of routine.exercises ?? []) {
                    const rawId = exercise.exercise_template_id;
                    const title = (exercise.title ?? '').trim();
                    const isEmptyOrNullId =
                        rawId == null ||
                        (typeof rawId === "string" && (rawId === "" || rawId === "null"));

                    let exerciseId: string | null = null;
                    if (!isEmptyOrNullId && typeof rawId === "string" && validExerciseIds.has(rawId)) {
                        exerciseId = rawId;
                    } else if (title) {
                        const lookupKey = title.toLowerCase();
                        exerciseId = titleToId.get(lookupKey) ?? null;
                    }

                    if (!exerciseId) {
                        skippedExercises.push({
                            exerciseName: title || rawId || "Unknown exercise",
                            reason: HEVY_OMIT_REASON,
                        });
                        if (title || rawId) {
                            console.warn('Exercise omitted from saved program:', { title, rawId });
                        }
                        continue;
                    }

                    const reps = exercise.sets?.map((set) => set.reps) ?? null;
                    // Rectangular number[][] only — null holes in multi-dim float4[] fail insert.
                    const reps_range = buildRepsRange2DForDb(exercise.sets);
                    const timeTaken = exercise.sets?.map((set) => set.duration_seconds) ?? null;
                    const weights = exercise.sets?.map((set) => set.weight_kg) ?? null;
                    const rpe = exercise.sets?.map((set) => set.rpe) ?? null;

                    allWorkoutUploads.push({
                        schedule_id: scheduleId,
                        exercise_id: exerciseId,
                        reps: reps,
                        reps_range,
                        reps_max: null,
                        amrap: null,
                        time_taken: timeTaken?.[0] === null ? null : timeTaken,
                        time_range: null,
                        weights: weights?.[0] === null ? null : weights,
                        rpe: rpe?.[0] === null ? null : rpe,
                        rpe_range: null,
                        percent_rm: null,
                    });
                }
            }
        }

        // STEP 5: Insert workouts in batches
        for (let i = 0; i < allWorkoutUploads.length; i += BATCH_SIZE) {
            const batch = allWorkoutUploads.slice(i, i + BATCH_SIZE);
            if (batch.length > 0) {
                const { error: workoutError } = await supabase.from('program_workout_exercises').insert(batch);
                if (workoutError) {
                    console.error('Error inserting program workout exercises batch:', {
                        code: workoutError.code,
                        message: workoutError.message,
                        details: workoutError.details,
                        fullError: workoutError,
                    });
                    return postgrestToSaveError(workoutError);
                }
            }
        }

        return {
            status: "success",
            id: newProgramId,
            ...(skippedExercises.length > 0 ? { skippedExercises } : {}),
        };
    } catch (error) {
        console.error('Unexpected error:', error);
        return unknownToSaveError(error);
    }
}

/**
 * Persists an AI-generated program to Supabase with session refresh and one automatic retry on failure.
 *
 * @param mesocycleBlocks - First-build Mesocycle blocks from the landed `buildProgram` (ADR 0032 / 04)
 */
export const saveProgramToSupabase = async (
    hevyRoutines: THevyRoutine[],
    prompt: string,
    request?: TTextToJsonRequest,
    userId?: string,
    mesocycleBlocks?: TMesocycleBlock[] | null,
): Promise<TSaveProgramToSupabaseSuccess | TSaveProgramToSupabaseError> => {
    await supabase.auth.getSession();
    let result = await runSaveProgramToSupabase(hevyRoutines, prompt, request, userId, mesocycleBlocks);
    if (result.status !== "success") {
        await delayMs(SAVE_TO_SUPABASE_RETRY_DELAY_MS);
        result = await runSaveProgramToSupabase(hevyRoutines, prompt, request, userId, mesocycleBlocks);
    }
    return result;
};


/**
 * Stores the user's Hevy API key in the Supabase vault (encrypted secrets).
 *
 * Called during initial Hevy account linking. The key is stored via the
 * `insert_secret` RPC so it is never exposed in plain-text database columns.
 *
 * @param user - Authenticated Supabase user whose vault entry will be created
 * @param secret - The Hevy API key to store
 * @returns `{ success: true, data }` on success, or `{ success: false, data: error }`
 */
export const postHevyApikey = async (user: User, secret: string) => {

    try {
        if (user) {
            const { data: apiKeySaved, error: apiKeyError } = await supabase.rpc('insert_secret', {
                secret,
            });

            if (apiKeyError) {
                console.error("Error saving Hevy API Key", apiKeyError);
                return { success: false, data: apiKeyError };
            } else {
                return { success: true, data: apiKeySaved};
            }
        }
    } catch (error: unknown) {
        console.error("Unknown error saving Hevy API Key", error);
        return { success: false, data: error };
    }
};

/**
 * Removes the user's Hevy API key from the Supabase vault.
 *
 * Called when unlinking a Hevy account or as the first step of a key rotation
 * (see {@link updateHevyApiKey}).
 *
 * @param user - Authenticated Supabase user whose secret will be deleted
 * @returns `true` if deletion succeeded, `false` otherwise
 */
export const deleteHevyApiKey = async (user: User) => {

    try {
        if (user) {
            const secretName = `hevy_api_key_${user.id}`;
            const { error: deletionError } = await supabase.rpc('delete_secret', {
                secret_name: secretName,
            });

            if (deletionError) {
                console.error("Error deleting Hevy API Key", deletionError);
                return false;
            } else {
                return true;
            }
        }
    } catch (error: unknown) {
        console.error("Error deleting Hevy API Key", error);
    }

};


/**
 * Rotates the user's Hevy API key by deleting the old one and inserting the new one.
 *
 * Supabase vault doesn't support in-place updates, so this performs a
 * delete-then-insert. If either step fails the function returns `false`.
 *
 * @param user - Authenticated Supabase user
 * @param secret - The replacement Hevy API key
 * @returns `true` if both delete and re-insert succeeded
 */
export const updateHevyApiKey = async (user: User, secret: string): Promise<boolean> => {

    if (await deleteHevyApiKey(user)) {
        const apiKeySaved = await postHevyApikey(user, secret);
        if (apiKeySaved && apiKeySaved.success) {
            return true;
        }
    }

    return false;
};

/** Max routines to send in short succession before pausing (Hevy API limit). */
export const ROUTINES_BATCH_SIZE = 40;

/** Pause duration between batches or after 429 (ms). */
export const RATE_LIMIT_BACKOFF_MS = 60_000;

/** Max retries on 429 before returning error (4 attempts total). */
export const RATE_LIMIT_MAX_RETRIES = 3;

/** Callback for upload progress: uploaded count, total count, status, and optional countdown seconds when rate limited. */
export type THevyUploadProgressCallback = (
    uploaded: number,
    total: number,
    status: 'uploading' | 'rate_limited',
    rateLimitSecondsLeft?: number,
) => void;

/**
 * Promise-based sleep utility used between batched API calls.
 *
 * @param ms - Milliseconds to wait before resolving
 * @returns A promise that resolves after the specified delay
 */
export const delay = (ms: number): Promise<void> => {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
};

/** Runs waitSeconds delay while calling onProgress every second with countdown (waitSeconds down to 0). */
export async function delayWithRateLimitCountdown(
    uploaded: number,
    total: number,
    onProgress?: THevyUploadProgressCallback,
    waitSeconds: number = RATE_LIMIT_BACKOFF_MS / 1000,
): Promise<void> {
    for (let s = waitSeconds; s >= 0; s--) {
        onProgress?.(uploaded, total, 'rate_limited', s);
        if (s > 0) await delay(1000);
    }
}

type TExerciseTemplateDbRow = {
    id: string;
    title: string | null;
    type: string | null;
    equipment: string | null;
    primary_muscle_group: string | null;
    secondary_muscle_groups: string[] | null;
    is_custom: boolean | null;
};

/**
 * Collects distinct non-empty exercise template IDs from routines (export / upload).
 */
function collectExerciseTemplateIdsFromRoutines(routines: THevyRoutine[]): string[] {
    const set = new Set<string>();
    for (const r of routines) {
        for (const ex of r.exercises ?? []) {
            const id = ex.exercise_template_id?.trim();
            if (id) set.add(id);
        }
    }
    return Array.from(set);
}

/** One share-carried template that has no identity on the signed-in user's account yet. */
type TForeignCustomExercise = {
    /** The sharer's `exercise_template_id`, as it sits in builder state. */
    templateId: string;
    /** Title to mint under - the share's own, falling back to the builder row's. */
    title: string;
    /** Metadata `mapSharedTemplateToPostExercise` narrows into a Hevy create body. */
    shared: THevySharedTemplate;
};

/**
 * Collects share-carried templates that Proxima's mirror does not know.
 *
 * A **Hevy share import** keeps the sharer's `exercise_template_id`, so a **Hevy-native custom**
 * of theirs arrives as an ID that resolves on their account and nowhere else. Those are the only
 * IDs minted: an unmirrored ID with no `shared_template` is a template the user picked from their
 * own Hevy account in the add-exercise dialog, and it is already valid where it is going.
 *
 * @param mirroredIds - Template IDs found in `hevy_exercise_templates`
 * @returns One entry per distinct foreign template, first occurrence winning
 */
function collectForeignCustomExercises(
    routines: THevyRoutine[],
    mirroredIds: Set<string>,
): TForeignCustomExercise[] {
    const foreign = new Map<string, TForeignCustomExercise>();

    for (const routine of routines) {
        for (const ex of routine.exercises ?? []) {
            const templateId = ex.exercise_template_id?.trim();
            const shared = ex.shared_template;
            if (!templateId || !shared) continue;
            if (mirroredIds.has(templateId) || foreign.has(templateId)) continue;

            const title = (shared.title || ex.title || "").trim();
            // Nothing to mint a movement from; leave the ID alone rather than invent a name.
            if (!title) continue;

            foreign.set(templateId, { templateId, title, shared });
        }
    }

    return Array.from(foreign.values());
}

/**
 * Mints the **Custom movement** behind a foreign template and links it to the Hevy template the
 * user will actually log against.
 *
 * Proxima-side bookkeeping only: the upload succeeds or fails on Hevy's response, so a Supabase
 * failure here is logged and swallowed rather than allowed to sink a Week Export.
 *
 * @param userHevyTemplateId - The matched or freshly created template ID on the user's account
 */
async function recordCustomMovementForForeignTemplate(
    userId: string,
    foreign: TForeignCustomExercise,
    userHevyTemplateId: string,
): Promise<void> {
    try {
        const canonicalExerciseId = await mintCustomMovement(userId, {
            title: foreign.title,
            exercise_type: foreign.shared.exercise_type,
            equipment: foreign.shared.equipment_category,
            primary_muscle_group: foreign.shared.muscle_group,
            secondary_muscle_groups: foreign.shared.other_muscles.length > 0
                ? foreign.shared.other_muscles
                : null,
        });

        await mapHevyTemplateToCustomMovement(userHevyTemplateId, canonicalExerciseId);
    } catch (error: unknown) {
        console.warn("Could not record Custom movement for imported Hevy share exercise", {
            title: foreign.title,
            message: error instanceof Error ? error.message : String(error),
        });
    }
}

/**
 * Replaces `exercise_template_id` where a Proxima UUID maps to a Hevy account ID.
 */
function remapRoutineExerciseTemplateIds(routines: THevyRoutine[], idMap: Map<string, string>): THevyRoutine[] {
    return routines.map((routine) => ({
        ...routine,
        exercises: routine.exercises.map((ex) => {
            const next = idMap.get(ex.exercise_template_id);
            if (next === undefined) return ex;
            return { ...ex, exercise_template_id: next };
        }),
    }));
}

async function fetchExerciseTemplateRowsFromSupabase(
    templateIds: string[],
): Promise<{ success: true; rows: TExerciseTemplateDbRow[] } | { success: false; error: Error }> {
    const unique = Array.from(new Set(templateIds));
    const merged: TExerciseTemplateDbRow[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < unique.length; i += EXPORT_TEMPLATE_IDS_CHUNK_SIZE) {
        const chunk = unique.slice(i, i + EXPORT_TEMPLATE_IDS_CHUNK_SIZE);
        const { data, error } = await supabase
            .from("hevy_exercise_templates")
            .select("id, title, type, equipment, primary_muscle_group, secondary_muscle_groups, is_custom")
            .in("id", chunk);
        if (error) {
            return { success: false, error: new Error(error.message) };
        }
        for (const row of data ?? []) {
            const r = row as TExerciseTemplateDbRow;
            if (r.id && !seen.has(r.id)) {
                seen.add(r.id);
                merged.push(r);
            }
        }
    }
    return { success: true, rows: merged };
}

/**
 * Lists all custom exercise templates on the user's Hevy account for program export.
 * Throws if any page cannot be fetched after retries (no partial results).
 */
export async function getHevyCustomExercisesForUpload(
    user: User | null | undefined,
    apiKey: string,
): Promise<THevyExerciseTemplate[]> {
    if (!user) {
        throw new Error("User is required to load Hevy custom exercises for export.");
    }

    const customExercises: THevyExerciseTemplate[] = [];

    for (let page = 1; page <= HEVY_EXERCISE_TEMPLATES_MAX_PAGES; page++) {
        const url = `https://api.hevyapp.com/v1/exercise_templates?page=${page}&pageSize=100`;
        let result: { exercise_templates: THevyExerciseTemplate[] } | undefined;

        for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
            try {
                result = await defaultFetch<{ exercise_templates: THevyExerciseTemplate[] }>(url, apiKey);
                break;
            } catch (error: unknown) {
                const msg = error instanceof Error ? error.message : String(error);
                const statusMatch = msg.match(/Status: (\d+)/);
                const status = statusMatch ? parseInt(statusMatch[1], 10) : 0;
                const is429 = status === 429;
                const is5xx = status >= 500 && status < 600;
                const maybeNetwork =
                    msg.includes("Failed to fetch") ||
                    msg.includes("NetworkError") ||
                    msg.toLowerCase().includes("network request failed");
                const canRetry = is429 || is5xx || maybeNetwork || status === 0;
                if (!canRetry || retry >= RATE_LIMIT_MAX_RETRIES) {
                    throw error instanceof Error ? error : new Error(String(error));
                }
                const waitSec = is429 ? 60 * Math.pow(2, retry) : Math.min(8, Math.pow(2, retry));
                console.warn(`getHevyCustomExercisesForUpload page ${page} retry ${retry}`, error);
                await delay(waitSec * 1000);
            }
        }

        if (!result) {
            throw new Error("getHevyCustomExercisesForUpload: unexpected empty response");
        }

        const exercises = result.exercise_templates;
        if (!exercises || exercises.length === 0) {
            break;
        }
        customExercises.push(...exercises.filter((e) => e.is_custom));
        if (exercises.length < 100) {
            break;
        }
    }

    return customExercises;
}

function isRetryablePostHevyCustomError(error: unknown): boolean {
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("Status: 429")) return true;
    const m = msg.match(/Status: (\d+)/);
    if (m) {
        const s = parseInt(m[1], 10);
        if (s >= 500 && s < 600) return true;
    }
    if (
        msg.includes("Failed to fetch") ||
        msg.includes("NetworkError") ||
        msg.toLowerCase().includes("network request failed")
    ) {
        return true;
    }
    return false;
}

async function postHevyCustomExerciseWithRateLimitRetry(
    exercise: THevyPostExerciseTemplate,
    apiKey: string,
    onProgress: THevyUploadProgressCallback | undefined,
    uploaded: number,
    total: number,
): Promise<THevyPostCustomExerciseResponse> {
    for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
        try {
            return await postHevyCustomExercise(exercise, apiKey);
        } catch (error: unknown) {
            if (!isRetryablePostHevyCustomError(error) || retry >= RATE_LIMIT_MAX_RETRIES) {
                throw error;
            }
            const msg = error instanceof Error ? error.message : String(error);
            const is429 = msg.includes("Status: 429");
            console.warn("Retrying postHevyCustomExercise...", error);
            if (is429) {
                await delayWithRateLimitCountdown(uploaded, total, onProgress, 60 * Math.pow(2, retry));
            } else {
                await delay(Math.min(8000, 1000 * Math.pow(2, retry)));
            }
        }
    }
    throw new Error("postHevyCustomExerciseWithRateLimitRetry: exhausted retries");
}

export type TResolveCustomExerciseTemplatesResult =
    | { success: true; routines: THevyRoutine[]; createdNewHevyCustomTemplates: number }
    | { success: false; error: Error };

/**
 * Finds the one Hevy custom with this exact (trimmed) title.
 *
 * Two customs under one title leave nothing to pick between, and picking wrong silently rewrites
 * the user's program - so that is an error the export stops on, not a guess.
 */
function findHevyCustomByTitle(
    hevyCustoms: THevyExerciseTemplate[],
    title: string,
): { success: true; match: THevyExerciseTemplate | undefined } | { success: false; error: Error } {
    const sameTitle = hevyCustoms.filter((h) => (h.title ?? "").trim() === title);
    if (sameTitle.length > 1) {
        return {
            success: false,
            error: new Error(
                `Multiple Hevy exercises named "${title}". Rename one in Hevy and try again.`,
            ),
        };
    }
    return { success: true, match: sameTitle[0] };
}

/**
 * Resolves exercise templates that need a Hevy-account ID before upload.
 *
 * - Template IDs **present** in Supabase with `is_custom: true` are matched to the user's Hevy
 *   customs by exact title (trimmed) or created via `POST /v1/exercise_templates`, then remapped.
 * - Template IDs **not** in the Supabase mirror that carry `shared_template` came from a
 *   **Hevy share import** and belong to the sharer's account: each is minted as a **Custom
 *   movement** for the signed-in user, then matched or created on their Hevy account and remapped.
 *   Without this a Week Export dies on the sharer's IDs, which the importer cannot post against.
 * - Any other template ID **not** in the mirror (e.g. exercises picked from the user's own Hevy
 *   account in the add-exercise dialog) is treated as already valid and left unchanged.
 */
export async function resolveCustomExerciseTemplatesForHevyUpload(
    user: User | null | undefined,
    apiKey: string,
    routines: THevyRoutine[],
    onProgress?: THevyUploadProgressCallback,
): Promise<TResolveCustomExerciseTemplatesResult> {
    if (!user) {
        return { success: true, routines, createdNewHevyCustomTemplates: 0 };
    }

    const templateIds = collectExerciseTemplateIdsFromRoutines(routines);
    if (templateIds.length === 0) {
        return { success: true, routines, createdNewHevyCustomTemplates: 0 };
    }

    const fetched = await fetchExerciseTemplateRowsFromSupabase(templateIds);
    if (fetched.success === false) {
        return { success: false, error: fetched.error };
    }

    const customRows = fetched.rows.filter((r) => r.is_custom === true);
    const mirroredIds = new Set(fetched.rows.map((r) => r.id));
    const foreignCustoms = collectForeignCustomExercises(routines, mirroredIds);
    if (customRows.length === 0 && foreignCustoms.length === 0) {
        return { success: true, routines, createdNewHevyCustomTemplates: 0 };
    }

    let hevyCustoms: THevyExerciseTemplate[];
    try {
        hevyCustoms = await getHevyCustomExercisesForUpload(user, apiKey);
    } catch (e: unknown) {
        return {
            success: false,
            error: e instanceof Error ? e : new Error(String(e)),
        };
    }

    const idMap = new Map<string, string>();
    let createdNewHevyCustomTemplates = 0;
    const createdHevyTemplateIds: string[] = [];
    const totalForProgress = routines.length;

    for (const row of customRows) {
        const proximaId = row.id;
        const titleTrim = (row.title ?? "").trim();
        const found = findHevyCustomByTitle(hevyCustoms, titleTrim);
        if (found.success === false) {
            return { success: false, error: found.error };
        }
        const match = found.match;
        if (match) {
            idMap.set(proximaId, String(match.id));
            continue;
        }

        let postBody: THevyPostExerciseTemplate;
        try {
            postBody = mapSupabaseExerciseTemplateRowToPostExercise(row);
        } catch (e: unknown) {
            return {
                success: false,
                error: e instanceof Error ? e : new Error(String(e)),
            };
        }

        try {
            const result = await postHevyCustomExerciseWithRateLimitRetry(
                postBody,
                apiKey,
                onProgress,
                0,
                totalForProgress,
            );
            const hevyId = String(result.id);
            idMap.set(proximaId, hevyId);
            createdHevyTemplateIds.push(hevyId);
            createdNewHevyCustomTemplates += 1;
        } catch (e: unknown) {
            const base = e instanceof Error ? e : new Error(String(e));
            if (createdHevyTemplateIds.length > 0) {
                return {
                    success: false,
                    error: new Error(
                        `${base.message} Already created ${createdHevyTemplateIds.length} custom exercise(s) on Hevy; you may see duplicates if you retry.`,
                    ),
                };
            }
            return { success: false, error: base };
        }
    }

    for (const foreign of foreignCustoms) {
        // Already on this account - a user re-importing their own share, or a Hevy custom the
        // add-exercise dialog offered them. Nothing to mint and nothing to remap.
        if (hevyCustoms.some((h) => String(h.id) === foreign.templateId)) {
            continue;
        }

        const found = findHevyCustomByTitle(hevyCustoms, foreign.title);
        if (found.success === false) {
            return { success: false, error: found.error };
        }

        const match = found.match;
        if (match) {
            const hevyId = String(match.id);
            idMap.set(foreign.templateId, hevyId);
            await recordCustomMovementForForeignTemplate(user.id, foreign, hevyId);
            continue;
        }

        try {
            const result = await postHevyCustomExerciseWithRateLimitRetry(
                mapSharedTemplateToPostExercise(foreign.shared, foreign.title),
                apiKey,
                onProgress,
                0,
                totalForProgress,
            );
            const hevyId = String(result.id);
            idMap.set(foreign.templateId, hevyId);
            createdHevyTemplateIds.push(hevyId);
            createdNewHevyCustomTemplates += 1;
            await recordCustomMovementForForeignTemplate(user.id, foreign, hevyId);
        } catch (e: unknown) {
            const base = e instanceof Error ? e : new Error(String(e));
            if (createdHevyTemplateIds.length > 0) {
                return {
                    success: false,
                    error: new Error(
                        `${base.message} Already created ${createdHevyTemplateIds.length} custom exercise(s) on Hevy; you may see duplicates if you retry.`,
                    ),
                };
            }
            return { success: false, error: base };
        }
    }

    for (const row of customRows) {
        if (!idMap.has(row.id)) {
            return {
                success: false,
                error: new Error(`Internal error: missing ID mapping for template ${row.id}`),
            };
        }
    }

    return {
        success: true,
        routines: remapRoutineExerciseTemplateIds(routines, idMap),
        createdNewHevyCustomTemplates,
    };
}

/**
 * Generic authenticated POST request against the Hevy public API.
 *
 * Wraps `fetch` with JSON content-type, the required `api-key` header,
 * and automatic body serialisation / response parsing.
 *
 * @param url - Fully-qualified Hevy API URL to post to
 * @param apiKey - User's Hevy API key for authentication
 * @param body - Request payload (will be JSON-stringified)
 * @returns The parsed JSON response body cast to `T`
 * @throws {Error} On any non-2xx HTTP status
 */
export const defaultPost = async <T, U = unknown>(url: string, apiKey: string, body: U): Promise<T> => {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'api-key': apiKey,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        await throwHevyHttpError("POST", response);
    }

    return (await response.json()) as T;
  };


/**
 * Generic authenticated PUT request against the Hevy public API.
 *
 * Wraps `fetch` with JSON content-type, the required `api-key` header,
 * and automatic body serialisation / response parsing.
 *
 * @param url - Fully-qualified Hevy API URL to send the PUT to
 * @param apiKey - User's Hevy API key for authentication
 * @param body - Request payload (will be JSON-stringified)
 * @returns The parsed JSON response body cast to `T`
 * @throws {Error} On any non-2xx HTTP status
 */
export const defaultPut = async <T, U = unknown>(url: string, apiKey: string, body: U): Promise<T> => {
    const response = await fetch(url, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            'api-key': apiKey,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        await throwHevyHttpError("PUT", response);
    }

    return (await response.json()) as T;
  };


/**
 * Retrieves the user's Hevy API key from the Supabase vault.
 *
 * The key name follows the convention `hevy_api_key_{userId}`. Returns an
 * empty string if the user is not authenticated or the key doesn't exist,
 * so callers can treat falsy values as "not linked".
 *
 * @param user - Authenticated Supabase user, or null/undefined if logged out
 * @returns The decrypted Hevy API key string, or `""` on failure
 */
export const getHevyApiKey = async (user: User | undefined | null) => {

    try {
        if (user) {
            const secretName = `hevy_api_key_${user.id}`;
            const { data: hevyApiKey, error: hevyApiKeyError } = await supabase.rpc('read_secret', {
                secret_name: secretName,
            });

            if (hevyApiKeyError) {
                console.error("Error accessing Hevy API Key", hevyApiKeyError);
                return "";
            } else {
                return hevyApiKey;
            }
        }
        return "";
    } catch (error: unknown) {
        console.error("Error accessing Hevy API key", error);
        return "";
    }
};



/**
 * Fetches the most recently completed workout from the Hevy API.
 *
 * Maps to `GET /v1/workouts`. Returns only the first workout in the response
 * (workouts are returned newest-first by default).
 *
 * @see https://api.hevyapp.com/docs/#/Workouts/get_v1_workouts
 * @param apiKey - User's Hevy API key
 * @param page - 1-based page number to retrieve
 * @param pageSize - Number of workouts per page
 * @returns The first workout on the requested page, or `undefined` if none exist
 */
export const getMostRecentHevyWorkout = async (apiKey: string, page: number, pageSize: number) => {
    try {
        const response = await defaultFetch<{ workouts: unknown[] }>(
            `https://api.hevyapp.com/v1/workouts?page=${page}&pageSize=${pageSize}`,
            apiKey,
        );

        if (response && response.workouts && response.workouts.length > 0) {
            return response.workouts[0];
        }

        return undefined;
    } catch (error: unknown) {
        console.error("Error fetching most recent Hevy workout", error);
        return undefined;
    }
};

/**
 * Creates a single routine in the user's Hevy account.
 *
 * Maps to `POST /v1/routines`. Called once per workout-day during the
 * program upload flow (see {@link postProgramToHevyOneFolder}).
 *
 * @see https://api.hevyapp.com/docs/#/Routines/post_v1_routines
 * @param postRoutine - Routine payload conforming to the Hevy request schema
 * @param apiKey - User's Hevy API key
 * @returns The created routine as returned by the Hevy API
 */
export const postRoutine = async (postRoutine: THevyRoutineRequest, apiKey: string) => {
    const body: THevyRoutineRequestObject = {
        routine: postRoutine,
    };

    const response = await defaultPost<THevyRoutineRequest, THevyRoutineRequestObject>(
        'https://api.hevyapp.com/v1/routines',
        apiKey,
        body,
    );

    return response;

};


/**
 * Loads the full Hevy exercise template library from the Proxima Supabase mirror.
 *
 * The `hevy_exercise_templates` table is a cached copy of Hevy's global exercise
 * database. Results are sorted alphabetically by title for UI display.
 *
 * @returns All exercise templates, or `[]` on error
 */
export const getHevyExercises = async () => {
    try {
        const { data: hevyExercises, error: hevyExercisesError } = await supabase
            .from('hevy_exercise_templates')
            .select('id, title, type, primary_muscle_group, secondary_muscle_groups, is_custom, equipment, normalized_title, gif_id, instructions')
            .order("title", { ascending: true});

        if (hevyExercisesError) {
            console.error('Error fetching existing exercises:', hevyExercisesError);
            return [];
        }

        return hevyExercises as THevyExerciseTemplate[];
    } catch (error) {
        console.error('Error fetching hevy exercises:', error);
        return [];
    }
};

/**
 * Fetches workout history for a specific exercise template from the Hevy API.
 *
 * Optionally filters by date range. Used to display the user's past
 * performance on a given exercise and inform AI-driven progression decisions.
 *
 * @param apiKey - User's Hevy API key
 * @param exerciseTemplateId - Hevy exercise template ID to look up
 * @param start_date - Optional ISO 8601 lower bound for the date filter
 * @param end_date - Optional ISO 8601 upper bound for the date filter
 * @returns Exercise history response, defaulting to `{ exercise_history: [] }` if empty
 */
export const getHevyExerciseHistory = async (
    apiKey: string,
    exerciseTemplateId: string,
    start_date?: string,
    end_date?: string,
): Promise<THevyExerciseHistory> => {
    const params = new URLSearchParams();
    if (start_date) params.set("start_date", start_date);
    if (end_date) params.set("end_date", end_date);
    const query = params.toString();
    const url = `https://api.hevyapp.com/v1/exercise_history/${encodeURIComponent(exerciseTemplateId)}${query ? `?${query}` : ""}`;
    const response = await defaultFetch<THevyExerciseHistory>(url, apiKey);
    return response ?? { exercise_history: [] };
};

/**
 * Returns the total number of completed workouts on the user's Hevy account.
 *
 * Maps to `GET /v1/workouts/count`. Used alongside
 * {@link getLastKnownHevyWorkoutCount} to detect new workout completions.
 *
 * @param apiKey - User's Hevy API key
 * @returns The workout count, or `0` if the response is empty
 */
export const getHevyWorkoutCount = async (apiKey: string) => {
    try {
        const response = await defaultFetch<{ workout_count: number }>(`https://api.hevyapp.com/v1/workouts/count`, apiKey);
        if (response) {
            return response.workout_count;
        }
        return 0;
    } catch (error: unknown) {
        console.error("Error fetching Hevy workout count", error);
    }
};

/**
 * Fetches one page of body measurements from the Hevy API.
 *
 * Maps to `GET /v1/body_measurements`. Page size max is 10.
 *
 * @see https://api.hevyapp.com/docs/#/Body%20Measurements/get_v1_body_measurements
 * @param apiKey - User's Hevy API key
 * @param page - 1-based page number
 * @param pageSize - Items per page (Hevy max 10)
 * @returns Paginated body-measurements response
 */
export const getHevyBodyMeasurementsPage = async (
    apiKey: string,
    page: number,
    pageSize: number = 10,
): Promise<THevyBodyMeasurementsResponse> => {
    const response = await defaultFetch<THevyBodyMeasurementsResponse>(
        `https://api.hevyapp.com/v1/body_measurements?page=${page}&pageSize=${pageSize}`,
        apiKey,
    );
    return response ?? { page, page_count: 0, body_measurements: [] };
};

/**
 * Fetches a single body-measurement entry by date from the Hevy API.
 *
 * Maps to `GET /v1/body_measurements/{date}`.
 *
 * @see https://api.hevyapp.com/docs/#/Body%20Measurements/get_v1_body_measurements__date_
 * @param apiKey - User's Hevy API key
 * @param date - Measurement date (YYYY-MM-DD)
 * @returns The body-measurement entry for that date
 */
export const getHevyBodyMeasurementByDate = async (
    apiKey: string,
    date: string,
): Promise<THevyBodyMeasurement> => {
    return defaultFetch<THevyBodyMeasurement>(
        `https://api.hevyapp.com/v1/body_measurements/${encodeURIComponent(date)}`,
        apiKey,
    );
};

/**
 * Reads the last-cached Hevy workout count from the Supabase `hevy_workouts_count` table.
 *
 * Compared against the live count from {@link getHevyWorkoutCount} to determine
 * whether the user has completed new workouts since the last check.
 * Returns `null` (not an error) when no baseline row exists yet.
 *
 * @param user - Authenticated Supabase user
 * @returns The cached workout count, or `null` if no record exists
 */
export const getLastKnownHevyWorkoutCount = async (user: User): Promise<number | null> => {
    try {
        if (user) {
            const { data, error } = await supabase
                .from('hevy_workouts_count')
                .select('last_known_workout_count')
                .eq('user_id', user.id)
                .single();

            if (error) {
                // If no record exists, return null (not an error)
                if (error.code === 'PGRST116') {
                    return null;
                }
                console.error("Error fetching last known Hevy workout count", error);
                return null;
            }

            return data?.last_known_workout_count ?? null;
        }
        return null;
    } catch (error: unknown) {
        console.error("Error fetching last known Hevy workout count", error);
        return null;
    }
};

/**
 * Updates `last_known_workout_count` on `hevy_workouts_count` after a full catch-up.
 * Clears `sync_error` when the cursor advances.
 *
 * @param user - Authenticated Supabase user
 * @param count - Live Hevy workout count to store as the cursor
 * @returns `true` when the upsert succeeds
 */
export const updateLastKnownHevyWorkoutCount = async (user: User, count: number): Promise<boolean> => {
    try {
        if (user) {
            const { error } = await supabase
                .from("hevy_workouts_count")
                .upsert(
                    {
                        user_id: user.id,
                        last_known_workout_count: count,
                        sync_error: null,
                        updated_at: new Date().toISOString(),
                    },
                    { onConflict: "user_id" },
                );

            if (error) {
                console.error("Error updating last known Hevy workout count", error);
                return false;
            }

            return true;
        }
        return false;
    } catch (error: unknown) {
        console.error("Error updating last known Hevy workout count", error);
        return false;
    }
};

/**
 * CALCULATES THE DIFFERENCE BETWEEN CURRENT AND LAST KNOWN HEVY WORKOUT COUNT
 * Updates the database with the current count and returns the difference
 * @param apiKey - The hevy api key
 * @param user - The user
 * @returns The difference (current - last known), or null if error
 */
// export const getHevyWorkoutCountDiff = async (apiKey: string, user: User): Promise<{ diff: number; currentCount: number } | null> => {
//     try {
//         if (!apiKey || !user) {
//             return null;
//         }

//         // Get current count from Hevy API
//         const currentCount = await getHevyWorkoutCount(apiKey);
//         if (currentCount === undefined || currentCount === null) {
//             return null;
//         }

//         // Get last known count from database
//         const lastKnownCount = await getLastKnownHevyWorkoutCount(user);

//         // If no last known count exists, set current count as baseline and return 0 diff
//         if (lastKnownCount === null) {
//             await updateLastKnownHevyWorkoutCount(user, currentCount);
//             return { diff: 0, currentCount };
//         }

//         // Calculate difference
//         const diff = currentCount - lastKnownCount;

//         // Update database with current count (only if count increased or stayed same)
//         if (diff >= 0) {
//             await updateLastKnownHevyWorkoutCount(user, currentCount);
//         }

//         return { diff, currentCount };
//     } catch (error: unknown) {
//         console.error("Error calculating Hevy workout count diff", error);
//         return null;
//     }
// };






/**
 * Creates a new routine folder in the user's Hevy account.
 *
 * Maps to `POST /v1/routine_folders`. New folders are inserted at index 0;
 * Hevy automatically increments the index of all existing folders.
 * Called once per week during the upload flow to group routines by week.
 *
 * @see https://api.hevyapp.com/docs/#/RoutineFolders/post_v1_routine_folders
 * @param title - Display name for the folder (e.g. "Week 1 - My Program")
 * @param apiKey - User's Hevy API key
 * @returns The newly created routine folder response
 */
export const postRoutineFolders = async (title: string, apiKey: string) => {
    const body: TRoutineFolderRequest = {
        routine_folder: {
            title,
        },
    };

    const response = await defaultPost<TRoutineFolderResponse, TRoutineFolderRequest>(
        'https://api.hevyapp.com/v1/routine_folders',
        apiKey,
        body,
    );

    return response;
};




/** Folder + routine IDs created by a one-folder Week Export (for Program–Hevy link). */
export type THevyOneFolderUploadIds = {
    hevyFolderId: number;
    hevyRoutineIds: string[];
};

export type TPostProgramToHevyOneFolderResult =
    | { success: true; data: THevyOneFolderUploadIds; createdNewHevyCustomTemplates: number }
    | { success: false; data: unknown };

/** Pulls routine id from Hevy POST /v1/routines body (`{ id }` or `{ routine: { id } }`). */
export function extractHevyCreatedRoutineId(response: unknown): string | null {
    if (!response || typeof response !== "object") {
        return null;
    }
    const body = response as Record<string, unknown>;
    if (typeof body.id === "string" && body.id.length > 0) {
        return body.id;
    }
    const routine = body.routine;
    if (routine && typeof routine === "object") {
        const nestedId = (routine as Record<string, unknown>).id;
        if (typeof nestedId === "string" && nestedId.length > 0) {
            return nestedId;
        }
    }
    return null;
}

/**
 * Uploads a week's worth of routines to Hevy inside a single routine folder.
 *
 * This is the primary upload path: it creates one folder titled
 * "Week N - <programTitle>", then sequentially posts each routine into it.
 * Rate-limit handling (HTTP 429) uses exponential back-off with a countdown
 * reported through the `onProgress` callback so the UI can display remaining wait time.
 *
 * Routines are uploaded in batches of {@link ROUTINES_BATCH_SIZE} with a
 * {@link RATE_LIMIT_BACKOFF_MS} pause between batches.
 *
 * @param hevyRoutines - Array of routines for a single week
 * @param week - 1-based week number used in the folder title
 * @param apiKey - User's Hevy API key
 * @param programTitle - Program title metadata (first element's title is used)
 * @param onProgress - Optional callback receiving upload counts and rate-limit countdowns
 * @param user - Authenticated user; required to remap Proxima custom template IDs to Hevy before upload
 * @returns `{ success: true, data: { hevyFolderId, hevyRoutineIds } }` on success, or `{ success: false, data: Error }`
 */
export const postProgramToHevyOneFolder = async (
    hevyRoutines: THevyRoutine[],
    week: number,
    apiKey: string,
    programTitle: TProgramTitle[] | undefined,
    user: User,
    onProgress?: THevyUploadProgressCallback,
): Promise<TPostProgramToHevyOneFolderResult> => {
    let routinesToUpload = hevyRoutines;
    const resolved = await resolveCustomExerciseTemplatesForHevyUpload(user, apiKey, hevyRoutines, onProgress);
    if (resolved.success === false) {
        return { success: false, data: resolved.error };
    }
    routinesToUpload = resolved.routines;
    const createdNewHevyCustomTemplates = resolved.createdNewHevyCustomTemplates;

    const total = routinesToUpload.length;
    const folderTitle = `Week ${week} - ${programTitle?.[0]?.title ?? "Proxima Program"}`;

    try {
        for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
            try {
                await postRoutineFolders(folderTitle, apiKey);
                break;
            } catch (error: unknown) {
                if (retry >= RATE_LIMIT_MAX_RETRIES) {
                    return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                }
                console.warn("Rate limited on postRoutineFolders. Retrying...", error);
                await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
            }
        }

        let pageOneRoutineFolders: THevyRoutineFolderResponse | undefined;
        for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
            try {
                pageOneRoutineFolders = await getRoutineFolders(apiKey, 1);
                break;
            } catch (error: unknown) {
                if (retry >= RATE_LIMIT_MAX_RETRIES) {
                    return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                }
                console.warn("Rate limited on getRoutineFolders. Retrying...", error);
                await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
            }
        }

        const folderId = pageOneRoutineFolders?.routine_folders.find((folder) => folder.title === folderTitle);
        if (!folderId) {
            console.error("Could not find routine folder after create");
            return { success: false, data: new Error("Routine folder not found") };
        }

        const createdRoutineIds: string[] = [];
        for (let batchStart = 0; batchStart < routinesToUpload.length; batchStart += ROUTINES_BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + ROUTINES_BATCH_SIZE, routinesToUpload.length);
            for (let i = batchStart; i < batchEnd; i++) {
                for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
                    try {
                        onProgress?.(i + 1, total, 'uploading');
                        const created = await postRoutine(
                            convertHevyOutputIntoInput(routinesToUpload[i], folderId.id),
                            apiKey,
                        );
                        const routineId = extractHevyCreatedRoutineId(created);
                        if (routineId) {
                            createdRoutineIds.push(routineId);
                        }
                        break;
                    } catch (error: unknown) {
                        if (retry >= RATE_LIMIT_MAX_RETRIES) {
                            return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                        }
                        console.warn(`Rate limited at index ${i}. Retrying...`, error);
                        await delayWithRateLimitCountdown(i + 1, total, onProgress, 60 * Math.pow(2, retry));
                    }
                }
            }
            if (batchEnd < routinesToUpload.length) {
                await delayWithRateLimitCountdown(batchEnd, total, onProgress);
            }
        }

        let hevyRoutineIds = createdRoutineIds;
        if (hevyRoutineIds.length < routinesToUpload.length) {
            const folderRoutines = await getRoutinesInFolder(apiKey, folderId.id);
            hevyRoutineIds = folderRoutines.map((routine) => routine.id);
        }

        if (hevyRoutineIds.length === 0) {
            return {
                success: false,
                data: new Error("Hevy folder created but no routine IDs were returned"),
            };
        }

        return {
            success: true,
            data: { hevyFolderId: folderId.id, hevyRoutineIds },
            createdNewHevyCustomTemplates,
        };
    } catch (error: unknown) {
        console.error("Error saving program to Hevy", error);
        return { success: false, data: error };
    }
};

/**
 *
 * Uploads a full multi-week program to Hevy, creating one folder per week.
 *
 * Replaced by the single-folder variant which gives users more control over
 * which week to upload. Kept for backward compatibility but no longer called.
 *
 * @param hevyRoutines - Array of routines spanning multiple weeks
 * @param apiKey - User's Hevy API key
 * @param onProgress - Optional callback receiving upload counts and rate-limit countdowns
 * @param user - Authenticated user; required to remap Proxima custom template IDs to Hevy before upload
 * @returns `{ success: true, data: [] }` on success, or `{ success: false, data: Error }`
 */
export const postProgramToHevy = async (
    hevyRoutines: THevyRoutine[],
    apiKey: string,
    user: User,
    onProgress?: THevyUploadProgressCallback,
) => {
    let routinesToUpload = hevyRoutines;
    const resolved = await resolveCustomExerciseTemplatesForHevyUpload(user, apiKey, hevyRoutines, onProgress);
    if (resolved.success === false) {
        return { success: false, data: resolved.error };
    }
    routinesToUpload = resolved.routines;
    const createdNewHevyCustomTemplates = resolved.createdNewHevyCustomTemplates;

    const total = routinesToUpload.length;

    try {
        const weeks = Array.from(
            new Set(
                routinesToUpload
                    .map((p) => p.folder_id)
                    .filter((week): week is number => typeof week === 'number'),
            ),
        );

        for (let i = 0; i < weeks.length; i++) {
            for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
                try {
                    await postRoutineFolders(`Week ${weeks[i] + 1}`, apiKey);
                    break;
                } catch (error: unknown) {
                    if (retry >= RATE_LIMIT_MAX_RETRIES) {
                        return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                    }
                    console.warn(`Rate limited at week ${weeks[i]}. Retrying...`, error);
                    await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
                }
            }
        }

        let routineFolders: THevyRoutineFolderResponse | undefined;
        for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
            try {
                routineFolders = await getRoutineFolders(apiKey, 1);
                break;
            } catch (error: unknown) {
                if (retry >= RATE_LIMIT_MAX_RETRIES) {
                    return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                }
                console.warn("Rate limited on getRoutineFolders. Retrying...", error);
                await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
            }
        }

        if (weeks.length > 10 && routineFolders?.routine_folders) {
            for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
                try {
                    const pageTwo = await getRoutineFolders(apiKey, 2);
                    if (pageTwo?.routine_folders?.length) {
                        routineFolders.routine_folders.push(...pageTwo.routine_folders);
                    }
                    break;
                } catch (error: unknown) {
                    if (retry >= RATE_LIMIT_MAX_RETRIES) {
                        return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                    }
                    console.warn("Rate limited on getRoutineFolders page 2. Retrying...", error);
                    await delayWithRateLimitCountdown(0, total, onProgress, 60 * Math.pow(2, retry));
                }
            }
        }

        for (let batchStart = 0; batchStart < routinesToUpload.length; batchStart += ROUTINES_BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + ROUTINES_BATCH_SIZE, routinesToUpload.length);
            for (let j = batchStart; j < batchEnd; j++) {
                const folderId = routineFolders?.routine_folders.find(
                    (folder) => folder.title === `Week ${Number(routinesToUpload[j].folder_id) + 1}`,
                );
                if (!folderId) continue;
                for (let retry = 0; retry <= RATE_LIMIT_MAX_RETRIES; retry++) {
                    try {
                        onProgress?.(j + 1, total, 'uploading');
                        await postRoutine(convertHevyOutputIntoInput(routinesToUpload[j], folderId.id), apiKey);
                        break;
                    } catch (error: unknown) {
                        if (retry >= RATE_LIMIT_MAX_RETRIES) {
                            return { success: false, data: new Error(RATE_LIMIT_EXHAUSTED_MESSAGE) };
                        }
                        console.warn(`Rate limited at index ${j}. Retrying...`, error);
                        await delayWithRateLimitCountdown(j + 1, total, onProgress, 60 * Math.pow(2, retry));
                    }
                }
            }
            if (batchEnd < routinesToUpload.length) {
                await delayWithRateLimitCountdown(batchEnd, total, onProgress);
            }
        }
        return { success: true, data: [], createdNewHevyCustomTemplates };
    } catch (error: unknown) {
        console.error("Error saving program to Hevy", error);
        return { success: false, data: error };
    }
};

/**
 * Fetches the N most-recently completed workouts from the Hevy API.
 *
 * Always reads page 1, so results are sorted newest-first. Used by the
 * workout-completion detection flow to compare against the user's schedule.
 *
 * @param hevyApiKey - User's Hevy API key
 * @param pageSize - Number of workouts to retrieve (default `1`)
 * @returns The paginated workouts response from Hevy
 */
export async function getRecentlyCompletedWorkouts(hevyApiKey: string, pageSize: number = 1): Promise<THevyWorkoutsResponse> {
    // only can handle max 10 workouts completed in a day (probably fine)
    const hevyApiUrlWorkouts = `https://api.hevyapp.com/v1/workouts?page=1&pageSize=${pageSize}`;
    const hevyResponseWorkouts = await fetch(hevyApiUrlWorkouts, {
        method: "GET",
        headers: {
            "accept": "application/json",
            "api-key": hevyApiKey,
        },
    });


    if (!hevyResponseWorkouts.ok) {
        console.error(`Hevy API error: ${hevyResponseWorkouts.status} ${hevyResponseWorkouts.statusText}`);
    }

    const recentlyCompletedWorkouts: THevyWorkoutsResponse = await hevyResponseWorkouts.json();

    return recentlyCompletedWorkouts;

}


/**
 * Fetches a single routine by ID from the Hevy API.
 *
 * Maps to `GET /v1/routines/{routineId}`. Returns the full routine
 * including exercises and sets.
 *
 * @param hevyApiKey - User's Hevy API key
 * @param routine_id - The Hevy routine ID to retrieve
 * @returns The full routine response including nested exercises and sets
 */
export async function getRoutine(hevyApiKey: string, routine_id: string): Promise<TRoutineResponse> {
    const routineResponse = await fetch(`https://api.hevyapp.com/v1/routines/${routine_id}`, {
        method: "GET",
        headers: {
            "accept": "application/json",
            "api-key": hevyApiKey,
        },
    });

    if (!routineResponse.ok) {
        console.error(`Hevy API error: ${routineResponse.status} ${routineResponse.statusText}`);
    }

    const routine: TRoutineResponse = await routineResponse.json();

    return routine;

}


/**
 * Fetches a single routine folder by ID from the Hevy API.
 *
 * Maps to `GET /v1/routine_folders/{folderId}`. Logs an error (but still
 * attempts the fetch) when `folder_id` is null.
 *
 * @param hevyApiKey - User's Hevy API key
 * @param folder_id - Numeric folder ID, or `null` (which will likely 404)
 * @returns The routine folder response
 */
export async function getRoutineFolder(hevyApiKey: string, folder_id: number | null): Promise<TRoutineFolderResponse> {
    if (!folder_id) {
        console.error(`No folder_id found`);
    }

    const folderResponse = await fetch(`https://api.hevyapp.com/v1/routine_folders/${folder_id}`, {
        method: "GET",
        headers: {
            "accept": "application/json",
            "api-key": hevyApiKey,
        },
    });

    if (!folderResponse.ok) {
        console.error(`Hevy API error: ${folderResponse.status} ${folderResponse.statusText}`);
    }

    const folder: TRoutineFolderResponse = await folderResponse.json();

    return folder;

}

/**
 * Returns all routines that belong to a given routine folder.
 *
 * The Hevy API doesn't support filtering routines by folder directly, so this
 * paginates through all routines and selects those whose `folder_id` matches.
 * Used by the progression system to find sibling workout days within a week.
 *
 * @param hevyApiKey - User's Hevy API key
 * @param folder_id - The folder ID to filter by
 * @returns Lightweight routine stubs `{ id, title }` belonging to the folder
 */
export async function getRoutinesInFolder(hevyApiKey: string, folder_id: number): Promise<Array<{ id: string; title: string }>> {
    const routines: Array<{ id: string; title: string }> = [];
    let page = 1;
    let hasMore = true;

    // Fetch all routines page by page
    while (hasMore) {
        try {
            const response = await defaultFetch<{
                page: number;
                page_count: number;
                routines: Array<{ id: string; title: string; folder_id: number | null }>;
            }>(`https://api.hevyapp.com/v1/routines?page=${page}&pageSize=10`, hevyApiKey);

            if (!response || !response.routines) {
                hasMore = false;
                break;
            }

            // Filter routines by folder_id and exclude the current routine if provided
            const filteredRoutines = response.routines
                .filter(routine => routine.folder_id === folder_id)
                .map(routine => ({ id: routine.id, title: routine.title }));

            routines.push(...filteredRoutines);

            // Check if there are more pages
            hasMore = page < (response.page_count || 1);
            page++;
        } catch (error) {
            console.error(`Error fetching routines page ${page}:`, error);
            hasMore = false;
        }
    }

    return routines;
}

/**
 * Locates a routine within a folder by its day number using the title convention.
 *
 * Proxima names routines as `"<dayNumber> - <dayTitle>"` when uploading.
 * This function matches that pattern to map a schedule day back to its
 * Hevy routine ID.
 *
 * @param routines - Array of `{ id, title }` stubs from {@link getRoutinesInFolder}
 * @param nthDay - 1-based day number to search for in the title prefix
 * @returns The matching routine's ID, or `null` if no match is found
 */
export function findRoutineByDay(
    routines: Array<{ id: string; title: string }>,
    nthDay: number,
): string | null {
    for (const routine of routines) {
        // Match pattern like "1 - Day 1" or "1 - {day_title}"
        const pattern = new RegExp(`^${nthDay}\\s*-\\s*(.+)$`);
        const match = routine.title.match(pattern);

        if (match) {
          return routine.id;
        }
    }

    return null;
}


/**
 * Groups and sorts a flat array of schedule workouts into a week × day grid.
 *
 * Returns a 2D array where the outer index is the week (ascending) and the
 * inner index is the day within that week (ascending by `nthDay`). Used to
 * prepare data for {@link convertToHevyRoutine} in hevy_export.
 *
 * @param scheduleWorkouts - Flat list of schedule workout rows from Supabase
 * @returns 2D array of workouts organised as `[week][day]`
 */
export const sortWorkouts = (scheduleWorkouts: TScheduleWorkouts[]) => {
    const workoutsByWeek = scheduleWorkouts.reduce<Record<number, TScheduleWorkouts[]>>((acc, workout) => {
        const { nthWeek } = workout;
        if (!acc[nthWeek]) {
            acc[nthWeek] = [];
        }
        acc[nthWeek].push(workout);
        return acc;
    }, {});

    const sortedWorkoutsByWeek: TScheduleWorkouts[][] = Object.keys(workoutsByWeek)
        .sort((a, b) => Number(a) - Number(b))
        .map(week =>
            workoutsByWeek[Number(week)].sort((a, b) => a.nthDay - b.nthDay),
    );

    return sortedWorkoutsByWeek;
};



// export async function uploadNewWeek(hevyApiKey: string, program_id: string, week_number: number, programTitle: string): Promise<void> {
//     const { data: scheduleWorkouts, error: scheduleWorkoutsError } = await supabase
//         .from('schedule_workouts')
//         .select(`
//             nthDay,
//             nthWeek,
//             day_title,
//             program_workout_exercises (
//                 reps,
//                 reps_max,
//                 reps_range,
//                 time_taken,
//                 time_range,
//                 amrap,
//                 rpe,
//                 rpe_range,
//                 percent_rm,
//                 weights,
//                 hevy_exercise_templates (
//                     id,
//                     title,
//                     type,
//                     primary_muscle_group,
//                     secondary_muscle_groups,
//                     is_custom,
//                     equipment,
//                     normalized_title,
//                     gif_id,
//                     instructions
//                 )
//             )
//         `)
//         .eq('program_id', program_id)
//         .order('nthWeek', { ascending: true })
//         .order('nthDay', { ascending: true });

//     if (scheduleWorkoutsError) {
//         console.error('Failed to retrieve schedule workouts:', scheduleWorkoutsError.message);
//         throw new HttpError(`Failed to retrieve schedule workouts: ${scheduleWorkoutsError.message}`, 500);
//     }

//     if (!scheduleWorkouts || scheduleWorkouts.length === 0) {
//         throw new HttpError(`No schedule workouts found for program_id: ${program_id}, week_number: ${week_number}`, 404);
//     }

//     // Sort workouts by week and day
//     const sortedWorkoutsByWeek = sortWorkouts(scheduleWorkouts);

//     // Convert all workouts to Hevy routines
//     const allHevyRoutines = await convertToHevyRoutine(sortedWorkoutsByWeek);

//     // Filter for the specific week (folder_id is 0-indexed, week_number is 1-indexed)
//     // So week_number 1 = folder_id 0, week_number 2 = folder_id 1, etc.
//     const weekHevyRoutines = allHevyRoutines.filter((routine) => routine.folder_id === week_number - 1);

//     if (weekHevyRoutines.length === 0) {
//         throw new HttpError(`No routines found for week_number: ${week_number}`, 404);
//     }

//     // 6. Upload to Hevy
//     await postProgramToHevyOneFolder(weekHevyRoutines, week_number, hevyApiKey, [{ id: program_id, title: programTitle }]);
// }



// PUT /v1/routines/{routineId}. Update an existing routine
// https://api.hevyapp.com/docs/#/Routines/put_v1_routines__routineId_
/**
 * UPDATES AN EXISTING ROUTINE IN HEVY
 * @param routineId - The routine ID to update
 * @param updateRoutine - The routine data to update
 * @param apiKey - The hevy api key
 * @returns The updated routine
 */
export const putRoutine = async (
    routineId: string,
    updateRoutine: Omit<THevyRoutineRequest, "folder_id"> & { folder_id?: number | null },
    apiKey: string,
) => {

    const body = {
        routine: updateRoutine,
    };

    const response = await defaultPut<typeof updateRoutine, typeof body>(
        `https://api.hevyapp.com/v1/routines/${routineId}`,
        apiKey,
        body,
    );

    return response;
};

/** Hevy routine notes (description) written on empty PUT. Non-empty so Hevy accepts it. */
export const REMOVED_ROUTINE_NOTES =
    "You marked this routine for removal in Proxima. You can now delete this routine.";

/**
 * One-set stub Hevy requires on empty PUT. Live Hevy 400s `exercises: []`
 * ("Array must contain at least 1 element(s)") and 400s when `exercises` is omitted.
 *
 * @param exerciseTemplateId - Template id taken from the routine being emptied
 */
export function placeholderExerciseForRemovedRoutine(
    exerciseTemplateId: string,
): THevyExerciseRequest {
    return {
        exercise_template_id: exerciseTemplateId,
        superset_id: null,
        rest_seconds: 0,
        notes: "...",
        sets: [
            {
                type: "normal",
                weight_kg: null,
                reps: 0,
                distance_meters: null,
                duration_seconds: null,
                custom_metric: null,
            },
        ],
    };
}

/**
 * First `exercise_template_id` on a Hevy GET/PUT routine payload.
 * Hevy sometimes wraps `routine` as an object, sometimes as a one-item array.
 *
 * @param body - Parsed JSON from GET `/v1/routines/{id}`
 */
export function firstHevyExerciseTemplateId(body: unknown): string | undefined {
    if (!body || typeof body !== "object") {
        return undefined;
    }
    const wrapped = (body as { routine?: unknown }).routine ?? body;
    const routine = Array.isArray(wrapped) ? wrapped[0] : wrapped;
    if (!routine || typeof routine !== "object") {
        return undefined;
    }
    const exercises = (routine as { exercises?: unknown }).exercises;
    if (!Array.isArray(exercises)) {
        return undefined;
    }
    for (const exercise of exercises) {
        if (!exercise || typeof exercise !== "object") {
            continue;
        }
        const id = (exercise as { exercise_template_id?: unknown }).exercise_template_id;
        if (typeof id === "string" && id.length > 0) {
            return id;
        }
    }
    return undefined;
}

/**
 * Empties a Hevy routine in place (no DELETE). Title becomes `[Removed] {original}`,
 * notes are {@link REMOVED_ROUTINE_NOTES}, and exercises collapse to one placeholder set.
 * Hevy PUT rejects `exercises: []`.
 *
 * @param routineId - Hevy routine UUID
 * @param originalTitle - Title before emptying; existing `[Removed] ` is stripped first
 * @param apiKey - User's Hevy API key
 */
export async function emptyRoutineOnHevy(
    routineId: string,
    originalTitle: string,
    apiKey: string,
): Promise<unknown> {
    const stripped = originalTitle.startsWith("[Removed] ")
        ? originalTitle.slice("[Removed] ".length)
        : originalTitle;
    const current = await defaultFetch<unknown>(
        `https://api.hevyapp.com/v1/routines/${routineId}`,
        apiKey,
    );
    const templateId = firstHevyExerciseTemplateId(current);
    if (!templateId) {
        throw new Error(
            `Cannot empty Hevy routine ${routineId}: no exercise template to keep as placeholder`,
        );
    }
    return putRoutine(
        routineId,
        {
            title: `[Removed] ${stripped}`,
            notes: REMOVED_ROUTINE_NOTES,
            exercises: [placeholderExerciseForRemovedRoutine(templateId)],
        },
        apiKey,
    );
}

/**
 * APPENDS "  ✅" TO THE ROUTINE TITLE OF A COMPLETED ROUTINE
 * @param routineId - The routine ID to update
 * @param currentTitle - The current routine title
 * @param apiKey - The hevy api key
 * @param routine - The full routine object (needed to preserve other fields when updating)
 * @returns The updated routine
 */
// export const appendCheckmarkToRoutineTitle = async (
//     routineId: string,
//     currentTitle: string,
//     apiKey: string,
//     routine: TRoutineResponse
// ): Promise<void> => {
//     // Check if the title already has the checkmark
//     if (currentTitle.endsWith('  ✅')) {
//         console.log(`Routine ${routineId} already has checkmark in title. Skipping update.`);
//         return;
//     }

//     // Append the checkmark to the title
//     const updatedTitle = `${currentTitle}  ✅`;

//     // Prepare the update payload matching the API structure
//     // Structure: { routine: { title, notes, exercises: [{ exercise_template_id, superset_id, rest_seconds, notes, sets: [{ type, weight_kg, reps, distance_meters, duration_seconds, custom_metric, rep_range? }] }] } }
//     // Note: folder_id is NOT included in PUT request body per API documentation
//     // Note: notes cannot be empty string - API requires non-empty value
//     const routineNotes = (routine.routine as any).notes;
//     const updatePayload: THevyRoutineRequest = {
//         title: updatedTitle,
//         notes: routineNotes && routineNotes.trim().length > 0 ? routineNotes : ' ',
//         exercises: routine.routine.exercises.map((exercise) => ({
//             exercise_template_id: exercise.exercise_template_id,
//             superset_id: exercise.supersets_id,
//             rest_seconds: Number(exercise.rest_seconds) || 90,
//             notes: exercise.notes || '',
//             sets: exercise.sets.map((set) => {
//                 const setPayload: any = {
//                     type: set.type || 'normal',
//                     weight_kg: set.weight_kg,
//                     reps: set.reps,
//                     distance_meters: set.distance_meters,
//                     duration_seconds: set.duration_seconds,
//                     custom_metric: set.custom_metric,
//                 };
//                 // Include rep_range if it exists (API accepts it in request body even though not in type)
//                 if (set.rep_range) {
//                     setPayload.rep_range = set.rep_range;
//                 }
//                 return setPayload;
//             }),
//         })),
//     };

//     try {
//         await putRoutine(routineId, updatePayload, apiKey);
//         console.log(`Successfully appended checkmark to routine ${routineId} title: "${updatedTitle}"`);
//     } catch (error) {
//         console.error(`Failed to update routine ${routineId} title:`, error);
//         throw error;
//     }
// };




/**
 * Type for tracking which exercises progressed and their types
 */
export type TProgressedExercise = {
    exercise_template_id: string;
    exercise_name: string;
    exerciseType: string;
    completed_value: number; // The value the user completed (e.g., 12 reps)
    completed_unit: string; // The unit (reps, kg, meters, seconds, etc.)
    progression_amount: number; // The amount being added (e.g., +2, +2.5)
    progression_unit: string; // The unit for progression (reps, kg, meters, seconds, etc.)
};

/**
 * GETS PROGRESSION METADATA FOR AN EXERCISE TYPE
 * @param exerciseType - The type of exercise (weight_reps, distance_duration, etc.)
 * @returns Object with progression amount, unit, and field to update
 */
// const getProgressionMetadata = (exerciseType: string): {
//     progressionAmount: number;
//     progressionUnit: string;
//     completedUnit: string;
//     fieldToUpdate: 'weight_kg' | 'reps' | 'distance_meters' | 'duration_seconds' | 'custom_metric' | null;
// } => {
//     switch (exerciseType) {
//         case 'weight_reps':
//             return { progressionAmount: 2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
//         case 'distance_duration':
//             return { progressionAmount: 0.25, progressionUnit: 'km', completedUnit: 'km', fieldToUpdate: 'distance_meters' };
//         case 'reps_only':
//             return { progressionAmount: 2, progressionUnit: 'reps', completedUnit: 'reps', fieldToUpdate: 'reps' };
//         case 'duration':
//             return { progressionAmount: 30, progressionUnit: 'seconds', completedUnit: 'seconds', fieldToUpdate: 'duration_seconds' };
//         case 'bodyweight_weighted':
//             return { progressionAmount: 2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
//         case 'bodyweight_assisted':
//             return { progressionAmount: -2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
//         case 'short_distance_weight':
//             return { progressionAmount: 2.5, progressionUnit: 'kg', completedUnit: 'reps', fieldToUpdate: 'weight_kg' };
//         case 'floors_duration':
//             return { progressionAmount: 100, progressionUnit: 'floors', completedUnit: 'floors', fieldToUpdate: 'custom_metric' };
//         case 'steps_duration':
//             return { progressionAmount: 100, progressionUnit: 'steps', completedUnit: 'steps', fieldToUpdate: 'custom_metric' };
//         default:
//             return { progressionAmount: 0, progressionUnit: '', completedUnit: '', fieldToUpdate: null };
//     }
// };

/**
 * APPLIES DOUBLE PROGRESSION TO A SINGLE SET BASED ON EXERCISE TYPE
 * @param exerciseType - The type of exercise (weight_reps, distance_duration, etc.)
 * @param routineSet - The routine set to apply progression to (modified in place)
 * @param exerciseTemplateId - The exercise template ID (for logging)
 */
// const applyProgressionToSet = (
//     exerciseType: string,
//     routineSet: TRoutineSet,
//     exerciseTemplateId: string
// ): void => {
//     let progressionAmount = 0;
//     let currentValue = 0;
//     let useFloor = false;
//     let conversionFactor = 1;
//     let fieldToUpdate: 'weight_kg' | 'reps' | 'distance_meters' | 'duration_seconds' | 'custom_metric' | null = null;

//     switch (exerciseType) {
//         case 'weight_reps':
//             progressionAmount = 2.5; // +2.5kg
//             currentValue = routineSet.weight_kg ?? 0;
//             fieldToUpdate = 'weight_kg';
//             break;

//         case 'distance_duration':
//             progressionAmount = 0.25; // +0.25km = +250m
//             currentValue = routineSet.distance_meters ?? 0;
//             conversionFactor = 1000; // Convert km to meters
//             fieldToUpdate = 'distance_meters';
//             break;

//         case 'reps_only':
//             progressionAmount = 2; // +2 reps
//             currentValue = routineSet.reps ?? 0;
//             useFloor = true; // Use floor for integer values
//             fieldToUpdate = 'reps';
//             break;

//         case 'duration':
//             progressionAmount = 30; // +30 seconds
//             currentValue = routineSet.duration_seconds ?? 0;
//             fieldToUpdate = 'duration_seconds';
//             break;

//         case 'bodyweight_weighted':
//             progressionAmount = 2.5; // +2.5kg
//             currentValue = routineSet.weight_kg ?? 0;
//             fieldToUpdate = 'weight_kg';
//             break;

//         case 'bodyweight_assisted':
//             progressionAmount = -2.5; // -2.5kg (reducing assistance)
//             currentValue = routineSet.weight_kg ?? 0;
//             let newValue = currentValue + progressionAmount;

//             // Gut check: ensure we don't go negative or make too large a jump
//             if (newValue < 0) {
//                 newValue = 0;
//             } else if (currentValue > 0 && newValue < currentValue * 0.8) {
//                 // If reducing by more than 20%, limit the reduction
//                 newValue = currentValue * 0.8;
//             }
//             routineSet.weight_kg = newValue;
//             return; // Early return for special case

//         case 'short_distance_weight':
//             progressionAmount = 2.5; // +2.5kg
//             currentValue = routineSet.weight_kg ?? 0;
//             fieldToUpdate = 'weight_kg';
//             break;

//         case 'floors_duration':
//             progressionAmount = 100; // +100 floors
//             currentValue = routineSet.custom_metric ?? 0;
//             fieldToUpdate = 'custom_metric';
//             break;

//         case 'steps_duration':
//             progressionAmount = 100; // +100 steps
//             currentValue = routineSet.custom_metric ?? 0;
//             fieldToUpdate = 'custom_metric';
//             break;

//         default:
//             console.warn(`Unknown exercise type: ${exerciseType} for exercise ${exerciseTemplateId}`);
//             return;
//     }

//     // Apply gut check once after switch statement
//     const adjustedProgression = progressionAmount * conversionFactor;
//     let newValue = currentValue + adjustedProgression;

//     // Gut check: if (current_value + jump) > current_value * 1.2, half the jump
//     if (newValue > currentValue * 1.2) {
//         const halvedProgression = useFloor
//             ? Math.floor(progressionAmount / 2)
//             : progressionAmount / 2;
//         newValue = currentValue + (halvedProgression * conversionFactor);
//     }

//     // Update the appropriate field
//     if (fieldToUpdate) {
//         (routineSet as any)[fieldToUpdate] = newValue;
//     }
// };

/**
 * APPLIES DOUBLE PROGRESSION FOR A COMPLETED EXERCISE
 * Applies progressions to incomplete routines in the current week (or next week if current week is complete)
 * @param workout - The completed workout
 * @param routine - The routine of the completed workout
 * @param program_id - The program ID
 * @param programHistoryId - The program history ID
 * @param user_id - The user ID
 * @param weekNumber - The week number
 * @param nthDay - The day number
 * @param hevyApiKey - The hevy api key
 *
 * @returns An array of ProgressedExercise objects
 */
// export const doubleProgression = async (
//     workout: THevyWorkout,
//     routine: TRoutineResponse,
//     program_id: string,
//     programHistoryId: string,
//     user_id: string,
//     weekNumber: number,
//     nthDay: number,
//     hevyApiKey: string,
//     hevyExercises: THevyExerciseTemplate[],
//     folder_id: number | null): Promise<ProgressedExercise[]> => {

//     // An Exercise type can be one of the following options:
//     // 1. weight_reps (e.g. Squat (Barbell)),
//     // 2. distance_duration (Sled Push),
//     // 3. reps_only (e.g. Kipping Pullup),
//     // 4. duration (e.g. Boxing) ,
//     // 5. bodyweight_weighted (e.g. Decline Crunch (Weighted)),
//     // 6. bodyweight_assisted (e.g. Pull Up (Band)),
//     // 7. short_distance_weight (e.g. Walking lunge dumbbell),
//     // 8. floors_duration (Stair Machine Floors),
//     // 9. steps_duration (Stair Machine Steps)
//     // For each option it will have a different progression increement amount.
//     // 1. weight_reps: +2.5kg
//     // 2. distance_duration: +0.25km
//     // 3. reps_only: +2 reps
//     // 4. duration: +30 s
//     // 5. bodyweight_weighted: +2.5kg
//     // 6. bodyweight_assisted: -2.5kg
//     // 7. short_distance_weight: +2.5kg
//     // 8. floors_duration: +100 floors
//     // 9. steps_duration: +100 steps

//     // We also want to gut check that we're not making a massive leap in difficulty
//     // for example we can apply a rule such as if (current_weight + jump) > current_weight * 1.2 then we half the jump amount.
//     // This prevents the algo from making a massive leap in difficulty. E.g. adding 2.5kg to a 10kg exercise would be too much of a jump.

//     // Track which exercises progressed and their types
//     const progressedExercises: ProgressedExercise[] = [];

//     for (const exercise of workout.exercises) {
//         // Find the matching exercise in the routine by exercise_template_id
//         const routineExercise = routine.routine.exercises.find(
//             (rEx) => rEx.exercise_template_id === exercise.exercise_template_id
//         );

//         if (!routineExercise) continue;

//         // Fetch exercise template to get the exercise type
//         const exerciseTemplate = hevyExercises.find(ex => ex.id === exercise.exercise_template_id);
//         if (!exerciseTemplate) {
//             console.warn(`Could not fetch exercise template for ${exercise.exercise_template_id}`);
//             continue;
//         }

//         const exerciseType = exerciseTemplate.type;
//         const progressionMetadata = getProgressionMetadata(exerciseType);

//         // Compare sets: check if all workout sets have reps >= routine target reps
//         // Also capture what the user completed
//         let allSetsProgressed = true;
//         let completedValue: number | null = null;
//         let completedUnit = progressionMetadata.completedUnit;

//         // For most exercises, we check if reps >= target reps
//         // For distance_duration, we check if duration >= target duration
//         // For duration, we check if duration >= target duration
//         if (exerciseType === 'distance_duration') {
//             // For distance exercises, check duration and capture distance
//             allSetsProgressed = exercise.sets.every((workoutSet, index) => {
//                 const routineSet = routineExercise.sets[index];
//                 if (!routineSet) return false;

//                 const routineTargetDuration = routineSet.duration_seconds ?? 0;
//                 const workoutDuration = workoutSet.duration_seconds ?? 0;

//                 // Capture the distance from the first set
//                 if (index === 0 && workoutSet.distance_meters !== null && workoutSet.distance_meters !== undefined) {
//                     completedValue = workoutSet.distance_meters / 1000; // Convert to km
//                 }

//                 return workoutDuration >= routineTargetDuration;
//             });
//         } else if (exerciseType === 'duration') {
//             // For duration exercises, capture the target duration
//             allSetsProgressed = exercise.sets.every((workoutSet, index) => {
//                 const routineSet = routineExercise.sets[index];
//                 if (!routineSet) return false;

//                 const routineTargetDuration = routineSet.duration_seconds ?? 0;
//                 const workoutDuration = workoutSet.duration_seconds ?? 0;

//                 // Capture the target duration from the first set
//                 if (index === 0) {
//                     completedValue = routineTargetDuration;
//                 }

//                 return workoutDuration >= routineTargetDuration;
//             });
//         } else {
//             // For reps-based exercises (weight_reps, reps_only, etc.), check reps and capture target reps
//             allSetsProgressed = exercise.sets.every((workoutSet, index) => {
//                 const routineSet = routineExercise.sets[index];
//                 if (!routineSet) return false;

//                 // Get target reps from routine (rep_range end, or default to 12 for 8-12 range if not set)
//                 const routineTargetReps = routineSet.rep_range?.end ?? 12;
//                 const workoutReps = workoutSet.reps ?? 0;

//                 // Capture the target reps from the first set (what they needed to complete)
//                 if (index === 0) {
//                     completedValue = routineTargetReps;
//                     completedUnit = 'reps';
//                 }

//                 return workoutReps >= routineTargetReps;
//             });
//         }

//         if (allSetsProgressed && completedValue !== null) {

//             progressedExercises.push({
//                 exercise_template_id: exercise.exercise_template_id,
//                 exercise_name: exerciseTemplate.title,
//                 exerciseType,
//                 completed_value: completedValue,
//                 completed_unit: completedUnit,
//                 progression_amount: progressionMetadata.progressionAmount,
//                 progression_unit: progressionMetadata.progressionUnit
//             });

//             console.log(`Progression detected for exercise ${exercise.exercise_template_id} ${exercise.title} (${exerciseType})`);
//         }
//     }

//     if (progressedExercises.length === 0) {
//         console.log('No progressions detected, skipping update');
//         return progressedExercises;
//     }
//     if (folder_id === null) {
//         console.warn('No folder_id provided, cannot apply progressions');
//         return progressedExercises;
//     }

//     // Get incomplete days for the current week
//     const incompleteDays = await getIncompleteDaysForWeek(user_id, programHistoryId, weekNumber, program_id);

//     if (incompleteDays.length === 0) {
//         console.log(`No incomplete days found for week ${weekNumber}, skipping progression updates`);
//         return progressedExercises;
//     }

//     // Get all routines in the current week's folder
//     const routinesInFolder = await getRoutinesInFolder(hevyApiKey, folder_id);

//     if (routinesInFolder.length === 0) {
//         console.log(`No routines found in folder ${folder_id} for week ${weekNumber}`);
//         return progressedExercises;
//     }

//     // For each incomplete day, find and update the routine
//     for (const incompleteDay of incompleteDays) {
//         const routineId = findRoutineByDay(routinesInFolder, incompleteDay.nthDay);

//         if (!routineId) {
//             console.warn(`Could not find routine for day ${incompleteDay.nthDay} in week ${weekNumber}`);
//             continue;
//         }

//         try {
//             // Fetch the full routine
//             const targetRoutine = await getRoutine(hevyApiKey, routineId);

//             // Track if any progressions were applied to this routine
//             let routineUpdated = false;

//             // Create a copy of the routine exercises to modify
//             const updatedExercises = targetRoutine.routine.exercises.map(exercise => {
//                 // Check if this exercise matches any progressed exercise
//                 const progressedExercise = progressedExercises.find(
//                     pe => pe.exercise_template_id === exercise.exercise_template_id
//                 );

//                 if (!progressedExercise) {
//                     // No progression for this exercise, return as-is
//                     return exercise;
//                 }

//                 // Apply progression to matching exercise
//                 routineUpdated = true;
//                 const updatedSets = exercise.sets.map((set) => {
//                     // Create a copy of the set and apply progression
//                     const updatedSet: TRoutineSet = {
//                         ...set,
//                         rep_range: set.rep_range ? { ...set.rep_range } : null
//                     };

//                     // Apply progression based on exercise type
//                     applyProgressionToSet(progressedExercise.exerciseType, updatedSet, exercise.exercise_template_id);

//                     return updatedSet;
//                 });

//                 return {
//                     ...exercise,
//                     sets: updatedSets
//                 };
//             });

//             // Only update if at least one exercise was progressed
//             if (routineUpdated) {
//                 const routineNotes = (targetRoutine.routine as any).notes;
//                 const updatePayload: THevyRoutineRequest = {
//                     title: targetRoutine.routine.title,
//                     notes: routineNotes && routineNotes.trim().length > 0 ? routineNotes : ' ',
//                     exercises: updatedExercises.map((exercise) => ({
//                         exercise_template_id: exercise.exercise_template_id,
//                         superset_id: exercise.supersets_id,
//                         rest_seconds: Number(exercise.rest_seconds) || 90,
//                         notes: exercise.notes || ' ',
//                         sets: exercise.sets.map((set) => {
//                             const setPayload: any = {
//                                 type: set.type || 'normal',
//                                 weight_kg: set.weight_kg,
//                                 reps: set.reps,
//                                 distance_meters: set.distance_meters,
//                                 duration_seconds: set.duration_seconds,
//                                 custom_metric: set.custom_metric,
//                             };
//                             // Include rep_range if it exists
//                             if (set.rep_range) {
//                                 setPayload.rep_range = set.rep_range;
//                             }
//                             return setPayload;
//                         }),
//                     })),
//                 };

//                 // Log request details before making the PUT request
//                 console.log(`[putRoutine] Preparing to update routine:`, {
//                     routineId,
//                     url: `https://api.hevyapp.com/v1/routines/${routineId}`,
//                     payload: JSON.stringify(updatePayload, null, 2),
//                     payloadSize: JSON.stringify(updatePayload).length,
//                     exercisesCount: updatePayload.exercises?.length || 0,
//                     day: incompleteDay.nthDay,
//                     week: weekNumber,
//                     apiKeyPrefix: hevyApiKey ? `${hevyApiKey.substring(0, 8)}...` : 'missing'
//                 });

//                 await putRoutine(routineId, updatePayload, hevyApiKey);
//                 console.log(`Successfully updated routine ${routineId} (day ${incompleteDay.nthDay}, week ${weekNumber}) with progressions`);
//             }
//         } catch (error) {
//             console.error(`[putRoutine] Failed to update routine for day ${incompleteDay.nthDay} in week ${weekNumber}:`, {
//                 error: error instanceof Error ? error.message : String(error),
//                 errorStack: error instanceof Error ? error.stack : undefined,
//                 routineId,
//                 day: incompleteDay.nthDay,
//                 week: weekNumber
//             });
//             // Continue with other days even if one fails
//         }
//     }

//     return progressedExercises;
// };
