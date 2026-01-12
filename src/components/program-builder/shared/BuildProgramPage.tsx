"use client";

import { useSearchParams } from "next/navigation";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { useIsHevy } from "@/contexts/HevyContext";
import { useSharedProgram } from "@/api/hooks";
import { useEffect, useMemo, useState } from "react";
import { usePreview } from "@/contexts/PreviewContext";
import { HevyRoutine } from "../hevy/HevyRoutine";
import { appendOrderToHevyRoutines } from "../utils/format-responses";

interface IProps {
    hevyProgram: THevyRoutine[];
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
}

export const BuildProgramPage: React.FC<IProps> = ({ hevyProgram, setHevyProgram }) => {

    const { isHevy } = useIsHevy();
    const { setIsPreview } = usePreview();

    const searchParams = useSearchParams();

    const shareId = searchParams.get('shareId') ?? '';
    const edit = searchParams.get('edit') ?? '';
    const resume = searchParams.get('resume') ?? '';
    const [resumeHevyProgram, setResumeHevyProgram] = useState<THevyRoutine[]>();
    // const [resumeProximaProgram, setResumeProximaProgram] = useState<TProgramCreatorDay[][]>();

    useEffect(() => {
        if (edit === 'true') {
            setIsPreview(false);
        } else {
            setIsPreview(true);
        }

        if (resume === 'true') {
            const program = localStorage.getItem('hevy-program-in-progress');
            if (program) {
                setResumeHevyProgram(JSON.parse(program));
            }
            // } else {
            //     const program = localStorage.getItem('program-in-progress');
            //     if (program) {
            //         setResumeProximaProgram(JSON.parse(program));
            //     }
            // }
        }
    }, [edit, setIsPreview, resume, isHevy]);

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
    const programTitle = searchParams.get('programTitle') ?? '';
    const explore = searchParams.get('explore') ?? '';

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
        programTitle,
        explore,
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
        programTitle,
        explore,
    ]);

    // Save the prompt to local storage so that it can be saved to the database
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("prompt", JSON.stringify(search));
        }
    }, [search]);

    const { data: sharedProgram, isLoading: loadingSharedProgram } = useSharedProgram(shareId, resume);

    // Determine which program to use: generatedProgram > sharedProgram > resumeHevyProgram
    const programToUse = hevyProgram || (shareId && shareId.length > 0 ? sharedProgram : undefined);

    if (!programToUse && (loadingSharedProgram || sharedProgram === undefined) && resume === "" && !hevyProgram) {
        return (
            <BuildProgramSkeleton />
        );
    }

    if (resume === "true") {
        if (!resumeHevyProgram) {
            return (
                <BuildProgramSkeleton />
            );
        }
        if (resumeHevyProgram) {
            return (
                <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden">
                    <HevyRoutine request={ request } hevyProgram={ appendOrderToHevyRoutines(resumeHevyProgram) as THevyRoutine[] } setHevyProgram={ setHevyProgram } />
                </div>
            );
        }

    }

    // Use generatedProgram if available, otherwise fall back to sharedProgram or resumeHevyProgram
    const finalProgram = programToUse || resumeHevyProgram;

    if (!finalProgram) {
        return (
            <BuildProgramSkeleton />
        );
    }

    return (
        <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden">
            <HevyRoutine request={ request } hevyProgram={ appendOrderToHevyRoutines(finalProgram) as THevyRoutine[] } setHevyProgram={ setHevyProgram } />
        </div>
    );
};
