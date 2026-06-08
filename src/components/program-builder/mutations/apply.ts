import { programMutationCatalogById } from "./catalog";
import type { TProgramOperation } from "./schemas";
import {
    isValidationFailure,
    mutationFailure,
    type TApplyBatchResult,
    type TMutationResult,
} from "./types";

function stripOpField<T extends { op: string }>(operation: T): Omit<T, "op"> {
    const { op: _op, ...args } = operation;
    return args;
}

export function applyOperation(program: THevyRoutine[], operation: TProgramOperation): TMutationResult {
    const mutation = programMutationCatalogById[operation.op];
    if (!mutation) {
        return mutationFailure(`Unknown operation: ${operation.op}`);
    }

    const parsed = mutation.schema.safeParse(operation);
    if (!parsed.success) {
        return mutationFailure(parsed.error.issues.map((issue) => issue.message).join("; "));
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

    const parsed = mutation.schema.safeParse({ op, ...args });
    if (!parsed.success) {
        return mutationFailure(parsed.error.issues.map((issue) => issue.message).join("; "));
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
