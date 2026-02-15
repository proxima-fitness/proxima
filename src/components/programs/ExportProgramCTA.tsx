"use client";

import { ExportProgramCTAButtons } from "./ExportProgramCTAButtons";
import { exportOptions } from "@/assets/constants";

interface IProps {
    programId: number;
}

export const ExportProgramCTA: React.FC<IProps> = ({ programId }) => {

    return (
        <div className="rounded-xl bg-gray-900 border-2 border-gray-700 shadow-md flex flex-col text-center justify-start items-center px-8 w-full h-full max-sm:h-auto max-sm:pb-4">
            <div className="flex flex-col w-full">
                <h2 className="font-main text-5xl max-sm:text-3xl pt-4 font-bold text-white pb-8">Export Program</h2>
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
