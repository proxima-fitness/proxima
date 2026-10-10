// SPDX-License-Identifier: AGPL-3.0-only

"use client";

/**
 * React bridge for the program mutation registry - commitWithUndo, hydrate, runMutation.
 */

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type Dispatch,
    type ReactNode,
    type SetStateAction,
} from "react";
import { flushSync } from "react-dom";
import { toast } from "sonner";

import { runProgramMutation } from "@/components/program-builder/mutations/registry";
import {
    isValidationFailure,
    type TCommitWithUndoOptions,
    type TMutationResult,
} from "@/components/program-builder/mutations/types";
import type { TProposalStepLocator } from "@/components/program-builder/utils/mutation-proposal-copy";
import {
    resolveProposalJump,
    type TProposalJumpTarget,
} from "@/components/program-builder/utils/proposal-marks";

const EMPTY_MARK_KEYS: ReadonlySet<number> = new Set();

interface IProgramMutationContext {
    program: THevyRoutine[];
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void;
    setProgramFromHydrate: (program: THevyRoutine[]) => void;
    isAgentStreaming: boolean;
    completedHevyRoutineIds: readonly string[];
    runMutation: (id: string, args: Record<string, unknown>) => TMutationResult;
    proposalMarkKeys: ReadonlySet<number>;
    requestProposalJump: (locator: TProposalStepLocator) => void;
}

interface IBuilderWeekContext {
    setWeekIndex: Dispatch<SetStateAction<number>>;
    weekIndex: number;
}

const ProgramMutationContext = createContext<IProgramMutationContext | undefined>(undefined);
const BuilderWeekContext = createContext<IBuilderWeekContext | undefined>(undefined);

/**
 * Recipe-tap **Proposal jump**: flush the mobile week so the row exists, then scroll.
 *
 * @param target - Week + builder exercise key from {@link resolveProposalJump}
 * @param setWeekIndex - Mobile week pager
 */
function applyProposalJump(
    target: TProposalJumpTarget,
    setWeekIndex: Dispatch<SetStateAction<number>>,
): void {
    flushSync(() => {
        setWeekIndex(target.weekIndex);
    });
    document
        .querySelector(`[data-builder-exercise-key="${target.builderExerciseKey}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
}

interface IProgramMutationProviderProps {
    program: THevyRoutine[];
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void;
    setProgramFromHydrate: (program: THevyRoutine[]) => void;
    isAgentStreaming?: boolean;
    completedHevyRoutineIds?: readonly string[];
    proposalMarkKeys?: readonly number[];
    children: ReactNode;
}

export function ProgramMutationProvider({
    program,
    commitWithUndo,
    setProgramFromHydrate,
    isAgentStreaming = false,
    completedHevyRoutineIds = [],
    proposalMarkKeys = [],
    children,
}: IProgramMutationProviderProps) {
    const [weekIndex, setWeekIndex] = useState(0);
    const markKeySet = useMemo(() => new Set(proposalMarkKeys), [proposalMarkKeys]);
    const requestProposalJump = useCallback(
        (locator: TProposalStepLocator) => {
            const target = resolveProposalJump(program, locator);
            if (target) {
                applyProposalJump(target, setWeekIndex);
            }
        },
        [program],
    );
    const weekValue = useMemo<IBuilderWeekContext>(
        () => ({ setWeekIndex, weekIndex }),
        [weekIndex],
    );
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
            proposalMarkKeys: markKeySet,
            requestProposalJump,
        }),
        [
            program,
            commitWithUndo,
            setProgramFromHydrate,
            isAgentStreaming,
            completedHevyRoutineIds,
            runMutation,
            markKeySet,
            requestProposalJump,
        ],
    );

    return (
        <ProgramMutationContext.Provider value={value}>
            <BuilderWeekContext.Provider value={weekValue}>{children}</BuilderWeekContext.Provider>
        </ProgramMutationContext.Provider>
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

/** Live **Proposal mark** keys — empty outside the builder provider. */
export function useProposalMarkKeys(): ReadonlySet<number> {
    return useContext(ProgramMutationContext)?.proposalMarkKeys ?? EMPTY_MARK_KEYS;
}

/** **Proposal jump** request — no-ops outside the builder provider. */
export function useProposalJump(): {
    requestProposalJump: (locator: TProposalStepLocator) => void;
} {
    const context = useContext(ProgramMutationContext);
    return {
        requestProposalJump: context?.requestProposalJump ?? noopRequestProposalJump,
    };
}

/** Mobile week pager — lifted so recipe-tap **Proposal jump** can flushSync then scroll. */
export function useBuilderWeek(): IBuilderWeekContext {
    const context = useContext(BuilderWeekContext);
    const [localWeekIndex, setLocalWeekIndex] = useState(0);
    return context ?? { setWeekIndex: setLocalWeekIndex, weekIndex: localWeekIndex };
}

function noopRequestProposalJump(): void {}

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
