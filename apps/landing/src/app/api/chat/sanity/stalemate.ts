/**
 * @module chat/sanity/stalemate
 *
 * Request-scoped **Program stalemate** (ADR 0027 / 01, C8; ADR 0029 / 02).
 * The same honor id or code-gate error twice this turn stops `buildProgram` /
 * `mutateProgram`. Schema, empty days, bad ids, and structural stamp Soft-fails
 * (`missingWave` / `missingRoles` / `emptyMains`) are not counted. Code
 * deload / peak hardness misses (`phaseHardness.*`, ADR 0032 C2) count and
 * keep the clear-preference + **Fix it.** actions. Same-week
 * skip lives on the stash; the card click's next request sets it from the
 * exact user text.
 *
 * Injury / equipment pairs (ADR 0030 / 03, C6–C7) count per pair id, so a
 * different pair can still Soft-fail-retry. The escalate card rolls up every
 * pair miss this request, each with remove-that-constraint (**User-stated
 * change**) and replace-that-lift (a coach retry message, not a **User-stated
 * exception**). Preferred split, variability, and warmup are not counted.
 *
 * Depends on: ./types, ../constraints/types, ../constraints/initialize
 * Used by: tools.ts, week-coverage.ts, ProgramStalemateCard
 */

import { sanitizeExcludedEquipment } from "../constraints/initialize";
import type { TConstraintProfile } from "../constraints/types";
import { CONSTRAINT_QUESTION_ID_SET } from "./questions";
import type {
    IProgramSanityStash,
    IProgramStalematePayload,
    TConstraintPairMiss,
    TProgramStalemateAction,
    TProgramStalemateChip,
    TProgramStalemateKind,
    TStalemateChipField,
    TStalematePreferenceKey,
} from "./types";

/** Tool `error` on a stop after escalate, and on later calls this request. */
export const STALEMATE_ERROR = "program_stalemate";

/** `toModelOutput` on escalate. Must not tell Andy to call buildProgram again. */
export const STALEMATE_MODEL_STOP =
    "Program stalemate. The program grid is unchanged. Do not call buildProgram or mutateProgram again this turn. Wait for the user.";

/** Card click / typed exact string that sets stash same-week skip this request. */
export const SAME_WEEK_SKIP_MESSAGE = "Same week every week is what I want";

export const MAKE_LATER_WEEKS_DIFFERENT_MESSAGE = "Make later weeks different.";

export const USER_REQUESTED_EXCEPTION_MESSAGE = "That's what I asked for";

export const FIX_IT_MESSAGE = "Fix it.";

/** Opening words of every replace-that-lift click (ADR 0030 C6). */
export const REPLACE_LIFT_MESSAGE_PREFIX = "Replace this lift:";

/**
 * Exact user message for a pair's replace-that-lift button. Andy swaps the
 * lift and calls buildProgram again; the saved constraint stays.
 *
 * @param pair - Pair miss the card row names
 */
export function replaceLiftMessage(pair: TConstraintPairMiss): string {
    const limit = pair.field === "injuries" ? "injury" : "excluded equipment";
    return `${REPLACE_LIFT_MESSAGE_PREFIX} swap ${pair.exerciseTitle} for a lift that works with my ${limit} "${pair.constraint}".`;
}

/**
 * Card header when more than one pair missed. A single pair shows its own `why`.
 *
 * @param count - Rolled-up pair misses
 */
export function pairRollupWhy(count: number): string {
    return `${count} lifts still conflict with your saved limits.`;
}

const ESCALATE_ERROR_CODES = new Set(["constraint_violation", "weekCoverage"]);

/** Structural stamp Soft-fails: Andy retries; never escalate to a chip-less card. */
const STRUCTURAL_STAMP_NO_ESCALATE = new Set([
    "periodizationStamp.missingWave",
    "periodizationStamp.missingRoles",
    "periodizationStamp.emptyMains",
]);

/** Exercise fields the Mutation constraint gate `matchesAny` reads. */
export type TStalemateExerciseMeta = {
    equipment?: string | null;
    primary_muscle_group?: string | null;
    title?: string;
};

/**
 * Soft-fail `error` strings that count toward a Program stalemate.
 * Empty days, bad ids, Zod, `readProgram_required`, and structural stamp
 * Soft-fails return null.
 *
 * @param error - Tool result `error` string
 */
export function stalemateKeyForError(error: string): string | null {
    // Preferred split, variability, and warmup soft-fail for a retry. They
    // never become a Program stalemate card.
    if (CONSTRAINT_QUESTION_ID_SET.has(error)) return null;
    if (STRUCTURAL_STAMP_NO_ESCALATE.has(error)) return null;
    if (ESCALATE_ERROR_CODES.has(error)) return error;
    if (
        error.startsWith("constraint.") ||
        error.startsWith("training.") ||
        error.startsWith("skill.") ||
        error.startsWith("phaseHardness.") ||
        error.startsWith("periodizationStamp")
    ) {
        return error;
    }
    return null;
}

/**
 * Increment the request-scoped count for `key`. Two of the same key this
 * request is a Program stalemate. A different key does not increment the first.
 * Missing stash or a non-counted error is never an escalate.
 *
 * @param stash - Per-request bag; omitted in tests that do not exercise stalemate
 * @param key - Honor id or code-gate error, or null to skip
 */
export function shouldEscalate(
    stash: IProgramSanityStash | undefined,
    key: string | null,
): boolean {
    return escalateKey(stash, key ? [key] : []) !== null;
}

/**
 * Increment every distinct key from one Soft-fail (the `error` plus each
 * missed pair id, ADR 0030 C7). Returns the first key that reached two this
 * request, or null. Keys that did not escalate still keep their count.
 *
 * @param stash - Per-request bag; omitted in tests that do not exercise stalemate
 * @param keys - Counted keys from one Soft-fail
 */
export function escalateKey(
    stash: IProgramSanityStash | undefined,
    keys: string[],
): string | null {
    if (!stash || keys.length === 0) return null;
    if (!stash.softFailCounts) stash.softFailCounts = {};
    let escalated: string | null = null;
    for (const key of new Set(keys)) {
        const count = (stash.softFailCounts[key] ?? 0) + 1;
        stash.softFailCounts[key] = count;
        if (count >= 2 && !escalated) escalated = key;
    }
    if (escalated) stash.stalemateStopped = true;
    return escalated;
}

/**
 * Keep each pair miss this request for the rollup card. A repeat id replaces
 * its row in place so the card shows the latest `why`.
 *
 * @param stash - Per-request bag
 * @param pairs - Pair misses from one Soft-fail
 */
export function recordConstraintPairMisses(
    stash: IProgramSanityStash | undefined,
    pairs: TConstraintPairMiss[],
): void {
    if (!stash || pairs.length === 0) return;
    const rows = stash.constraintPairMisses ?? [];
    for (const pair of pairs) {
        const index = rows.findIndex((row) => row.id === pair.id);
        if (index === -1) rows.push(pair);
        else rows[index] = pair;
    }
    stash.constraintPairMisses = rows;
}

/**
 * Set the same-week skip when this turn's user text is the card's exact skip
 * phrase. Survives the click because the next request's `userMessage` is that
 * phrase. A paraphrase Andy might ignore does not set the flag.
 *
 * @param stash - Per-request bag
 * @param userMessage - Last user text this turn
 */
export function applySameWeekSkipFromUserMessage(
    stash: IProgramSanityStash | undefined,
    userMessage: string | undefined,
): void {
    if (!stash) return;
    if (userMessage?.trim() === SAME_WEEK_SKIP_MESSAGE) {
        stash.skipSameWeekCoverage = true;
    }
}

/**
 * Case-insensitive equality remove, same rule as `patchStringArray` remove.
 * Chip persist uses this so only the clicked stored string is dropped.
 *
 * @param arr - Saved Constraint profile strings
 * @param value - Exact chip string
 */
export function removeConstraintString(arr: string[], value: string): string[] {
    const needle = value.toLowerCase();
    return arr.filter((item) => item.toLowerCase() !== needle);
}

function matchesAnyTerm(value: string | null | undefined, term: string): boolean {
    if (!value || !term) return false;
    return value.toLowerCase().includes(term.toLowerCase());
}

function pushChip(
    chips: TProgramStalemateChip[],
    seen: Set<string>,
    field: TStalemateChipField,
    value: string,
): void {
    const id = `${field}:${value.toLowerCase()}`;
    if (seen.has(id) || !value) return;
    seen.add(id);
    chips.push({ field, value });
}

/**
 * Exact saved rows the Mutation constraint gate already hit (`matchesAny`).
 *
 * @param profile - Active Constraint profile
 * @param exercises - Incoming / built exercise meta the gate saw
 */
export function matchedConstraintChips(
    profile: TConstraintProfile,
    exercises: TStalemateExerciseMeta[],
): TProgramStalemateChip[] {
    const chips: TProgramStalemateChip[] = [];
    const seen = new Set<string>();
    const excludedEquipment = sanitizeExcludedEquipment(profile.excludedEquipment);
    for (const exercise of exercises) {
        for (const term of excludedEquipment) {
            if (matchesAnyTerm(exercise.equipment, term)) {
                pushChip(chips, seen, "excludedEquipment", term);
            }
        }
        for (const term of profile.excludedAreas) {
            if (matchesAnyTerm(exercise.primary_muscle_group, term)) {
                pushChip(chips, seen, "excludedAreas", term);
            }
        }
        for (const term of profile.injuries) {
            if (matchesAnyTerm(exercise.primary_muscle_group, term)) {
                pushChip(chips, seen, "injuries", term);
            }
        }
    }
    return chips;
}

function kindForKey(key: string): TProgramStalemateKind {
    if (key === "weekCoverage") return "weekCoverage";
    if (key.startsWith("training.") || key.startsWith("skill.")) return "training";
    return "constraint";
}

function whyForKey(key: string): string {
    if (key === "weekCoverage") {
        return "Later weeks still copy week 1. Same week every week, or make later weeks different?";
    }
    if (key === "constraint_violation") {
        return "A saved injury or health limit still conflicts with this program.";
    }
    if (key === "phaseHardness.peak") {
        return "The peak week still isn't harder than the week before it.";
    }
    if (key === "phaseHardness.deload") {
        return "The deload week still isn't easier than the week before it.";
    }
    if (key.startsWith("training.") || key.startsWith("skill.")) {
        return "This program doesn't match the training you asked for.";
    }
    if (key.startsWith("constraint.")) {
        return "This program still conflicts with a saved training constraint.";
    }
    return "I couldn't land this program. Choose below or type a different ask.";
}

function chipsForKey(
    key: string,
    profile: TConstraintProfile | null | undefined,
    exercises: TStalemateExerciseMeta[] | undefined,
): TProgramStalemateChip[] {
    if (!profile) return [];
    if (key === "constraint_violation") {
        return matchedConstraintChips(profile, exercises ?? []);
    }
    return [];
}

function fixItAction(): TProgramStalemateAction {
    return { label: FIX_IT_MESSAGE, message: FIX_IT_MESSAGE };
}

function preferenceClearAction(
    key: TStalematePreferenceKey,
    label: string,
    message: string,
): TProgramStalemateAction {
    return {
        label,
        message,
        preference: { key, value: "" },
    };
}

/**
 * Clear-preference buttons for a counted phase-hardness miss, plus **Fix it.**
 * Split, variability, and warmup never reach this card.
 *
 * @param key - Counted Soft-fail id
 */
function preferenceActionsForKey(key: string): TProgramStalemateAction[] {
    switch (key) {
        case "phaseHardness.peak":
            return [
                preferenceClearAction(
                    "peakWeek",
                    "I don't need a peak week",
                    "I no longer want a peak week",
                ),
                fixItAction(),
            ];
        case "phaseHardness.deload":
            return [
                preferenceClearAction(
                    "deloadWeek",
                    "I don't need a deload week",
                    "I no longer want a deload week",
                ),
                fixItAction(),
            ];
        default:
            return [];
    }
}

/**
 * Card payload for an escalated Soft-fail. Chips are exact saved strings.
 * Phase-hardness misses and empty-chip constraint misses carry `actions`. When
 * `key` is a pair id, the card is the pair rollup: every pair this request,
 * each with its own fork, plus **Fix it.**
 *
 * @param key - Counted honor id or code-gate error
 * @param profile - Active Constraint profile, if any
 * @param exercises - Gate exercises when `key` is `constraint_violation`
 * @param pairs - Every pair miss this request (stash rollup)
 */
export function buildStalematePayload(
    key: string,
    profile: TConstraintProfile | null | undefined,
    exercises?: TStalemateExerciseMeta[],
    pairs: TConstraintPairMiss[] = [],
): IProgramStalematePayload {
    if (pairs.some((pair) => pair.id === key)) {
        return {
            chips: [],
            key,
            kind: "constraint",
            why: pairs.length === 1 ? pairs[0].why : pairRollupWhy(pairs.length),
            actions: [fixItAction()],
            pairs,
        };
    }
    const kind = kindForKey(key);
    const chips = chipsForKey(key, profile, exercises);
    let actions = preferenceActionsForKey(key);
    if (kind === "constraint" && chips.length === 0 && actions.length === 0) {
        actions = [fixItAction()];
    }
    return {
        chips,
        key,
        kind,
        why: whyForKey(key),
        ...(actions.length > 0 ? { actions } : {}),
    };
}

function isChip(value: unknown): value is TProgramStalemateChip {
    if (!value || typeof value !== "object") return false;
    const record = value as { field?: unknown; value?: unknown };
    return (
        (record.field === "injuries" ||
            record.field === "excludedEquipment" ||
            record.field === "excludedAreas") &&
        typeof record.value === "string" &&
        record.value.length > 0
    );
}

const PREFERENCE_KEYS = new Set<string>([
    "splitType",
    "exerciseVariability",
    "deloadWeek",
    "peakWeek",
    "warmupExercises",
]);

function isPairMiss(value: unknown): value is TConstraintPairMiss {
    if (!value || typeof value !== "object") return false;
    const record = value as Partial<Record<keyof TConstraintPairMiss, unknown>>;
    return (
        (record.field === "injuries" || record.field === "excludedEquipment") &&
        typeof record.id === "string" &&
        record.id.length > 0 &&
        typeof record.constraint === "string" &&
        record.constraint.length > 0 &&
        typeof record.exerciseTitle === "string" &&
        record.exerciseTitle.length > 0 &&
        typeof record.why === "string"
    );
}

function isAction(value: unknown): value is TProgramStalemateAction {
    if (!value || typeof value !== "object") return false;
    const record = value as {
        label?: unknown;
        message?: unknown;
        preference?: { key?: unknown; value?: unknown };
    };
    if (typeof record.label !== "string" || !record.label) return false;
    if (typeof record.message !== "string" || !record.message) return false;
    if (record.preference === undefined) return true;
    if (!record.preference || typeof record.preference !== "object") return false;
    return (
        typeof record.preference.key === "string" &&
        PREFERENCE_KEYS.has(record.preference.key) &&
        typeof record.preference.value === "string"
    );
}

/**
 * Read a card payload off a tool output. Null when this miss is not a stalemate.
 *
 * @param output - buildProgram / mutateProgram tool output
 */
export function readStalematePayload(output: unknown): IProgramStalematePayload | null {
    if (!output || typeof output !== "object") return null;
    const record = output as { stalemate?: unknown };
    const payload = record.stalemate;
    if (!payload || typeof payload !== "object") return null;
    const body = payload as {
        chips?: unknown;
        key?: unknown;
        kind?: unknown;
        why?: unknown;
        actions?: unknown;
        pairs?: unknown;
    };
    if (typeof body.key !== "string" || !body.key) return null;
    if (
        body.kind !== "constraint" &&
        body.kind !== "weekCoverage" &&
        body.kind !== "training"
    ) {
        return null;
    }
    if (typeof body.why !== "string") return null;
    const chips = Array.isArray(body.chips) ? body.chips.filter(isChip) : [];
    const actions = Array.isArray(body.actions) ? body.actions.filter(isAction) : undefined;
    const pairs = Array.isArray(body.pairs) ? body.pairs.filter(isPairMiss) : undefined;
    return {
        chips,
        key: body.key,
        kind: body.kind,
        why: body.why,
        ...(actions && actions.length > 0 ? { actions } : {}),
        ...(pairs && pairs.length > 0 ? { pairs } : {}),
    };
}

/**
 * True when Andy must stop this turn. Escalate keeps the original honor
 * `error` for Agent debug and adds `stalemate`. Later calls use `program_stalemate`.
 *
 * @param output - Tool result
 */
export function isStalemateOutput(output: unknown): boolean {
    if (readStalematePayload(output)) return true;
    if (!output || typeof output !== "object") return false;
    return (output as { error?: unknown }).error === STALEMATE_ERROR;
}
