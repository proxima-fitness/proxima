// SPDX-License-Identifier: AGPL-3.0-only

"use client";

import { PDFViewer } from "@react-pdf/renderer";
import { HevyPdfRenderer } from "@/components/program-builder/hevy/HevyPdfRenderer";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useCallback } from "react";

interface IProps {
    hevyRoutine: THevyRoutine[][];
    isInLbs: boolean;
}

export const PdfPreviewPane: React.FC<IProps> = ({ hevyRoutine, isInLbs }) => {
    const [ready, setReady] = useState(false);

    const handleRef = useCallback((node: HTMLDivElement | null) => {
        if (!node) return;
        const iframe = node.querySelector("iframe");
        if (iframe) {
            iframe.addEventListener("load", () => setReady(true), { once: true });
        }
    }, []);

    return (
        <div className="relative w-full max-sm:h-[50vh] h-[60vh]" ref={handleRef}>
            {!ready && (
                <Skeleton className="absolute inset-0 rounded-lg" />
            )}
            <PDFViewer
                className="w-full h-full rounded-lg border"
                style={{ visibility: ready ? "visible" : "hidden" }}
            >
                <HevyPdfRenderer hevyRoutine={hevyRoutine} isInLbs={isInLbs} />
            </PDFViewer>
        </div>
    );
};
