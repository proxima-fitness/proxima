"use client";

import { useEffect, useState } from "react";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { useIsHevy } from "@/contexts/HevyContext";
import { postTextToJson } from "@/api/edge-functions";
import { buildFiveDayRoutine, buildOneDayRoutine, buildPushPullLegsRoutine, buildSevenDayRoutine, buildUpperLowerRoutine } from "@/utils/helpers";

interface IProps {
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

export const BuildProgramClientPage: React.FC<IProps> = (props) => {

    const {
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

    const [generating, setGenerating] = useState(true);
    const [routine, setRoutine] = useState<THevyRoutine[]>();
    // const [program, setProgram] = useState<TProgramDetails>();
    // console.log("routine:",routine);
    // console.log("program:",program);
    console.log("Specific Days and workout Duration data is ignored temporarily in the AI process", specificDays, workoutDuration);

    const { isHevy } = useIsHevy();



    useEffect(() => {

        const buildPrompt = () => {
            let prompt = "";
            if (search.length > 0) {
                prompt += search;
            }
            if (sex.length > 0) {
                prompt += sex;
            }
            if (age.length > 0) {
                prompt += age;
            }
            if (activityLevel.length > 0) {
                prompt += activityLevel;
            }
            if (goals.length > 0) {
                prompt += goals;
            }
            if (specialization.length > 0) {
                prompt += specialization;
            }
            if (equipment.length > 0) {
                prompt += equipment;
            }
            if (focusAreas.length > 0) {
                prompt += focusAreas;
            }
            if (difficultyLevel.length > 0) {
                prompt += difficultyLevel;
            }
            if (excludeAreas.length > 0) {
                prompt += excludeAreas;
            }
            if (excludeEquipment.length > 0) {
                prompt += excludeEquipment;
            }
            if (excludeSpecializations.length > 0) {
                prompt += excludeSpecializations;
            }
            if (healthIssues.length > 0) {
                prompt += healthIssues;
            }

            return prompt;
        };

        const aiGenerateProgram = async () => {

            let numberOfDaysPerWeek = daysPerWeek;
            if (numberOfDaysPerWeek.length === 0) {
                numberOfDaysPerWeek = "6";
            }

            if (Number(numberOfDaysPerWeek) % 3 === 0) {
                // A Push / Pull / Leg Program
                const pushDay = await postTextToJson(buildPrompt() + ".Create a Push Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const pullDay = await postTextToJson(buildPrompt() + ".Create a Pull Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const legDay = await postTextToJson(buildPrompt() + ".Create a Leg Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");

                if (pushDay && pullDay && legDay){
                    const parsedPushDay = JSON.parse(pushDay);
                    const parsedPullDay = JSON.parse(pullDay);
                    const parsedLegDay = JSON.parse(legDay);

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const ppl = buildPushPullLegsRoutine(parsedPushDay.routine, parsedPullDay.routine, parsedLegDay.routine, Number(pl), Number(numberOfDaysPerWeek));
                    setRoutine(ppl);
                }


            } else if (Number(numberOfDaysPerWeek) % 3 !== 0 && Number(numberOfDaysPerWeek) % 2 === 0){
                // An Upper / Lower Program
                const upperDay = await postTextToJson(buildPrompt() + ".Create an Upper Body Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const lowerDay = await postTextToJson(buildPrompt() + ".Create an Upper Body Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");

                if (upperDay && lowerDay){
                    const parsedUpperDay = JSON.parse(upperDay);
                    const parsedLowerDay = JSON.parse(lowerDay);

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const ul = buildUpperLowerRoutine(parsedUpperDay.routine, parsedLowerDay.routine, Number(pl), Number(numberOfDaysPerWeek));
                    setRoutine(ul);
                }

            } else if (Number(numberOfDaysPerWeek) % 5 === 0) {
                // Chest / Back / Legs / Shoulders / Arms
                const chestDay = await postTextToJson(buildPrompt() + ".Create a Chest Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const backDay = await postTextToJson(buildPrompt() + ".Create a Back Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const legDay = await postTextToJson(buildPrompt() + ".Create an Legs Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const shoulderDay = await postTextToJson(buildPrompt() + ".Create a Shoulder Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const armDay = await postTextToJson(buildPrompt() + ".Create an Arm day Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");

                if (chestDay && backDay && legDay && shoulderDay && armDay){
                    const parsedChestDay = JSON.parse(chestDay);
                    const parsedBackDay = JSON.parse(backDay);
                    const parsedLegDay = JSON.parse(legDay);
                    const parsedShoulderDay = JSON.parse(shoulderDay);
                    const parsedArmDay = JSON.parse(armDay);

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const fiveDay = buildFiveDayRoutine(parsedChestDay.routine, parsedBackDay.routine, parsedLegDay.routine, parsedShoulderDay.routine, parsedArmDay.routine, Number(pl));
                    setRoutine(fiveDay);
                }


            } else if (Number(numberOfDaysPerWeek) === 1) {
                // 1 Day per week program
                const day = await postTextToJson(buildPrompt(),isHevy ? "hevy_routine_schema" : "program_details_schema");
                if (day) {
                    const parsedDay = JSON.parse(day);

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const oneDay  = buildOneDayRoutine(parsedDay.routine, Number(pl));
                    setRoutine(oneDay);


                }
            } else if (Number(numberOfDaysPerWeek) === 7) {
                const pushDay = await postTextToJson(buildPrompt() + ".Create a Push Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const pullDay = await postTextToJson(buildPrompt() + ".Create a Pull Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const legDay = await postTextToJson(buildPrompt() + ".Create a Leg Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");
                const cardioDay = await postTextToJson(buildPrompt() + ".Create a Cardio Workout",isHevy ? "hevy_routine_schema" : "program_details_schema");

                if (pushDay && pullDay && legDay && cardioDay) {
                    const parsedPushDay = JSON.parse(pushDay);
                    const parsedPullDay = JSON.parse(pullDay);
                    const parsedLegDay = JSON.parse(legDay);
                    const parsedCardioDay = JSON.parse(cardioDay);

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const sevenDay = buildSevenDayRoutine(parsedPushDay.routine, parsedPullDay.routine, parsedLegDay.routine, parsedCardioDay.routine, Number(pl));
                    setRoutine(sevenDay);
                }
            }

            setGenerating(false);
        };

        aiGenerateProgram();
    }, [isHevy, activityLevel, age, daysPerWeek, difficultyLevel, equipment, excludeAreas, excludeEquipment, excludeSpecializations, focusAreas, goals, healthIssues, programLength, search, sex, specialization]);

    return (
        <div className="pl-8">
            { generating ?
                <BuildProgramSkeleton />
            : (isHevy && routine !== undefined) &&
                <HevyRoutine program={ routine } />
            // : (!isHevy && program !== undefined) &&
            //     <div></div>
                // <ProximaProgram program={ sortWorkouts(program.schedule_workouts) } />
            }
        </div>
    );
};
