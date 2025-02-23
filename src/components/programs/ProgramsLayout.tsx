"use client";

import { use } from "react";
import { usePrograms } from "@/api/hooks";
import { ProgramSearch } from "./ProgramSearch";

export default function ProgramsLayout({ initialPrograms }: { initialPrograms: Promise<TProgram[]> }) {

    const firstBatchPrograms = use(initialPrograms);
    const { data: programs } = usePrograms();

    return (
        <div className="px-24 max-sm:px-0">
            <ProgramSearch programs={ programs ?? firstBatchPrograms } />
        </div>
    );
};
