"use client";

import { useSearchParams } from "next/navigation";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { useIsHevy } from "@/contexts/HevyContext";
import { useBuildAiProgram, useSharedProgram } from "@/api/hooks";
import { useEffect, useMemo } from "react";
import { ProximaProgram } from "./ProximaProgram";
import { usePreview } from "@/contexts/PreviewContext";
import { HevyRoutineSchedule } from "./hevy/HevyRoutineSchedule";
import { deFlattenHevyRoutine, programCreatorDayToScheduleWorkouts } from "@/utils/program-builder";
import { ProgramSchedule } from "../programs/ProgramSchedule";

export const BuildProgramPage: React.FC = () => {

    const { isHevy } = useIsHevy();
    const { isPreview, setIsPreview } = usePreview();

    const searchParams = useSearchParams();

    const shareId = searchParams.get('shareId') ?? '';
    const edit = searchParams.get('edit') ?? '';

    if (edit === 'true') {
        setIsPreview(false);
    } else {
        setIsPreview(true);
    }

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

    // Save the prompt to local storage so that it can be saved to the database
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("prompt", JSON.stringify(search));
        }
    }, [search]);

    const { data: program, isLoading: loadingProgram } =  useBuildAiProgram(request, isHevy, shareId);
    const { data: sharedProgram, isLoading: loadingSharedProgram } = useSharedProgram(shareId);

    if ((loadingProgram || program === undefined) && (loadingSharedProgram || sharedProgram === undefined)) {
        return (
            <BuildProgramSkeleton />
        );
    }




    if (isHevy) {
        if (isPreview) {
            return (
                <div className="max-sm:px-2 sm:pl-8">
                    <HevyRoutineSchedule deflatHevyRoutine={ shareId && shareId.length > 0 ? deFlattenHevyRoutine(sharedProgram?.[0]?.hevy_routines as THevyRoutine[]) : deFlattenHevyRoutine(program as THevyRoutine[]) } />
                </div>
            );
        } else {
            return (
                <div className="max-sm:px-2 sm:pl-8">
                    <HevyRoutine program={ shareId && shareId.length > 0 ? sharedProgram?.[0]?.hevy_routines as THevyRoutine[] : program as THevyRoutine[] } />
                </div>
            );
        }
    } else if (!isHevy) {
        if (isPreview) {
            return (
                <div className="max-sm:px-2 sm:pl-8">
                    <ProgramSchedule sortedWorkoutsByWeek={ programCreatorDayToScheduleWorkouts(program as TProgramCreatorDay[][]) } />
                </div>
            );
        } else {
            return (
                <div className="max-sm:px-2 sm:pl-8">
                    <ProximaProgram program={ program as TProgramCreatorDay[][] } />
                </div>
            );
        }
    }
};
