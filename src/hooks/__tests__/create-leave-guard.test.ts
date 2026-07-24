import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import {
    BUILDER_DRAFT_KEY,
    __resetBuilderDraftForTests,
} from "@/lib/builder-draft";
import { createLeaveGuard, newPathLeaveGuard } from "../create-leave-guard";

describe("createLeaveGuard", () => {
    const guard = createLeaveGuard({
        title: "Discard unsaved changes?",
        description: "Leave without saving?",
    });

    beforeEach(() => {
        guard.__resetForTests();
        newPathLeaveGuard.__resetForTests();
        __resetBuilderDraftForTests();
        localStorage.clear();
    });

    afterEach(() => {
        cleanup();
        guard.__resetForTests();
        newPathLeaveGuard.__resetForTests();
        __resetBuilderDraftForTests();
        localStorage.clear();
    });

    it("beforeunload prevents unload only after setDirty(true)", () => {
        const { result } = renderHook(() => guard.useLeaveGuard());

        const cleanEvent = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(cleanEvent);
        expect(cleanEvent.defaultPrevented).toBe(false);

        act(() => {
            result.current.setDirty(true);
        });

        const dirtyEvent = new Event("beforeunload", { cancelable: true });
        window.dispatchEvent(dirtyEvent);
        expect(dirtyEvent.defaultPrevented).toBe(true);
    });

    it("opens leave dialog with pendingHref on same-origin link click while dirty", () => {
        const { result } = renderHook(() => guard.useLeaveGuard());

        act(() => {
            result.current.setDirty(true);
        });

        const anchor = document.createElement("a");
        anchor.setAttribute("href", "/profile");
        document.body.appendChild(anchor);

        act(() => {
            anchor.dispatchEvent(
                new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
            );
        });

        expect(result.current.leaveDialogOpen).toBe(true);
        expect(result.current.pendingHref).toBe("/profile");

        act(() => {
            result.current.onDiscardLeave();
            result.current.onLeaveDialogOpenChange(false);
        });

        expect(result.current.leaveDialogOpen).toBe(false);
        expect(result.current.pendingHref).toBeNull();

        document.body.removeChild(anchor);
    });

    it("Cancel closes dialog without discarding", () => {
        const { result } = renderHook(() => guard.useLeaveGuard());

        act(() => {
            result.current.setDirty(true);
        });

        const anchor = document.createElement("a");
        anchor.setAttribute("href", "/profile");
        document.body.appendChild(anchor);

        act(() => {
            anchor.dispatchEvent(
                new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
            );
        });

        act(() => {
            result.current.onLeaveDialogOpenChange(false);
        });

        expect(result.current.leaveDialogOpen).toBe(false);
        expect(result.current.pendingHref).toBeNull();

        document.body.removeChild(anchor);
    });

    it("does not intercept link clicks when clean", () => {
        renderHook(() => guard.useLeaveGuard());

        const anchor = document.createElement("a");
        anchor.setAttribute("href", "/profile");
        document.body.appendChild(anchor);

        const event = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            button: 0,
        });
        const prevented = !anchor.dispatchEvent(event);

        expect(prevented).toBe(false);

        document.body.removeChild(anchor);
    });

    it("requestLeave blocks when dirty and Discard runs beforeNavigate", () => {
        const { result } = renderHook(() => guard.useLeaveGuard());
        const beforeNavigate = vi.fn();

        act(() => {
            result.current.setDirty(true);
        });

        let blocked = false;
        act(() => {
            blocked = guard.requestLeave("/build-program?empty=true", beforeNavigate);
        });
        expect(blocked).toBe(true);
        expect(result.current.leaveDialogOpen).toBe(true);
        expect(result.current.pendingHref).toBe("/build-program?empty=true");

        act(() => {
            result.current.onDiscardLeave();
            result.current.onLeaveDialogOpenChange(false);
        });

        expect(beforeNavigate).toHaveBeenCalledTimes(1);
    });

    it("requestLeave is a no-op when clean", () => {
        renderHook(() => guard.useLeaveGuard());
        expect(guard.requestLeave("/profile")).toBe(false);
    });

    it("newPath Discard clears builder draft", () => {
        localStorage.setItem(BUILDER_DRAFT_KEY, JSON.stringify([{ title: "A" }]));
        const { result } = renderHook(() => newPathLeaveGuard.useLeaveGuard());

        act(() => {
            result.current.setDirty(true);
        });

        const anchor = document.createElement("a");
        anchor.setAttribute("href", "/profile");
        document.body.appendChild(anchor);

        act(() => {
            anchor.dispatchEvent(
                new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
            );
        });

        act(() => {
            result.current.onDiscardLeave();
            result.current.onLeaveDialogOpenChange(false);
        });

        expect(localStorage.getItem(BUILDER_DRAFT_KEY)).toBeNull();

        document.body.removeChild(anchor);
    });
});
