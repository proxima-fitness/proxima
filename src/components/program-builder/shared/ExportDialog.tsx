"use client";

import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogFooter,
    DialogHeader,
    DialogDescription,
} from "@/components/ui/dialog";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ExportProgramCTAButtons } from "@/components/programs/ExportProgramCTAButtons";
import { exportOptions } from "@/assets/constants";
import { PDFViewer } from "@react-pdf/renderer";
import { HevyPdfRenderer } from "../hevy/HevyPdfRenderer";
import { deFlattenHevyRoutine } from "../utils";
import { ChevronLeft } from "lucide-react";
import { ExportToHevySetup } from "./ExportToHevySetup";

interface IProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    programId: number;
}

export const ExportDialog: React.FC<IProps> = (props) => {
    const { open, onOpenChange, programId } = props;
    const [selectedExportId, setSelectedExportId] = useState<string | null>(null);
    const [hevyUploading, setHevyUploading] = useState(false);
    const [showBackConfirm, setShowBackConfirm] = useState(false);

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setSelectedExportId(null);
            setShowBackConfirm(false);
        }
        onOpenChange(nextOpen);
    };

    const hevyProgramFromStorage = (): THevyRoutine[][] | null => {
        if (typeof window === "undefined") return null;
        const raw = localStorage.getItem("hevy-program-in-progress");
        if (!raw) return null;
        try {
            const parsed = JSON.parse(raw) as THevyRoutine[];
            return deFlattenHevyRoutine(parsed);
        } catch {
            return null;
        }
    };

    const isHevyStepAndUploading = selectedExportId === "hevy" && hevyUploading;

    const handleHevyBackClick = () => {
        if (hevyUploading) {
            setShowBackConfirm(true);
        } else {
            setSelectedExportId(null);
        }
    };

    const handleConfirmStopUpload = () => {
        setShowBackConfirm(false);
        setSelectedExportId(null);
    };

    return (
        <>
            <Dialog open={open} onOpenChange={handleOpenChange}>
                <DialogContent
                    className={
                        selectedExportId === "pdf" || selectedExportId === "hevy"
                            ? "sm:max-w-6xl max-sm:w-[95vw]"
                            : ""
                    }
                    hideClose={isHevyStepAndUploading}
                    onPointerDownOutside={isHevyStepAndUploading ? (e) => e.preventDefault() : undefined}
                    onEscapeKeyDown={isHevyStepAndUploading ? (e) => e.preventDefault() : undefined}
                >
                <DialogTitle className="font-bold font-main text-xl sm:text-2xl text-center ">
                    Export program
                </DialogTitle>
                {selectedExportId === null && (
                    <ExportProgramCTAButtons
                        programId={programId}
                        exportOptions={exportOptions}
                        onSelectExport={setSelectedExportId}
                    />
                )}
                {selectedExportId === "pdf" && (
                    <div className="flex flex-col items-start w-full gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 min-w-0 px-2 text-xs gap-1 -ml-2"
                            onClick={() => setSelectedExportId(null)}
                        >
                            <ChevronLeft className="w-3 h-3 shrink-0" />
                            Back
                        </Button>
                        {(() => {
                            const hevyRoutine = hevyProgramFromStorage();
                            if (!hevyRoutine || hevyRoutine.length === 0) {
                                return (
                                    <p className="text-sm text-muted-foreground py-4">
                                        No program in progress. Build a program first to export as PDF.
                                    </p>
                                );
                            }
                            return (
                                <PDFViewer className="w-full max-sm:h-[50vh] h-[60vh] rounded-lg border">
                                    <HevyPdfRenderer hevyRoutine={hevyRoutine} />
                                </PDFViewer>
                            );
                        })()}
                    </div>
                )}
                {selectedExportId === "hevy" && (
                    <div className="flex flex-col items-start w-full gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 min-w-0 px-2 text-xs gap-1 -ml-2"
                            onClick={handleHevyBackClick}
                        >
                            <ChevronLeft className="w-3 h-3 shrink-0" />
                            Back
                        </Button>
                        <div className="w-full px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 lg:px-10 lg:py-6">
                            <ExportToHevySetup onUploadStateChange={setHevyUploading} />
                        </div>
                    </div>
                )}
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
