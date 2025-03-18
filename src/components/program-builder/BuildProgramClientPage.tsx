"use client";

import { useEffect, useState } from "react";
import { BuildProgramSkeleton } from "./BuildProgramSkeleton";
import { HevyRoutine } from "./HevyRoutine";
import { useIsHevy } from "@/contexts/HevyContext";
import { postTextToJson } from "@/api/edge-functions";
import { buildFiveDayRoutine, buildOneDayRoutine, buildPrompt, buildPushPullLegsRoutine, buildSevenDayRoutine, buildUpperLowerRoutine } from "@/utils/helpers";
import { toast } from "sonner";
import {  emptyHevyRoutineProgram, hevyFallbackLeg, hevyFallbackPull, hevyFallbackPush } from "@/assets/constants";

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

export const BuildProgramClientPage: React.FC<IProps> = (props) => {

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

    const [generating, setGenerating] = useState(true);
    const [routine, setRoutine] = useState<THevyRoutine[]>();
    console.log("Specific Days and workout Duration data ignored temporarily in the AI process", specificDays, workoutDuration);

    const { isHevy } = useIsHevy();
    const schema = isHevy ? "hevy_routine_schema" : "program_creator_day_schema";

    useEffect(() => {

        const aiGenerateProgram = async () => {

            const promptBase = buildPrompt(
                search,
                sex,
                age,
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
            );

            let numberOfDaysPerWeek = daysPerWeek;

            if (numberOfDaysPerWeek.length === 0) {
                numberOfDaysPerWeek = "6";
            }

            if (Number(numberOfDaysPerWeek) % 3 === 0) {
                // A Push / Pull / Leg Program
                toast.info("Generating Routines. This may take up to a minute...");
                const pushPromise = postTextToJson(promptBase + ".Create a Push Workout", schema);
                const pullPromise = postTextToJson(promptBase + ".Create a Pull Workout", schema);
                const legPromise = postTextToJson(promptBase + ".Create a Leg Workout", schema);

                const results = await Promise.allSettled([pushPromise, pullPromise, legPromise]);

                const [pushDay, pullDay, legDay] = results.map((result, i) => {
                    if (result.status === "fulfilled") {
                        if (result && result.value) {
                            return JSON.parse(result.value);
                        }
                    } else {
                        toast.error(`Error in ${["Push", "Pull", "Leg"][i]} Workout:, ${result.reason}`);
                        return [hevyFallbackPush, hevyFallbackPull, hevyFallbackLeg][i];
                    }
                });

                toast.success("Your Program is Complete!");

                if (pushDay && pullDay && legDay){

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const ppl = await buildPushPullLegsRoutine(pushDay.routine, pullDay.routine, legDay.routine, Number(pl), Number(numberOfDaysPerWeek));

                    setRoutine(ppl);
                }

            } else if (Number(numberOfDaysPerWeek) % 3 !== 0 && Number(numberOfDaysPerWeek) % 2 === 0){
                // An Upper / Lower Program
                toast.info("Generating Routines. This may take up to a minute...");
                const upperPromise = postTextToJson(promptBase + ".Create an Upper Body Workout", schema);
                const lowerPromise = postTextToJson(promptBase + ".Create a Lower Body Workout", schema);

                const results = await Promise.allSettled([upperPromise, lowerPromise]);

                const [upperDay, lowerDay] = results.map((result, i) => {
                    if (result.status === "fulfilled") {
                        if (result && result.value) {
                            return JSON.parse(result.value);
                        }
                    } else {
                        toast.error(`Error in ${["Upper", "Lower"][i]} Workout:, ${result.reason}`);
                        return [hevyFallbackPush, hevyFallbackLeg][i];
                    }
                });

                toast.success("Your Program is Complete!");

                if (upperDay && lowerDay){

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const ul = await buildUpperLowerRoutine(upperDay.routine, lowerDay.routine, Number(pl), Number(numberOfDaysPerWeek));
                    setRoutine(ul);
                }

            } else if (Number(numberOfDaysPerWeek) % 5 === 0) {
                // Chest / Back / Legs / Shoulders / Arms
                toast.info("Generating Routines. This may take up to a minute...");
                const chestPromise = postTextToJson(promptBase + ".Create a Chest Workout", schema);
                const backPromise = postTextToJson(promptBase + ".Create a Back Workout", schema);
                const legPromise = postTextToJson(promptBase + ".Create an Legs Workout", schema);
                const shoulderPromise = postTextToJson(promptBase + ".Create a Shoulder Workout", schema);
                const armPromise = postTextToJson(promptBase + ".Create an Arm day Workout", schema);

                const results = await Promise.allSettled([chestPromise, backPromise, legPromise, shoulderPromise, armPromise]);

                const [chestDay, backDay, legDay, shoulderDay, armDay] = results.map((result, i) => {
                    if (result.status === "fulfilled") {
                        if (result && result.value) {
                            return JSON.parse(result.value);
                        }
                    } else {
                        toast.error(`Error in ${["Chest", "Back", "Leg", "Shoulder", "Arm"][i]} Workout:, ${result.reason}`);
                        return [hevyFallbackPush, hevyFallbackPull, hevyFallbackLeg, hevyFallbackPush, hevyFallbackPull][i];
                    }
                });

                toast.success("Your Program is Complete!");

                if (chestDay && backDay && legDay && shoulderDay && armDay){

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const fiveDay = await buildFiveDayRoutine(chestDay.routine, backDay.routine, legDay.routine, shoulderDay.routine, armDay.routine, Number(pl));
                    setRoutine(fiveDay);
                }


            } else if (Number(numberOfDaysPerWeek) === 1) {
                // 1 Day per week program
                toast.info("Generating Routines. This may take up to a minute...");
                const dayPromise = postTextToJson(promptBase, schema);

                const results = await Promise.allSettled([dayPromise]);

                const [day] = results.map((result, i) => {
                    if (result.status === "fulfilled") {
                        if (result && result.value) {
                            return JSON.parse(result.value);
                        }
                    } else {
                        toast.error(`Error Generating Workout:, ${result.reason}`);
                        return [hevyFallbackPush][i];
                    }
                });

                toast.success("Your Program is Complete!");

                if (day) {

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const oneDay = await buildOneDayRoutine(day.routine, Number(pl));
                    setRoutine(oneDay);


                }
            } else if (Number(numberOfDaysPerWeek) === 7) {

                toast.info("Generating Routines. This may take up to a minute...");
                const pushPromise = postTextToJson(promptBase + ".Create a Push Workout", schema);
                const pullPromise = postTextToJson(promptBase + ".Create a Pull Workout", schema);
                const legPromise = postTextToJson(promptBase + ".Create a Leg Workout", schema);
                const cardioPromise = postTextToJson(promptBase + ".Create a Cardio Workout", schema);

                const results = await Promise.allSettled([pushPromise, pullPromise, legPromise, cardioPromise]);

                const [pushDay, pullDay, legDay, cardioDay] = results.map((result, i) => {
                    if (result.status === "fulfilled") {
                        if (result && result.value) {
                            return JSON.parse(result.value);
                        }
                    } else {
                        toast.error(`Error in ${["Push", "Pull", "Legs", "Cardio"][i]} Workout:, ${result.reason}`);
                        return [hevyFallbackPush, hevyFallbackPull, hevyFallbackLeg, hevyFallbackLeg][i];
                    }
                });

                toast.success("Your Program is Complete!");

                if (pushDay && pullDay && legDay && cardioDay) {

                    let pl = programLength;

                    if (programLength.length === 0) {
                        pl = "12";
                    }

                    const sevenDay = await buildSevenDayRoutine(pushDay.routine, pullDay.routine, legDay.routine, cardioDay.routine, Number(pl));
                    setRoutine(sevenDay);
                }
            }

            setGenerating(false);
        };

        if (empty !== "true") {
            aiGenerateProgram();
        } else {
            setRoutine(emptyHevyRoutineProgram);
            setGenerating(false);
        }

    }, [isHevy, schema, activityLevel, age, daysPerWeek, difficultyLevel, equipment, excludeAreas, excludeEquipment, excludeSpecializations, focusAreas, goals, healthIssues, programLength, search, sex, specialization]);

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
