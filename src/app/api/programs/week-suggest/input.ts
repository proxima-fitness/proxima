/**
 * @module programs/week-suggest/input
 *
 * Pure input assembly + output contract for **AI week suggest** (ADR 0012 / 01).
 * Resolves which week to suggest from Program–Hevy links, renders the prompt
 * (prior-week prescription + logs + target week), and normalizes the model's
 * change batch so it can only touch week N+1.
 *
 * Suggested changes are `mutateProgram` registry ops (`update_set`,
 * `add_exercise_notes`) so the apply path (Sub-plan 3) reuses existing
 * mutation handlers instead of a bespoke patch format.
 *
 * Depends on: zod, program-builder/mutations/schemas, @/lib/weightUtils
 * Used by: ./route.ts, ./generate.ts, AiWeekSuggestPanel (Sub-plan 2)
 */

import { z } from "zod";

import {
    addExerciseNotesSchema,
    updateSetSchema,
} from "@/components/program-builder/mutations/schemas";
import { formatWeight, getWeightUnit } from "@/lib/weightUtils";

/** Max suggested changes kept from one generation (panel stays skimmable). */
export const MAX_WEEK_SUGGEST_CHANGES = 12;

/** Max logged sessions fed to the model for the completed week. */
export const MAX_LOGGED_WORKOUTS_IN_PROMPT = 14;

/** Ops a week suggestion may propose — progression + coaching notes only. */
export const weekSuggestOperationSchema = z.discriminatedUnion("op", [
    updateSetSchema,
    addExerciseNotesSchema,
]);

export type TWeekSuggestOperation = z.infer<typeof weekSuggestOperationSchema>;

export const weekSuggestChangeSchema = z.object({
    /** One short user-facing line, e.g. "Bench press: 4 sets → 62.5 kg (+2.5)". */
    description: z.string().min(1).max(200),
    operation: weekSuggestOperationSchema,
});

export type TWeekSuggestChange = z.infer<typeof weekSuggestChangeSchema>;

export const weekSuggestModelOutputSchema = z.object({
    summary: z.string().min(1).max(600),
    changes: z.array(weekSuggestChangeSchema),
});

export type TWeekSuggestModelOutput = z.infer<typeof weekSuggestModelOutputSchema>;

/** Why no suggestion is available yet — panel renders copy per code. */
export type TWeekSuggestNotReadyCode =
    | "no_completed_week"
    | "program_complete"
    | "already_exported"
    | "no_target_prescription";

export type TWeekSuggestResponse =
    | {
          status: "ok";
          programId: number;
          /** Completed week the suggestion reads from. */
          basedOnWeek: number;
          /** Week the changes target (basedOnWeek + 1). */
          targetWeek: number;
          summary: string;
          changes: TWeekSuggestChange[];
          generatedAt: string;
      }
    | {
          status: "not_ready";
          programId: number;
          code: TWeekSuggestNotReadyCode;
          message: string;
          basedOnWeek?: number;
          targetWeek?: number;
      };

export type TWeekSuggestLinkInput = {
    nth_week: number;
    completed_at: string | null;
    created_at: string;
};

export type TWeekSuggestTarget =
    | { ready: true; basedOnWeek: number; targetWeek: number }
    | { ready: false; code: TWeekSuggestNotReadyCode; message: string; basedOnWeek?: number };

/**
 * Picks the week to suggest: latest **Week complete** link N → target N+1.
 * Blocked when nothing is complete, the program has no week N+1, or N+1 is
 * already exported (that week is Edit current week's job, not suggest).
 *
 * @param links - Program–Hevy links for one program
 * @param programLength - Weeks in the prescription (null = unknown, no cap)
 */
export function resolveWeekSuggestTarget(
    links: readonly TWeekSuggestLinkInput[],
    programLength: number | null,
): TWeekSuggestTarget {
    const completedWeeks = links
        .filter((link) => link.completed_at != null)
        .map((link) => link.nth_week);

    if (completedWeeks.length === 0) {
        return {
            ready: false,
            code: "no_completed_week",
            message: "Mark the current week complete to get next-week suggestions.",
        };
    }

    const basedOnWeek = Math.max(...completedWeeks);
    const targetWeek = basedOnWeek + 1;

    if (programLength != null && programLength > 0 && targetWeek > programLength) {
        return {
            ready: false,
            code: "program_complete",
            message: `Week ${basedOnWeek} was the last week of this program.`,
            basedOnWeek,
        };
    }

    if (links.some((link) => link.nth_week === targetWeek)) {
        return {
            ready: false,
            code: "already_exported",
            message: `Week ${targetWeek} is already exported — use Edit current week to change it.`,
            basedOnWeek,
        };
    }

    return { ready: true, basedOnWeek, targetWeek };
}

/**
 * Window of logged sessions that count as the completed week's training.
 * Starts at the week's Export (link created) and ends at Week complete.
 *
 * @param link - Program–Hevy link for the completed week
 * @param now - Fallback upper bound when `completed_at` is unset
 */
export function weekLogWindow(
    link: TWeekSuggestLinkInput,
    now: Date = new Date(),
): { since: string; until: string } {
    return {
        since: link.created_at,
        until: link.completed_at ?? now.toISOString(),
    };
}

/**
 * Keeps logged workouts inside the completed week's window, oldest first.
 *
 * @param workouts - Logged workouts as Hevy routines (backup mirror)
 * @param window - `since`/`until` ISO bounds from {@link weekLogWindow}
 */
export function filterWorkoutsInWindow(
    workouts: readonly THevyRoutine[],
    window: { since: string; until: string },
): THevyRoutine[] {
    const since = Date.parse(window.since);
    const until = Date.parse(window.until);

    return workouts
        .filter((workout) => {
            const startedAt = workout.started_at ? Date.parse(workout.started_at) : NaN;
            if (Number.isNaN(startedAt)) {
                return false;
            }
            return startedAt >= since && startedAt <= until;
        })
        .sort((a, b) => (a.started_at ?? "").localeCompare(b.started_at ?? ""))
        .slice(0, MAX_LOGGED_WORKOUTS_IN_PROMPT);
}

function setLine(set: THevySets, isInLbs: boolean): string {
    const parts: string[] = [];

    if (set.rep_range) {
        parts.push(`reps ${set.rep_range.start}-${set.rep_range.end}`);
    } else if (set.reps != null) {
        parts.push(`reps ${set.reps}`);
    }

    if (set.weight_kg != null && set.weight_kg > 0) {
        parts.push(
            `${set.weight_kg} kg (${formatWeight(set.weight_kg, isInLbs, "kg")} ${getWeightUnit(isInLbs)})`,
        );
    }

    if (set.rpe != null) {
        parts.push(`RPE ${set.rpe}`);
    }

    if (set.duration_seconds != null && set.duration_seconds > 0) {
        parts.push(`${set.duration_seconds}s`);
    }

    if (set.type && set.type !== "normal") {
        parts.push(set.type);
    }

    return `      set ${set.index}: ${parts.length > 0 ? parts.join(", ") : "no targets"}`;
}

function routineBlock(routine: THevyRoutine, isInLbs: boolean, dayLabel: string): string {
    const lines = [`  ${dayLabel} "${routine.title}"`];

    if (routine.exercises.length === 0) {
        lines.push("    (no exercises)");
        return lines.join("\n");
    }

    for (const exercise of routine.exercises) {
        lines.push(`    exercise ${exercise.index}: ${exercise.title}`);
        for (const set of exercise.sets) {
            lines.push(setLine(set, isInLbs));
        }
    }

    return lines.join("\n");
}

function prescriptionBlock(
    routines: readonly THevyRoutine[],
    isInLbs: boolean,
): string {
    if (routines.length === 0) {
        return "  (no days)";
    }
    return routines
        .map((routine) => routineBlock(routine, isInLbs, `day ${routine.order ?? "?"} —`))
        .join("\n");
}

function loggedBlock(workouts: readonly THevyRoutine[], isInLbs: boolean): string {
    if (workouts.length === 0) {
        return "  (no logged sessions backed up for this window)";
    }
    return workouts
        .map((workout) =>
            routineBlock(workout, isInLbs, `${workout.started_at?.slice(0, 10) ?? "unknown date"} —`),
        )
        .join("\n");
}

export type TWeekSuggestPromptInput = {
    programTitle: string;
    basedOnWeek: number;
    targetWeek: number;
    /** Prescription for the completed week N. */
    completedWeekPrescription: readonly THevyRoutine[];
    /** Prescription for week N+1 — the only week changes may target. */
    targetWeekPrescription: readonly THevyRoutine[];
    /** Sessions logged during week N, oldest first. */
    loggedWorkouts: readonly THevyRoutine[];
    isInLbs: boolean;
};

/**
 * Renders the single-shot prompt for one week suggestion.
 * Deterministic — no clock, no network — so the wording is unit-testable.
 *
 * @param input - Program context, both prescription weeks, and week N logs
 */
export function buildWeekSuggestPrompt(input: TWeekSuggestPromptInput): string {
    const {
        programTitle,
        basedOnWeek,
        targetWeek,
        completedWeekPrescription,
        targetWeekPrescription,
        loggedWorkouts,
        isInLbs,
    } = input;

    const unit = getWeightUnit(isInLbs);
    const targetFolderId = targetWeek - 1;

    return [
        "You are an experienced strength coach reviewing one training week for a client.",
        `Program: "${programTitle}". Week ${basedOnWeek} is finished; propose week ${targetWeek}.`,
        "",
        `## Week ${basedOnWeek} prescription (what was planned)`,
        prescriptionBlock(completedWeekPrescription, isInLbs),
        "",
        `## Week ${basedOnWeek} logged sessions (what the client actually did)`,
        "Sessions come from the client's Hevy backup for the week window; unrelated sessions may appear — match by exercise title and ignore the rest.",
        loggedBlock(loggedWorkouts, isInLbs),
        "",
        `## Week ${targetWeek} prescription (what you are changing)`,
        prescriptionBlock(targetWeekPrescription, isInLbs),
        "",
        "## Task",
        `Compare planned vs logged, then propose conservative progression for week ${targetWeek} only.`,
        "Rules:",
        "- Progress what was hit cleanly; hold or reduce what was missed or logged at high RPE.",
        "- No changes at all is a valid answer — return an empty `changes` array with a summary saying the week stands.",
        `- Weights are stored in kg. The client reads ${unit}; keep increments sensible in ${unit} (${isInLbs ? "2.5–5 lbs" : "1–2.5 kg"} on most lifts).`,
        `- At most ${MAX_WEEK_SUGGEST_CHANGES} changes. Prefer few, high-signal ones.`,
        "- Do not add, remove, swap, or reorder exercises or days.",
        "",
        "## Output",
        "Respond with only a JSON object (no markdown fences):",
        "{",
        '  "summary": "2-3 sentences: how week N went and what week N+1 does about it",',
        '  "changes": [',
        '    { "description": "short user-facing line",',
        `      "operation": { "op": "update_set", "folderIds": [${targetFolderId}], "dayOrder": 1, "exerciseIndex": 0, "setIndex": 0, "set": { "weight_kg": 62.5 } } }`,
        "  ]",
        "}",
        "",
        "Operation rules:",
        `- \`folderIds\` is always [${targetFolderId}] (week ${targetWeek}).`,
        `- \`dayOrder\` is the day number shown above for week ${targetWeek}; \`exerciseIndex\` and \`setIndex\` are the 0-based indexes shown above.`,
        '- `update_set` patches only the fields you send: `weight_kg`, `reps`, `rpe`, `rep_range` ({ "start": n, "end": n }).',
        '- `add_exercise_notes` takes `notes` (a short cue) instead of `set`.',
        "- Every operation must target an exercise/set that exists in the week " +
            `${targetWeek} prescription above.`,
    ].join("\n");
}

function operationExistsInWeek(
    operation: TWeekSuggestOperation,
    targetWeekPrescription: readonly THevyRoutine[],
): boolean {
    const day = targetWeekPrescription.find(
        (routine) => Number(routine.order) === operation.dayOrder,
    );
    const exercise = day?.exercises[operation.exerciseIndex];
    if (!exercise) {
        return false;
    }
    if (operation.op === "update_set") {
        return exercise.sets[operation.setIndex] != null;
    }
    return true;
}

/**
 * Pins every change to week N+1 and drops ones that miss the prescription.
 * Guarantees "apply touches week N+1 only" before the panel ever sees a change.
 *
 * @param changes - Validated model changes
 * @param targetWeek - 1-based week N+1
 * @param targetWeekPrescription - Week N+1 routines the ops must resolve against
 */
export function normalizeWeekSuggestChanges(
    changes: readonly TWeekSuggestChange[],
    targetWeek: number,
    targetWeekPrescription: readonly THevyRoutine[],
): { changes: TWeekSuggestChange[]; dropped: number } {
    const kept: TWeekSuggestChange[] = [];
    let dropped = 0;

    for (const change of changes) {
        const operation = {
            ...change.operation,
            folderIds: [targetWeek - 1],
        } as TWeekSuggestOperation;

        if (!operationExistsInWeek(operation, targetWeekPrescription)) {
            dropped += 1;
            continue;
        }

        if (kept.length >= MAX_WEEK_SUGGEST_CHANGES) {
            dropped += 1;
            continue;
        }

        kept.push({ description: change.description, operation });
    }

    return { changes: kept, dropped };
}
