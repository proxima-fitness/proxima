// SPDX-License-Identifier: AGPL-3.0-only

/**
 * @module ProgramOverviewExportWeekCTA
 *
 * Thin overview Week Export CTA + progress fragment (ADR 0009, ADR 0011 / 04).
 * Gates Export via Program–Hevy links + Week complete (`completed_at` on link).
 * No Hevy key: Connect Hevy, not a disabled Export.
 *
 * Depends on: ProgramOverviewExportWeek, tooltip,
 *             refreshOverviewQueriesAfterWeekExport, useProgramHevyWeekLinks,
 *             useHevySecret, useProgramWeekComplete, UserContext, ConfirmDialog
 * Used by: thin Week Export entry points (overview CTAs own primary Export)
 */

"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, KeyRound, Upload } from "lucide-react";
import {
    useHevySecret,
    useProgramHevyWeekLinks,
    useWorkoutRoutineIds,
} from "@/api/hooks";
import {
    useAutoMarkProgramWeeksComplete,
    useAutoUncompleteProgramWeeks,
    useMarkProgramWeekComplete,
} from "@/hooks/useProgramWeekComplete";
import { useUserContext } from "@/contexts/UserContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ConnectHevyDialog } from "@/components/header/ConnectHevyDialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { RATE_LIMIT_EXHAUSTED_MESSAGE } from "@/assets/constants/ui-constants";
import {
    evaluateWeekExportGate,
    exportProgramWeekToHevy,
    nextExportableWeek,
} from "./ProgramOverviewExportWeek";
import { refreshOverviewQueriesAfterWeekExport } from "./refreshOverviewQueriesAfterWeekExport";
import {
    deriveCompletedWeeksFromLinks,
    deriveCompletedWeeksFromWorkoutRoutineIds,
    deriveEffectiveCompletedWeeks,
    weekHasCompletionProof,
    weeksNeedingAutoMark,
    weeksNeedingUncomplete,
} from "./ProgramOverviewWeekStatus";

type TUploadProgress = {
    uploaded: number;
    total: number;
    status: "uploading" | "rate_limited";
    rateLimitSecondsLeft?: number;
};

export type TProgramOverviewExportWeekCTAProps = {
    programId: number;
    programTitle: string;
};

/**
 * Renders Export week N button, gate-aware disable, and Mark week complete.
 */
export function ProgramOverviewExportWeekCTA({
    programId,
    programTitle,
}: TProgramOverviewExportWeekCTAProps) {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: links = [], isLoading: linksLoading } = useProgramHevyWeekLinks(programId);
    const { data: workoutRoutineIds = [] } = useWorkoutRoutineIds(user?.id);
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<TUploadProgress | null>(null);
    const [confirmCompleteOpen, setConfirmCompleteOpen] = useState(false);
    const [connectHevyOpen, setConnectHevyOpen] = useState(false);
    const markComplete = useMarkProgramWeekComplete(programId);

    const linkedWeeks = links.map((link) => link.nth_week);

    const persistedCompleted = deriveCompletedWeeksFromLinks(links);
    const autoCompleted = deriveCompletedWeeksFromWorkoutRoutineIds(links, workoutRoutineIds);
    const completedWeeks = deriveEffectiveCompletedWeeks(links, workoutRoutineIds);
    useAutoMarkProgramWeeksComplete(
        programId,
        weeksNeedingAutoMark(autoCompleted, persistedCompleted),
    );
    useAutoUncompleteProgramWeeks(
        programId,
        weeksNeedingUncomplete(links, workoutRoutineIds),
    );

    const currentLinkedWeek =
        linkedWeeks.length > 0 ? Math.max(...linkedWeeks) : null;
    const nthWeek = nextExportableWeek(linkedWeeks);
    const gate = evaluateWeekExportGate(nthWeek, linkedWeeks, completedWeeks);
    const currentLink =
        currentLinkedWeek != null
            ? (links.find((link) => link.nth_week === currentLinkedWeek) ?? null)
            : null;
    const canMarkCurrentComplete =
        currentLinkedWeek != null &&
        !completedWeeks.includes(currentLinkedWeek) &&
        weekHasCompletionProof(currentLink, workoutRoutineIds);

    const handleMarkComplete = () => {
        if (currentLinkedWeek == null) {
            return;
        }
        if (!weekHasCompletionProof(currentLink, workoutRoutineIds)) {
            toast.error("Log a workout in Hevy before marking this week complete.");
            return;
        }
        markComplete.mutate(currentLinkedWeek, {
            onSuccess: () => {
                toast.success(`Marked week ${currentLinkedWeek} complete.`);
            },
            onError: (err) => {
                const message =
                    err instanceof Error ? err.message : "Could not mark week complete.";
                toast.error(message);
            },
        });
    };

    const handleExport = async () => {
        if (!user) {
            toast.error("Sign in to export a week to Hevy.");
            return;
        }
        if (!hevyApiKey) {
            toast.error("Connect your Hevy API key before Week Export.");
            return;
        }
        if (isUploading) {
            return;
        }

        const liveGate = evaluateWeekExportGate(nthWeek, linkedWeeks, completedWeeks);
        if (!liveGate.allowed) {
            toast.error(liveGate.reason);
            return;
        }

        setIsUploading(true);
        setUploadProgress({ uploaded: 0, total: 0, status: "uploading" });

        const result = await exportProgramWeekToHevy({
            programId,
            programTitle,
            nthWeek,
            apiKey: hevyApiKey,
            user,
            completedWeeks,
            onProgress: (uploaded, total, status, rateLimitSecondsLeft) => {
                setUploadProgress({ uploaded, total, status, rateLimitSecondsLeft });
            },
        });

        if (result.success !== true) {
            setIsUploading(false);
            setUploadProgress(null);
            const message = result.error.message.includes("Rate limited after 3 retries")
                ? RATE_LIMIT_EXHAUSTED_MESSAGE
                : result.error.message;
            toast.error(message);
            return;
        }

        try {
            await refreshOverviewQueriesAfterWeekExport(queryClient, {
                programId,
                createdNewHevyCustomTemplates: result.createdNewHevyCustomTemplates,
            });
            toast.success(
                `Exported week ${nthWeek} to Hevy. Current week: ${result.currentWeek}.`,
            );
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
        }
    };

    const exportDisabled =
        isUploading || !user || !hevyApiKey || linksLoading || !gate.allowed;
    const needsHevyConnect = Boolean(user) && !hevyApiKey;
    const exportGateHint = !gate.allowed && !linksLoading ? gate.reason : undefined;
    const exportGateLabel =
        exportGateHint != null
            ? `Export week ${nthWeek}: ${exportGateHint}`
            : `Export week ${nthWeek}`;

    return (
        <div className="flex w-full flex-col gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{programTitle}</p>
                    <p className="text-xs text-muted-foreground">
                        Week Export · week {nthWeek}
                        {currentLinkedWeek != null
                            ? ` · current linked ${currentLinkedWeek}`
                            : ""}
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {currentLinkedWeek != null &&
                    !completedWeeks.includes(currentLinkedWeek) ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            disabled={
                                isUploading ||
                                markComplete.isPending ||
                                !canMarkCurrentComplete
                            }
                            onClick={() => {
                                if (!canMarkCurrentComplete) {
                                    return;
                                }
                                setConfirmCompleteOpen(true);
                            }}
                        >
                            <Check className="mr-1.5 size-3.5" aria-hidden />
                            Mark week {currentLinkedWeek} complete
                        </Button>
                    ) : null}
                    {needsHevyConnect ? (
                        <Button
                            type="button"
                            size="sm"
                            className="rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90"
                            disabled={!user}
                            onClick={() => setConnectHevyOpen(true)}
                            aria-label="Connect Hevy"
                        >
                            <KeyRound className="mr-1.5 size-3.5" aria-hidden />
                            Connect Hevy
                        </Button>
                    ) : exportGateHint ? (
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span
                                        className="inline-flex"
                                        tabIndex={0}
                                        aria-label={exportGateLabel}
                                    >
                                        <Button
                                            type="button"
                                            size="sm"
                                            className="rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90"
                                            disabled={exportDisabled}
                                            onClick={() => {
                                                void handleExport();
                                            }}
                                        >
                                            <Upload className="mr-1.5 size-3.5" aria-hidden />
                                            {isUploading
                                                ? "Exporting…"
                                                : `Export week ${nthWeek}`}
                                        </Button>
                                    </span>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    className="max-w-[240px] bg-lightSecondary text-left leading-snug text-white"
                                >
                                    {exportGateHint}
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ) : (
                        <Button
                            type="button"
                            size="sm"
                            className="rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90"
                            disabled={exportDisabled}
                            onClick={() => {
                                void handleExport();
                            }}
                        >
                            <Upload className="mr-1.5 size-3.5" aria-hidden />
                            {isUploading ? "Exporting…" : `Export week ${nthWeek}`}
                        </Button>
                    )}
                </div>
            </div>
            {isUploading && uploadProgress ? (
                <div className="flex flex-col gap-2">
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-500">
                        Do not leave this page.
                    </p>
                    <div className="flex items-center gap-3">
                        <Progress
                            className="flex-1"
                            value={
                                uploadProgress.total > 0
                                    ? (uploadProgress.uploaded / uploadProgress.total) * 100
                                    : 0
                            }
                        />
                        <span className="shrink-0 text-sm text-muted-foreground">
                            {uploadProgress.uploaded}/{uploadProgress.total} routines uploaded
                        </span>
                    </div>
                    {uploadProgress.status === "rate_limited" ? (
                        <p className="text-xs text-muted-foreground">
                            Rate limited: trying again in{" "}
                            {typeof uploadProgress.rateLimitSecondsLeft === "number"
                                ? uploadProgress.rateLimitSecondsLeft
                                : "60"}{" "}
                            seconds…
                        </p>
                    ) : null}
                </div>
            ) : null}
            <ConnectHevyDialog
                openConnectHevyDialog={connectHevyOpen}
                handleOpenConnectHevyDialog={setConnectHevyOpen}
            />
            <ConfirmDialog
                open={confirmCompleteOpen && currentLinkedWeek != null}
                onOpenChange={setConfirmCompleteOpen}
                title={`Mark week ${currentLinkedWeek ?? ""} complete?`}
                description="Are you sure? This week becomes history. You can export the next week after."
                confirmLabel="Mark complete"
                confirmVariant="default"
                confirmClassName="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                isConfirmLoading={markComplete.isPending}
                onConfirm={handleMarkComplete}
            />
        </div>
    );
}
