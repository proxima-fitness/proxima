import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

const push = vi.fn();

vi.mock("next/navigation", () => ({
    useRouter: () => ({ push }),
}));

import {
    __resetEditProfileLeaveGuardForTests,
    useEditProfileLeaveGuard,
} from "../use-edit-profile-leave-guard";

describe("useEditProfileLeaveGuard", () => {
    beforeEach(() => {
        push.mockReset();
        __resetEditProfileLeaveGuardForTests();
    });

    afterEach(() => {
        cleanup();
        __resetEditProfileLeaveGuardForTests();
    });

    it("beforeunload prevents unload only after setDirty(true)", () => {
        const { result } = renderHook(() => useEditProfileLeaveGuard());

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

    it("opens leave dialog on same-origin link click while dirty, discard navigates", () => {
        const { result } = renderHook(() => useEditProfileLeaveGuard());

        act(() => {
            result.current.setDirty(true);
        });

        expect(result.current.leaveDialogOpen).toBe(false);

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

    it("stay closes dialog without navigating", () => {
        const { result } = renderHook(() => useEditProfileLeaveGuard());

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
        renderHook(() => useEditProfileLeaveGuard());

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
});
