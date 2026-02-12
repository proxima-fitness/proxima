"use client";

import { useIsHevy } from "@/contexts/HevyContext";
import { useUserContext } from "@/contexts/UserContext";
import { useHevyPrograms, useHevySecret } from "@/api/hooks";
import { HevyProgramsGrid } from "@/components/program-builder/hevy/HevyProgramsGrid";

export const ConditionalHevyGrid: React.FC = () => {
    const { isHevy } = useIsHevy();
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);

    const { data: hevyPrograms, isLoading: isLoadingHevy } = useHevyPrograms(user, hevyApiKey ?? "");

    if (!isHevy) {
        return null;
    }

    return (
        <HevyProgramsGrid
            hevyPrograms={hevyPrograms}
            isLoadingHevy={isLoadingHevy}
        />
    );
};
