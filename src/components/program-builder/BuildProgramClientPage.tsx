"use client";

import { useState } from "react";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { ProximaProgram } from "./ProximaProgram";

export const BuildProgramClientPage: React.FC = () => {

    const [generating, setGenerating] = useState(false);
    const [isHevy, setIsHevy] = useState(false); // if true Hevy routine, else Proxima Program

    return (
        <div className="pl-8">
            { generating ?
                <BuildProgramSkeleton />
            : isHevy ?
                <HevyRoutine />
            :
                <ProximaProgram />
            }
        </div>
    );
};
