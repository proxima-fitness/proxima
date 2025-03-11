"use client";

import { use } from "react";
import { useProgramsSSR } from "@/api/hooks";
import { ProgramSearch } from "./ProgramSearch";

export default function ProgramsLayout() {

    const initialPrograms = use(useProgramsSSR());


    // const firstBatchPrograms = use(initialPrograms);
    // const { data: programs } = usePrograms();

    return (
        <div className="px-24 max-sm:px-0">
            <ProgramSearch programs={ initialPrograms } />
        </div>
    );
};
