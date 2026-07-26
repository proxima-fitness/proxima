/**
 * @module ProgramOverviewExportWeekCTA
 *
 * Thin overview Week Export CTA + progress fragment (ADR 0009).
 * Gates Export via Program–Hevy links + Week complete (manual mark until ADR 0011).
 *
 * Depends on: ProgramOverviewExportWeek, useProgramHevyWeekLinks, useHevySecret, UserContext
 * Used by: thin Week Export entry points (overview CTAs own primary Export)
 */

"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Upload } from "lucide-react";
import {
    PROGRAM_HEVY_LINKS_QUERY_KEY,
    useHevySecret,
    useProgramHevyWeekLinks,
} from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RATE_LIMIT_EXHAUSTED_MESSAGE } from "@/assets/constants/ui-constants";
import {
    evaluateWeekExportGate,
    exportProgramWeekToHevy,
    nextExportableWeek,
} from "./ProgramOverviewExportWeek";
import {
    readManualCompletedWeeks,
    writeManualCompletedWeeks,
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
 * Renders Export week N button, gate-aware disable, and temp Mark week complete.
 * Parent must `key={programId}` so localStorage lazy-init resets per program (no effect).
 */
export function ProgramOverviewExportWeekCTA({
    programId,
    programTitle,
}: TProgramOverviewExportWeekCTAProps) {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: links = [], isLoading: linksLoading } = useProgramHevyWeekLinks(programId);
    const queryClient = useQueryClient();
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<TUploadProgress | null>(null);
    // Lazy init from localStorage; remount via key when programId changes (rerender-lazy-state-init).
    const [completedWeeks, setCompletedWeeks] = useState(() =>
        readManualCompletedWeeks(programId),
    );

    const linkedWeeks = links.map((link) => link.nth_week);
    const currentLinkedWeek =
        linkedWeeks.length > 0 ? Math.max(...linkedWeeks) : null;
    const nthWeek = nextExportableWeek(linkedWeeks);
    const gate = evaluateWeekExportGate(nthWeek, linkedWeeks, completedWeeks);
    const canMarkCurrentComplete =
        currentLinkedWeek != null && !completedWeeks.includes(currentLinkedWeek);

    const handleMarkComplete = () => {
        if (currentLinkedWeek == null) {
            return;
        }
        const next = Array.from(new Set([...completedWeeks, currentLinkedWeek])).sort(
            (a, b) => a - b,
        );
        writeManualCompletedWeeks(programId, next);
        setCompletedWeeks(next);
        toast.success(`Marked week ${currentLinkedWeek} complete.`);
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

        setIsUploading(false);
        setUploadProgress(null);

        if (result.success !== true) {
            const message = result.error.message.includes("Rate limited after 3 retries")
                ? RATE_LIMIT_EXHAUSTED_MESSAGE
                : result.error.message;
            toast.error(message);
            return;
        }

        if (result.createdNewHevyCustomTemplates > 0) {
            queryClient.invalidateQueries({ queryKey: ["hevy-custom-exercises"] });
        }
        queryClient.invalidateQueries({
            queryKey: [...PROGRAM_HEVY_LINKS_QUERY_KEY, programId],
        });

        toast.success(
            `Exported week ${nthWeek} to Hevy. Current week: ${result.currentWeek}.`,
        );
    };

    const exportDisabled =
        isUploading || !user || !hevyApiKey || linksLoading || !gate.allowed;

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
                    {!gate.allowed ? (
                        <p className="mt-1 text-xs text-muted-foreground">{gate.reason}</p>
                    ) : null}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {canMarkCurrentComplete ? (
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            disabled={isUploading}
                            onClick={handleMarkComplete}
                        >
                            <Check className="mr-1.5 size-3.5" aria-hidden />
                            Mark week {currentLinkedWeek} complete
                        </Button>
                    ) : null}
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
        </div>
    );
}
