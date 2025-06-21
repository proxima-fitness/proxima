"use client";

import { useIsHevy } from "@/contexts/HevyContext";
import { HevyProgramsGrid } from "@/components/program-builder/hevy/HevyProgramsGrid";

export const ConditionalHevyGrid: React.FC = () => {
    const { isHevy } = useIsHevy();

    if (!isHevy) {
        return null;
    }

    return <HevyProgramsGrid />;
};
