/**
 * @module program-builder/utils/build-program
 * DEPRECATED: This module is no longer used.
 * Core program-construction logic for the AI workout builder. Provides two
 * active helpers:
 *
 *  1. `buildPrompt` — assembles a natural-language prompt string from the
 *     user's form selections (demographics, goals, equipment, etc.).
 *  2. `aiRequest` — sends the assembled prompt to the AI edge function,
 *     selecting the correct JSON schema based on the training-day count.
 *
 * The bottom half of the file contains commented-out legacy builders that
 * expanded a single AI response into a full multi-week program. These are
 * retained for reference during the ongoing data-model migration.
 *
 * Depends on: @/api/edge-functions (postTextToJson), sonner (toast)
 * Used by: program-builder Agent/Chat, PromptTemplate components
 */

import { postTextToJson } from "@/api/edge-functions";
import { toast } from "sonner";

/**
 * Concatenates non-empty user-preference strings into a single AI prompt.
 * Each parameter is a pre-formatted sentence fragment produced by the
 * PromptTemplate component; only non-empty fragments are included.
 *
 * @param search - Free-text search/instructions from the user
 * @param sex - Biological sex context for programming
 * @param age - Age context for programming
 * @param activityLevel - Current activity / training frequency
 * @param goals - Primary fitness goals (e.g. hypertrophy, strength)
 * @param specialization - Preferred training split or style
 * @param equipment - Available equipment description
 * @param focusAreas - Muscle groups to emphasise
 * @param difficultyLevel - Beginner / intermediate / advanced
 * @param excludeAreas - Body parts to avoid training
 * @param workoutDuration - Target session length
 * @param excludeSpecializations - Training styles to exclude
 * @param healthIssues - Injuries or health considerations
 * @returns The fully assembled prompt string ready for the AI edge function
 */
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
    workoutDuration: string, // goes into AI Prompt
    // excludeEquipment: string, // goes into AI Prompt
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
    if (workoutDuration.length > 0) {
        prompt += workoutDuration;
    }
    // if (excludeEquipment.length > 0) {
    //     prompt += excludeEquipment;
    // }
    if (excludeSpecializations.length > 0) {
        prompt += excludeSpecializations;
    }
    if (healthIssues.length > 0) {
        prompt += healthIssues;
    }
    return prompt;
};

/**
 * Sends the assembled prompt to the AI edge function and returns the
 * structured workout data. The number of training days determines which
 * JSON schema is requested and what split-specific suffix is appended to
 * the prompt (e.g. PPL for 3 or 6 days, upper/lower for 2 or 4).
 *
 * @param numberOfDaysPerWeek - How many training days per week (1–7). Defaults to 6 if 0.
 * @param promptBase - The base prompt assembled by {@link buildPrompt}
 * @returns Parsed AI response data matching the requested schema, or
 *          `undefined` if the request fails
 */
export const aiRequest = async (numberOfDaysPerWeek: number, promptBase: string) => {

    toast.info("Generating Routines. This may take up to a minute...");

    try {
        let response: Awaited<ReturnType<typeof postTextToJson>> | undefined;

        // Treat 0 as "not specified" — fall back to 6-day PPL as the default split
        if (numberOfDaysPerWeek === 0) {
            numberOfDaysPerWeek = 6;
        }

        if (numberOfDaysPerWeek === 1) {
            response = await postTextToJson(promptBase + "Create a workout", "one_day_schema");

        } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
            response = await postTextToJson(promptBase + "Create two distinct workouts based on the split provided. Otherwise, Upper Lower Split.", "ul_schema");

        } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
            response = await postTextToJson(promptBase + "Create three distinct workouts based on the split provided. Otherwise, a Push Day, a Pull Day and a Leg Day workout", "ppl_schema");

        } else if (numberOfDaysPerWeek === 5) {
            response = await postTextToJson(promptBase + "Create five distinct workouts based on the split provided. Otherwise, Create a Chest Day, a Back Day, a Leg Day workout, a Shoulder Day, and an Arm Day Workout", "ppl_schema");

        } else if (numberOfDaysPerWeek === 7) {
            response = await postTextToJson(promptBase + "Create four distinct workouts based on the split provided. Otherwise, Create a Push Day, a Pull Day, a Leg Day and a Cardio Day workout", "pplc_schema");

        }

        if (!response?.success) {
            toast.warning("Failed to generate a routine" + response?.error);
            return undefined;
        }

        return response.data;


    } catch (error: unknown) {
        toast.error("Unexpected error while generating routines.");
        console.error("Error generating routines:",error);
    }

};

// export const buildProgram = async (parsedResponse: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number ) => {

//     if (programLength === 0) {
//         programLength = 12;
//     }

//     if (numberOfDaysPerWeek === 0) {
//         numberOfDaysPerWeek = 6;
//     }

//     if (numberOfDaysPerWeek === 1) {
//         // 1 Day per week program
//         const one_day = await buildOneDayRoutine(parsedResponse, programLength);
//         return one_day;
//     } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
//         // An Upper / Lower Program
//         const ul = await buildUpperLowerRoutine(parsedResponse, programLength, numberOfDaysPerWeek);
//         return ul;

//     } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
//         // A Push / Pull / Leg Program
//         const ppl = await buildPushPullLegsRoutine(parsedResponse, programLength, numberOfDaysPerWeek);
//         return ppl;
//     } else if (numberOfDaysPerWeek === 5) {
//         // Chest / Back / Legs / Shoulders / Arms
//         const five_day = await buildFiveDayRoutine(parsedResponse, programLength);
//         return five_day;

//     } else if (numberOfDaysPerWeek === 7) {
//         // Push / Pull / Legs / Cardio
//         const seven_day = await buildHevySevenDayRoutine(parsedResponse, programLength);
//         return seven_day;
//     }
// };

// Returns a default program if the AI failed
// export const buildFallbackProgram = async (programLength: number, numberOfDaysPerWeek: number) => {

//     if (programLength === 0) {
//         programLength = 12;
//     }

//     if (numberOfDaysPerWeek === 0) {
//         numberOfDaysPerWeek = 6;
//     }

//     if (numberOfDaysPerWeek === 1) {
//         // 1 Day per week program
//         const one_day = await buildOneDayRoutine(fallbackOneDay, programLength);
//         return one_day;
//     } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
//         // An Upper / Lower Program
//         const ul = await buildUpperLowerRoutine(fallbackUpperLower, programLength, numberOfDaysPerWeek);
//         return ul;

//     } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
//         // A Push / Pull / Leg Program
//         const ppl = await buildPushPullLegsRoutine(fallbackPPL, programLength, numberOfDaysPerWeek);
//         return ppl;

//     } else if (numberOfDaysPerWeek === 5) {
//         // Chest / Back / Legs / Shoulders / Arms
//         const five_day = await buildFiveDayRoutine(fallbackCBLSA, programLength);
//         return five_day;

//     } else if (numberOfDaysPerWeek === 7) {
//         // Push / Pull / Legs / Cardio
//         const seven_day = await buildHevySevenDayRoutine(fallbackSevenDay, programLength);
//         return seven_day;
//     }

// };

// Turns one workout returned from AI into a program
// export const buildOneDayRoutine = async (split: TTextToJsonResponse, programLength: number): Promise<TProgramCreatorDay[][]> => {

//     const program: TProgramCreatorDay[][] = [];
//     const exercises = await getExercises();

//     for (let week = 0; week < programLength; week++) {
//         const weeks = [
//             {
//                 day_title: split?.workout_days[0]?.day_title ?? fallbackOneDay.workout_days[0].day_title,
//                 order: "1",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackOneDay.workout_days[0].exercises, exercises),
//                 notes: "",
//             },

//         ];

//         program.push([...weeks]);
//     }

//     return program;
// };

// export const buildPushPullLegsRoutine = async (split: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number): Promise<TProgramCreatorDay[][]> => {

//     const program: TProgramCreatorDay[][] = [];
//     const exercises = await getExercises();

//     if (numberOfDaysPerWeek === 3) {
//         for (let week = 0; week < programLength; week++) {
//             const weeks = [
//                 {
//                     day_title: split?.workout_days[0]?.day_title ?? fallbackPPL.workout_days[0].day_title,
//                     order: "1",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackPPL.workout_days[0].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[1]?.day_title ?? fallbackPPL.workout_days[1].day_title,
//                     order: "2",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[1]?.exercises ?? fallbackPPL.workout_days[1].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[2]?.day_title ?? fallbackPPL.workout_days[2].day_title,
//                     order: "3",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[2]?.exercises ?? fallbackPPL.workout_days[2].exercises, exercises),
//                 },
//             ];

//           program.push([...weeks]);
//         }
//     } else if (numberOfDaysPerWeek === 6) {
//         for (let week = 0; week < programLength; week++) {
//             const weeks = [
//                 {
//                     day_title: split?.workout_days[0]?.day_title ?? fallbackPPL.workout_days[0].day_title,
//                     order: "1",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackPPL.workout_days[0].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[1]?.day_title ?? fallbackPPL.workout_days[1].day_title,
//                     order: "2",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[1]?.exercises ?? fallbackPPL.workout_days[1].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[2]?.day_title ?? fallbackPPL.workout_days[2].day_title,
//                     order: "3",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[3]?.exercises ?? fallbackPPL.workout_days[2].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[0]?.day_title ?? fallbackPPL.workout_days[0].day_title,
//                     order: "4",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackPPL.workout_days[0].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[1]?.day_title ?? fallbackPPL.workout_days[1].day_title,
//                     order: "5",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[1]?.exercises ?? fallbackPPL.workout_days[1].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[2]?.day_title ?? fallbackPPL.workout_days[2].day_title,
//                     order: "6",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[2]?.exercises ?? fallbackPPL.workout_days[2].exercises, exercises),
//                 },
//             ];

//           program.push([...weeks]);
//         }

//     }

//     return program;
// };

// export const buildUpperLowerRoutine = async (split: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number): Promise<TProgramCreatorDay[][]> => {

//     const program: TProgramCreatorDay[][] = [];
//     const exercises = await getExercises();


//     if (numberOfDaysPerWeek === 2) {
//         for (let week = 0; week < programLength; week++) {
//             const weeks = [
//                 {
//                     day_title: split?.workout_days[0]?.day_title ?? fallbackUpperLower.workout_days[0].day_title,
//                     order: "1",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackUpperLower.workout_days[0].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[1]?.day_title ?? fallbackUpperLower.workout_days[1].day_title,
//                     order: "2",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[1]?.exercises ?? fallbackUpperLower.workout_days[1].exercises, exercises),
//                 },

//             ];

//           program.push([...weeks]);
//         }
//     } else if (numberOfDaysPerWeek === 4) {
//         for (let week = 0; week < programLength; week++) {
//             const weeks = [
//                 {
//                     day_title: split?.workout_days[0]?.day_title ?? fallbackUpperLower.workout_days[0].day_title,
//                     order: "1",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackUpperLower.workout_days[0].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[1]?.day_title ?? fallbackUpperLower.workout_days[1].day_title,
//                     order: "2",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[1]?.exercises ?? fallbackUpperLower.workout_days[1].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[0]?.day_title ?? fallbackUpperLower.workout_days[0].day_title,
//                     order: "3",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackUpperLower.workout_days[0].exercises, exercises),
//                 },
//                 {
//                     day_title: split?.workout_days[1]?.day_title ?? fallbackUpperLower.workout_days[1].day_title,
//                     order: "4",
//                     notes: "",
//                     exercises: replaceTextToJsonExercises(split?.workout_days[1]?.exercises ?? fallbackUpperLower.workout_days[1].exercises, exercises),
//                 },

//             ];

//           program.push([...weeks]);
//         }
//     }

//     return program;
// };

// export const buildFiveDayRoutine = async (split: TTextToJsonResponse, programLength: number): Promise<TProgramCreatorDay[][]> => {

//     const program: TProgramCreatorDay[][] = [];
//     const exercises = await getExercises();


//     for (let week = 0; week < programLength; week++) {
//         const weeks = [
//             {
//                 day_title: split?.workout_days[0]?.day_title ?? fallbackCBLSA.workout_days[0].day_title,
//                 order: "1",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackCBLSA.workout_days[0].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[1]?.day_title ?? fallbackCBLSA.workout_days[1].day_title,
//                 order: "2",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[1]?.exercises ?? fallbackCBLSA.workout_days[1].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[2]?.day_title ?? fallbackCBLSA.workout_days[2].day_title,
//                 order: "3",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[2]?.exercises ?? fallbackCBLSA.workout_days[2].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[3]?.day_title ?? fallbackCBLSA.workout_days[3].day_title,
//                 order: "4",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[3]?.exercises ?? fallbackCBLSA.workout_days[3].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[4]?.day_title ?? fallbackCBLSA.workout_days[4].day_title,
//                 order: "5",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[4]?.exercises ?? fallbackCBLSA.workout_days[4].exercises, exercises),
//             },
//         ];

//         program.push([...weeks]);
//     }

//     return program;
// };

// export const buildHevySevenDayRoutine = async (split: TTextToJsonResponse, programLength: number): Promise<TProgramCreatorDay[][]> => {

//     const program: TProgramCreatorDay[][] = [];
//     const exercises = await getExercises();


//     for (let week = 0; week < programLength; week++) {
//         const weeks = [
//             {
//                 day_title: split?.workout_days[0]?.day_title ?? fallbackSevenDay.workout_days[0].day_title,
//                 order: "1",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackSevenDay.workout_days[0].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[1]?.day_title ?? fallbackSevenDay.workout_days[1].day_title,
//                 order: "2",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[1]?.exercises ?? fallbackSevenDay.workout_days[1].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[2]?.day_title ?? fallbackSevenDay.workout_days[2].day_title,
//                 order: "3",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[2]?.exercises ?? fallbackSevenDay.workout_days[2].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[0]?.day_title ?? fallbackSevenDay.workout_days[0].day_title,
//                 order: "4",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[0]?.exercises ?? fallbackSevenDay.workout_days[0].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[1]?.day_title ?? fallbackSevenDay.workout_days[1].day_title,
//                 order: "5",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[1]?.exercises ?? fallbackSevenDay.workout_days[1].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[2]?.day_title ?? fallbackSevenDay.workout_days[2].day_title,
//                 order: "6",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[2]?.exercises ?? fallbackSevenDay.workout_days[2].exercises, exercises),
//             },
//             {
//                 day_title: split?.workout_days[3]?.day_title ?? fallbackSevenDay.workout_days[3].day_title,
//                 order: "7",
//                 notes: "",
//                 exercises: replaceTextToJsonExercises(split?.workout_days[3]?.exercises ?? fallbackSevenDay.workout_days[3].exercises, exercises),
//             },
//         ];

//         program.push([...weeks]);
//     }

//     return program;
// };

