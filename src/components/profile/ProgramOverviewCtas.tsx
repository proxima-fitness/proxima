/**
 * @module ProgramOverviewCtas
 *
 * Per-slide overview chrome + CTAs (ADR 0010 / 03, ADR 0020 / 01): title + meta
 * left (owner can rename), Export dropdown (Hevy Week Export / PDF / spreadsheet)
 * + Edit program right; AI week suggest disclosure below (ADR 0012 / 02). Week
 * Export via ADR 0009; PDF/CSV reuse ExportDialog destinations.
 *
 * Applying a suggestion (ADR 0012 / 03) writes the prescription for week N+1
 * and refreshes the Week preview read; Export stays a separate, explicit step.
 *
 * Depends on: ExportDialog, ProgramOverviewExportWeek, AiWeekSuggestPanel,
 *             AiWeekSuggestApply, ProgramOverviewWeekPreview, hooks,
 *             updateProgramTitle, ConfirmDialog, Button, DropdownMenu, Progress
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
import {
    MAX_PROGRAM_TITLE_LENGTH,
    updateProgramTitle,
} from "@/api/programs";
import { useUserContext } from "@/contexts/UserContext";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { ConfirmDialog } from "@/components/ConfirmDialog";
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
    applyWeekSuggestion,
    describeApplyResult,
    WeekSuggestApplyError,
} from "./AiWeekSuggestApply";
import { AiWeekSuggestPanel } from "./AiWeekSuggestPanel";
import {
    evaluateWeekExportGate,
    exportProgramWeekToHevy,
    loadPrescriptionHevyRoutines,
    nextExportableWeek,
} from "./ProgramOverviewExportWeek";
import { PROGRAM_PRESCRIPTION_HEVY_QUERY_KEY } from "./ProgramOverviewWeekPreview";

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
    linksLoading: boolean;
    /** Owner-only: show rename control next to the title. */
    canRenameTitle?: boolean;
};

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

/**
 * Program chrome (title | Export / Edit) + AI week suggest for one overview slide.
 */
export function ProgramOverviewCtas({
    programId,
    programTitle,
    programLength,
    specialization = null,
    linkedWeeks,
    completedWeeks,
    linksLoading,
    canRenameTitle = false,
}: TProgramOverviewCtasProps) {
    const { user } = useUserContext();
    const { isInLbs } = usePoundsOrKgContext();
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
    const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);

    const nthWeek = nextExportableWeek(linkedWeeks);
    const gate = evaluateWeekExportGate(nthWeek, linkedWeeks, completedWeeks);
    const hevyDisabled =
        isUploading || !user || !hevyApiKey || linksLoading || !gate.allowed || fileLoading;
    const meta = formatProgramMeta(programLength, specialization);

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

    /**
     * Writes the open suggestion into the prescription for week N+1.
     * The server re-reads its cached changes; `targetWeek` only guards against
     * a panel left open across a Week complete or Week Export.
     *
     * @param suggestion - Target week from the panel (changes stay server-side)
     */
    const handleApplySuggestion = async (suggestion: { targetWeek: number }) => {
        if (isApplyingSuggestion) {
            return;
        }
        if (!user) {
            toast.error("Sign in to apply suggestions.");
            return;
        }

        setIsApplyingSuggestion(true);
        try {
            const result = await applyWeekSuggestion(
                programId,
                suggestion.targetWeek,
                isInLbs,
            );

            if (result.status === "not_ready") {
                toast.error(describeApplyResult(result));
                return;
            }

            // Prescription changed under the Week preview read.
            void queryClient.invalidateQueries({
                queryKey: [...PROGRAM_PRESCRIPTION_HEVY_QUERY_KEY, programId],
            });
            toast.success(describeApplyResult(result));
        } catch (error) {
            toast.error(
                error instanceof WeekSuggestApplyError
                    ? error.message
                    : "Couldn't apply the suggestion. Try again.",
            );
        } finally {
            setIsApplyingSuggestion(false);
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

    return (
        <div className="flex w-full flex-col gap-3 px-1">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
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
                    {meta ? (
                        <p className="text-sm text-muted-foreground">{meta}</p>
                    ) : null}
                </div>

                <div className="flex shrink-0 flex-col items-stretch gap-1.5 sm:items-end">
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
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
                            <DropdownMenuContent align="end" className="min-w-[14rem]">
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

            <AiWeekSuggestPanel
                programId={programId}
                linkedWeeks={linkedWeeks}
                completedWeeks={completedWeeks}
                programLength={programLength}
                isApplying={isApplyingSuggestion}
                onApply={(suggestion) => {
                    void handleApplySuggestion(suggestion);
                }}
            />

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
