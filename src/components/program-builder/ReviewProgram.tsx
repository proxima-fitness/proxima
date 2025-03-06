"use client";

import { programCreatorDayToScheduleWorkouts } from "@/utils/helpers";
import { ProgramSchedule } from "../programs/ProgramSchedule";
import { useEffect, useState } from "react";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";

export const ReviewProgramPage: React.FC = () => {

    const [program, setProgram] = useState<TProgramCreatorDay[][]>();

    useEffect(() => {
        if (typeof window !== undefined) {
            const localStorageProgram = localStorage.getItem("program-in-progress");
            if (localStorageProgram) {
                setProgram(JSON.parse(localStorageProgram));
            }
        }
    }, []);

    if (!program) {
        return <BuildProgramSkeleton />
    }

    return (
        <div className="pl-8">
            <ProgramSchedule sortedWorkoutsByWeek={ programCreatorDayToScheduleWorkouts(program) } />
        </div>
    );
};
