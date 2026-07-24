/**
 * @module hooks/create-leave-guard
 *
 * Dirty leave warn: `beforeunload`, same-origin link capture, optional
 * `requestLeave()` for router.push exits. Pass dialog copy; each instance
 * has its own dirty mirror (SoT stays with the caller).
 *
 * Pattern (vercel-react-best-practices):
 * - `setDirty` is a silent mirror of caller SoT (boolean only — no emit / no React state)
 * - DOM listeners wired once per instance via subscribe (advanced-init-once)
 * - Dialog UI via useSyncExternalStore
 *
 * Used by: BuildProgram / AppSidebar / BuildProgramModeMenu (`newPathLeaveGuard`);
 *   EditProfileContent (`editProfileLeaveGuard`).
 */

"use client";

import { useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { clearBuilderDraft } from "@/lib/builder-draft";

export type TLeaveGuardCopy = {
    title: string;
    description: string;
    /** Runs on Discard before navigate (e.g. wipe builder draft). */
    onDiscard?: () => void;
};

type TPending = {
    href: string;
    beforeNavigate?: () => void;
};

type TSnapshot = {
    open: boolean;
    href: string | null;
};

/**
 * Isolated leave-guard store + hook. Dialog copy attached for ConfirmDialog.
 */
export function createLeaveGuard(copy: TLeaveGuardCopy) {
    const empty: TSnapshot = { open: false, href: null };
    let dirty = false;
    let bypass = false;
    let pending: TPending | null = null;
    let snapshot: TSnapshot = empty;
    let wired = false;
    const listeners = new Set<() => void>();

    function emit() {
        for (const listener of listeners) listener();
    }

    function setSnapshot(next: TSnapshot) {
        snapshot = next;
        emit();
    }

    function close() {
        pending = null;
        if (!snapshot.open && snapshot.href == null) return;
        setSnapshot(empty);
    }

    function open(next: TPending) {
        pending = next;
        setSnapshot({ open: true, href: next.href });
    }

    function setDirty(isDirty: boolean) {
        dirty = isDirty;
    }

    function resolveHref(anchor: HTMLAnchorElement): string | null {
        if (anchor.target && anchor.target !== "_self") return null;
        if (anchor.hasAttribute("download")) return null;
        const raw = anchor.getAttribute("href");
        if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) {
            return null;
        }
        try {
            const url = new URL(raw, window.location.href);
            if (url.origin !== window.location.origin) return null;
            if (url.pathname === window.location.pathname && url.search === window.location.search) {
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

    function onClick(event: MouseEvent) {
        if (!dirty || bypass || event.defaultPrevented || event.button !== 0) return;
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const target = event.target;
        if (!(target instanceof Element)) return;
        const anchor = target.closest("a[href]");
        if (!(anchor instanceof HTMLAnchorElement)) return;
        const href = resolveHref(anchor);
        if (!href) return;
        event.preventDefault();
        event.stopPropagation();
        open({ href });
    }

    function wire() {
        if (wired || typeof window === "undefined") return;
        wired = true;
        window.addEventListener("beforeunload", onBeforeUnload);
        document.addEventListener("click", onClick, true);
    }

    function unwire() {
        if (!wired || typeof window === "undefined") return;
        wired = false;
        window.removeEventListener("beforeunload", onBeforeUnload);
        document.removeEventListener("click", onClick, true);
    }

    function subscribe(onChange: () => void) {
        wire();
        listeners.add(onChange);
        return () => {
            listeners.delete(onChange);
            if (listeners.size === 0) {
                dirty = false;
                bypass = false;
                pending = null;
                snapshot = empty;
                unwire();
            }
        };
    }

    /** @returns true if blocked (caller must not navigate). */
    function requestLeave(href: string, beforeNavigate?: () => void): boolean {
        if (!dirty || bypass) return false;
        open({ href, beforeNavigate });
        return true;
    }

    /** @internal */
    function __resetForTests() {
        dirty = false;
        bypass = false;
        pending = null;
        snapshot = empty;
        emit();
    }

    function useLeaveGuard() {
        const { open: leaveDialogOpen } = useSyncExternalStore(
            subscribe,
            () => snapshot,
            () => empty,
        );
        const router = useRouter();

        const onLeaveDialogOpenChange = useCallback((nextOpen: boolean) => {
            if (!nextOpen) close();
        }, []);

        const onDiscardLeave = useCallback(() => {
            const next = pending;
            close();
            if (!next) return;
            dirty = false;
            copy.onDiscard?.();
            next.beforeNavigate?.();
            bypass = true;
            router.push(next.href);
            queueMicrotask(() => {
                bypass = false;
            });
        }, [router]);

        return {
            setDirty,
            leaveDialogOpen,
            onLeaveDialogOpenChange,
            onDiscardLeave,
        };
    }

    return {
        title: copy.title,
        description: copy.description,
        setDirty,
        requestLeave,
        useLeaveGuard,
        __resetForTests,
    };
}

export const newPathLeaveGuard = createLeaveGuard({
    title: "Discard unsaved changes?",
    description:
        "You have unsaved program changes. Cancel to stay and Save from the toolbar, or Discard to leave without saving.",
    onDiscard: clearBuilderDraft,
});

export const editProfileLeaveGuard = createLeaveGuard({
    title: "Discard unsaved changes?",
    description:
        "You have unsaved edits on this page. Stay to keep editing, or discard to leave without saving.",
});
