/**
 * @module ProgramOverviewWeekList
 *
 * Per-program overview slide body (ADR 0010 / 02–04, ADR 0020 / 01–03,
 * ADR 0011 / 04): shell (title | Export / Edit), week rail + Selected week
 * preview, Mark week complete, Hevy mirror.
 *
 * Depends on: useProgramHevyWeekLinks, useProgramScheduleHistoryDays, useHevyPrograms,
 *             useProgramWeekComplete, UserContext, ProgramOverviewWeekStatus,
 *             ProgramOverviewWeekRail, ProgramOverviewWeekPreview,
 *             ProgramOverviewCtas, ProgramOverviewHevyMirror, ConfirmDialog
 * Used by: ProgramOverviewSection (carousel children)
 */

"use client";

import { useState } from "react";
import { Check, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
    useHevyPrograms,
    useHevySecret,
    useProgramHevyWeekLinks,
    useProgramScheduleHistoryDays,
} from "@/api/hooks";
import {
    useAutoMarkProgramWeeksComplete,
    useMarkProgramWeekComplete,
} from "@/hooks/useProgramWeekComplete";
import { useUserContext } from "@/contexts/UserContext";
import { useNavigateToEditHevyProgram } from "@/hooks/useNavigateToEditHevyProgram";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramOverviewCtas } from "./ProgramOverviewCtas";
import { ProgramOverviewHevyMirror } from "./ProgramOverviewHevyMirror";
import { ProgramOverviewWeekPreview } from "./ProgramOverviewWeekPreview";
import { ProgramOverviewWeekRail } from "./ProgramOverviewWeekRail";
import {
    deriveCompletedWeeksFromLinks,
    deriveCompletedWeeksFromScheduleHistory,
    deriveProgramOverviewWeekStatuses,
    findHevyProgramForWeek,
    mergeCompletedWeeks,
    resolveSelectedWeek,
    weekStatusLabel,
    weeksNeedingAutoMark,
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
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: hevyPrograms, isLoading: isLoadingHevy } = useHevyPrograms(
        user,
        hevyApiKey ?? "",
    );
    const { data: links = [], isLoading: linksLoading } = useProgramHevyWeekLinks(programId);
    const { data: historyDays = [], isLoading: historyLoading } = useProgramScheduleHistoryDays(
        programId,
        user?.id,
    );
    const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
    const [confirmCompleteWeek, setConfirmCompleteWeek] = useState<number | null>(null);
    const markComplete = useMarkProgramWeekComplete(programId);
    const navigateToEdit = useNavigateToEditHevyProgram();
    const [isEnteringEdit, setIsEnteringEdit] = useState(false);

    const linkedWeeks = links.map((link) => link.nth_week);
    const expectedDaysByWeek = new Map<number, number>();
    for (const link of links) {
        expectedDaysByWeek.set(link.nth_week, link.hevy_routine_ids?.length ?? 0);
    }

    const persistedCompleted = deriveCompletedWeeksFromLinks(links);
    const autoCompleted = deriveCompletedWeeksFromScheduleHistory(
        historyDays,
        expectedDaysByWeek,
    );
    const completedWeeks = mergeCompletedWeeks(autoCompleted, persistedCompleted);
    const autoMarkWeeks = weeksNeedingAutoMark(autoCompleted, persistedCompleted);

    useAutoMarkProgramWeeksComplete(programId, autoMarkWeeks);

    const isLoading = linksLoading || (!!user && historyLoading);

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

    /** Still fetching Hevy — distinct from "fetched, folder is gone". */
    const hevyPending = Boolean(hevyApiKey) && isLoadingHevy;
    /** Link row for the Selected week — carries the folder id and day-ordered routine ids. */
    const currentWeekLink = selectedIsCurrent
        ? (links.find((link) => link.nth_week === resolvedSelected) ?? null)
        : null;
    /** Hevy folder that is the Selected week's Hevy week copy (null → no Edit target). */
    const currentWeekHevyProgram = selectedIsCurrent
        ? findHevyProgramForWeek(hevyPrograms, links, resolvedSelected)
        : null;

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

    return (
        <div className="flex flex-col gap-4">
            <ProgramOverviewCtas
                programId={programId}
                programTitle={programTitle}
                programLength={programLength}
                specialization={specialization}
                linkedWeeks={linkedWeeks}
                completedWeeks={completedWeeks}
                linksLoading={linksLoading}
                canRenameTitle={canRenameTitle}
            />

            {weekCount < 1 || resolvedSelected == null || selectedRow == null ? (
                <p className="px-1 py-2 text-sm text-muted-foreground">
                    No weeks on this program yet.
                </p>
            ) : (
                <div className="flex flex-col gap-3 px-1 md:flex-row md:items-start md:gap-4">
                    <ProgramOverviewWeekRail
                        rows={rows}
                        selectedWeek={resolvedSelected}
                        onSelectWeek={setSelectedWeek}
                    />

                    <div
                        className="min-w-0 flex-1 rounded-xl border border-border/40 bg-muted/20 px-3 py-3 sm:px-4"
                        data-selected-week={resolvedSelected}
                        data-week-status={selectedRow.status}
                    >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h4 className="text-base font-semibold tracking-tight text-foreground">
                                Week {resolvedSelected}
                            </h4>
                            <span className="text-xs tracking-wide text-muted-foreground sm:text-sm">
                                {weekStatusLabel(selectedRow.status)}
                            </span>
                        </div>

                        <ProgramOverviewWeekPreview
                            key={`${programId}-${resolvedSelected}`}
                            programId={programId}
                            nthWeek={resolvedSelected}
                        />

                        {selectedIsCurrent ? (
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                {!completedWeeks.includes(resolvedSelected) ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-8 rounded-full"
                                        disabled={markComplete.isPending}
                                        onClick={() => setConfirmCompleteWeek(resolvedSelected)}
                                    >
                                        <Check className="size-3.5" aria-hidden />
                                        Mark week complete
                                    </Button>
                                ) : null}
                                {/* Pending Hevy → disabled, not absent: a missing button reads
                                    as "no Hevy week copy", which is a different thing. */}
                                {hevyPending || currentWeekHevyProgram ? (
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 rounded-full text-muted-foreground"
                                        disabled={hevyPending || isEnteringEdit || !currentWeekHevyProgram}
                                        onClick={() => {
                                            if (!currentWeekHevyProgram) return;
                                            void handleEditCurrentWeek(
                                                currentWeekHevyProgram,
                                                resolvedSelected,
                                            );
                                        }}
                                    >
                                        <Pencil className="size-3.5" aria-hidden />
                                        Edit current week
                                    </Button>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

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
