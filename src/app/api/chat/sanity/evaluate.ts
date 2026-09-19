/**
 * @module chat/sanity/evaluate
 *
 * One TypeSafe call over {@link buildSanityQuestions}, then the C3–C5 fail
 * policy (ADR 0025 / 03). Constraint misses reject even at low confidence.
 * Training / skill misses Soft-fail only when Andy authored the snapshot and
 * the user did not ask; low confidence fail-opens.
 *
 * Missing `TYPESAFE_API_KEY` or a TypeSafe transport error fail-opens Jev
 * questions so chat stays up. Slice 2 week-coverage still ran in the caller.
 *
 * Depends on: ./questions, ./types
 * Used by: tools.ts
 */

import {
    buildSanityQuestions,
    CONSTRAINT_QUESTION_ID_SET,
    TRAINING_OR_SKILL_QUESTION_ID_SET,
    userRequestedId,
    type TSanityQuestions,
} from "./questions";
import type { TProgramSanitySnapshot } from "./types";

const SYSTEM_ONE_URL = "https://api.typesafe.ai/v1/systemone";

/**
 * Constraint honor floor. Below this (including ~0.5) is a miss.
 * Cookbook 0.8 is not a product constant; start conservative and move on traces.
 */
export const CONSTRAINT_HONOR_MIN = 0.65;

/**
 * Training / skill miss ceiling. Only noul at or below this is a clear miss.
 * The mid band fail-opens (C5).
 */
export const TRAINING_MISS_MAX = 0.35;

/** Skip a Training / skill reject only when the User-stated exception Noul is clearly yes. */
export const USER_REQUESTED_YES_MIN = 0.65;

/** One labeled Soft-fail line. `id` is the honor question id Andy should retry against. */
export type TEvaluateMiss = {
    id: string;
    detail: string;
};

/**
 * Evaluate result. `ok: false` is a Soft tool failure; `misses` is empty when
 * `ok` is true. Fail-open (no key, no questions, transport error) is `ok: true`.
 */
export type TEvaluateResult = {
    ok: boolean;
    misses: TEvaluateMiss[];
};

/** Noul values keyed by question id. Missing keys are treated as unanswered. */
export type TSystemOneNouls = Record<string, number>;

export interface IEvaluateOptions {
    /**
     * True when this turn locked `buildWeekOnceGuard` (first `buildWeek` or
     * same-turn periodization). Standalone later **Program mutation batch**s
     * pass false so Training / skill questions cannot reject.
     */
    andyAuthored: boolean;
    /** Test seam. Production uses {@link postSystemOne}. */
    postSystemOne?: (
        state: TProgramSanitySnapshot,
        questions: TSanityQuestions,
    ) => Promise<TSystemOneNouls | null>;
}

/**
 * Bearer key for TypeSafe. Empty / unset is missing.
 *
 * @returns Trimmed key, or undefined when Jev questions must fail open
 */
export function readTypeSafeApiKey(): string | undefined {
    const key = process.env.TYPESAFE_API_KEY;
    return typeof key === "string" && key.trim() ? key.trim() : undefined;
}

function isFiniteNoul(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/**
 * `POST /v1/systemone` with every applicable question. One request (C7).
 *
 * @param state - Compact snapshot (already stripped of leftover `reason` text)
 * @param questions - From {@link buildSanityQuestions}; must be non-empty
 * @returns Noul map, or null when the key is missing or the call failed
 */
export async function postSystemOne(
    state: TProgramSanitySnapshot,
    questions: TSanityQuestions,
): Promise<TSystemOneNouls | null> {
    const apiKey = readTypeSafeApiKey();
    if (!apiKey) {
        console.warn("[program-sanity] TYPESAFE_API_KEY missing; skipping Jev questions");
        return null;
    }

    try {
        const response = await fetch(SYSTEM_ONE_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "typesafe-ai/jev",
                state,
                questions,
            }),
        });
        if (!response.ok) {
            console.warn("[program-sanity] TypeSafe HTTP", response.status);
            return null;
        }
        const body: unknown = await response.json();
        if (body == null || typeof body !== "object") return null;
        const answers = (body as { answers?: unknown }).answers;
        if (answers == null || typeof answers !== "object") return null;

        const nouls: TSystemOneNouls = {};
        for (const [id, answer] of Object.entries(answers as Record<string, unknown>)) {
            if (answer == null || typeof answer !== "object") continue;
            const noul = (answer as { noul?: unknown }).noul;
            if (isFiniteNoul(noul)) nouls[id] = noul;
        }
        return nouls;
    } catch (error) {
        console.warn("[program-sanity] TypeSafe call failed", error);
        return null;
    }
}

function honorDetail(id: string): string {
    return `does not honor ${id}`;
}

/**
 * Combine TypeSafe nouls with C3–C5. Pure; no network.
 *
 * @param nouls - Answered honor + `userRequested.*` Nouls
 * @param questionIds - Keys that were actually sent (so empty premises stay omitted)
 * @param andyAuthored - See {@link IEvaluateOptions.andyAuthored}
 * @returns Misses to Soft-fail; empty when the snapshot passes
 */
export function applyEvaluatePolicy(
    nouls: TSystemOneNouls,
    questionIds: string[],
    andyAuthored: boolean,
): TEvaluateMiss[] {
    const misses: TEvaluateMiss[] = [];

    for (const id of questionIds) {
        if (id.startsWith("userRequested.")) continue;

        const noul = nouls[id];
        if (CONSTRAINT_QUESTION_ID_SET.has(id)) {
            // Unanswered or not clearly yes → reject (fail-closed, C5).
            if (!isFiniteNoul(noul) || noul < CONSTRAINT_HONOR_MIN) {
                misses.push({ id, detail: honorDetail(id) });
            }
            continue;
        }

        if (!TRAINING_OR_SKILL_QUESTION_ID_SET.has(id)) continue;
        if (!andyAuthored) continue;
        // Unanswered or mid-band / yes → pass (fail-open, C5).
        if (!isFiniteNoul(noul) || noul > TRAINING_MISS_MAX) continue;

        const asked = nouls[userRequestedId(id)];
        if (isFiniteNoul(asked) && asked >= USER_REQUESTED_YES_MIN) continue;

        misses.push({ id, detail: honorDetail(id) });
    }

    return misses;
}

/**
 * One labeled line per miss for the Soft tool failure `message`.
 * `toModelOutput` already forwards `message` unchanged.
 *
 * @param misses - Honor questions that failed the policy
 */
export function formatEvaluateMessage(misses: TEvaluateMiss[]): string {
    return misses.map((miss) => `${miss.id}: ${miss.detail}`).join("\n");
}

/**
 * Ask applicable Jev questions and apply the fail policy.
 *
 * @param snapshot - Compact result; must already exist (C1 / C6)
 * @param options.andyAuthored - First `buildWeek` or same-turn periodization
 * @returns Soft-fail payload when any Constraint miss, or an Andy-authored
 *   Training / skill miss without a User-stated exception
 */
export async function evaluate(
    snapshot: TProgramSanitySnapshot,
    options: IEvaluateOptions,
): Promise<TEvaluateResult> {
    const questions = buildSanityQuestions(snapshot);
    const questionIds = Object.keys(questions);
    if (questionIds.length === 0) {
        return { ok: true, misses: [] };
    }

    const post = options.postSystemOne ?? postSystemOne;
    const nouls = await post(snapshot, questions);
    if (nouls == null) {
        return { ok: true, misses: [] };
    }

    const misses = applyEvaluatePolicy(nouls, questionIds, options.andyAuthored);
    return { ok: misses.length === 0, misses };
}
