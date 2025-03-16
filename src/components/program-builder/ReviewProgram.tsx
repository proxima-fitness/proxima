"use client";

import { deFlattenHevyRoutine, programCreatorDayToScheduleWorkouts } from "@/utils/helpers";
import { ProgramSchedule } from "../programs/ProgramSchedule";
import { useEffect, useState } from "react";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { useIsHevy } from "@/contexts/HevyContext";
import { HevyRoutineSchedule } from "./hevy/HevyRoutineSchedule";

export const ReviewProgramPage: React.FC = () => {

    const { isHevy } = useIsHevy();
    const [program, setProgram] = useState<TProgramCreatorDay[][]>();
    const [hevyRoutine, setHevyRoutine] = useState<THevyRoutine[]>();

    useEffect(() => {
        if (typeof window !== undefined) {
            const localStorageProgram = localStorage.getItem(isHevy ? "hevy-program-in-progress" : "program-in-progress");
            if (localStorageProgram) {
                if (isHevy) {
                    setHevyRoutine(JSON.parse(localStorageProgram));
                } else {
                    setProgram(JSON.parse(localStorageProgram));
                }
            }
        }
    }, [isHevy]);

    if (!program && !hevyRoutine) {
        return <BuildProgramSkeleton />;
    }

    return (
        <div className="pl-8">
            { (isHevy && hevyRoutine) ?
                <HevyRoutineSchedule deflatHevyRoutine={ deFlattenHevyRoutine(hevyRoutine) } />
            : program &&
                <ProgramSchedule sortedWorkoutsByWeek={ programCreatorDayToScheduleWorkouts(program) } />
            }
        </div>
    );
};
