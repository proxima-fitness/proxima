"use client";

import { use } from "react";
import { usePrograms } from "@/api/hooks";
import { ProgramSearch } from "./ProgramSearch";

export default function ProgramsLayout({ initialPrograms }: { initialPrograms: Promise<TProgram[]> }) {

    const firstBatchPrograms = use(initialPrograms);
    console.log("firstBatchPrograms:",firstBatchPrograms);
    const { data: programs = firstBatchPrograms } = usePrograms();
    console.log("programs:",programs);

    return (
        <div className="px-24 max-sm:px-0">
            <ProgramSearch programs={ programs } />
        </div>
    );
};
