"use client";

import { useEffect, useMemo, useState } from "react";
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

    const { isHevy } = useIsHevy();

    useEffect(() => {
        const aiGenerateProgram = async () => {
            const ai_schema = await postTextToJson(decodedQuery,isHevy ? "hevy_routine_schema" : "program_details_schema");
            if (ai_schema) {
                if (isHevy) {
                    setRoutine(ai_schema as unknown as THevyRoutine[]);
                } else {
                    setProgram(ai_schema as unknown as TProgramCreatorDay[][]);
                }
            }
            setGenerating(false);
            console.log("AI repsonse:",ai_schema);
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
