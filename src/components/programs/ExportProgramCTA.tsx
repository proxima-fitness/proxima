"use client";

/*
 * @module ExportProgramCTA
 * @description High-level export call-to-action that wraps export option buttons for sending a program to external destinations.
 * @dependsOn Export program button group component, shared export option constants, and React client rendering.
 * @usedBy Program detail pages to present export choices (e.g., Hevy, PDF) for the current program.
 */

/**
 * Props for `ExportProgramCTA`.
 * @property programId Identifier of the program whose data should be exported.
 */
import { ExportProgramCTAButtons } from "./ExportProgramCTAButtons";
import { exportOptions } from "@/assets/constants/export-options";

interface IProps {
    programId: number;
}

/**
 * ExportProgramCTA renders a styled card wrapper around export buttons for the active program.
 */
export const ExportProgramCTA: React.FC<IProps> = ({ programId }) => {

    return (
        <div className="rounded-xl dark:bg-darkGray bg-extraLightGray text-black dark:text-white shadow-md flex flex-col text-center justify-start items-center px-8 w-full h-full max-sm:h-auto max-sm:pb-4">
            <div className="flex flex-col w-full">
                <h2 className="font-main text-5xl max-sm:text-3xl pt-4 font-bold pb-8">Export Program</h2>
                <ExportProgramCTAButtons
                    programId={programId}
                    exportOptions={exportOptions
                        .filter((o) => o.id === "hevy" || o.id === "pdf")
                        .map((o) => ({ ...o, disabled: true }))}
                    showComingSoonLabel={false}
                />
            </div>
        </div>
    );
};
