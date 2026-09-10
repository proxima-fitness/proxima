/**
 * @module hooks/useEditLeaveGuard
 *
 * **Edit navigation guard** (ADR 0013 / 07). Dirty Edit sessions block in-app
 * leave. **Sync and Continue** reuses SP4 `runSync` then the pending href.
 * Discard navigates without a Hevy write. `beforeunload` is the browser prompt
 * only — it cannot Sync.
 *
 * Dirty SoT is the post-hydrate undo stack (grid edits, agent patches, undo).
 * Mirrored silently into {@link editLeaveGuard} like New path.
 *
 * Depends on: create-leave-guard
 * Used by: BuildProgram, AppSidebar, BuildProgramModeMenu
 */

"use client";

import { createLeaveGuard, newPathLeaveGuard } from "@/hooks/create-leave-guard";

export type TEditLeaveCounts = {
    add: number;
    empty: number;
    update: number;
};

export const EMPTY_EDIT_LEAVE_COUNTS: TEditLeaveCounts = {
    add: 0,
    empty: 0,
    update: 0,
};

export const editLeaveGuard = createLeaveGuard({
    title: "Leave without syncing?",
    description: "Your changes have not been written to Hevy.",
});

/** Same store API as New path; named for CONTEXT / ADR 0013. */
export function useEditLeaveGuard() {
    return editLeaveGuard.useLeaveGuard();
}

/**
 * True when **Edit path** has unsaved builder edits (undo stack after hydrate).
 *
 * @param isHevyEditArrival - `edit=true` and `hevy=true`
 * @param undoStackLength - Editor undo depth
 */
export function isEditLeaveDirty(
    isHevyEditArrival: boolean,
    undoStackLength: number,
): boolean {
    return isHevyEditArrival && undoStackLength > 0;
}

/**
 * Empty / update / add counts for the leave dialog (CONTEXT labels; PUT/POST).
 *
 * @param plan - {@link buildSyncPlan} result
 */
export function editLeaveCountsFromPlan(plan: {
    empty: readonly unknown[];
    post: readonly unknown[];
    put: readonly unknown[];
}): TEditLeaveCounts {
    return {
        add: plan.post.length,
        empty: plan.empty.length,
        update: plan.put.length,
    };
}

/**
 * Destination after a successful leave-guard Sync. Toolbar Sync always
 * passes `/profile`. Missing pending href falls back to profile too.
 *
 * @param pendingHref - Href captured when the guard intercepted leave
 */
export function resolveSyncLeaveHref(pendingHref: string | null | undefined): string {
    if (pendingHref == null || pendingHref.length === 0) {
        return "/profile";
    }
    return pendingHref;
}

/**
 * Block leave when Edit or New path is dirty. Edit is checked first so both
 * dialogs cannot open at once.
 *
 * @param href - Pending destination
 * @param beforeNavigate - Discard-only side effect (e.g. clear Edit session)
 * @returns true if blocked (caller must not navigate)
 */
export function requestBuilderLeave(
    href: string,
    beforeNavigate?: () => void,
): boolean {
    return (
        editLeaveGuard.requestLeave(href, beforeNavigate)
        || newPathLeaveGuard.requestLeave(href, beforeNavigate)
    );
}
