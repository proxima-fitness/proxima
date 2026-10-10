// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module SyncProgressDialog
 *
 * Progress, failure, and rollback chrome for **Sync** (ADR 0013 / 04).
 * Not a second persist CTA — the toolbar button is the only persist slot.
 *
 * Depends on: Dialog, Button, Progress
 * Used by: BuildProgram
 */
"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { TSyncFailure } from "@/components/program-builder/api/hevy_sync";

export type TSyncProgress = {
    uploaded: number;
    total: number;
    status: "uploading" | "rate_limited";
    rateLimitSecondsLeft?: number;
};

export type TSyncDialogPhase = "uploading" | "failed" | "rolling_back";

interface ISyncProgressDialogProps {
    open: boolean;
    phase: TSyncDialogPhase;
    progress: TSyncProgress | null;
    failures: readonly TSyncFailure[];
    onRetry: () => void;
    onRollback: () => void;
    onOpenChange: (open: boolean) => void;
}

/**
 * Sync in-flight / failure dialog.
 *
 * @param props.open - Whether the dialog is shown
 * @param props.phase - Uploading, failed, or rolling back
 * @param props.progress - Counts from the Hevy write callback
 * @param props.failures - Ops that did not succeed
 * @param props.onRetry - Re-run Sync
 * @param props.onRollback - Apply {@link buildRollbackPlan}
 * @param props.onOpenChange - Dismiss (ignored while writes are in flight)
 */
export function SyncProgressDialog({
    open,
    phase,
    progress,
    failures,
    onRetry,
    onRollback,
    onOpenChange,
}: ISyncProgressDialogProps) {
    const busy = phase === "uploading" || phase === "rolling_back";
    const title =
        phase === "failed"
            ? "Sync failed"
            : phase === "rolling_back"
                ? "Rolling back…"
                : "Syncing to Hevy";

    return (
        <Dialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
            <DialogContent hideClose={busy}>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {phase === "failed"
                            ? "Hevy was not fully updated. Retry, or roll back to the previous version."
                            : "Do not leave this page."}
                    </DialogDescription>
                </DialogHeader>
                {progress ? (
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                            <Progress
                                className="flex-1"
                                value={
                                    progress.total > 0
                                        ? (progress.uploaded / progress.total) * 100
                                        : 0
                                }
                            />
                            <span className="shrink-0 text-sm text-muted-foreground">
                                {progress.uploaded}/{progress.total}
                            </span>
                        </div>
                        {progress.status === "rate_limited" ? (
                            <p className="text-xs text-muted-foreground">
                                Rate limited: trying again in{" "}
                                {typeof progress.rateLimitSecondsLeft === "number"
                                    ? progress.rateLimitSecondsLeft
                                    : "60"}{" "}
                                seconds…
                            </p>
                        ) : null}
                    </div>
                ) : null}
                {phase === "failed" && failures.length > 0 ? (
                    <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                        {failures.map((failure) => (
                            <li key={`${failure.op}-${failure.hevyRoutineId ?? failure.title}`}>
                                {failure.op}: {failure.title} — {failure.error}
                            </li>
                        ))}
                    </ul>
                ) : null}
                {phase === "failed" ? (
                    <DialogFooter>
                        <Button variant="outline" onClick={onRollback}>
                            Rollback to previous version
                        </Button>
                        <Button
                            className="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                            onClick={onRetry}
                        >
                            Retry
                        </Button>
                    </DialogFooter>
                ) : null}
            </DialogContent>
        </Dialog>
    );
}
