"use client";

/**
 * React bridge for the program mutation registry - commitWithUndo, hydrate, runMutation.
 */

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    type ReactNode,
} from "react";
import { toast } from "sonner";

import { runProgramMutation } from "@/components/program-builder/mutations/registry";
import {
    isValidationFailure,
    type TCommitWithUndoOptions,
    type TMutationResult,
} from "@/components/program-builder/mutations/types";

interface IProgramMutationContext {
    program: THevyRoutine[];
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void;
    setProgramFromHydrate: (program: THevyRoutine[]) => void;
    isAgentStreaming: boolean;
    completedHevyRoutineIds: readonly string[];
    runMutation: (id: string, args: Record<string, unknown>) => TMutationResult;
}

const ProgramMutationContext = createContext<IProgramMutationContext | undefined>(undefined);

interface IProgramMutationProviderProps {
    program: THevyRoutine[];
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void;
    setProgramFromHydrate: (program: THevyRoutine[]) => void;
    isAgentStreaming?: boolean;
    completedHevyRoutineIds?: readonly string[];
    children: ReactNode;
}

export function ProgramMutationProvider({
    program,
    commitWithUndo,
    setProgramFromHydrate,
    isAgentStreaming = false,
    completedHevyRoutineIds = [],
    children,
}: IProgramMutationProviderProps) {
    const runMutation = useCallback(
        (id: string, args: Record<string, unknown>) => {
            const result = runProgramMutation(id, args, {
                program,
                commitWithUndo,
                isAgentStreaming,
                completedHevyRoutineIds,
            });

            if (isValidationFailure(result)) {
                toast.error(result.reason);
            }

            return result;
        },
        [program, commitWithUndo, isAgentStreaming, completedHevyRoutineIds],
    );

    const value = useMemo<IProgramMutationContext>(
        () => ({
            program,
            commitWithUndo,
            setProgramFromHydrate,
            isAgentStreaming,
            completedHevyRoutineIds,
            runMutation,
        }),
        [
            program,
            commitWithUndo,
            setProgramFromHydrate,
            isAgentStreaming,
            completedHevyRoutineIds,
            runMutation,
        ],
    );

    return (
        <ProgramMutationContext.Provider value={value}>{children}</ProgramMutationContext.Provider>
    );
}

export function useProgramMutation() {
    const context = useContext(ProgramMutationContext);
    if (!context) {
        throw new Error("useProgramMutation must be used within ProgramMutationProvider");
    }
    return context;
}

/** Agent streaming lock - safe outside {@link ProgramMutationProvider} (defaults to false). */
export function useIsAgentStreaming(): boolean {
    return useContext(ProgramMutationContext)?.isAgentStreaming ?? false;
}

/** Day complete Hevy routine IDs for this Edit session. */
export function useCompletedHevyRoutineIds(): readonly string[] {
    return useContext(ProgramMutationContext)?.completedHevyRoutineIds ?? [];
}

/**
 * True when the agent is streaming or this day's Hevy routine is **Day complete**.
 *
 * @param hevyRoutineId - The day's Hevy UUID, if it has one
 */
export function useIsDayLocked(hevyRoutineId?: string): boolean {
    const context = useContext(ProgramMutationContext);
    if (!context) {
        return false;
    }
    if (context.isAgentStreaming) {
        return true;
    }
    if (hevyRoutineId && context.completedHevyRoutineIds.includes(hevyRoutineId)) {
        return true;
    }
    return false;
}
