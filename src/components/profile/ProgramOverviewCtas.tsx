/**
 * @module ProgramOverviewCtas
 *
 * Per-slide overview CTAs (ADR 0010 / 03): Export dropdown (Hevy Week Export /
 * PDF / spreadsheet), Edit program, AI week suggest mount (empty until 0012).
 * Week Export upload via ADR 0009 helpers; PDF/CSV reuse ExportDialog destinations.
 *
 * Depends on: ExportDialog, ProgramOverviewExportWeek, hooks, Button,
 *             DropdownMenu, Progress
 * Used by: ProgramOverviewWeekList
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, Pencil, Upload } from "lucide-react";
import {
    PROGRAM_HEVY_LINKS_QUERY_KEY,
    useHevySecret,
} from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ExportDialog } from "@/components/program-builder/shared/ExportDialog";
import { RATE_LIMIT_EXHAUSTED_MESSAGE } from "@/assets/constants/ui-constants";
import {
    evaluateWeekExportGate,
    exportProgramWeekToHevy,
    loadPrescriptionHevyRoutines,
    nextExportableWeek,
} from "./ProgramOverviewExportWeek";

type TUploadProgress = {
    uploaded: number;
    total: number;
    status: "uploading" | "rate_limited";
    rateLimitSecondsLeft?: number;
};

export type TProgramOverviewCtasProps = {
    programId: number;
    programTitle: string;
    linkedWeeks: readonly number[];
    completedWeeks: readonly number[];
    linksLoading: boolean;
};

/**
 * Program-level Export / Edit program / AI suggest slot for one overview slide.
 */
export function ProgramOverviewCtas({
    programId,
    programTitle,
    linkedWeeks,
    completedWeeks,
    linksLoading,
}: TProgramOverviewCtasProps) {
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    const queryClient = useQueryClient();

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<TUploadProgress | null>(null);
    const [fileExportOpen, setFileExportOpen] = useState(false);
    const [fileExportId, setFileExportId] = useState<"pdf" | "spreadsheet" | null>(null);
    const [fileRoutines, setFileRoutines] = useState<THevyRoutine[] | null>(null);
    const [fileLoading, setFileLoading] = useState(false);

    const nthWeek = nextExportableWeek(linkedWeeks);
    const gate = evaluateWeekExportGate(nthWeek, linkedWeeks, completedWeeks);
    const hevyDisabled =
        isUploading || !user || !hevyApiKey || linksLoading || !gate.allowed || fileLoading;

    const handleWeekExport = async () => {
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

    const openFileExport = async (destination: "pdf" | "spreadsheet") => {
        if (fileLoading || isUploading) {
            return;
        }
        setFileLoading(true);
        try {
            const routines = await loadPrescriptionHevyRoutines(programId);
            if (routines.length === 0) {
                toast.error("No program prescription to export. Save the program first.");
                return;
            }
            setFileRoutines(routines);
            setFileExportId(destination);
            setFileExportOpen(true);
        } catch {
            toast.error("Couldn't load program for export. Try again.");
        } finally {
            setFileLoading(false);
        }
    };

    return (
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 px-1">
            <div className="flex flex-wrap items-center justify-center gap-2">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            size="sm"
                            className="rounded-full bg-lightSecondary text-white hover:bg-lightSecondary/90"
                            disabled={isUploading || fileLoading}
                        >
                            <Upload className="size-3.5" aria-hidden />
                            Export
                            <ChevronDown className="size-3.5 opacity-80" aria-hidden />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="min-w-[14rem]">
                        <DropdownMenuItem
                            disabled={hevyDisabled}
                            title={!gate.allowed ? gate.reason : undefined}
                            onSelect={() => {
                                void handleWeekExport();
                            }}
                        >
                            Week Export · week {nthWeek}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled={fileLoading || isUploading}
                            onSelect={() => {
                                void openFileExport("pdf");
                            }}
                        >
                            PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            disabled={fileLoading || isUploading}
                            onSelect={() => {
                                void openFileExport("spreadsheet");
                            }}
                        >
                            Spreadsheet
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full border-border/80"
                    asChild
                >
                    {/* Stub until ADR 0014 Edit program arrival */}
                    <Link href={`/build-program?shareId=${programId}`}>
                        <Pencil className="size-3.5" aria-hidden />
                        Edit program
                    </Link>
                </Button>
            </div>

            {!gate.allowed && !linksLoading ? (
                <p className="text-center text-xs text-muted-foreground">{gate.reason}</p>
            ) : null}

            {isUploading && uploadProgress ? (
                <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-2.5">
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
                            {uploadProgress.uploaded}/{uploadProgress.total} routines
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

            {/* AI week suggest mount — content in ADR 0012 */}
            <div data-ai-week-suggest-slot aria-label="AI week suggest" />

            <ExportDialog
                open={fileExportOpen}
                onOpenChange={(next) => {
                    setFileExportOpen(next);
                    if (!next) {
                        setFileExportId(null);
                        setFileRoutines(null);
                    }
                }}
                programId={programId}
                initialExportId={fileExportId}
                hevyRoutines={fileRoutines}
            />
        </div>
    );
}
