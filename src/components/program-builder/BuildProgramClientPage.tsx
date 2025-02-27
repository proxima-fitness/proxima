"use client";

import { useEffect, useState } from "react";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { ProximaProgram } from "./ProximaProgram";
import { exampleProximaProgram } from "@/assets/constants";

export const BuildProgramClientPage: React.FC = () => {

    const [generating, setGenerating] = useState(true);
    const [isHevy, setIsHevy] = useState(false); // if true Hevy routine, else Proxima Program

    useEffect(() => {
        setTimeout(() => {
            setGenerating(false);
        }, 2000);
    }, []);

    return (
        <div className="pl-8">
            { generating ?
                <BuildProgramSkeleton />
            : isHevy ?
                <HevyRoutine />
            :
                <ProximaProgram program={ exampleProximaProgram } />
            }
        </div>
    );
};
