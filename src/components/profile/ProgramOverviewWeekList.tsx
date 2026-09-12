/**
 * @module ProgramOverviewWeekList
 *
 * Per-program overview slide body (ADR 0010 / 02–04, ADR 0020 / 01–03,
 * ADR 0011 / 04, mobile layout): shell (title | Export / overflow), week rail +
 * Selected week preview (mobile: sticky chips + compact list; desktop:
 * HevyDayCard), Mark week complete, AI week suggest, Hevy mirror.
 * Title percent is **Day complete** / planned days.
 *
 * Depends on: useProgramHevyWeekLinks, useWorkoutRoutineIds, useHevyPrograms,
 *             useProgramWeekComplete, UserContext, ProgramOverviewWeekStatus,
 *             ProgramOverviewWeekRail, ProgramOverviewWeekPreview,
 *             ProgramOverviewCtas, ProgramOverviewHevyMirror, AiWeekSuggestPanel,
 *             ConfirmDialog, loadPrescriptionHevyRoutines
 * Used by: ProgramOverviewSection (carousel children)
 */

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { toast } from "sonner";
import {
    useHevyPrograms,
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
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { useNavigateToEditHevyProgram } from "@/hooks/useNavigateToEditHevyProgram";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
    applyWeekSuggestion,
    describeApplyResult,
    WeekSuggestApplyError,
} from "./AiWeekSuggestApply";
import { AiWeekSuggestPanel } from "./AiWeekSuggestPanel";
import { loadPrescriptionHevyRoutines } from "./ProgramOverviewExportWeek";
import { ProgramOverviewCtas } from "./ProgramOverviewCtas";
import { ProgramOverviewHevyMirror } from "./ProgramOverviewHevyMirror";
import {
    PROGRAM_PRESCRIPTION_HEVY_QUERY_KEY,
    ProgramOverviewWeekPreview,
} from "./ProgramOverviewWeekPreview";
import { ProgramOverviewWeekRail } from "./ProgramOverviewWeekRail";
import {
    deriveCompletedWeeksFromLinks,
    deriveCompletedWeeksFromWorkoutRoutineIds,
    deriveEffectiveCompletedWeeks,
    deriveProgramDayProgress,
    deriveProgramOverviewWeekStatuses,
    findHevyProgramForWeek,
    missingHevyFolderWeeks,
    resolveSelectedWeek,
    weekHasCompletionProof,
    weeksNeedingAutoMark,
    weeksNeedingUncomplete,
} from "./ProgramOverviewWeekStatus";

export type TProgramOverviewWeekListProps = {
    programId: number;
    programTitle: string;
    programLength: number | null;
    specialization?: string[] | null;
    /** Owner-only: Program overview title rename. */
    canRenameTitle?: boolean;
};

function WeekListSkeleton() {
    return (
        <div className="space-y-4" aria-hidden>
            <div className="flex flex-col gap-3 px-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56 sm:w-72" />
                    <Skeleton className="h-4 w-36" />
                </div>
                <div className="flex gap-2 sm:justify-end">
                    <Skeleton className="h-8 w-24 rounded-full" />
                    <Skeleton className="h-8 w-28 rounded-full" />
                </div>
            </div>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:gap-4">
                <div className="flex gap-2 overflow-hidden md:hidden">
                    <Skeleton className="h-12 w-20 shrink-0 rounded-full" />
                    <Skeleton className="h-12 w-20 shrink-0 rounded-full" />
                    <Skeleton className="h-12 w-20 shrink-0 rounded-full" />
                </div>
                <div className="hidden w-40 shrink-0 space-y-2 md:block">
                    <Skeleton className="h-9 w-full rounded-lg" />
                    <Skeleton className="h-9 w-full rounded-lg" />
                    <Skeleton className="h-9 w-full rounded-lg" />
                </div>
                <Skeleton className="h-28 min-w-0 flex-1 rounded-xl" />
            </div>
        </div>
    );
}

/**
 * Week rail + Selected week panel for one active Proxima program slide.
 */
export function ProgramOverviewWeekList({
    programId,
    programTitle,
    programLength,
    specialization = null,
    canRenameTitle = false,
}: TProgramOverviewWeekListProps) {
    const { user } = useUserContext();
    const { isInLbs } = usePoundsOrKgContext();
    const queryClient = useQueryClient();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: hevyPrograms, isLoading: isLoadingHevy } = useHevyPrograms(
        user,
        hevyApiKey ?? "",
    );
    const { data: links = [], isLoading: linksLoading } = useProgramHevyWeekLinks(programId);
    const { data: workoutRoutineIds = [], isLoading: workoutIdsLoading } = useWorkoutRoutineIds(
        user?.id,
    );
    const { data: prescriptionRoutines = [] } = useQuery({
        queryKey: [...PROGRAM_PRESCRIPTION_HEVY_QUERY_KEY, programId],
        queryFn: () => loadPrescriptionHevyRoutines(programId),
        enabled: Number.isInteger(programId) && programId > 0,
    });
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [confirmCompleteWeek, setConfirmCompleteWeek] = useState<number | null>(null);
    const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false);
    const markComplete = useMarkProgramWeekComplete(programId);
    const navigateToEdit = useNavigateToEditHevyProgram();
    const [isEnteringEdit, setIsEnteringEdit] = useState(false);

    const linkedWeeks = links.map((link) => link.nth_week);

    const persistedCompleted = deriveCompletedWeeksFromLinks(links);
    const autoCompleted = deriveCompletedWeeksFromWorkoutRoutineIds(links, workoutRoutineIds);
    const completedWeeks = deriveEffectiveCompletedWeeks(links, workoutRoutineIds);
    const dayProgress = deriveProgramDayProgress(
        links,
        workoutRoutineIds,
        completedWeeks,
        prescriptionRoutines,
    );
    const autoMarkWeeks = weeksNeedingAutoMark(autoCompleted, persistedCompleted);
    const uncompleteWeeks = weeksNeedingUncomplete(links, workoutRoutineIds);

    useAutoMarkProgramWeeksComplete(programId, autoMarkWeeks);
    useAutoUncompleteProgramWeeks(programId, uncompleteWeeks);

    const isLoading = linksLoading || (!!user && workoutIdsLoading);

    if (isLoading) {
        return <WeekListSkeleton />;
    }

    const weekCount =
        programLength != null && programLength > 0
            ? programLength
            : linkedWeeks.length > 0
              ? Math.max(...linkedWeeks)
              : 0;

    const rows =
        weekCount > 0
            ? deriveProgramOverviewWeekStatuses(weekCount, linkedWeeks, completedWeeks)
            : [];

    const resolvedSelected = resolveSelectedWeek(selectedWeek, rows);
    const selectedRow =
        resolvedSelected != null
            ? (rows.find((row) => row.week === resolvedSelected) ?? null)
            : null;
    const selectedIsCurrent = selectedRow?.status === "current";
    const currentWeekNumber = rows.find((row) => row.status === "current")?.week ?? null;
    const selectedLink =
        resolvedSelected != null
            ? (links.find((row) => row.nth_week === resolvedSelected) ?? null)
            : null;
    const selectedNeedsComplete =
        selectedIsCurrent &&
        resolvedSelected != null &&
        !completedWeeks.includes(resolvedSelected);
    const canMarkSelectedComplete =
        selectedNeedsComplete && weekHasCompletionProof(selectedLink, workoutRoutineIds);

    /** Still fetching Hevy — distinct from "fetched, folder is gone". */
    const hevyPending = Boolean(hevyApiKey) && isLoadingHevy;
    const hevyFetched = Boolean(hevyApiKey) && !hevyPending;
    /** Link row for the Current week — carries the folder id and day-ordered routine ids. */
    const currentWeekLink =
        currentWeekNumber != null
            ? (links.find((link) => link.nth_week === currentWeekNumber) ?? null)
            : null;
    /** Hevy folder that is the Current week's Hevy week copy (null → no Edit target). */
    const currentWeekHevyProgram =
        currentWeekNumber != null
            ? findHevyProgramForWeek(hevyPrograms, links, currentWeekNumber)
            : null;
    const showEditCurrentWeek =
        currentWeekNumber != null && (hevyPending || currentWeekHevyProgram != null);
    const missingFolderWeeks = hevyFetched
        ? missingHevyFolderWeeks(hevyPrograms ?? [], links, completedWeeks)
        : [];
    const selectedHevyProgram = findHevyProgramForWeek(
        hevyPrograms,
        links,
        resolvedSelected,
    );

    /** Edit current week: hand the linked folder to the builder, ordered by the link. */
    const handleEditCurrentWeek = async (program: THevyProgramItem, week: number) => {
        if (isEnteringEdit) return;
        setIsEnteringEdit(true);
        try {
            await navigateToEdit(program, {
                programId,
                nthWeek: week,
                hevyRoutineIds: currentWeekLink?.hevy_routine_ids ?? [],
            });
        } catch (err) {
            setIsEnteringEdit(false);
            const message = err instanceof Error ? err.message : "Could not open this week.";
            toast.error(message);
        }
    };

    const handleMarkComplete = (week: number) => {
        const weekLink = links.find((row) => row.nth_week === week);
        if (!weekHasCompletionProof(weekLink, workoutRoutineIds)) {
            toast.error("Log a workout in Hevy before marking this week complete.");
            return;
        }
        markComplete.mutate(week, {
            onSuccess: () => {
                toast.success(`Marked week ${week} complete.`);
            },
            onError: (err) => {
                const message =
                    err instanceof Error ? err.message : "Could not mark week complete.";
                toast.error(message);
            },
        });
    };

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

    const weekRailProps = {
        rows,
        selectedWeek: resolvedSelected ?? 1,
        onSelectWeek: setSelectedWeek,
    };

    return (
        <div className="flex flex-col gap-4">
            <ProgramOverviewCtas
                programId={programId}
                programTitle={programTitle}
                programLength={programLength}
                specialization={specialization}
                linkedWeeks={linkedWeeks}
                completedWeeks={completedWeeks}
                completedDays={dayProgress.completed}
                totalDays={dayProgress.total}
                linksLoading={linksLoading}
                canRenameTitle={canRenameTitle}
                currentWeek={currentWeekNumber}
                missingFolderWeeks={missingFolderWeeks}
                onEditCurrentWeek={
                    showEditCurrentWeek
                        ? () => {
                            if (!currentWeekHevyProgram || currentWeekNumber == null) {
                                return;
                            }
                            void handleEditCurrentWeek(
                                currentWeekHevyProgram,
                                currentWeekNumber,
                            );
                        }
                        : undefined
                }
                editCurrentWeekDisabled={
                    hevyPending || isEnteringEdit || !currentWeekHevyProgram
                }
            />

            {weekCount < 1 || resolvedSelected == null || selectedRow == null ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                    No weeks on this program yet.
                </p>
            ) : (
                <div className="flex flex-col gap-3 px-1 md:flex-row md:items-start md:gap-4">
                    <ProgramOverviewWeekRail {...weekRailProps} layout="desktop" />

                    <div
                        className="min-w-0 flex-1 md:rounded-xl md:border md:border-border/40 md:bg-muted/20 md:px-4 md:py-3"
                        data-selected-week={resolvedSelected}
                        data-week-status={selectedRow.status}
                    >
                        <ProgramOverviewWeekPreview
                            key={`${programId}-${resolvedSelected}`}
                            programId={programId}
                            nthWeek={resolvedSelected}
                            link={
                                links.find((row) => row.nth_week === resolvedSelected) ?? null
                            }
                            hevyFolderRoutines={selectedHevyProgram?.program ?? []}
                            hevyFolderPresent={!hevyFetched || selectedHevyProgram != null}
                            hevyFolderPending={hevyPending}
                            workoutRoutineIds={workoutRoutineIds}
                            userId={user?.id}
                            mobileStickyNav={
                                <ProgramOverviewWeekRail {...weekRailProps} layout="mobile" />
                            }
                        />

                        {selectedNeedsComplete ? (
                            <div className="mt-3 flex flex-col items-stretch gap-1.5 md:items-start">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-full rounded-full md:w-auto"
                                    disabled={markComplete.isPending || !canMarkSelectedComplete}
                                    aria-describedby={
                                        canMarkSelectedComplete
                                            ? undefined
                                            : "mark-week-complete-hint"
                                    }
                                    onClick={() => {
                                        if (resolvedSelected == null || !canMarkSelectedComplete) {
                                            return;
                                        }
                                        setConfirmCompleteWeek(resolvedSelected);
                                    }}
                                >
                                    <Check className="size-3.5" aria-hidden />
                                    Mark week complete
                                </Button>
                                {canMarkSelectedComplete ? null : (
                                    <p
                                        id="mark-week-complete-hint"
                                        className="text-xs text-muted-foreground"
                                    >
                                        Log a workout in Hevy first.
                                    </p>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <div className="px-1">
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
            </div>

            <ProgramOverviewHevyMirror
                programId={programId}
                links={links}
                completedWeeks={completedWeeks}
                hevyPrograms={hevyPrograms}
                isLoadingHevy={hevyPending}
            />

            <ConfirmDialog
                open={confirmCompleteWeek != null}
                onOpenChange={(open) => {
                    if (!open) {
                        setConfirmCompleteWeek(null);
                    }
                }}
                title={`Mark week ${confirmCompleteWeek ?? ""} complete?`}
                description="Are you sure? This week becomes history. You can export the next week after."
                confirmLabel="Mark complete"
                confirmVariant="default"
                confirmClassName="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                isConfirmLoading={markComplete.isPending}
                onConfirm={() => {
                    if (confirmCompleteWeek == null) {
                        return;
                    }
                    handleMarkComplete(confirmCompleteWeek);
                }}
            />
        </div>
    );
}
