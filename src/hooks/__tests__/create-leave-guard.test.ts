import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

const push = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

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
        push.mockReset();
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

    it("Discard navigates after same-origin link click while dirty", () => {
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

        act(() => {
            result.current.onDiscardLeave();
        });

        expect(result.current.leaveDialogOpen).toBe(false);
        expect(push).toHaveBeenCalledWith("/profile");

        document.body.removeChild(anchor);
    });

    it("Cancel closes dialog without navigating", () => {
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
        expect(push).not.toHaveBeenCalled();

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
        expect(push).not.toHaveBeenCalled();

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
        expect(push).not.toHaveBeenCalled();

        act(() => {
            result.current.onDiscardLeave();
        });

        expect(beforeNavigate).toHaveBeenCalledTimes(1);
        expect(push).toHaveBeenCalledWith("/build-program?empty=true");
    });

    it("requestLeave is a no-op when clean", () => {
        renderHook(() => guard.useLeaveGuard());
        expect(guard.requestLeave("/profile")).toBe(false);
    });

    it("newPath Discard clears builder draft before navigate", () => {
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
        });

        expect(localStorage.getItem(BUILDER_DRAFT_KEY)).toBeNull();
        expect(push).toHaveBeenCalledWith("/profile");

        document.body.removeChild(anchor);
    });
});
