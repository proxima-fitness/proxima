"use client";

import { useEffect, useState } from "react";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { ProximaProgram } from "./ProximaProgram";
import { useIsHevy } from "@/contexts/HevyContext";
import { postTextToJson } from "@/api/edge-functions";

interface IProps {
    decodedQuery: string;
}

export const BuildProgramClientPage: React.FC<IProps> = (props) => {

    const {
        decodedQuery,
    } = props;

    const [generating, setGenerating] = useState(true);
    const [routine, setRoutine] = useState<THevyRoutine[]>();
    const [program, setProgram] = useState<TProgramCreatorDay[][]>();
    console.log("routine:",routine);
    console.log("program:",program);

    const { isHevy } = useIsHevy();

    useEffect(() => {
        const aiGenerateProgram = async () => {
            const ai_schema = await postTextToJson(decodedQuery,isHevy ? "hevy_routine_schema" : "program_details_schema");
            if (ai_schema) {
                const parsedSchema = JSON.parse(ai_schema);
                if (isHevy) {
                    setRoutine(parsedSchema as unknown as THevyRoutine[]);
                } else {
                    setProgram(parsedSchema as unknown as TProgramCreatorDay[][]);
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
                <HevyRoutine program={ routine } />
            : (!isHevy && program !== undefined) &&
                <ProximaProgram program={ program } />
            }
        </div>
    );
};
