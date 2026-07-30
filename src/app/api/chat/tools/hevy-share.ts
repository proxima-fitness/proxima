/**
 * @module chat/tools/hevy-share
 *
 * Agent **Hevy share fetch** and **Hevy share import** tools - input schemas, output
 * shapes, and the model-facing text for a public Hevy share link the user pasted: a shared
 * routine folder, a single shared routine, or a completed workout someone logged.
 *
 * A workout link is the one kind whose numbers are a **record rather than a plan**, so its
 * output carries session metadata and framing that says so - see {@link workoutFramingForModel}.
 *
 * `fetchHevyShareFolder` is read-only by construction: the output carries the adapted week-0
 * routines so Andy can answer questions or plan against that split, and nothing touches
 * builder state. `importHevyShareFolder` returns the same seed, but marked `imported: true` so
 * the client hydrates it onto the grid - which is why it carries two extra gates
 * ({@link THevyShareImportRefusalReason}): the grid must be empty and the user must have
 * said yes. A refusal is an expected answer, not a failure, so it has no `error` field and
 * never reaches `ToolErrorPanel`.
 *
 * Failures arrive as `HevyShareError` from the pipeline; {@link hevyShareErrorOutput}
 * flattens them into the `{ error, message }` shape `ToolErrorPanel` already reads, adding
 * the "Hevy's share API may have changed" note when the reason points at Hevy's
 * undocumented endpoints rather than at the user's link.
 *
 * Deliberately holds no server client - only the pure error type - so the chat UI can
 * import these types without pulling the platform key path into the browser bundle.
 *
 * Depends on: zod, lib/hevy-share/share-errors
 * Used by: chat/tools/tools.ts (share tools), MessageBubbles (output types + hydrate)
 */
import { z } from 'zod';

import { isHevyShareError, type THevyShareErrorReason } from '@/lib/hevy-share/share-errors';
import type { THevyShareLoadResult } from '@/lib/hevy-share/load-share';
import type { THevyShareWorkoutMeta } from '@/lib/hevy-share/share-adapter';

export const fetchHevyShareFolderInputSchema = z.object({
    url: z
        .string()
        .min(1)
        .describe(
            'The public Hevy share link the user pasted - hevy.com/folder/{id}, hevy.com/routine/{shortId}, or hevy.com/workout/{id} for a completed workout they logged. Pass it exactly as they wrote it; do not invent or guess a link.',
        ),
});

export type TFetchHevyShareFolderInput = z.infer<typeof fetchHevyShareFolderInputSchema>;

export const importHevyShareFolderInputSchema = z.object({
    url: z
        .string()
        .min(1)
        .describe(
            'The public Hevy share link to load - hevy.com/folder/{id}, hevy.com/routine/{shortId}, or hevy.com/workout/{id} for a completed workout. Pass it exactly as the user wrote it; do not invent or guess a link.',
        ),
    confirmed: z
        .boolean()
        .describe(
            'Pass true only after the user explicitly agreed, in their own message, to load this share onto the program grid. Pasting a link is not agreement, and neither is asking about it. Never set this true on your own initiative.',
        ),
});

export type TImportHevyShareFolderInput = z.infer<typeof importHevyShareFolderInputSchema>;

/** A share that was read successfully. `routines` are context only - the grid is untouched. */
export type THevyShareToolSuccess = {
    /** Canonical `https://hevy.com/…` form of the link that was read. */
    url: string;
    /** What the link pointed at. A `workout` is a logged session; the others are prescriptions. */
    kind: 'folder' | 'routine' | 'workout';
    /** Shared folder title or workout name, when the payload carried one. */
    title: string | null;
    /** Days in the seed (week 0 only). Always 1 for a workout. */
    dayCount: number;
    /** Total exercise rows across all days. */
    exerciseCount: number;
    /** Week-0 seed days with **builder routine keys**; no foreign Hevy routine/folder IDs. */
    routines: THevyRoutine[];
    /** Session facts for a `workout` link; `null` for a folder or routine. */
    workout: THevyShareWorkoutMeta | null;
};

/** Chip and summary label when a share carried no title of its own. */
export const SHARE_KIND_LABELS: Record<THevyShareToolSuccess['kind'], string> = {
    folder: 'Shared folder',
    routine: 'Shared routine',
    workout: 'Completed workout',
};

/** A share read that failed, in the `{ error, message }` shape `ToolErrorPanel` summarizes. */
export type THevyShareToolError = {
    /** Short code; also keyed in the UI's friendly-copy table. */
    error: string;
    /** User-facing copy shown in `ToolErrorPanel`. */
    message: string;
    reason: THevyShareErrorReason;
};

export type TFetchHevyShareFolderToolOutput = THevyShareToolSuccess | THevyShareToolError;

/**
 * Why an import was refused before Hevy was called at all.
 *
 * `grid_not_empty` covers the **Edit path** too - an Edit-path chat always arrives with a
 * loaded split, so "the grid has exercises" is the same refusal in both cases.
 */
export type THevyShareImportRefusalReason = 'grid_not_empty' | 'not_confirmed';

/**
 * An import that was correctly declined. Expected behaviour, so no `error` field: the chat
 * shows a plain note and `ToolErrorPanel` stays out of it.
 */
export type THevyShareImportRefusal = {
    refused: THevyShareImportRefusalReason;
    /** User-facing copy for the chat chip. */
    message: string;
};

/** A share the client should hydrate onto the grid as week 0. */
export type THevyShareImportSuccess = THevyShareToolSuccess & {
    /** Discriminator the client checks before touching builder state. */
    imported: true;
};

export type TImportHevyShareFolderToolOutput =
    | THevyShareImportSuccess
    | THevyShareImportRefusal
    | THevyShareToolError;

export type THevyShareToolOutput = TFetchHevyShareFolderToolOutput | TImportHevyShareFolderToolOutput;

/** Short code per failure reason - the `error` field, and the UI's friendly-copy key. */
const SHARE_ERROR_CODES: Record<THevyShareErrorReason, string> = {
    invalid_url: 'Not a Hevy share link',
    not_configured: 'Hevy share reading unavailable',
    not_found: 'Hevy share not found',
    rate_limited: 'Hevy share limit reached',
    upstream: 'Failed to read Hevy share',
    malformed: 'Failed to read Hevy share',
};

/**
 * Reasons that mean Hevy's undocumented web endpoints moved under us, rather than the
 * user pasting something we cannot use. Only these get the "API may have changed" note -
 * saying it on a typo'd link would just confuse the user.
 */
const HEVY_API_CHANGED_REASONS: ReadonlySet<THevyShareErrorReason> = new Set<THevyShareErrorReason>([
    'upstream',
    'malformed',
]);

const HEVY_API_CHANGED_NOTE = "Hevy's share API may have changed.";

export function isHevyShareToolError(
    output: THevyShareToolOutput,
): output is THevyShareToolError {
    return 'error' in output;
}

export function isHevyShareImportRefusal(
    output: TImportHevyShareFolderToolOutput,
): output is THevyShareImportRefusal {
    return 'refused' in output;
}

/** True only for an import the client should apply to the grid. */
export function isHevyShareImportSuccess(
    output: TImportHevyShareFolderToolOutput,
): output is THevyShareImportSuccess {
    return 'imported' in output && output.imported === true;
}

/** User-facing copy per refusal reason - what happened, not what Andy should do next. */
const IMPORT_REFUSAL_MESSAGES: Record<THevyShareImportRefusalReason, string> = {
    grid_not_empty:
        'Nothing was loaded - the program grid already has exercises. A Hevy share loads onto an empty grid only.',
    not_confirmed:
        'Nothing was loaded - loading a Hevy share onto the grid needs your go-ahead first.',
};

export function hevyShareImportRefusal(
    refused: THevyShareImportRefusalReason,
): THevyShareImportRefusal {
    return { refused, message: IMPORT_REFUSAL_MESSAGES[refused] };
}

/** Adapts a successful load into tool output, adding the counts the UI and model summarize. */
export function hevyShareToolOutput(result: THevyShareLoadResult): THevyShareToolSuccess {
    return {
        url: result.url,
        kind: result.target.kind,
        title: result.title,
        dayCount: result.routines.length,
        exerciseCount: result.routines.reduce(
            (total, routine) => total + (routine.exercises?.length ?? 0),
            0,
        ),
        routines: result.routines,
        workout: result.workout,
    };
}

/** Same seed as a fetch, marked so the client knows it is cleared to hydrate the grid. */
export function hevyShareImportOutput(result: THevyShareLoadResult): THevyShareImportSuccess {
    return { ...hevyShareToolOutput(result), imported: true };
}

/**
 * Flattens any thrown value into tool output.
 *
 * Non-`HevyShareError` throws are unexpected shapes from the pipeline, so they are treated
 * as `upstream` - loud, with the API-changed note, rather than swallowed.
 */
export function hevyShareErrorOutput(error: unknown): THevyShareToolError {
    const reason: THevyShareErrorReason = isHevyShareError(error) ? error.reason : 'upstream';
    const detail = isHevyShareError(error)
        ? error.message
        : 'Something went wrong reading that Hevy share link.';
    const note = HEVY_API_CHANGED_REASONS.has(reason) ? ` ${HEVY_API_CHANGED_NOTE}` : '';

    return {
        error: SHARE_ERROR_CODES[reason],
        message: `${detail}${note}`,
        reason,
    };
}

/** One-line share description for the chat tool chip (`Push Pull Legs · 3 days · 18 exercises`). */
export function summarizeHevyShareResult(output: THevyShareToolSuccess): string {
    const label = output.title ?? SHARE_KIND_LABELS[output.kind];
    const exercises = `${output.exerciseCount} exercise${output.exerciseCount === 1 ? '' : 's'}`;

    // A completed workout is one session by definition - "1 day" would just be noise.
    if (output.kind === 'workout') {
        return `${label} · ${exercises}`;
    }

    const days = `${output.dayCount} day${output.dayCount === 1 ? '' : 's'}`;

    return `${label} · ${days} · ${exercises}`;
}

/** Session facts as a model-readable clause, e.g. `logged by @sam, started …, 73 min, ~11457 kg volume`. */
function describeWorkoutMetaForModel(meta: THevyShareWorkoutMeta): string {
    const parts: string[] = [];

    if (meta.username) parts.push(`logged by @${meta.username}`);
    if (meta.startedAt) parts.push(`started ${meta.startedAt}`);
    if (meta.durationSeconds !== null) parts.push(`${Math.round(meta.durationSeconds / 60)} min`);
    if (meta.estimatedVolumeKg !== null) {
        parts.push(`~${Math.round(meta.estimatedVolumeKg)} kg estimated volume`);
    }

    return parts.length > 0 ? `Session: ${parts.join(', ')}. ` : '';
}

/**
 * The one thing the model must not get wrong about a workout link: these numbers are a record,
 * not a plan. Without this it reads logged loads as prescriptions and "critiques" the programming
 * of a session that already happened.
 */
function workoutFramingForModel(output: THevyShareToolSuccess): string {
    if (output.kind !== 'workout') return '';

    return (
        'This is a **completed workout** someone logged, not a prescribed routine: every weight, rep, RPE and set type below is what was actually performed in that one session. ' +
        (output.workout ? describeWorkoutMetaForModel(output.workout) : '')
    );
}

/**
 * Drops builder bookkeeping the model has no use for - timestamps, and the `shared_template`
 * mint metadata Week Export reads off sharer-owned exercises. The client still hydrates from the
 * tool output itself, which keeps both.
 */
function routinesForModel(routines: THevyRoutine[]) {
    return routines.map(({ created_at: _created, updated_at: _updated, ...routine }) => ({
        ...routine,
        exercises: routine.exercises.map(
            ({ shared_template: _shared, ...exercise }) => exercise,
        ),
    }));
}

/** Framing for a read that failed - shared by both share tools, so neither invents contents. */
function formatShareErrorForModel(error: THevyShareToolError, nothingHappened: string): string {
    return (
        `Error: ${error.message} ${nothingHappened} ` +
        'Tell the user in plain language and do not describe or invent the share contents. ' +
        'Retry at most once, and only if a different link or a moment later could plausibly help.'
    );
}

/** Structured share contents for the LLM after fetchHevyShareFolder executes. */
export function formatHevyShareForModel(output: TFetchHevyShareFolderToolOutput): string {
    if (isHevyShareToolError(output)) {
        return formatShareErrorForModel(output, 'Nothing was read.');
    }

    return (
        `Read-only Hevy share (${output.kind}): ${summarizeHevyShareResult(output)} - ${output.url}. ` +
        workoutFramingForModel(output) +
        'Nothing was added to the program grid and no Hevy account was connected. ' +
        'Days are the share as written, mapped to week 0; exercise_template_id values come from the share. ' +
        'Use this to answer questions about the share or as planning context. ' +
        'Do not load it into the builder unless the user explicitly asks for that - loading is a separate confirmed step.\n\n' +
        JSON.stringify(routinesForModel(output.routines))
    );
}

/** What Andy should do next per refusal reason - the tool has already declined. */
const IMPORT_REFUSAL_MODEL_GUIDANCE: Record<THevyShareImportRefusalReason, string> = {
    grid_not_empty:
        'The grid already has exercises, so a share seed would overwrite the user\'s work. Do not retry importHevyShareFolder. ' +
        'Tell them plainly that loading a share needs an empty program, and offer the alternatives: read the share with fetchHevyShareFolder and build a program inspired by it, or start a new program first.',
    not_confirmed:
        'Ask the user, in your visible reply, whether they want that shared week loaded onto the grid exactly as written. ' +
        'Only call importHevyShareFolder again with confirmed: true after they answer yes in their own message.',
};

/** Result framing for the LLM after importHevyShareFolder executes. */
export function formatHevyShareImportForModel(output: TImportHevyShareFolderToolOutput): string {
    if (isHevyShareImportRefusal(output)) {
        return `Import refused: ${output.message} ${IMPORT_REFUSAL_MODEL_GUIDANCE[output.refused]}`;
    }

    if (isHevyShareToolError(output)) {
        return formatShareErrorForModel(output, 'Nothing was loaded and the grid is unchanged.');
    }

    const workoutNote =
        output.kind === 'workout'
            ? 'It came from a completed workout, so the loads on the grid are what was actually lifted that session, now sitting as week 1 prescriptions - say so, and offer to adjust them rather than assuming they are the right targets. '
            : '';

    return (
        `Hevy share imported (${output.kind}): ${summarizeHevyShareResult(output)} - ${output.url}. ` +
        'The builder grid now holds these days as its first week, exactly as the share had them - call it week 1 when you talk to the user. ' +
        workoutNote +
        'Nothing was pushed or synced to Hevy, the shared folder was not touched, and no Hevy account was connected. ' +
        'Do not call buildWeek to recreate this week - it is already on the grid; use mutateProgram for any edits. ' +
        'Confirm what landed in one or two lines, then offer expanding it to more weeks or periodizing it as a separate step - ask first, do not start.\n\n' +
        JSON.stringify(routinesForModel(output.routines))
    );
}
