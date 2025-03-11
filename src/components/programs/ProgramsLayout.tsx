"use client";

import { ProgramSearch } from "./ProgramSearch";

export default function ProgramsLayout() {

    // const initialPrograms = use(useProgramsSSR());

    return (
        <div className="px-24 max-sm:px-0">
            <ProgramSearch />
        </div>
    );
};
