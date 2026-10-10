// SPDX-License-Identifier: AGPL-3.0-only

import type { z } from "zod";

export type TValidationFailure = {
    ok: false;
    reason: string;
};

export type TMutationSuccess = {
    ok: true;
    program: THevyRoutine[];
};

export type TMutationResult = TMutationSuccess | TValidationFailure;

export function mutationSuccess(program: THevyRoutine[]): TMutationSuccess {
    return { ok: true, program };
}

export function mutationFailure(reason: string): TValidationFailure {
    return { ok: false, reason };
}

export function isValidationFailure(result: TMutationResult): result is TValidationFailure {
    return !result.ok;
}

export function isApplyBatchFailure(result: TApplyBatchResult): result is TApplyBatchFailure {
    return !result.ok;
}

export type TProgramMutationDefinition<TSchema extends z.ZodType = z.ZodType> = {
    id: string;
    description: string;
    schema: TSchema;
    agentExposed: boolean;
    run: (program: THevyRoutine[], args: z.infer<TSchema>) => TMutationResult;
};

export type TApplyBatchSuccess = {
    ok: true;
    program: THevyRoutine[];
};

export type TApplyBatchFailure = {
    ok: false;
    failures: Array<{ index: number; op: string; reason: string }>;
    program: THevyRoutine[];
};

export type TApplyBatchResult = TApplyBatchSuccess | TApplyBatchFailure;

export type TCommitWithUndoOptions = {
    recordUndo?: boolean;
    /** Accept-only. Replaces live **Proposal marks**; omit on manual commits. */
    proposalMarkKeys?: number[];
};

export type TProgramMutationRunContext = {
    program: THevyRoutine[];
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void;
    isAgentStreaming: boolean;
    /** **Day complete** Hevy routine IDs — mutations that target these days no-op. */
    completedHevyRoutineIds?: readonly string[];
};
