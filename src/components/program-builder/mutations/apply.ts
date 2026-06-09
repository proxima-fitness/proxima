import type { z } from "zod";

import { programMutationCatalogById } from "./catalog";
import type { TProgramOperation } from "./schemas";
import {
    isValidationFailure,
    mutationFailure,
    type TApplyBatchResult,
    type TMutationResult,
} from "./types";
import {
    detectCommonMutationFieldMistakes,
    formatMutationSchemaError,
} from "./validationErrors";

function stripOpField<T extends { op: string }>(operation: T): Omit<T, "op"> {
    const { op: _op, ...args } = operation;
    return args;
}

function parseMutationOperation<TSchema extends z.ZodType>(
    operation: Record<string, unknown>,
    schema: TSchema,
):
    | { ok: true; data: z.infer<TSchema> }
    | { ok: false; reason: string } {
    const mistake = detectCommonMutationFieldMistakes(operation);
    if (mistake) {
        return { ok: false, reason: mistake };
    }

    const parsed = schema.safeParse(operation);
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

    const parsed = parseMutationOperation(operation as Record<string, unknown>, mutation.schema);
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

    const parsed = parseMutationOperation({ op, ...args }, mutation.schema);
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
