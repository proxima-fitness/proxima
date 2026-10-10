/**
 * @module ExportDialog
 * Modal to choose export destination (PDF, spreadsheet) and render PDF preview or CSV download.
 * Depends on: ExportProgramCTAButtons, HevyPdfRenderer, usePoundsOrKgContext, dialog.
 * Builder New-path toolbar no longer opens this (ADR 0007). Program overview reuses PDF /
 * spreadsheet destinations with prescription routines (ADR 0010 / 03); Hevy Week Export is
 * outside this dialog.
 */
"use client";

import {
    Dialog,
    DialogContent,
    DialogTitle,
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
import { usePoundsOrKgContext } from "@/contexts/PoundsOrKgContext";

/** Props for the export destination modal. */
interface IProps {
    /** Whether the dialog is visible. */
    open: boolean;
    /** Called when dialog open state should change. */
    onOpenChange: (open: boolean) => void;
    /** Program id (e.g. for analytics); export data comes from localStorage unless overridden. */
    programId: number;
    /** Skip picker and open this destination (overview PDF / spreadsheet). */
    initialExportId?: "pdf" | "spreadsheet" | null;
    /** Prescription routines for PDF/CSV (overview). When set, skips localStorage. */
    hevyRoutines?: THevyRoutine[] | null;
}

/** Export modal: pick PDF / spreadsheet, then show preview or CSV download. */
export const ExportDialog: React.FC<IProps> = (props) => {
    const { open, onOpenChange, programId, initialExportId = null, hevyRoutines = null } = props;
    const { isInLbs } = usePoundsOrKgContext();

    // Picker choice only — overview `initialExportId` wins when set (no prop→state effect).
    const [pickedExportId, setPickedExportId] = useState<string | null>(null);
    const selectedExportId = initialExportId ?? pickedExportId;

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            setPickedExportId(null);
        }
        onOpenChange(nextOpen);
    };

    const handleSelectExport = (id: string) => {
        setPickedExportId(id);
    };

    const hevyProgramFlattened = (): THevyRoutine[] | null => {
        if (hevyRoutines != null) {
            return hevyRoutines.length > 0 ? hevyRoutines : null;
        }
        if (typeof window === "undefined") return null;
        const raw = localStorage.getItem("hevy-program-in-progress");
        if (!raw) return null;
        try {
            return JSON.parse(raw) as THevyRoutine[];
        } catch {
            return null;
        }
    };

    const hevyProgramNested = (): THevyRoutine[][] | null => {
        const flat = hevyProgramFlattened();
        if (!flat || flat.length === 0) return null;
        return deFlattenHevyRoutine(flat);
    };

    const handleDownloadCsv = () => {
        const routines = hevyProgramFlattened();
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

    const emptyPrescriptionCopy =
        hevyRoutines != null
            ? "No program prescription to export. Save the program first."
            : "No program in progress. Build a program first to export.";

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent
                className={
                    selectedExportId === "pdf"
                        ? "sm:max-w-6xl max-sm:w-[95vw] sm:rounded-2xl"
                        : "sm:rounded-2xl"
                }
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
                    />
                )}
                {selectedExportId === "pdf" && (
                    <div className="flex flex-col items-start w-full gap-2">
                        {initialExportId == null ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-2 h-8 min-w-0 gap-1 rounded-full px-3 text-xs"
                                onClick={() => setPickedExportId(null)}
                                aria-label="Back to export options"
                            >
                                <ChevronLeft className="w-3 h-3 shrink-0" />
                                Back
                            </Button>
                        ) : null}
                        {(() => {
                            const hevyRoutine = hevyProgramNested();
                            if (!hevyRoutine || hevyRoutine.length === 0) {
                                return (
                                    <p className="text-sm text-muted-foreground py-4">
                                        {emptyPrescriptionCopy}
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
                {selectedExportId === "spreadsheet" && (
                    <div className="flex flex-col items-start w-full gap-2">
                        {initialExportId == null ? (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-2 h-8 min-w-0 gap-1 rounded-full px-3 text-xs"
                                onClick={() => setPickedExportId(null)}
                                aria-label="Back to export options"
                            >
                                <ChevronLeft className="w-3 h-3 shrink-0" />
                                Back
                            </Button>
                        ) : null}
                        {(() => {
                            const routines = hevyProgramFlattened();
                            if (!routines || routines.length === 0) {
                                return (
                                    <p className="text-sm text-muted-foreground py-4">
                                        {emptyPrescriptionCopy}
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
    );
};
