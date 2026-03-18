"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { HevyPdfRenderer } from "@/components/program-builder/hevy/HevyPdfRenderer";

interface IProps {
    hevyRoutine: THevyRoutine[][];
    isInLbs: boolean;
}

export const PdfPreviewPane: React.FC<IProps> = ({ hevyRoutine, isInLbs }) => (
    <PDFViewer className="w-full max-sm:h-[50vh] h-[60vh] rounded-lg border">
        <HevyPdfRenderer hevyRoutine={hevyRoutine} isInLbs={isInLbs} />
    </PDFViewer>
);
