// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module hooks/useEditLeaveGuard
 *
 * Edit leave-guard helpers (ADR 0013 / 07).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import { newPathLeaveGuard } from "../create-leave-guard";
import {
    editLeaveGuard,
    isEditLeaveDirty,
    requestBuilderLeave,
    resolveSyncLeaveHref,
    useEditLeaveGuard,
} from "../useEditLeaveGuard";

describe("isEditLeaveDirty", () => {
    it("is true only on Edit arrival with a non-empty undo stack", () => {
        expect(isEditLeaveDirty(true, 1)).toBe(true);
        expect(isEditLeaveDirty(true, 0)).toBe(false);
        expect(isEditLeaveDirty(false, 3)).toBe(false);
    });
});

describe("resolveSyncLeaveHref", () => {
    it("uses the pending href and falls back to profile", () => {
        expect(resolveSyncLeaveHref("/account/privacy")).toBe("/account/privacy");
        expect(resolveSyncLeaveHref(null)).toBe("/profile");
        expect(resolveSyncLeaveHref("")).toBe("/profile");
    });
});

describe("editLeaveGuard", () => {
    beforeEach(() => {
        editLeaveGuard.__resetForTests();
        newPathLeaveGuard.__resetForTests();
    });

    afterEach(() => {
        cleanup();
        editLeaveGuard.__resetForTests();
        newPathLeaveGuard.__resetForTests();
    });

    it("beforeunload prevents unload only when dirty", () => {
        const { result } = renderHook(() => useEditLeaveGuard());

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

    it("requestBuilderLeave prefers Edit over New path", () => {
        const { result } = renderHook(() => ({
            edit: useEditLeaveGuard(),
            neu: newPathLeaveGuard.useLeaveGuard(),
        }));

        act(() => {
            result.current.edit.setDirty(true);
            result.current.neu.setDirty(true);
        });

        let blocked = false;
        act(() => {
            blocked = requestBuilderLeave("/profile");
        });

        expect(blocked).toBe(true);
        expect(result.current.edit.leaveDialogOpen).toBe(true);
        expect(result.current.edit.pendingHref).toBe("/profile");
        expect(result.current.neu.leaveDialogOpen).toBe(false);
    });

    it("requestBuilderLeave falls through to New path when Edit is clean", () => {
        const { result } = renderHook(() => ({
            edit: useEditLeaveGuard(),
            neu: newPathLeaveGuard.useLeaveGuard(),
        }));
        const beforeNavigate = vi.fn();

        act(() => {
            result.current.neu.setDirty(true);
        });

        let blocked = false;
        act(() => {
            blocked = requestBuilderLeave("/build-program?empty=true", beforeNavigate);
        });

        expect(blocked).toBe(true);
        expect(result.current.edit.leaveDialogOpen).toBe(false);
        expect(result.current.neu.leaveDialogOpen).toBe(true);
        expect(result.current.neu.pendingHref).toBe("/build-program?empty=true");
    });
});
