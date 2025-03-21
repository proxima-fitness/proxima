import { getHevyExercises } from "@/api/hevy";
import { replaceTextToJsonExercisesHevy } from "./format-responses";
import { postTextToJson } from "@/api/edge-functions";
import { toast } from "sonner";
import { fallbackCBLSA, fallbackOneDay, fallbackPPL, fallbackSevenDay, fallbackUpperLower } from "@/assets/constants";

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

// Returns a default program if the AI failed
export const buildFallbackProgram = async (programLength: number, numberOfDaysPerWeek: number) => {

    if (programLength === 0) {
        programLength = 12;
    }

    if (numberOfDaysPerWeek === 0) {
        numberOfDaysPerWeek = 6;
    }

    if (numberOfDaysPerWeek === 1) {
        // 1 Day per week program
        const one_day = await buildOneDayRoutine(fallbackOneDay, programLength);
        return one_day;

    } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
        // An Upper / Lower Program
        const ul = await buildUpperLowerRoutine(fallbackUpperLower, programLength, numberOfDaysPerWeek);
        return ul;

    } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
        // A Push / Pull / Leg Program
        const ppl = await buildPushPullLegsRoutine(fallbackPPL, programLength, numberOfDaysPerWeek);
        return ppl;

    } else if (numberOfDaysPerWeek === 5) {
        // Chest / Back / Legs / Shoulders / Arms
        const five_day = await buildFiveDayRoutine(fallbackCBLSA, programLength);
        return five_day;

    } else if (numberOfDaysPerWeek === 7) {
        // Push / Pull / Legs / Cardio
        const seven_day = await buildSevenDayRoutine(fallbackSevenDay, programLength);
        return seven_day;
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
        const one_day = await buildOneDayRoutine(parsedResponse, programLength);
        return one_day;

    } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
        // An Upper / Lower Program
        const ul = await buildUpperLowerRoutine(parsedResponse, programLength, numberOfDaysPerWeek);
        return ul;

    } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
        // A Push / Pull / Leg Program
        const ppl = await buildPushPullLegsRoutine(parsedResponse, programLength, numberOfDaysPerWeek);
        return ppl;
    } else if (numberOfDaysPerWeek === 5) {
        // Chest / Back / Legs / Shoulders / Arms
        const five_day = await buildFiveDayRoutine(parsedResponse, programLength);
        return five_day;

    } else if (numberOfDaysPerWeek === 7) {
        // Push / Pull / Legs / Cardio
        const seven_day = await buildSevenDayRoutine(parsedResponse, programLength);
        return seven_day;
    }
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

export const buildUpperLowerRoutine = async (split: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    if (numberOfDaysPerWeek === 2) {
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

            ];

          routines.push(...weekRoutines);
        }
    } else if (numberOfDaysPerWeek === 4) {
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
                    title: split.workout_days[0].day_title,
                    folder_id: week,
                    order: "3",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[0].exercises, hevyExercises),
                },
                {
                    id: String(currentId++),
                    title: split.workout_days[1].day_title,
                    folder_id: week,
                    order: "4",
                    exercises: replaceTextToJsonExercisesHevy(split.workout_days[1].exercises, hevyExercises),
                },

            ];

          routines.push(...weekRoutines);
        }
    }

    return routines;
};


export const buildFiveDayRoutine = async (split: TTextToJsonResponse, programLength: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

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
            {
                id: String(currentId++),
                title: split.workout_days[3].day_title,
                folder_id: week,
                order: "4",
                exercises: replaceTextToJsonExercisesHevy(split.workout_days[3].exercises, hevyExercises),
            },
            {
                id: String(currentId++),
                title: split.workout_days[4].day_title,
                folder_id: week,
                order: "4",
                exercises: replaceTextToJsonExercisesHevy(split.workout_days[4].exercises, hevyExercises),
            },
        ];

        routines.push(...weekRoutines);
    }

    return routines;
};


export const buildSevenDayRoutine = async (split: TTextToJsonResponse, programLength: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

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
                order: "4",
                exercises: replaceTextToJsonExercisesHevy(split.workout_days[1].exercises, hevyExercises),
            },
            {
                id: String(currentId++),
                title: split.workout_days[2].day_title,
                folder_id: week,
                order: "4",
                exercises: replaceTextToJsonExercisesHevy(split.workout_days[2].exercises, hevyExercises),
            },
            {
                id: String(currentId++),
                title: split.workout_days[3].day_title,
                folder_id: week,
                order: "4",
                exercises: replaceTextToJsonExercisesHevy(split.workout_days[3].exercises, hevyExercises),
            },
        ];

        routines.push(...weekRoutines);
    }

    return routines;
};


export const buildOneDayRoutine = async (split: TTextToJsonResponse, programLength: number): Promise<THevyRoutine[]> => {

    const routines: THevyRoutine[] = [];
    const hevyExercises = await getHevyExercises();

    let currentId = 1;

    for (let week = 0; week < programLength; week++) {
        const weekRoutines = [
            {
                id: String(currentId++),
                title: split.workout_days[0].day_title,
                folder_id: week,
                order: "1",
                exercises: replaceTextToJsonExercisesHevy(split.workout_days[0].exercises, hevyExercises),
            },

        ];

        routines.push(...weekRoutines);
    }

    return routines;
};

