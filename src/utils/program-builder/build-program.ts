import { getHevyExercises } from "@/api/hevy";
import { replaceHevyExercises, replaceTextToJsonExercisesHevy } from "./format-responses";
import { postTextToJson } from "@/api/edge-functions";
import { toast } from "sonner";

export const buildPrompt = (
    search: string, // goes into AI Prompt
    sex: string, // goes into AI Prompt
    age: string, // goes into AI Prompt
    activityLevel: string,  // goes into AI Prompt
    goals: string, // goes into AI Prompt
    specialization: string, // goes into AI Prompt
    equipment: string, // goes into AI Prompt
    focusAreas: string, // goes into AI Prompt
    difficultyLevel: string, // goes into AI Prompt
    excludeAreas: string, // goes into AI Prompt
    excludeEquipment: string, // goes into AI Prompt
    excludeSpecializations: string, // goes into AI Prompt
    healthIssues: string, // goes into AI Prompt
) => {
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

export const aiRequest = async (numberOfDaysPerWeek: number, promptBase: string) => {

    toast.info("Generating Routines. This may take up to a minute...");

    try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let response: any;

        if (numberOfDaysPerWeek === 0) {
            numberOfDaysPerWeek = 6;
        }

        if (numberOfDaysPerWeek === 1) {
            // 1 Day per week program
            response = await postTextToJson(promptBase + "Create a workout", "one_day_schema");

        } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
            // An Upper / Lower Program
            response = await postTextToJson(promptBase + "Create an Upper body and a Lower body workout", "ul_schema");

        } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
            // A Push / Pull / Leg Program
            response = await postTextToJson(promptBase + "Create a Push Day, a Pull Day and a Leg Day workout", "ppl_schema");

        } else if (numberOfDaysPerWeek === 5) {
            // Chest / Back / Legs / Shoulders / Arms
            response = await postTextToJson(promptBase + "Create a Chest Day, a Back Day, a Leg Day workout, a Shoulder Day, and an Arm Day Workout", "ppl_schema");

        } else if (numberOfDaysPerWeek === 7) {
            // Push / Pull / Legs / Cardio
            response = await postTextToJson(promptBase + "Create a Push Day, a Pull Day, a Leg Day and a Cardio Day workout", "pplc_schema");

        }

        if (!response?.success) {
            // Use Fallbacks
            toast.warning("Failed to generate a routine" + response?.error);
        }

        return response.data;


    } catch (error: unknown) {
        toast.error("Unexpected error while generating routines.");
        console.error("Error generating routines:",error);
    }

};

export const buildProgram = async (parsedResponse: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number ) => {

    if (programLength === 0) {
        programLength = 12;
    }

    if (numberOfDaysPerWeek === 0) {
        numberOfDaysPerWeek = 6;
    }

    if (numberOfDaysPerWeek === 1) {
        // 1 Day per week program

    } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
        // An Upper / Lower Program

    } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
        // A Push / Pull / Leg Program
        const ppl = await buildPushPullLegsRoutine(parsedResponse, programLength, numberOfDaysPerWeek);
        console.log("PPL:",ppl);
        return ppl;
    } else if (numberOfDaysPerWeek === 5) {
        // Chest / Back / Legs / Shoulders / Arms

    } else if (numberOfDaysPerWeek === 7) {
        // Push / Pull / Legs / Cardio

    }



        //             setRoutine(ppl);
        //         }




        //             const ul = await buildUpperLowerRoutine(upperDay.routine, lowerDay.routine, Number(pl), Number(numberOfDaysPerWeek));
        //             setRoutine(ul);
        //         }



        //             const fiveDay = await buildFiveDayRoutine(chestDay.routine, backDay.routine, legDay.routine, shoulderDay.routine, armDay.routine, Number(pl));
        //             setRoutine(fiveDay);


        //             const oneDay = await buildOneDayRoutine(day.routine, Number(pl));
        //             setRoutine(oneDay);



        //             const sevenDay = await buildSevenDayRoutine(pushDay.routine, pullDay.routine, legDay.routine, cardioDay.routine, Number(pl));
        //             setRoutine(sevenDay);
        //         }
        //     }



};

// Turns one routine returned from AI into a program
export const buildPushPullLegsRoutine = async (split: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    if (numberOfDaysPerWeek === 3) {
        for (let week = 0; week < programLength; week++) {
            const weekRoutines = [
                {
                    id: String(currentId++),
                    title: split.workout_days[0].day_title,
                    folder_id: week,
                    order: "1",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[0].exercises, hevyExercises),
                },
                {
                    id: String(currentId++),
                    title: split.workout_days[1].day_title,
                    folder_id: week,
                    order: "2",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[1].exercises, hevyExercises),
                },
                {
                    id: String(currentId++),
                    title: split.workout_days[2].day_title,
                    folder_id: week,
                    order: "3",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[2].exercises, hevyExercises),
                },
            ];

          routines.push(...weekRoutines);
        }
    } else if (numberOfDaysPerWeek === 6) {
        for (let week = 0; week < programLength; week++) {
            const weekRoutines = [
                {
                    id: String(currentId++),
                    title: split.workout_days[0].day_title,
                    folder_id: week,
                    order: "1",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[0].exercises, hevyExercises),
                },
                {
                    id: String(currentId++),
                    title: split.workout_days[1].day_title,
                    folder_id: week,
                    order: "2",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[1].exercises, hevyExercises),
                },
                {
                    id: String(currentId++),
                    title: split.workout_days[2].day_title,
                    folder_id: week,
                    order: "3",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[3].exercises, hevyExercises),
                },
                {
                    id: String(currentId++),
                    title: split.workout_days[0].day_title,
                    folder_id: week,
                    order: "4",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[0].exercises, hevyExercises),
                },
                {
                    id: String(currentId++),
                    title: split.workout_days[1].day_title,
                    folder_id: week,
                    order: "5",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[1].exercises, hevyExercises),
                },
                {
                    id: String(currentId++),
                    title: split.workout_days[2].day_title,
                    folder_id: week,
                    order: "6",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[2].exercises, hevyExercises),
                },
            ];

          routines.push(...weekRoutines);
        }

    }

    return routines;
};

export const buildUpperLowerRoutine = async (upper: THevyRoutine, lower: THevyRoutine, programLength: number, numberOfDaysPerWeek: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    if (numberOfDaysPerWeek === 2) {
        for (let week = 0; week < programLength; week++) {
            const weekRoutines = [
                {
                    ...structuredClone(upper),
                    id: String(currentId++),
                    folder_id: week,
                    order: "1",
                    exercises: replaceHevyExercises(upper.exercises, hevyExercises),
                },
                {
                    ...structuredClone(lower),
                    id: String(currentId++),
                    folder_id: week,
                    order: "2",
                    exercises: replaceHevyExercises(lower.exercises, hevyExercises),
                },

            ];

          routines.push(...weekRoutines);
        }
    } else if (numberOfDaysPerWeek === 4) {
        for (let week = 0; week < programLength; week++) {
            const weekRoutines = [
                {
                    ...structuredClone(upper),
                    id: String(currentId++),
                    folder_id: week,
                    order: "1",
                    exercises: replaceHevyExercises(upper.exercises, hevyExercises),
                },
                {
                    ...structuredClone(lower),
                    id: String(currentId++),
                    folder_id: week,
                    order: "2",
                    exercises: replaceHevyExercises(lower.exercises, hevyExercises),
                },
                {
                    ...structuredClone(upper),
                    id: String(currentId++),
                    folder_id: week,
                    order: "3",
                    exercises: replaceHevyExercises(upper.exercises, hevyExercises),
                },
                {
                    ...structuredClone(lower),
                    id: String(currentId++),
                    folder_id: week,
                    order: "4",
                    exercises: replaceHevyExercises(lower.exercises, hevyExercises),
                },

            ];

          routines.push(...weekRoutines);
        }
    }

    return routines;
};


export const buildFiveDayRoutine = async (chest: THevyRoutine, back: THevyRoutine, legs: THevyRoutine, shoulders: THevyRoutine, arms: THevyRoutine, programLength: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    for (let week = 0; week < programLength; week++) {
        const weekRoutines = [
            {
                ...structuredClone(chest),
                id: String(currentId++),
                folder_id: week,
                order: "1",
                exercises: replaceHevyExercises(chest.exercises, hevyExercises),
            },
            {
                ...structuredClone(back),
                id: String(currentId++),
                folder_id: week,
                order: "2",
                exercises: replaceHevyExercises(back.exercises, hevyExercises),
            },
            {
                ...structuredClone(legs),
                id: String(currentId++),
                folder_id: week,
                order: "3",
                exercises: replaceHevyExercises(legs.exercises, hevyExercises),
            },
            {
                ...structuredClone(shoulders),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(shoulders.exercises, hevyExercises),
            },
            {
                ...structuredClone(arms),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(arms.exercises, hevyExercises),
            },
        ];

        routines.push(...weekRoutines);
    }

    return routines;
};


export const buildSevenDayRoutine = async (push: THevyRoutine, pull: THevyRoutine, legs: THevyRoutine, cardio: THevyRoutine, programLength: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    for (let week = 0; week < programLength; week++) {
        const weekRoutines = [
            {
                ...structuredClone(push),
                id: String(currentId++),
                folder_id: week,
                order: "1",
                exercises: replaceHevyExercises(push.exercises, hevyExercises),
            },
            {
                ...structuredClone(pull),
                id: String(currentId++),
                folder_id: week,
                order: "2",
                exercises: replaceHevyExercises(pull.exercises, hevyExercises),
            },
            {
                ...structuredClone(legs),
                id: String(currentId++),
                folder_id: week,
                order: "3",
                exercises: replaceHevyExercises(legs.exercises, hevyExercises),
            },
            {
                ...structuredClone(push),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(push.exercises, hevyExercises),
            },
            {
                ...structuredClone(pull),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(pull.exercises, hevyExercises),
            },
            {
                ...structuredClone(legs),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(legs.exercises, hevyExercises),
            },
            {
                ...structuredClone(cardio),
                id: String(currentId++),
                folder_id: week,
                order: "4",
                exercises: replaceHevyExercises(cardio.exercises, hevyExercises),
            },
        ];

        routines.push(...weekRoutines);
    }

    return routines;
};


export const buildOneDayRoutine = async (day: THevyRoutine, programLength: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    for (let week = 0; week < programLength; week++) {
        const weekRoutines = [
            {
                ...structuredClone(day),
                id: String(currentId++),
                folder_id: week,
                order: "1",
                exercises: replaceHevyExercises(day.exercises, hevyExercises),
            },

        ];

        routines.push(...weekRoutines);
    }

    return routines;
};

