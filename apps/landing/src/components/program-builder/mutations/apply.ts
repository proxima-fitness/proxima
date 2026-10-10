import type { z } from "zod";

import { programMutationCatalogById } from "./catalog";
import { inferMissingFolderIds } from "./inferFolderIds";
import type { TProgramOperation } from "./schemas";
import { normalizeAgentOperationInput } from "./schemas";
import {
    isValidationFailure,
    mutationFailure,
    type TApplyBatchResult,
    type TMutationResult,
} from "./types";
import { collectDeletedDayKeys, validateNoEmptiedTrainingDays } from "./validateProgram";
import {
    detectCommonMutationFieldMistakes,
    formatMutationSchemaError,
} from "./validationErrors";

function stripOpField<T extends { op: string }>(operation: T): Omit<T, "op"> {
    const { op: _op, ...args } = operation;
    return args;
}

function parseMutationOperation<TSchema extends z.ZodType>(
    program: THevyRoutine[],
    operation: Record<string, unknown>,
    schema: TSchema,
):
    | { ok: true; data: z.infer<TSchema> }
    | { ok: false; reason: string } {
    const normalized = normalizeAgentOperationInput(operation) as Record<string, unknown>;
    const withFolderIds = inferMissingFolderIds(program, normalized);
    const mistake = detectCommonMutationFieldMistakes(withFolderIds);
    if (mistake) {
        return { ok: false, reason: mistake };
    }

    const parsed = schema.safeParse(withFolderIds);
    if (!parsed.success) {
        return { ok: false, reason: formatMutationSchemaError(parsed.error) };
    }

    return { ok: true, data: parsed.data };
}

export function applyOperation(program: THevyRoutine[], operation: TProgramOperation): TMutationResult {
    const mutation = programMutationCatalogById[operation.op];
    if (!mutation) {
        return mutationFailure(`Unknown operation: ${operation.op}`);
    }

    const parsed = parseMutationOperation(
        program,
        operation as Record<string, unknown>,
        mutation.schema,
    );
    if (parsed.ok === false) {
        return mutationFailure(parsed.reason);
    }

    return mutation.run(program, parsed.data);
}

export function applyOperationById(
    program: THevyRoutine[],
    op: string,
    args: Record<string, unknown>,
): TMutationResult {
    const mutation = programMutationCatalogById[op];
    if (!mutation) {
        return mutationFailure(`Unknown operation: ${op}`);
    }

    const parsed = parseMutationOperation(program, { op, ...args }, mutation.schema);
    if (parsed.ok === false) {
        return mutationFailure(parsed.reason);
    }

    return mutation.run(program, parsed.data);
}

export function applyOperations(
    program: THevyRoutine[],
    operations: TProgramOperation[],
): TApplyBatchResult {
    let nextProgram = program;
    const deletedDayKeys = collectDeletedDayKeys(
        operations as Array<{ op: string } & Record<string, unknown>>,
    );

    for (let index = 0; index < operations.length; index++) {
        const operation = operations[index];
        const result = applyOperation(nextProgram, operation);
        if (isValidationFailure(result)) {
            return {
                ok: false,
                failures: [{ index, op: operation.op, reason: result.reason }],
                program,
            };
        }
        nextProgram = result.program;
    }

    const emptiedDayReason = validateNoEmptiedTrainingDays(program, nextProgram, deletedDayKeys);
    if (emptiedDayReason) {
        const lastOp = operations[operations.length - 1];
        return {
            ok: false,
            failures: [
                {
                    index: operations.length - 1,
                    op: lastOp?.op ?? "unknown",
                    reason: emptiedDayReason,
                },
            ],
            program,
        };
    }

    return { ok: true, program: nextProgram };
}

export function applyOperationsLoose(
    program: THevyRoutine[],
    operations: Array<{ op: string } & Record<string, unknown>>,
): TApplyBatchResult {
    let nextProgram = program;

    for (let index = 0; index < operations.length; index++) {
        const operation = operations[index];
        const result = applyOperationById(nextProgram, operation.op, stripOpField(operation));
        if (isValidationFailure(result)) {
            return {
                ok: false,
                failures: [{ index, op: operation.op, reason: result.reason }],
                program,
            };
        }
        nextProgram = result.program;
    }

    return { ok: true, program: nextProgram };
}
