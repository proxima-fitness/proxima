/**
 * @module ProgramOverviewWeekList
 *
 * Per-program overview slide body (ADR 0010 / 02–04): week rows + status,
 * program CTAs (Export / Edit / AI slot), Mark complete, Hevy mirror.
 *
 * Depends on: useProgramHevyWeekLinks, useProgramScheduleHistoryDays, useHevyPrograms,
 *             UserContext, ProgramOverviewWeekStatus, ProgramOverviewWeekRow,
 *             ProgramOverviewCtas, ProgramOverviewHevyMirror
 * Used by: ProgramOverviewSection (carousel children)
 */

"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
    useHevyPrograms,
    useHevySecret,
    useProgramHevyWeekLinks,
    useProgramScheduleHistoryDays,
} from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgramOverviewCtas } from "./ProgramOverviewCtas";
import { ProgramOverviewHevyMirror } from "./ProgramOverviewHevyMirror";
import { ProgramOverviewWeekRow } from "./ProgramOverviewWeekRow";
import {
    deriveCompletedWeeksFromScheduleHistory,
    deriveProgramOverviewWeekStatuses,
    mergeCompletedWeeks,
    readManualCompletedWeeks,
    writeManualCompletedWeeks,
} from "./ProgramOverviewWeekStatus";

export type TProgramOverviewWeekListProps = {
    programId: number;
    programTitle: string;
    programLength: number | null;
};

function WeekListSkeleton() {
    return (
        <div className="space-y-4" aria-hidden>
            <div className="flex justify-center gap-2">
                <Skeleton className="h-8 w-24 rounded-full" />
                <Skeleton className="h-8 w-28 rounded-full" />
            </div>
            <ul className="space-y-0">
                {Array.from({ length: 4 }, (_, i) => (
                    <li
                        key={i}
                        className="flex items-center justify-between border-b border-border/40 py-2.5 last:border-b-0"
                    >
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-3.5 w-20" />
                    </li>
                ))}
            </ul>
        </div>
    );
}

/**
 * Week rows + CTAs for one active Proxima program (inside that program’s slide).
 */
export function ProgramOverviewWeekList({
    programId,
    programTitle,
    programLength,
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
    // Remount via key={programId} from parent so lazy init resets per program.
    const [manualCompleted, setManualCompleted] = useState(() =>
        readManualCompletedWeeks(programId),
    );

    const isLoading = linksLoading || (!!user && historyLoading);

    if (isLoading) {
        return <WeekListSkeleton />;
    }

    const linkedWeeks = links.map((link) => link.nth_week);
    const expectedDaysByWeek = new Map<number, number>();
    for (const link of links) {
        expectedDaysByWeek.set(link.nth_week, link.hevy_routine_ids?.length ?? 0);
    }

    const autoCompleted = deriveCompletedWeeksFromScheduleHistory(
        historyDays,
        expectedDaysByWeek,
    );
    const completedWeeks = mergeCompletedWeeks(autoCompleted, manualCompleted);

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

    const handleMarkComplete = (week: number) => {
        const next = Array.from(new Set([...manualCompleted, week])).sort((a, b) => a - b);
        writeManualCompletedWeeks(programId, next);
        setManualCompleted(next);
        toast.success(`Marked week ${week} complete.`);
    };

    return (
        <div className="flex flex-col gap-4">
            <ProgramOverviewCtas
                programId={programId}
                programTitle={programTitle}
                linkedWeeks={linkedWeeks}
                completedWeeks={completedWeeks}
                linksLoading={linksLoading}
            />

            {weekCount < 1 ? (
                <p className="px-1 py-2 text-center text-sm text-muted-foreground">
                    No weeks on this program yet.
                </p>
            ) : (
                <ul className="mx-auto w-full max-w-md px-1" aria-label="Program weeks">
                    {rows.map((row) => (
                        <ProgramOverviewWeekRow
                            key={row.week}
                            week={row.week}
                            status={row.status}
                            programId={programId}
                            showActions={row.status === "current"}
                            canMarkComplete={
                                row.status === "current" && !completedWeeks.includes(row.week)
                            }
                            onMarkComplete={() => handleMarkComplete(row.week)}
                        />
                    ))}
                </ul>
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
