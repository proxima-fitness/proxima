/**
 * @module chat/tools/hevy-share
 *
 * Agent **Hevy share fetch** tool - input schema, output shape, and the model-facing
 * text for a public Hevy share link the user pasted.
 *
 * Read-only by construction: the output carries the adapted week-0 routines so Andy can
 * answer questions or plan against that split, and nothing here touches builder state.
 * **Hevy share import** is the separate, confirmed New-path step (sub-plan 3).
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
 * Used by: chat/tools/tools.ts (fetchHevyShare tool), MessageBubbles (output type)
 */
import { z } from 'zod';

import { isHevyShareError, type THevyShareErrorReason } from '@/lib/hevy-share/share-errors';
import type { THevyShareLoadResult } from '@/lib/hevy-share/load-share';

export const fetchHevyShareInputSchema = z.object({
    url: z
        .string()
        .min(1)
        .describe(
            'The public Hevy share link the user pasted - hevy.com/folder/{id} or hevy.com/routine/{shortId}. Pass it exactly as they wrote it; do not invent or guess a link.',
        ),
});

export type TFetchHevyShareInput = z.infer<typeof fetchHevyShareInputSchema>;

/** A share that was read successfully. `routines` are context only - the grid is untouched. */
export type THevyShareToolSuccess = {
    /** Canonical `https://hevy.com/…` form of the link that was read. */
    url: string;
    /** What the link pointed at. */
    kind: 'folder' | 'routine';
    /** Shared folder title, when the payload carried one. */
    title: string | null;
    /** Days in the seed (week 0 only). */
    dayCount: number;
    /** Total exercise rows across all days. */
    exerciseCount: number;
    /** Week-0 seed days with **builder routine keys**; no foreign Hevy routine/folder IDs. */
    routines: THevyRoutine[];
};

/** A share read that failed, in the `{ error, message }` shape `ToolErrorPanel` summarizes. */
export type THevyShareToolError = {
    /** Short code; also keyed in the UI's friendly-copy table. */
    error: string;
    /** User-facing copy shown in `ToolErrorPanel`. */
    message: string;
    reason: THevyShareErrorReason;
};

export type TFetchHevyShareToolOutput = THevyShareToolSuccess | THevyShareToolError;

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
    output: TFetchHevyShareToolOutput,
): output is THevyShareToolError {
    return 'error' in output;
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
    };
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
    const label = output.title ?? (output.kind === 'folder' ? 'Shared folder' : 'Shared routine');
    const days = `${output.dayCount} day${output.dayCount === 1 ? '' : 's'}`;
    const exercises = `${output.exerciseCount} exercise${output.exerciseCount === 1 ? '' : 's'}`;

    return `${label} · ${days} · ${exercises}`;
}

/** Drops builder bookkeeping the model has no use for. */
function routinesForModel(routines: THevyRoutine[]) {
    return routines.map(({ created_at: _created, updated_at: _updated, ...routine }) => routine);
}

/** Structured share contents for the LLM after fetchHevyShare executes. */
export function formatHevyShareForModel(output: TFetchHevyShareToolOutput): string {
    if (isHevyShareToolError(output)) {
        return (
            `Error: ${output.message} ` +
            'Nothing was read. Tell the user in plain language and do not describe or invent the share contents. ' +
            'Retry at most once, and only if a different link or a moment later could plausibly help.'
        );
    }

    return (
        `Read-only Hevy share (${output.kind}): ${summarizeHevyShareResult(output)} - ${output.url}. ` +
        'Nothing was added to the program grid and no Hevy account was connected. ' +
        'Days are the share as written, mapped to week 0; exercise_template_id values come from the share. ' +
        'Use this to answer questions about the share or as planning context. ' +
        'Do not load it into the builder unless the user explicitly asks for that - loading is a separate confirmed step.\n\n' +
        JSON.stringify(routinesForModel(output.routines))
    );
}
