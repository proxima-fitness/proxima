"use client";

/**
 * React bridge for the program mutation registry — commitWithUndo, hydrate, runMutation.
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
    runMutation: (id: string, args: Record<string, unknown>) => TMutationResult;
}

const ProgramMutationContext = createContext<IProgramMutationContext | undefined>(undefined);

interface IProgramMutationProviderProps {
    program: THevyRoutine[];
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void;
    setProgramFromHydrate: (program: THevyRoutine[]) => void;
    isAgentStreaming?: boolean;
    children: ReactNode;
}

export function ProgramMutationProvider({
    program,
    commitWithUndo,
    setProgramFromHydrate,
    isAgentStreaming = false,
    children,
}: IProgramMutationProviderProps) {
    const runMutation = useCallback(
        (id: string, args: Record<string, unknown>) => {
            const result = runProgramMutation(id, args, {
                program,
                commitWithUndo,
                isAgentStreaming,
            });

            if (isValidationFailure(result)) {
                toast.error(result.reason);
            }

            return result;
        },
        [program, commitWithUndo, isAgentStreaming],
    );

    const value = useMemo<IProgramMutationContext>(
        () => ({
            program,
            commitWithUndo,
            setProgramFromHydrate,
            isAgentStreaming,
            runMutation,
        }),
        [program, commitWithUndo, setProgramFromHydrate, isAgentStreaming, runMutation],
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

/** Agent streaming lock — safe outside {@link ProgramMutationProvider} (defaults to false). */
export function useIsAgentStreaming(): boolean {
    return useContext(ProgramMutationContext)?.isAgentStreaming ?? false;
}
