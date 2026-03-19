"use client";

import { ExportProgramCTAButtons } from "./ExportProgramCTAButtons";
import { exportOptions } from "@/assets/constants/export-options";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogFooter,
    DialogHeader,
    DialogDescription,
} from "@/components/ui/dialog";
import { convertToHevyRoutine, deFlattenHevyRoutine } from "@/components/program-builder/utils";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { useQuery } from "@tanstack/react-query";
import { ExportToHevySetup } from "@/components/program-builder/shared/ExportToHevySetup";
import { incrementProgramSaves } from "@/api/programs";
import { Button } from "@/components/ui/button";
import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

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

    const [pdfOpen, setPdfOpen] = useState(false);
    const [hevyOpen, setHevyOpen] = useState(false);
    const [hevyUploading, setHevyUploading] = useState(false);
    const [showBackConfirm, setShowBackConfirm] = useState(false);

    const { data: flatHevyRoutines } = useQuery({
        queryKey: ["export-hevy-routines", programId],
        queryFn: () => convertToHevyRoutine(sortedWorkoutsByWeek),
        enabled: (pdfOpen || hevyOpen) && sortedWorkoutsByWeek.length > 0,
    });

    const hevyRoutine = flatHevyRoutines ? deFlattenHevyRoutine(flatHevyRoutines) : undefined;

    const handleSelectExport = (id: string) => {
        if (id === "pdf") {
            setPdfOpen(true);
        } else if (id === "hevy") {
            setHevyOpen(true);
        }
    };

    const handleHevyOpenChange = (nextOpen: boolean) => {
        if (!nextOpen && hevyUploading) {
            setShowBackConfirm(true);
            return;
        }
        setHevyOpen(nextOpen);
    };

    const handleConfirmStopUpload = () => {
        setShowBackConfirm(false);
        setHevyOpen(false);
    };

    const visibleExportOptions = exportOptions.filter((o) => o.id === "hevy" || o.id === "pdf");

    return (
        <>
            <div className="rounded-xl dark:bg-darkGray bg-extraLightGray text-black dark:text-white shadow-md flex flex-col text-center justify-start items-center px-8 w-full h-full max-sm:h-auto max-sm:pb-4">
                <div className="flex flex-col w-full">
                    <h2 className="font-main text-5xl max-sm:text-3xl pt-4 font-bold pb-8">Export Program</h2>
                    <ExportProgramCTAButtons
                        programId={programId}
                        exportOptions={visibleExportOptions}
                        onSelectExport={handleSelectExport}
                        showComingSoonLabel={false}
                        hideHevyCrown
                    />
                </div>
            </div>

            <Dialog open={pdfOpen} onOpenChange={setPdfOpen}>
                <DialogContent className="sm:max-w-6xl max-sm:w-[95vw]">
                    <DialogTitle className="font-bold font-main text-xl sm:text-2xl text-center">
                        PDF Preview
                    </DialogTitle>
                    {hevyRoutine && hevyRoutine.length > 0 ? (
                        <PdfPreviewPane hevyRoutine={hevyRoutine} isInLbs={isInLbs} />
                    ) : (
                        <PdfPreviewSkeleton />
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={hevyOpen} onOpenChange={handleHevyOpenChange}>
                <DialogContent
                    className="sm:max-w-6xl max-sm:w-[95vw]"
                    hideClose={hevyUploading}
                    onPointerDownOutside={hevyUploading ? (e) => e.preventDefault() : undefined}
                    onEscapeKeyDown={hevyUploading ? (e) => e.preventDefault() : undefined}
                >
                    <DialogTitle className="font-bold font-main text-xl sm:text-2xl text-center">
                        Export to Hevy
                    </DialogTitle>
                    <div className="w-full px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 lg:px-10 lg:py-6">
                        {flatHevyRoutines ? (
                            <ExportToHevySetup
                                onUploadStateChange={setHevyUploading}
                                hevyRoutines={flatHevyRoutines}
                                skipUsageTracking
                                onExportSuccess={() => incrementProgramSaves(programId)}
                            />
                        ) : (
                            <p className="text-sm text-muted-foreground py-4 text-center">
                                Preparing program data…
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            <Dialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Stop upload?</DialogTitle>
                        <DialogDescription>
                            Are you sure? Closing will stop the upload.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBackConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleConfirmStopUpload}>
                            Yes, stop upload
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
