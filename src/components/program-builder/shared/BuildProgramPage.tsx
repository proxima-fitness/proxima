"use client";

import { useSearchParams } from "next/navigation";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { useIsHevy } from "@/contexts/HevyContext";
import { useBuildAiProgram, useSharedProgram } from "@/api/hooks";
import { useEffect, useMemo, useState } from "react";
import { usePreview } from "@/contexts/PreviewContext";
import { HevyRoutine } from "../hevy/HevyRoutine";

export const BuildProgramPage: React.FC = () => {

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

    const { data: program, isLoading: loadingProgram } =  useBuildAiProgram(request, shareId, resume);
    const { data: sharedProgram, isLoading: loadingSharedProgram } = useSharedProgram(shareId, resume);

    if ((loadingProgram || program === undefined) && (loadingSharedProgram || sharedProgram === undefined) && resume === "") {
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
                <div className="sm:pl-8">
                    <HevyRoutine request={ request } program={ resumeHevyProgram as THevyRoutine[] } />
                </div>
            );
        }
        // } else if (!isHevy) {
        //     if (!resumeProximaProgram) {
        //         return (
        //             <BuildProgramSkeleton />
        //         );
        //     }
        //     if (resumeProximaProgram) {
        //         return (
        //             <div className="sm:pl-8">
        //                 <ProximaProgram request={ request } program={ resumeProximaProgram as TProgramCreatorDay[][] } />
        //             </div>
        //         );
        //     }
        // }
    }

    return (
        <div className="sm:pl-8">
            <HevyRoutine request={ request } program={ shareId && shareId.length > 0 ? sharedProgram?.[0]?.hevy_routines as THevyRoutine[] : program as THevyRoutine[] } />
        </div>
    );
    // } else if (!isHevy) {
    //     return (
    //         <div className="sm:pl-8">
    //             <ProximaProgram request={ request } program={ program as TProgramCreatorDay[][] } />
    //         </div>
    //     );
    // }
};
