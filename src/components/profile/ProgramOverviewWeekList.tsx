/**
 * @module ProgramOverviewWeekList
 *
 * Per-program overview slide body (ADR 0010 / 02–04, ADR 0020 / 01–03,
 * ADR 0011 / 04): chrome (title | Export / Edit), week rail + Selected week
 * preview, Mark week complete, Hevy mirror.
 *
 * Depends on: useProgramHevyWeekLinks, useProgramScheduleHistoryDays, useHevyPrograms,
 *             useProgramWeekComplete, UserContext, ProgramOverviewWeekStatus,
 *             ProgramOverviewWeekRail, ProgramOverviewWeekPreview,
 *             ProgramOverviewCtas, ProgramOverviewHevyMirror
 * Used by: ProgramOverviewSection (carousel children)
 */

"use client";

import { useState } from "react";
import Link from "next/link";
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
    const markComplete = useMarkProgramWeekComplete(programId);

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
                                        onClick={() => handleMarkComplete(resolvedSelected)}
                                    >
                                        <Check className="size-3.5" aria-hidden />
                                        Mark week complete
                                    </Button>
                                ) : null}
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 rounded-full text-muted-foreground"
                                    asChild
                                >
                                    {/* Stub until ADR 0013 Hevy-folder Edit current week arrival */}
                                    <Link
                                        href={`/build-program?shareId=${programId}&editWeek=${resolvedSelected}`}
                                    >
                                        <Pencil className="size-3.5" aria-hidden />
                                        Edit week
                                    </Link>
                                </Button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <ProgramOverviewHevyMirror
                links={links}
                completedWeeks={completedWeeks}
                hevyPrograms={hevyPrograms}
                isLoadingHevy={Boolean(hevyApiKey) && isLoadingHevy}
            />
        </div>
    );
}
