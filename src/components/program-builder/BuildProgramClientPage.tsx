"use client";

import { useEffect, useState } from "react";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { ProximaProgram } from "./ProximaProgram";
import { exampleProximaProgram, exampleHevyRoutineProgram } from "@/assets/constants";
import { useIsHevy } from "@/contexts/HevyContext";

export const BuildProgramClientPage: React.FC = () => {

    const [generating, setGenerating] = useState(true);
    const { isHevy } = useIsHevy();

    useEffect(() => {
        setTimeout(() => {
            setGenerating(false);
        }, 100);
    }, []);

    return (
        <div className="pl-8">
            { generating ?
                <BuildProgramSkeleton />
            : isHevy ?
                <HevyRoutine program={ exampleHevyRoutineProgram } />
            :
                <ProximaProgram program={ exampleProximaProgram } />
            }
        </div>
    );
};
