/**
 * @module ProgramOverviewCtas
 *
 * Per-slide overview shell + CTAs (ADR 0010 / 03, ADR 0020 / 01, mobile layout):
 * title + meta left (owner can rename). **Edit program** is always a quiet
 * title-row control on desktop. A **Day complete** percent bar sits under
 * the title (desktop: above 0%; mobile: always when planned-day total known).
 * Desktop header: split Export (Hevy Week Export left, PDF / spreadsheet
 * dropdown right) plus **Edit current week** ("Edit Week N").
 * Mobile: overflow ⋯ for occasional actions; full-width Export only while
 * zero Program–Hevy links (ADR 0016 / 02). AI week suggest mounts in
 * ProgramOverviewWeekList after the Week preview.
 *
 * Depends on: ExportDialog, ProgramOverviewExportWeek,
 *             refreshOverviewQueriesAfterWeekExport, overview-start,
 *             updateProgramTitle, ConfirmDialog, Button, DropdownMenu, Progress
 * Used by: ProgramOverviewWeekList
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronDown, EllipsisVertical, FileText, Pencil, Table, Type, Upload } from "lucide-react";
import { useHevySecret } from "@/api/hooks";
import {
    MAX_PROGRAM_TITLE_LENGTH,
    updateProgramTitle,
} from "@/api/programs";
import { useUserContext } from "@/contexts/UserContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shouldHighlightOverviewExport } from "@/hooks/overview-start";
import { cn } from "@/lib/utils";
import { ExportDialog } from "@/components/program-builder/shared/ExportDialog";
import { RATE_LIMIT_EXHAUSTED_MESSAGE } from "@/assets/constants/ui-constants";
import {
    evaluateWeekExportGate,
    exportProgramWeekToHevy,
    loadPrescriptionHevyRoutines,
    nextExportableWeek,
} from "./ProgramOverviewExportWeek";
import { refreshOverviewQueriesAfterWeekExport } from "./refreshOverviewQueriesAfterWeekExport";
import { weekCompletePercent } from "./ProgramOverviewWeekStatus";

type TUploadProgress = {
    uploaded: number;
    total: number;
    status: "uploading" | "rate_limited";
    rateLimitSecondsLeft?: number;
};

export type TProgramOverviewCtasProps = {
    programId: number;
    programTitle: string;
    programLength: number | null;
    specialization?: string[] | null;
    linkedWeeks: readonly number[];
    completedWeeks: readonly number[];
    /** Planned days with **Day complete**, plus full weeks that are **Week complete**. */
    completedDays?: number;
    /** Planned days in the **Program prescription**. */
    totalDays?: number;
    linksLoading: boolean;
    /** Owner-only: show rename control next to the title. */
    canRenameTitle?: boolean;
    /**
     * 1-based Current week. Used for Edit Week N and for reset Export when
     * that week's folder is gone.
     */
    currentWeek?: number | null;
    /**
     * Incomplete linked weeks whose Hevy folder is gone. Enables reset
     * Re-Export of Current week (D5).
     */
    missingFolderWeeks?: readonly number[];
    /** Enter Edit current week for `currentWeek`. Omit when there is no Edit target. */
    onEditCurrentWeek?: () => void;
    /** Disable Edit Week N while Hevy is loading or the session is entering. */
    editCurrentWeekDisabled?: boolean;
};

const EXPORT_SPLIT_CLASS =
    "bg-lightSecondary text-white shadow-none hover:bg-lightSecondary/90";

/**
 * Owner **Edit program** entry. Always the quiet title-row control (desktop).
 */
function EditProgramControl({ programId }: { programId: number }) {
    return (
        <Button
            type="button"
            variant="link"
            size="sm"
            className="h-auto px-0 text-xs font-normal text-muted-foreground"
            asChild
        >
            {/* Stub until ADR 0014 Edit program arrival */}
            <Link href={`/build-program?shareId=${programId}`}>
                <Pencil className="size-3" aria-hidden />
                Edit program
            </Link>
        </Button>
    );
}

function formatProgramMeta(
    programLength: number | null,
    specialization: string[] | null | undefined,
): string | null {
    const parts: string[] = [];
    if (programLength != null && programLength > 0) {
        parts.push(`${programLength}-week`);
    }
    const specializationLabel = specialization?.filter(Boolean).join(" · ");
    if (specializationLabel) {
        parts.push(specializationLabel);
    }
    return parts.length > 0 ? parts.join(" · ") : null;
}

function formatMobileProgressMeta(
    currentWeek: number | null,
    programLength: number | null,
    completedDays: number,
    totalDays: number,
): string | null {
    if (programLength == null || programLength < 1) {
        return null;
    }
    const weekLabel =
        currentWeek != null && currentWeek >= 1
            ? `Week ${currentWeek} of ${programLength}`
            : `${programLength}-week`;
    const percent = weekCompletePercent(completedDays, totalDays);
    return `${weekLabel} · ${percent}% complete`;
}

function ProgramWeekCompleteBar({
    completed,
    total,
    showAtZero = false,
    compact = false,
}: {
    completed: number;
    total: number;
    /** Mobile: show a thin bar even at 0%. */
    showAtZero?: boolean;
    compact?: boolean;
}) {
    if (total < 1) {
        return null;
    }
    const percent = weekCompletePercent(completed, total);
    if (!showAtZero && percent < 1) {
        return null;
    }

    return (
        <div
            className={cn(
                "flex w-full items-center gap-3",
                compact ? "pt-1.5" : "max-w-md pt-2",
            )}
        >
            <Progress
                value={percent}
                animateFill
                className={cn("flex-1 bg-muted", compact ? "h-1.5" : "h-2.5")}
                aria-label={`${percent}% complete`}
            />
            {!compact ? (
                <span className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {percent}%
                </span>
            ) : null}
        </div>
    );
}

/**
 * Program shell (title + Edit program | split Export / Edit Week N on desktop;
 * overflow menu on mobile). AI week suggest lives on WeekList.
 */
export function ProgramOverviewCtas({
    programId,
    programTitle,
    programLength,
    specialization = null,
    linkedWeeks,
    completedWeeks,
    completedDays = 0,
    totalDays = 0,
    linksLoading,
    canRenameTitle = false,
    currentWeek = null,
    missingFolderWeeks = [],
    onEditCurrentWeek,
    editCurrentWeekDisabled = false,
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
    const [renameOpen, setRenameOpen] = useState(false);
    const [renameDraft, setRenameDraft] = useState(programTitle);
    const [isRenaming, setIsRenaming] = useState(false);

    const nthWeek = nextExportableWeek(linkedWeeks, {
        currentWeek,
        completedWeeks,
        missingFolderWeeks,
    });
    const gate = evaluateWeekExportGate(
        nthWeek,
        linkedWeeks,
        completedWeeks,
        missingFolderWeeks,
    );
    const hevyDisabled =
        isUploading || !user || !hevyApiKey || linksLoading || !gate.allowed || fileLoading;
    const weekExportGated = !linksLoading && !gate.allowed;
    const meta = formatProgramMeta(programLength, specialization);
    const mobileMeta = formatMobileProgressMeta(
        currentWeek,
        programLength,
        completedDays,
        totalDays,
    );
    const hasExported = linkedWeeks.length > 0;
    const highlightExport = shouldHighlightOverviewExport({
        hevyLinkCount: linkedWeeks.length,
        linksLoading,
    });
    /** Loud mobile Export only while zero links (next action to start the loop). */
    const showMobileLoudExport = highlightExport;
    const showEditCurrentWeek =
        currentWeek != null && currentWeek >= 1 && onEditCurrentWeek != null;
    const liveEditWeek = currentWeek != null && currentWeek >= 1 ? currentWeek : null;
    const editWeekNumber = showEditCurrentWeek
        ? liveEditWeek
        : hasExported
          ? null
          : 1;
    const editWeekDisabled =
        !hasExported || !showEditCurrentWeek || editCurrentWeekDisabled;

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

        const liveGate = evaluateWeekExportGate(
            nthWeek,
            linkedWeeks,
            completedWeeks,
            missingFolderWeeks,
        );
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
            missingFolderWeeks,
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

    const openRename = () => {
        setRenameDraft(programTitle);
        setRenameOpen(true);
    };

    const handleRenameConfirm = async () => {
        if (!user || isRenaming) {
            return;
        }
        const trimmed = renameDraft.trim();
        if (!trimmed || trimmed === programTitle.trim()) {
            setRenameOpen(false);
            return;
        }

        setIsRenaming(true);
        const result = await updateProgramTitle(user, programId, trimmed);
        setIsRenaming(false);

        if (!result.success) {
            toast.error(result.error);
            return;
        }

        queryClient.setQueryData<TProgram[] | undefined>(
            ["subscribed-programs", user.id],
            (prev) =>
                prev?.map((program) =>
                    program.id === programId
                        ? { ...program, title: result.title }
                        : program,
                ),
        );
        void queryClient.invalidateQueries({
            queryKey: ["subscribed-programs", user.id],
        });
        setRenameOpen(false);
        toast.success("Program renamed.");
    };

    const overflowMenu = (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-9 shrink-0 rounded-lg border-border/60"
                    aria-label="Program actions"
                >
                    <EllipsisVertical className="size-4" aria-hidden />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[12rem]">
                {!showMobileLoudExport ? (
                    <DropdownMenuItem
                        disabled={hevyDisabled}
                        title={!gate.allowed ? gate.reason : undefined}
                        onSelect={() => {
                            void handleWeekExport();
                        }}
                    >
                        <Upload className="size-3.5" aria-hidden />
                        Export Week {nthWeek}
                    </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                    disabled={fileLoading || isUploading}
                    onSelect={() => {
                        void openFileExport("pdf");
                    }}
                >
                    <FileText className="size-3.5" aria-hidden />
                    PDF
                </DropdownMenuItem>
                <DropdownMenuItem
                    disabled={fileLoading || isUploading}
                    onSelect={() => {
                        void openFileExport("spreadsheet");
                    }}
                >
                    <Table className="size-3.5" aria-hidden />
                    Spreadsheet
                </DropdownMenuItem>
                {editWeekNumber != null ? (
                    <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            disabled={editWeekDisabled}
                            title={
                                !hasExported
                                    ? "Export this week to Hevy first"
                                    : undefined
                            }
                            onSelect={() => {
                                onEditCurrentWeek?.();
                            }}
                        >
                            <Pencil className="size-3.5" aria-hidden />
                            Edit Week {editWeekNumber}
                        </DropdownMenuItem>
                    </>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                    <Link href={`/build-program?shareId=${programId}`}>
                        <Pencil className="size-3.5" aria-hidden />
                        Edit program
                    </Link>
                </DropdownMenuItem>
                {canRenameTitle ? (
                    <DropdownMenuItem onSelect={openRename}>
                        <Type className="size-3.5" aria-hidden />
                        Rename program
                    </DropdownMenuItem>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );

    return (
        <div className="flex w-full flex-col gap-3 px-1">
            {/* Mobile title + overflow */}
            <div className="flex items-start gap-2 md:hidden">
                <div className="min-w-0 flex-1 space-y-0.5">
                    <h3 className="min-w-0 text-balance text-xl font-semibold tracking-tight text-foreground">
                        {programTitle}
                    </h3>
                    {mobileMeta ? (
                        <p className="text-sm text-muted-foreground">{mobileMeta}</p>
                    ) : null}
                    <ProgramWeekCompleteBar
                        completed={completedDays}
                        total={totalDays}
                        showAtZero
                        compact
                    />
                </div>
                {overflowMenu}
            </div>

            {showMobileLoudExport ? (
                <div
                    className={cn(
                        "md:hidden",
                        highlightExport
                            ? "rounded-full ring-2 ring-lightSecondary/80 ring-offset-2 ring-offset-background animate-overview-export-nudge"
                            : null,
                    )}
                    data-export-highlight={highlightExport ? "true" : undefined}
                >
                    <Button
                        type="button"
                        size="default"
                        className={`${EXPORT_SPLIT_CLASS} h-11 w-full rounded-full`}
                        disabled={hevyDisabled}
                        title={!gate.allowed ? gate.reason : undefined}
                        onClick={() => {
                            void handleWeekExport();
                        }}
                    >
                        <Upload className="size-4" aria-hidden />
                        Export Week {nthWeek}
                    </Button>
                </div>
            ) : null}

            {/* Desktop title + split Export / Edit Week N */}
            <div className="hidden flex-col gap-3 md:flex md:flex-row md:items-start md:justify-between md:gap-4">
                <div className="min-w-0 space-y-0.5">
                    <div className="flex min-w-0 items-center gap-1.5">
                        <h3 className="min-w-0 text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                            {programTitle}
                        </h3>
                        {canRenameTitle ? (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
                                aria-label="Rename program"
                                onClick={openRename}
                            >
                                <Pencil className="size-3.5" aria-hidden />
                            </Button>
                        ) : null}
                    </div>
                    <ProgramWeekCompleteBar
                        completed={completedDays}
                        total={totalDays}
                    />
                    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-0.5">
                        {meta ? (
                            <p className="text-sm text-muted-foreground">{meta}</p>
                        ) : null}
                        <EditProgramControl programId={programId} />
                    </div>
                </div>

                <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <div
                            className={cn(
                                "inline-flex rounded-full shadow-sm",
                                highlightExport
                                    ? "ring-2 ring-lightSecondary/80 ring-offset-2 ring-offset-background animate-overview-export-nudge"
                                    : null,
                            )}
                            role="group"
                            aria-label="Export"
                            data-export-highlight={highlightExport ? "true" : undefined}
                            data-export-gated={weekExportGated ? "true" : undefined}
                        >
                            <Button
                                type="button"
                                size="sm"
                                variant={weekExportGated ? "outline" : undefined}
                                className={
                                    weekExportGated
                                        ? "rounded-l-full rounded-r-none border-border/80 border-r-0"
                                        : `${EXPORT_SPLIT_CLASS} rounded-l-full rounded-r-none`
                                }
                                disabled={hevyDisabled}
                                title={!gate.allowed ? gate.reason : undefined}
                                onClick={() => {
                                    void handleWeekExport();
                                }}
                            >
                                <Upload className="size-3.5" aria-hidden />
                                Export Week {nthWeek}
                            </Button>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={weekExportGated ? "outline" : undefined}
                                        className={
                                            weekExportGated
                                                ? "w-8 rounded-l-none rounded-r-full border-border/80 px-0"
                                                : `${EXPORT_SPLIT_CLASS} w-8 rounded-l-none rounded-r-full border-l border-white/25 px-0`
                                        }
                                        disabled={isUploading || fileLoading}
                                        aria-label="Export as PDF or spreadsheet"
                                    >
                                        <ChevronDown className="size-3.5" aria-hidden />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="min-w-[10rem]">
                                    <DropdownMenuItem
                                        disabled={fileLoading || isUploading}
                                        onSelect={() => {
                                            void openFileExport("pdf");
                                        }}
                                    >
                                        <FileText className="size-3.5" aria-hidden />
                                        PDF
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                        disabled={fileLoading || isUploading}
                                        onSelect={() => {
                                            void openFileExport("spreadsheet");
                                        }}
                                    >
                                        <Table className="size-3.5" aria-hidden />
                                        Spreadsheet
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {editWeekNumber != null ? (
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="rounded-full border-border/80"
                                disabled={editWeekDisabled}
                                title={
                                    !hasExported
                                        ? "Export this week to Hevy first"
                                        : undefined
                                }
                                onClick={onEditCurrentWeek}
                            >
                                <Pencil className="size-3.5" aria-hidden />
                                Edit Week {editWeekNumber}
                            </Button>
                        ) : null}
                    </div>

                    {!gate.allowed && !linksLoading ? (
                        <p className="text-xs text-muted-foreground sm:text-right">
                            {gate.reason}
                        </p>
                    ) : null}
                </div>
            </div>

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

            <ConfirmDialog
                open={renameOpen}
                onOpenChange={(open) => {
                    if (!open && !isRenaming) {
                        setRenameOpen(false);
                    }
                }}
                title="Rename program"
                confirmLabel="Save"
                confirmLoadingLabel="Saving…"
                confirmVariant="default"
                confirmClassName="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                isConfirmLoading={isRenaming}
                closeOnConfirm={false}
                confirmDisabled={!renameDraft.trim()}
                inputPlaceholder="Program title"
                inputValue={renameDraft}
                onInputChange={setRenameDraft}
                inputMaxLength={MAX_PROGRAM_TITLE_LENGTH}
                onConfirm={() => {
                    void handleRenameConfirm();
                }}
            />
        </div>
    );
}
