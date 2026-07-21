/**
 * @module account/use-edit-profile-leave-guard
 *
 * Blocks leaving Edit profile when identity or Constraint profile is dirty:
 * `beforeunload` for tab close/reload, and an in-app Stay / Discard dialog for
 * same-origin link clicks (capture-phase).
 *
 * Pattern (vercel-react-best-practices):
 * - `setDirty` only from event handlers (rerender-move-effect-to-event)
 * - DOM listeners wired once via subscribe (advanced-init-once)
 * - Dialog UI via useSyncExternalStore — no useEffect, no render-time mutation
 *
 * Depends on: next/navigation (router for discard navigation).
 * Used by: EditProfileContent.
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

export const EDIT_PROFILE_LEAVE_TITLE = "Discard unsaved changes?";
export const EDIT_PROFILE_LEAVE_DESCRIPTION =
    "You have unsaved edits on this page. Stay to keep editing, or discard to leave without saving.";

export type TEditProfileLeaveGuard = {
    /** Call from dirty-change event handlers only (not during render). */
    setDirty: (isDirty: boolean) => void;
    leaveDialogOpen: boolean;
    onLeaveDialogOpenChange: (open: boolean) => void;
    onDiscardLeave: () => void;
};

type TLeaveGuardSnapshot = {
    dialogOpen: boolean;
    pendingHref: string | null;
};

const serverSnapshot: TLeaveGuardSnapshot = {
    dialogOpen: false,
    pendingHref: null,
};

/** Browser-only flag — updated from event handlers, read by DOM listeners. */
let dirty = false;
let bypassNavigation = false;
let dialogSnapshot: TLeaveGuardSnapshot = serverSnapshot;
let domWired = false;
const listeners = new Set<() => void>();

function emitDialog() {
    for (const listener of listeners) {
        listener();
    }
}

function getSnapshot(): TLeaveGuardSnapshot {
    return dialogSnapshot;
}

function getServerSnapshot(): TLeaveGuardSnapshot {
    return serverSnapshot;
}

function setDirty(isDirty: boolean) {
    dirty = isDirty;
}

function closeDialog() {
    if (!dialogSnapshot.dialogOpen && dialogSnapshot.pendingHref == null) return;
    dialogSnapshot = { dialogOpen: false, pendingHref: null };
    emitDialog();
}

function openDialog(href: string) {
    dialogSnapshot = { dialogOpen: true, pendingHref: href };
    emitDialog();
}

function resolveInternalHref(anchor: HTMLAnchorElement): string | null {
    if (anchor.target && anchor.target !== "_self") return null;
    if (anchor.hasAttribute("download")) return null;

    const raw = anchor.getAttribute("href");
    if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
        return null;
    }

    try {
        const url = new URL(raw, window.location.href);
        if (url.origin !== window.location.origin) return null;
        if (
            url.pathname === window.location.pathname &&
            url.search === window.location.search
        ) {
            return null;
        }
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return null;
    }
}

function onBeforeUnload(event: BeforeUnloadEvent) {
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = "";
}

function onDocumentClick(event: MouseEvent) {
    if (!dirty || bypassNavigation) return;
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const target = event.target;
    if (!(target instanceof Element)) return;

    const anchor = target.closest("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;

    const href = resolveInternalHref(anchor);
    if (!href) return;

    event.preventDefault();
    event.stopPropagation();
    openDialog(href);
}

function ensureDomWired() {
    if (domWired || typeof window === "undefined") return;
    domWired = true;
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onDocumentClick, true);
}

function subscribe(onStoreChange: () => void) {
    ensureDomWired();
    listeners.add(onStoreChange);
    return () => {
        listeners.delete(onStoreChange);
        if (listeners.size === 0) {
            dirty = false;
            bypassNavigation = false;
            dialogSnapshot = { dialogOpen: false, pendingHref: null };
        }
    };
}

/** @internal test helper */
export function __resetEditProfileLeaveGuardForTests() {
    dirty = false;
    bypassNavigation = false;
    dialogSnapshot = { dialogOpen: false, pendingHref: null };
    emitDialog();
}

/**
 * Leave warn for Edit profile. Drive dirty via `setDirty` from form event handlers.
 */
export function useEditProfileLeaveGuard(): TEditProfileLeaveGuard {
    const snapshot = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
    const router = useRouter();

    const onLeaveDialogOpenChange = useCallback((open: boolean) => {
        if (!open) closeDialog();
    }, []);

    const onDiscardLeave = useCallback(() => {
        const href = dialogSnapshot.pendingHref;
        closeDialog();
        if (!href) return;

        bypassNavigation = true;
        router.push(href);
        queueMicrotask(() => {
            bypassNavigation = false;
        });
    }, [router]);

    return {
        setDirty,
        leaveDialogOpen: snapshot.dialogOpen,
        onLeaveDialogOpenChange,
        onDiscardLeave,
    };
}
