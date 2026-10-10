/**
 * @module workout-history-sync-toasts.test
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { toast } from "sonner";
import {
    clickWorkoutHistorySyncToastRetry,
    resetWorkoutHistorySyncToastState,
    syncWorkoutHistorySyncToast,
} from "../workout-history-sync-toasts";

vi.mock("sonner", () => ({
    toast: Object.assign(vi.fn(), {
        error: vi.fn(),
        success: vi.fn(),
        dismiss: vi.fn(),
    }),
}));

const errorProgress: TWorkoutSyncProgress = {
    backedUpCount: 2,
    hevyCount: 8,
    syncError: "insert failed",
};

describe("clickWorkoutHistorySyncToastRetry", () => {
    it("does not retry while a sync request is already in flight", () => {
        const retry = vi.fn();
        const preventDefault = vi.fn();

        clickWorkoutHistorySyncToastRetry({ isPolling: true, retry }, { preventDefault });

        expect(preventDefault).toHaveBeenCalledTimes(1);
        expect(retry).not.toHaveBeenCalled();
    });

    it("retries when sync is idle", () => {
        const retry = vi.fn();

        clickWorkoutHistorySyncToastRetry({ isPolling: false, retry });

        expect(retry).toHaveBeenCalledTimes(1);
    });
});

describe("syncWorkoutHistorySyncToast retry action", () => {
    beforeEach(() => {
        resetWorkoutHistorySyncToastState();
        vi.clearAllMocks();
    });

    it("labels the action Retrying… and ignores clicks while polling", () => {
        const retry = vi.fn();

        syncWorkoutHistorySyncToast(errorProgress, { isPolling: true, retry });

        expect(toast.error).toHaveBeenCalledTimes(1);
        const options = vi.mocked(toast.error).mock.calls[0]?.[1] as {
            action?: {
                label: string;
                onClick: (event: { preventDefault: () => void }) => void;
                actionButtonStyle?: { pointerEvents?: string };
            };
        };
        expect(options.action?.label).toBe("Retrying…");
        expect(options.action?.actionButtonStyle?.pointerEvents).toBe("none");

        const preventDefault = vi.fn();
        options.action?.onClick({ preventDefault });
        expect(retry).not.toHaveBeenCalled();
    });

    it("calls retry from the toast action when idle", () => {
        const retry = vi.fn();

        syncWorkoutHistorySyncToast(errorProgress, { isPolling: false, retry });

        const options = vi.mocked(toast.error).mock.calls[0]?.[1] as {
            action?: { label: string; onClick: () => void };
        };
        expect(options.action?.label).toBe("Retry sync");
        options.action?.onClick();
        expect(retry).toHaveBeenCalledTimes(1);
    });
});
