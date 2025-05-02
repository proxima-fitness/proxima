"use client";

import { useSearchParams } from "next/navigation";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { useIsHevy } from "@/contexts/HevyContext";
import { useBuildAiProgram } from "@/api/hooks";
import { useMemo } from "react";
import { ProximaProgram } from "./ProximaProgram";

export const BuildProgramPage: React.FC = () => {

    const { isHevy } = useIsHevy();
    const searchParams = useSearchParams();

    const empty = searchParams.get('empty') ?? '';
    const search = searchParams.get('search') ?? '';
    const sex = searchParams.get('sex') ?? '';
    const age = searchParams.get('age') ?? '';
    const daysPerWeek = searchParams.get('daysPerWeek') ?? '';
    const specificDays = searchParams.get('specificDays') ?? '';
    const programLength = searchParams.get('programLength') ?? '';
    const workoutDuration = searchParams.get('workoutDuration') ?? '';
    const activityLevel = searchParams.get('activityLevel') ?? '';
    const goals = searchParams.get('goals') ?? '';
    const specialization = searchParams.get('specialization') ?? '';
    const equipment = searchParams.get('equipment') ?? '';
    const focusAreas = searchParams.get('focusAreas') ?? '';
    const difficultyLevel = searchParams.get('difficultyLevel') ?? '';
    const excludeAreas = searchParams.get('excludeAreas') ?? '';
    const excludeEquipment = searchParams.get('excludeEquipment') ?? '';
    const excludeSpecializations = searchParams.get('excludeSpecializations') ?? '';
    const healthIssues = searchParams.get('healthIssues') ?? '';

    const request = useMemo(() => ({
        empty,
        search,
        sex,
        age,
        daysPerWeek,
        specificDays,
        programLength,
        workoutDuration,
        activityLevel,
        goals,
        specialization,
        equipment,
        focusAreas,
        difficultyLevel,
        excludeAreas,
        excludeEquipment,
        excludeSpecializations,
        healthIssues,
      } as TTextToJsonRequest), [
        empty,
        search,
        sex,
        age,
        daysPerWeek,
        specificDays,
        programLength,
        workoutDuration,
        activityLevel,
        goals,
        specialization,
        equipment,
        focusAreas,
        difficultyLevel,
        excludeAreas,
        excludeEquipment,
        excludeSpecializations,
        healthIssues,
    ]);

    const { data: program, isLoading: loadingProgram } =  useBuildAiProgram(request, isHevy);
    console.log("Program AT GENERATION:",program);
    if (loadingProgram) {
        return (
            <BuildProgramSkeleton />
        );
    }

    return (
        <div className="max-sm:px-2 sm:pl-8">
            { program !== undefined && isHevy &&
                <HevyRoutine program={ program as THevyRoutine[] } />
            }

            { program !== undefined && !isHevy &&
                <ProximaProgram program={ program as TProgramCreatorDay[][] } />
            }
        </div>
    );
};
