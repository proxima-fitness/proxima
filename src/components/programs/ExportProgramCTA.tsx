"use client";

import { ExportProgramCTAButtons } from "./ExportProgramCTAButtons";
import { exportOptions } from "@/assets/constants/export-options";
import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { convertToHevyRoutine, deFlattenHevyRoutine } from "@/components/program-builder/utils";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { useQuery } from "@tanstack/react-query";
import dynamic from "next/dynamic";

const PdfPreviewPane = dynamic(
    () => import("./PdfPreviewPane").then((mod) => mod.PdfPreviewPane),
    { ssr: false },
);

interface IProps {
    programId: number;
    sortedWorkoutsByWeek: TScheduleWorkouts[][];
}

export const ExportProgramCTA: React.FC<IProps> = ({ programId, sortedWorkoutsByWeek }) => {
    const { isInLbs } = usePoundsOrKgContext();
    const [pdfOpen, setPdfOpen] = useState(false);

    const { data: hevyRoutine } = useQuery({
        queryKey: ["pdf-hevy-routine", programId],
        queryFn: async () => {
            const flat = await convertToHevyRoutine(sortedWorkoutsByWeek);
            return deFlattenHevyRoutine(flat);
        },
        enabled: pdfOpen && sortedWorkoutsByWeek.length > 0,
        staleTime: Infinity,
    });

    const handleSelectExport = (id: string) => {
        if (id === "pdf") {
            setPdfOpen(true);
        }
    };

    const pdfExportOptions = exportOptions
        .filter((o) => o.id === "hevy" || o.id === "pdf")
        .map((o) => (o.id === "pdf" ? o : { ...o, disabled: true }));

    return (
        <>
            <div className="rounded-xl dark:bg-darkGray bg-extraLightGray text-black dark:text-white shadow-md flex flex-col text-center justify-start items-center px-8 w-full h-full max-sm:h-auto max-sm:pb-4">
                <div className="flex flex-col w-full">
                    <h2 className="font-main text-5xl max-sm:text-3xl pt-4 font-bold pb-8">Export Program</h2>
                    <ExportProgramCTAButtons
                        programId={programId}
                        exportOptions={pdfExportOptions}
                        onSelectExport={handleSelectExport}
                        showComingSoonLabel={false}
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
                        <p className="text-sm text-muted-foreground py-4 text-center">
                            Loading PDF preview…
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
};
