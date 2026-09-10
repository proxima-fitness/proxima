/**
 * @module EditSessionContext
 *
 * In-memory transport for **Edit path** arrival (ADR 0013 / 02, / 04).
 *
 * The overview holds everything the builder needs — the ordered **Hevy week copy**,
 * the **Program–Hevy link** folder id, the week — so it hands them over directly
 * instead of routing through `hevy-program-in-progress`, which CONTEXT reserves for
 * the New-path **Builder draft**. Sharing that key let an Edit arrival clobber a
 * New-path draft, and let a stale `?resume=true` rehydrate Hevy routines into a
 * New-path session.
 *
 * Snapshots (`initialHevyProgram`, `initialRoutineIds`) are captured here, before
 * the first edit, because Sync diffs against them (ADR 0013 / 03).
 *
 * In-memory by design (ADR 0002): the session survives client-side navigation but
 * not a refresh. The builder redirects rather than hydrating half a week.
 *
 * Depends on: react
 * Used by: (app)/layout, useNavigateToEditHevyProgram, BuildProgram. Hevy-only
 * Edit uses the same session without `programId` / `nthWeek`.
 */

"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type TEditSession = {
    /** Ordered week copy: ordinal `id`, Hevy UUID on `hevyRoutineId`, `folder_id` 0. */
    routines: THevyRoutine[];
    /** Pre-edit copy of `routines` — the Sync diff baseline. */
    initialHevyProgram: THevyRoutine[];
    /** Hevy routine UUIDs present at arrival, in day order. */
    initialRoutineIds: string[];
    /** Hevy folder id from the link — the Sync POST target. Never `routine.folder_id`. */
    initialFolderId: number | null;
    /** Proxima program id. Absent on Hevy-only Edit (no link). */
    programId?: number;
    /** 1-based week this folder is the Hevy week copy of. Absent on Hevy-only. */
    nthWeek?: number;
};

export type TStartEditSessionInput = Omit<
    TEditSession,
    "initialHevyProgram" | "initialRoutineIds"
>;

type TEditSessionContext = {
    session: TEditSession | null;
    startEditSession: (input: TStartEditSessionInput) => void;
    clearEditSession: () => void;
};

const EditSessionContext = createContext<TEditSessionContext | null>(null);

/** Deep-enough copy to survive builder mutations, which replace objects wholesale. */
function snapshotRoutines(routines: readonly THevyRoutine[]): THevyRoutine[] {
    return routines.map((routine) => ({
        ...routine,
        exercises: routine.exercises.map((exercise) => ({
            ...exercise,
            sets: exercise.sets.map((set) => ({ ...set })),
        })),
    }));
}

/**
 * Holds the active Edit path session. Mounted above both `/profile` and
 * `/build-program` so the handoff survives `router.push`.
 *
 * @param props.children - App subtree.
 */
export function EditSessionProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<TEditSession | null>(null);

    const startEditSession = useCallback((input: TStartEditSessionInput) => {
        setSession({
            ...input,
            initialHevyProgram: snapshotRoutines(input.routines),
            initialRoutineIds: input.routines
                .map((routine) => routine.hevyRoutineId)
                .filter((id): id is string => Boolean(id)),
        });
    }, []);

    const clearEditSession = useCallback(() => {
        setSession(null);
    }, []);

    const value = useMemo(
        () => ({ session, startEditSession, clearEditSession }),
        [session, startEditSession, clearEditSession],
    );

    return <EditSessionContext.Provider value={value}>{children}</EditSessionContext.Provider>;
}

/**
 * Read the Edit current week session.
 *
 * Returns a null session outside the provider rather than throwing, so surfaces
 * that never enter Edit (and tests that render them bare) do not need it mounted.
 */
export function useEditSession(): TEditSessionContext {
    const context = useContext(EditSessionContext);
    if (!context) {
        return {
            session: null,
            startEditSession: () => undefined,
            clearEditSession: () => undefined,
        };
    }
    return context;
}
