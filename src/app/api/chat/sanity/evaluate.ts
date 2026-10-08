/**
 * @module chat/sanity/evaluate
 *
 * One AI SDK {@link experimental_evaluate} call over {@link buildSanityQuestions},
 * then the fail policy. Case 1 (`firstBuild: true`) is the plated + stamped
 * **First build** mesocycle, judged once before land (ADR 0027 / 04, C4).
 * Injury / equipment pairs and preference honors (split, variability, warmup)
 * land unless the answer is a clear no. A this-turn ask waives a preference
 * honor. It does not waive a pair. Case 2 (`firstBuild: false`, every
 * `mutateProgram`) only asks delta Constraint questions on `changedDays`, so
 * a pre-existing grid cannot lock out every batch. Training / skill misses
 * Soft-fail only in Case 1 when the user did not ask; low confidence fail-opens.
 *
 * Injury / equipment pair misses (ADR 0030 / 02, C5) carry the structured
 * pair plus a human-readable `why` built from its title and saved string.
 *
 * Same Gateway style as week suggest: `gateway` + a model id. Jev is an
 * evaluation model, so the call is `experimental_evaluate` rather than
 * `generateText`. Auth is the Gateway OIDC / `AI_GATEWAY_API_KEY` the SDK
 * already uses. A transport error fail-opens Jev so chat stays up. Code
 * week-coverage still ran in the caller.
 *
 * Depends on: ai (gateway / experimental_evaluate), ./questions, ./snapshot, ./types
 * Used by: tools.ts
 */

import { experimental_evaluate, gateway } from "ai";

import {
    buildSanityQuestions,
    CONSTRAINT_QUESTION_ID_SET,
    isConstraintPairId,
    TRAINING_OR_SKILL_QUESTION_ID_SET,
    userRequestedId,
    type TSanityQuestions,
} from "./questions";
import { compactSnapshotForEvaluate, snapshotForStandaloneEvaluate } from "./snapshot";
import type {
    TConstraintPair,
    TConstraintPairMiss,
    TProgramSanitySnapshot,
} from "./types";

/** Same Gateway catalog id as week suggest's `gateway(model)` style. */
export const JEV_MODEL = "typesafe-ai/jev";

/**
 * Clear-miss ceiling for injury / equipment pairs, preference honors, and
 * Training / skill. Only a noul at or below this rejects. Unanswered and the
 * mid band land.
 */
export const TRAINING_MISS_MAX = 0.35;

/** Skip a Training / skill reject only when the User-stated exception Noul is clearly yes. */
export const USER_REQUESTED_YES_MIN = 0.65;

/**
 * One labeled Soft-fail line. `id` is the honor question id Andy should retry
 * against. `pair` is set on injury / equipment misses; `detail` is then its `why`.
 */
export type TEvaluateMiss = {
    id: string;
    detail: string;
    pair?: TConstraintPairMiss;
};

/**
 * Evaluate result. `ok: false` is a Soft tool failure; `misses` is empty when
 * `ok` is true. Fail-open (no questions, evaluate error) is `ok: true`.
 * `debug` is set only when {@link IEvaluateOptions.debug} is true.
 */
export type TEvaluateResult = {
    ok: boolean;
    misses: TEvaluateMiss[];
    debug?: TJevDebugTrace;
};

/** Noul values keyed by question id. Missing keys are treated as unanswered. */
export type TSystemOneNouls = Record<string, number>;

/** What Jev was asked, what it answered, and what the fail policy did. */
export type TJevDebugTrace = {
    skipped?: "no_questions" | "typesafe_unavailable";
    firstBuild: boolean;
    questionIds: string[];
    questions: TSanityQuestions;
    nouls: TSystemOneNouls | null;
    misses: TEvaluateMiss[];
    ok: boolean;
    snapshot: TProgramSanitySnapshot;
};

export interface IEvaluateOptions {
    /**
     * True only for the stamped **First build** snapshot in `buildProgram`
     * (Case 1). Not "this turn locked `buildProgramOnceGuard`": every
     * `mutateProgram`, same-turn or later, passes false (Case 2) so Training /
     * skill questions cannot reject.
     */
    firstBuild: boolean;
    /** Agent debug mode. Logs the Jev trace and attaches it to the result. */
    debug?: boolean;
    /** Test seam. Production uses {@link postSystemOne}. */
    postSystemOne?: (
        state: TProgramSanitySnapshot,
        questions: TSanityQuestions,
    ) => Promise<TSystemOneNouls | null>;
}

function finishEvaluate(
    result: TEvaluateResult,
    options: IEvaluateOptions,
    trace: TJevDebugTrace,
): TEvaluateResult {
    if (!options.debug) return result;
    console.log("[jev]", trace);
    return { ...result, debug: trace };
}

function isFiniteNoul(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

/** AI SDK boolean question. Same yes/no criteria as our stored Noul. */
type TBooleanQuestion = {
    type: "boolean";
    instructions: string;
    criteria: {
        true: string;
        false: string;
    };
};

/**
 * Map ADR Nouls onto the AI SDK evaluate question type.
 *
 * @param questions - From {@link buildSanityQuestions}
 */
export function toEvaluateQuestions(
    questions: TSanityQuestions,
): Record<string, TBooleanQuestion> {
    return Object.fromEntries(
        Object.entries(questions).map(([id, question]) => [
            id,
            {
                type: "boolean",
                instructions: question.instructions,
                criteria: question.criteria,
            },
        ]),
    );
}

/**
 * Pull 0–1 honor values out of AI SDK boolean answers (`probability`).
 *
 * @param answers - `experimental_evaluate` `answers` map
 */
export function noulsFromEvaluateAnswers(
    answers: Record<string, { probability?: unknown }>,
): TSystemOneNouls {
    const nouls: TSystemOneNouls = {};
    for (const [id, answer] of Object.entries(answers)) {
        if (isFiniteNoul(answer?.probability)) {
            nouls[id] = answer.probability;
        }
    }
    return nouls;
}

/**
 * One Gateway evaluate call with every applicable question (C7).
 *
 * @param state - Compact snapshot (already stripped of leftover `reason` text)
 * @param questions - From {@link buildSanityQuestions}; must be non-empty
 * @returns Noul map, or null when the call failed
 */
export async function postSystemOne(
    state: TProgramSanitySnapshot,
    questions: TSanityQuestions,
): Promise<TSystemOneNouls | null> {
    try {
        const result = await experimental_evaluate({
            model: gateway.evaluationModel(JEV_MODEL),
            state,
            questions: toEvaluateQuestions(questions),
        });
        return noulsFromEvaluateAnswers(result.answers);
    } catch (error) {
        console.warn("[program-sanity] Jev evaluate failed", error);
        return null;
    }
}

function honorDetail(id: string): string {
    return `does not honor ${id}`;
}

/**
 * Card-ready line for one pair miss (C5). Built from the pair fields only.
 *
 * @param pair - Title × saved string Jev did not clear
 * @returns e.g. `Can't keep Squat (Barbell) with your saved injury "Knee Pain".`
 */
export function constraintPairWhy(pair: TConstraintPair): string {
    const quoted = JSON.stringify(pair.constraint);
    return pair.field === "injuries"
        ? `Can't keep ${pair.exerciseTitle} with your saved injury ${quoted}.`
        : `Can't keep ${pair.exerciseTitle}: it uses excluded equipment ${quoted}.`;
}

function missFor(id: string, questions: TSanityQuestions): TEvaluateMiss {
    const pair = questions[id]?.pair;
    if (!pair) return { id, detail: honorDetail(id) };
    const why = constraintPairWhy(pair);
    return { id, detail: why, pair: { ...pair, why } };
}

/**
 * Structured pair misses for the Soft-fail payload. Empty when none.
 *
 * @param misses - From {@link applyEvaluatePolicy}
 */
export function constraintPairMisses(misses: TEvaluateMiss[]): TConstraintPairMiss[] {
    return misses.flatMap((miss) => (miss.pair ? [miss.pair] : []));
}

/**
 * Combine TypeSafe nouls with C3–C5. Pure; no network.
 *
 * @param nouls - Answered honor + `userRequested.*` Nouls
 * @param questionIds - Keys that were actually sent (so empty premises stay omitted)
 * @param firstBuild - See {@link IEvaluateOptions.firstBuild}
 * @param questions - Sent questions; pair questions attach structured detail
 * @returns Misses to Soft-fail; empty when the snapshot passes
 */
export function applyEvaluatePolicy(
    nouls: TSystemOneNouls,
    questionIds: string[],
    firstBuild: boolean,
    questions: TSanityQuestions = {},
): TEvaluateMiss[] {
    const misses: TEvaluateMiss[] = [];

    for (const id of questionIds) {
        if (id.startsWith("userRequested.")) continue;

        const noul = nouls[id];
        if (isConstraintPairId(id)) {
            // Unanswered or uncertain lands. A clear no rejects, even if the
            // user asked for that lift. Body limits wait for a User-stated change.
            if (isFiniteNoul(noul) && noul <= TRAINING_MISS_MAX) {
                misses.push(missFor(id, questions));
            }
            continue;
        }

        const preferenceHonor = CONSTRAINT_QUESTION_ID_SET.has(id);
        const trainingOrSkill = TRAINING_OR_SKILL_QUESTION_ID_SET.has(id);
        if (!preferenceHonor && !trainingOrSkill) continue;
        // Training / skill stay first-build only. Warmup is a preference honor
        // and still rejects a clear no on a later mutation.
        if (trainingOrSkill && !firstBuild) continue;
        // Unanswered or mid-band / yes → pass.
        if (!isFiniteNoul(noul) || noul > TRAINING_MISS_MAX) continue;

        const asked = nouls[userRequestedId(id)];
        if (isFiniteNoul(asked) && asked >= USER_REQUESTED_YES_MIN) continue;

        misses.push(missFor(id, questions));
    }

    return misses;
}

/**   ***/

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
 * @param options.firstBuild - Stamped **First build** (Case 1) vs `mutateProgram` (Case 2)
 * @returns Soft-fail payload when a pair or preference honor is a clear no
 *   without a waiver, or a first-build Training / skill miss without a
 *   User-stated exception. Preference honors waive on this-turn chat. Pairs
 *   do not.
 */
export async function evaluate(
    snapshot: TProgramSanitySnapshot,
    options: IEvaluateOptions,
): Promise<TEvaluateResult> {
    const questions = buildSanityQuestions(snapshot, { firstBuild: options.firstBuild });
    const questionIds = Object.keys(questions);
    if (questionIds.length === 0) {
        return finishEvaluate({ ok: true, misses: [] }, options, {
            skipped: "no_questions",
            firstBuild: options.firstBuild,
            questionIds,
            questions,
            nouls: null,
            misses: [],
            ok: true,
            snapshot,
        });
    }

    const jevState = options.firstBuild
        ? compactSnapshotForEvaluate(snapshot)
        : snapshotForStandaloneEvaluate(snapshot);
    const post = options.postSystemOne ?? postSystemOne;
    const nouls = await post(jevState, questions);
    if (nouls == null) {
        return finishEvaluate({ ok: true, misses: [] }, options, {
            skipped: "typesafe_unavailable",
            firstBuild: options.firstBuild,
            questionIds,
            questions,
            nouls: null,
            misses: [],
            ok: true,
            snapshot,
        });
    }

    const misses = applyEvaluatePolicy(nouls, questionIds, options.firstBuild, questions);
    const ok = misses.length === 0;
    return finishEvaluate({ ok, misses }, options, {
        firstBuild: options.firstBuild,
        questionIds,
        questions,
        nouls,
        misses,
        ok,
        snapshot,
    });
}
