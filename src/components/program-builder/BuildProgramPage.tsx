"use client";

import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { useIsHevy } from "@/contexts/HevyContext";
import { useBuildAiProgram } from "@/api/hooks";

interface IProps {
    empty: string; // used to open a program builder with no AI
    search: string; // goes into AI Prompt
    sex: string; // goes into AI Prompt
    age: string; // goes into AI Prompt
    daysPerWeek: string; // used in the buildRoutine function
    specificDays: string; // Ignore for now
    programLength: string; // used in the buildRoutine function
    workoutDuration: string; // Ignore for now
    activityLevel: string;  // goes into AI Prompt
    goals: string; // goes into AI Prompt
    specialization: string; // goes into AI Prompt
    equipment: string; // goes into AI Prompt
    focusAreas: string; // goes into AI Prompt
    difficultyLevel: string; // goes into AI Prompt
    excludeAreas: string; // goes into AI Prompt
    excludeEquipment: string; // goes into AI Prompt
    excludeSpecializations: string; // goes into AI Prompt
    healthIssues: string; // goes into AI Prompt
}

export const BuildProgramPage: React.FC<IProps> = (props) => {

    const {
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
    } = props;

    // const [routine, setRoutine] = useState<THevyRoutine[]>();
    const { isHevy } = useIsHevy();

    const { data: program, isLoading: loadingProgram } =  useBuildAiProgram({
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
    } as TTextToJsonRequest, isHevy);

    console.log("PROGRAM:",program);

    return (
        <div className="pl-8">
            { loadingProgram ?
                <BuildProgramSkeleton />
            : (isHevy && program !== undefined) &&
                <HevyRoutine program={ program } />
            // : (!isHevy && program !== undefined) &&
            //     <div></div>
                // <ProximaProgram program={ sortWorkouts(program.schedule_workouts) } />
            }
        </div>
    );
};
