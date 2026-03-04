"use client";

/**
 * @module ConditionalHevyGrid
 * Renders the Hevy programs grid only when the user is in Hevy mode and has synced programs.
 * Gate between HevyContext and the programs list; fetches Hevy API key and programs, then delegates to HevyProgramsGrid.
 * Depends on: HevyContext, UserContext, useHevyPrograms, useHevySecret, HevyProgramsGrid.
 * Used by: build-program / profile sections that show Hevy programs.
 */

import { useIsHevy } from "@/contexts/HevyContext";
import { useUserContext } from "@/contexts/UserContext";
import { useHevyPrograms, useHevySecret } from "@/api/hooks";
import { HevyProgramsGrid } from "@/components/program-builder/hevy/HevyProgramsGrid";

/**
 * Renders HevyProgramsGrid when isHevy is true; otherwise renders nothing.
 */
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
