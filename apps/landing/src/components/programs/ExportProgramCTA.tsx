// SPDX-License-Identifier: AGPL-3.0-only

"use client";

import { ExportProgramCTAButtons } from "./ExportProgramCTAButtons";
import { exportOptions } from "@/assets/constants/export-options";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    convertToHevyRoutine,
    deFlattenHevyRoutine,
    hevyRoutinesToCsvWithWeekAndDayTitles,
} from "@/components/program-builder/utils";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { useUserContext } from "@/contexts/UserContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import { buildAuthLoginHref } from "@/lib/sign-in-return";

const PdfPreviewSkeleton = () => (
    <Skeleton className="w-full max-sm:h-[50vh] h-[60vh] rounded-lg" />
);

const PdfPreviewPane = dynamic(
    () => import("./PdfPreviewPane").then((mod) => mod.PdfPreviewPane),
    { ssr: false, loading: PdfPreviewSkeleton },
);

interface IProps {
    programId: number;
    sortedWorkoutsByWeek: TScheduleWorkouts[][];
}

export const ExportProgramCTA: React.FC<IProps> = ({ programId, sortedWorkoutsByWeek }) => {
    const { isInLbs } = usePoundsOrKgContext();
    const { user, isLoading: authLoading } = useUserContext();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const loginWithNext = buildAuthLoginHref(pathname, searchParams);

    const [pdfOpen, setPdfOpen] = useState(false);
    const [spreadsheetOpen, setSpreadsheetOpen] = useState(false);

    const { data: flatHevyRoutines, isPending: exportRoutinesPending } = useQuery({
        queryKey: ["export-hevy-routines", programId],
        queryFn: () => convertToHevyRoutine(sortedWorkoutsByWeek),
        enabled: (pdfOpen || spreadsheetOpen) && sortedWorkoutsByWeek.length > 0,
    });

    const hevyRoutine = flatHevyRoutines ? deFlattenHevyRoutine(flatHevyRoutines) : undefined;

    const handleSelectExport = (id: string) => {
        if (!user) return;
        if (id === "pdf") {
            setPdfOpen(true);
        } else if (id === "spreadsheet") {
            setSpreadsheetOpen(true);
        }
    };

    const handleDownloadCsv = () => {
        if (!flatHevyRoutines || flatHevyRoutines.length === 0) return;
        const csv = hevyRoutinesToCsvWithWeekAndDayTitles(flatHevyRoutines);
        const bom = "\uFEFF";
        const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my-proxima-program.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <>
            <div className="flex w-full max-sm:h-auto flex-col items-center justify-start rounded-2xl border-0 bg-card/80 px-6 py-6 text-center text-foreground shadow-none backdrop-blur-sm dark:border dark:border-white/10 dark:bg-card/60 max-sm:pb-5 sm:px-8">
                <div className="flex w-full flex-col items-center">
                    {(authLoading || user) && (
                        <h2 className="font-third pb-3 pt-1 text-2xl font-semibold tracking-tight max-sm:text-3xl">
                            Export
                        </h2>
                    )}
                    {authLoading ? (
                        <div className="flex flex-col gap-3 w-full pb-4" aria-busy="true" aria-label="Loading export options">
                            <Skeleton className="h-22 w-full rounded-lg" />
                            <Skeleton className="h-22 w-full rounded-lg" />
                            <Skeleton className="h-22 w-full rounded-lg" />
                        </div>
                    ) : user ? (
                        <ExportProgramCTAButtons
                            programId={programId}
                            exportOptions={exportOptions}
                            onSelectExport={handleSelectExport}
                        />
                    ) : (
                        <div className="relative w-full pb-4 ">
                            <div
                                className="flex w-full flex-col opacity-50 pointer-events-none select-none"
                                aria-hidden="true"
                            >
                                <h2 className="font-third pb-3 pt-1 text-2xl font-semibold tracking-tight max-sm:text-3xl">
                                    Export
                                </h2>
                                <ExportProgramCTAButtons
                                    programId={programId}
                                    exportOptions={exportOptions}
                                    onSelectExport={handleSelectExport}
                                />
                            </div>
                            <div className="absolute inset-0 z-10 flex items-center justify-center overflow-hidden rounded-2xl bg-background/40 px-4 backdrop-blur-sm dark:bg-background/25">
                                <Button
                                    asChild
                                    className="relative z-1 h-10 rounded-xl bg-secondary font-semibold text-white shadow-sm hover:bg-secondary/90 dark:bg-lightSecondary dark:text-extraDarkGray dark:hover:bg-lightSecondary/90"
                                >
                                    <Link href={loginWithNext}>Sign in to export</Link>
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
                <DialogContent className="sm:max-w-6xl max-sm:w-[95vw]">
                    <DialogTitle className="text-center font-third text-xl font-semibold tracking-tight sm:text-2xl">
                        PDF preview
                    </DialogTitle>
                    {hevyRoutine && hevyRoutine.length > 0 ? (
                        <PdfPreviewPane hevyRoutine={hevyRoutine} isInLbs={isInLbs} />
                    ) : (
                        <PdfPreviewSkeleton />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={spreadsheetOpen} onOpenChange={setSpreadsheetOpen}>
                <DialogContent className="sm:max-w-lg max-sm:w-[95vw]">
                    <DialogTitle className="text-center font-third text-xl font-semibold tracking-tight sm:text-2xl">
                        Spreadsheet
                    </DialogTitle>
                    {sortedWorkoutsByWeek.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            This program has no workouts to export as CSV.
                        </p>
                    ) : exportRoutinesPending ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            Preparing program data…
                        </p>
                    ) : flatHevyRoutines && flatHevyRoutines.length > 0 ? (
                        <div className="w-full flex flex-col items-center justify-center text-center gap-3 py-6">
                            <p className="text-sm text-muted-foreground">
                                Open in Excel, Google Sheets, or any spreadsheet app.
                            </p>
                            <Button
                                className="rounded-xl bg-secondary font-semibold text-white hover:bg-secondary/90 dark:bg-lightSecondary dark:text-extraDarkGray dark:hover:bg-lightSecondary/90"
                                onClick={handleDownloadCsv}
                            >
                                Download CSV
                            </Button>
                        </div>
                    ) : (
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            This program has no workouts to export as CSV.
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
