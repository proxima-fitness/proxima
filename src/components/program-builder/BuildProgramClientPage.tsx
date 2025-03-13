"use client";

import { useEffect, useState } from "react";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { ProximaProgram } from "./ProximaProgram";
import { useIsHevy } from "@/contexts/HevyContext";
import { postTextToJson } from "@/api/edge-functions";
import { sortWorkouts } from "@/utils/helpers";

interface IProps {
    decodedQuery: string;
}

export const BuildProgramClientPage: React.FC<IProps> = (props) => {

    const {
        decodedQuery,
    } = props;

    const [generating, setGenerating] = useState(true);
    const [routine, setRoutine] = useState<THevyRoutineAIResponse>();
    const [program, setProgram] = useState<TProgramDetails>();
    console.log("routine:",routine);
    console.log("program:",program);

    const { isHevy } = useIsHevy();

    useEffect(() => {
        const aiGenerateProgram = async () => {
            const ai_schema = await postTextToJson(decodedQuery,isHevy ? "hevy_routine_schema" : "program_details_schema");
            if (ai_schema) {
                const parsedSchema = JSON.parse(ai_schema);
                if (isHevy) {
                    setRoutine(parsedSchema);
                } else {
                    setProgram(parsedSchema as unknown as TProgramDetails);
                }
            }
            setGenerating(false);
        };

        aiGenerateProgram();
    }, [isHevy, decodedQuery]);

    return (
        <div className="pl-8">
            { generating ?
                <BuildProgramSkeleton />
            : (isHevy && routine !== undefined) ?
                <HevyRoutine program={ routine.routines } />
            : (!isHevy && program !== undefined) &&
                <div></div>
                // <ProximaProgram program={ sortWorkouts(program.schedule_workouts) } />
            }
        </div>
    );
};
