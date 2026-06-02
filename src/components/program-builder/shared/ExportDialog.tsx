/**
 * @module ExportDialog
 * Modal to choose export destination (PDF, Hevy, spreadsheet) and render PDF preview or Hevy setup / CSV download.
 * Depends on: ExportProgramCTAButtons, HevyPdfRenderer, ExportToHevySetup, usePoundsOrKgContext, dialog. Used by: StepButton.
 */
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
import { exportOptions } from "@/assets/constants/export-options";
import { PDFViewer } from "@react-pdf/renderer";
import { HevyPdfRenderer } from "../hevy/HevyPdfRenderer";
import { deFlattenHevyRoutine, hevyRoutinesToCsvWithWeekAndDayTitles } from "../utils";
import { ChevronLeft } from "lucide-react";
import { ExportToHevySetup } from "./ExportToHevySetup";
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";
import { useUserContext } from "@/contexts/UserContext";
import { useMyFeatureLimits } from "@/api/hooks";
import { useBuildProgramActions } from "@/contexts/BuildProgramActionsContext";

/** Props for the export destination modal. */
interface IProps {
    /** Whether the dialog is visible. */
    open: boolean;
    /** Called when dialog open state should change. */
    onOpenChange: (open: boolean) => void;
    /** Program id (e.g. for analytics); export data comes from localStorage. */
    programId: number;
}

/** Export modal: pick PDF / Hevy / spreadsheet, then show preview or ExportToHevySetup / CSV download. */
export const ExportDialog: React.FC<IProps> = (props) => {
    const { open, onOpenChange, programId } = props;
    const { isInLbs } = usePoundsOrKgContext();
    const { user } = useUserContext();
    const { getPersistChatId } = useBuildProgramActions();
    const { data: featureLimits } = useMyFeatureLimits(user);

    const [selectedExportId, setSelectedExportId] = useState<string | null>(null);
    const [hevyUploading, setHevyUploading] = useState(false);
    const [showBackConfirm, setShowBackConfirm] = useState(false);

    const isPro = featureLimits?.has_active_subscription === true;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setSelectedExportId(null);
            setShowBackConfirm(false);
        }
        onOpenChange(nextOpen);
    };

    const handleSelectExport = (id: string) => {
        setSelectedExportId(id);
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

    const hevyProgramFlattenedFromStorage = (): THevyRoutine[] | null => {
        if (typeof window === "undefined") return null;
        const raw = localStorage.getItem("hevy-program-in-progress");
        if (!raw) return null;
        try {
            return JSON.parse(raw) as THevyRoutine[];
        } catch {
            return null;
        }
    };

    const handleDownloadCsv = () => {
        const routines = hevyProgramFlattenedFromStorage();
        if (!routines || routines.length === 0) return;
        const csv = hevyRoutinesToCsvWithWeekAndDayTitles(routines);
        const bom = "\uFEFF";
        const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "my-proxima-program.csv";
        a.click();
        URL.revokeObjectURL(url);
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
                            ? "sm:max-w-6xl max-sm:w-[95vw] sm:rounded-2xl"
                            : "sm:rounded-2xl"
                    }
                    hideClose={isHevyStepAndUploading}
                    onPointerDownOutside={isHevyStepAndUploading ? (e) => e.preventDefault() : undefined}
                    onEscapeKeyDown={isHevyStepAndUploading ? (e) => e.preventDefault() : undefined}
                >
                <DialogTitle className="font-bold font-main text-xl sm:text-2xl text-center ">
                    Export program
                </DialogTitle>
                {selectedExportId === null && (
                    <DialogDescription className="text-center text-muted-foreground">
                        Select a destination for your program
                    </DialogDescription>
                )}
                {selectedExportId === null && (
                    <ExportProgramCTAButtons
                        programId={programId}
                        exportOptions={exportOptions}
                        onSelectExport={handleSelectExport}
                        hideHevyCrown={isPro}
                    />
                )}
                {selectedExportId === "pdf" && (
                    <div className="flex flex-col items-start w-full gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-2 h-8 min-w-0 gap-1 rounded-full px-3 text-xs"
                            onClick={() => setSelectedExportId(null)}
                            aria-label="Back to export options"
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
                                <PDFViewer className="w-full max-sm:h-[50vh] h-[60vh] rounded-2xl border border-border/50">
                                    <HevyPdfRenderer hevyRoutine={hevyRoutine} isInLbs={isInLbs} />
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
                            className="-ml-2 h-8 min-w-0 gap-1 rounded-full px-3 text-xs"
                            onClick={handleHevyBackClick}
                            aria-label="Back to export options"
                        >
                            <ChevronLeft className="w-3 h-3 shrink-0" />
                            Back
                        </Button>
                        <div className="w-full px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 lg:px-10 lg:py-6">
                            <ExportToHevySetup
                                onUploadStateChange={setHevyUploading}
                                getPersistChatId={getPersistChatId}
                            />
                        </div>
                    </div>
                )}
                {selectedExportId === "spreadsheet" && (
                    <div className="flex flex-col items-start w-full gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="-ml-2 h-8 min-w-0 gap-1 rounded-full px-3 text-xs"
                            onClick={() => setSelectedExportId(null)}
                            aria-label="Back to export options"
                        >
                            <ChevronLeft className="w-3 h-3 shrink-0" />
                            Back
                        </Button>
                        {(() => {
                            const routines = hevyProgramFlattenedFromStorage();
                            if (!routines || routines.length === 0) {
                                return (
                                    <p className="text-sm text-muted-foreground py-4">
                                        No program in progress. Build a program first to export as CSV.
                                    </p>
                                );
                            }
                            return (
                                <div className="w-full flex flex-col items-center justify-center text-center gap-3 py-6">
                                    <p className="text-sm text-muted-foreground">
                                        Open in Excel, Google Sheets, or any spreadsheet app.
                                    </p>
                                    <Button
                                        className="rounded-full bg-lightSecondary px-6 text-white hover:bg-lightSecondary/90"
                                        onClick={handleDownloadCsv}
                                    >
                                        Download CSV
                                    </Button>
                                </div>
                            );
                        })()}
                    </div>
                )}
            </DialogContent>
        </Dialog>
            <Dialog open={showBackConfirm} onOpenChange={setShowBackConfirm}>
                <DialogContent className="sm:max-w-[425px] sm:rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Stop upload?</DialogTitle>
                        <DialogDescription>
                            Are you sure? Closing will stop the upload.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:justify-end">
                        <Button variant="outline" className="rounded-full border-border/80" onClick={() => setShowBackConfirm(false)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" className="rounded-full px-4" onClick={handleConfirmStopUpload}>
                            Yes, stop upload
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};
