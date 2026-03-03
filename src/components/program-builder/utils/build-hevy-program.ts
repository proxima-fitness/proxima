/**
 * @module program-builder/utils/build-hevy-program
 *
 * (DEPRECATED / commented-out) Conversion layer that transformed AI-generated
 * workout programs into the Hevy fitness app's routine format (THevyRoutine[]).
 * Contained builders for every supported training split (1-day, upper/lower,
 * PPL, 5-day, 7-day) and a fallback path that used hardcoded templates when
 * the AI request failed.
 *
 * All code is currently commented out — retained for reference while the
 * program builder migrates to a new data model.
 *
 * Depends on: @/components/program-builder/api/hevy, @/assets/constants, ./scoring-system
 * Used by: (currently unused — previously consumed by the program builder orchestrator)
 */

// import { getHevyExercises } from "@/components/program-builder/api/hevy";
// import { fallbackCBLSA,  fallbackOneDay, fallbackPPL, fallbackSevenDay, fallbackUpperLower } from "@/assets/constants";
// import { replaceTextToJsonExercisesHevy } from "./scoring-system";

// Returns a default program if the AI failed
// export const buildHevyFallbackProgram = async (programLength: number, numberOfDaysPerWeek: number) => {

//     if (programLength === 0) {
//         programLength = 12;
//     }

//     if (numberOfDaysPerWeek === 0) {
//         numberOfDaysPerWeek = 6;
//     }

//     if (numberOfDaysPerWeek === 1) {
//         // 1 Day per week program
//         const one_day = await buildHevyOneDayRoutine(fallbackOneDay, programLength);
//         return one_day;

//     } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
//         // An Upper / Lower Program
//         const ul = await buildHevyUpperLowerRoutine(fallbackUpperLower, programLength, numberOfDaysPerWeek);
//         return ul;

//     } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
//         // A Push / Pull / Leg Program
//         const ppl = await buildHevyPushPullLegsRoutine(fallbackPPL, programLength, numberOfDaysPerWeek);
//         return ppl;

//     } else if (numberOfDaysPerWeek === 5) {
//         // Chest / Back / Legs / Shoulders / Arms
//         const five_day = await buildHevyFiveDayRoutine(fallbackCBLSA, programLength);
//         return five_day;

//     } else if (numberOfDaysPerWeek === 7) {
//         // Push / Pull / Legs / Cardio
//         const seven_day = await buildHevySevenDayRoutine(fallbackSevenDay, programLength);
//         return seven_day;
//     }

// };

// export const buildHevyProgram = async (parsedResponse: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number, excludeAreas: string, excludeEquipment: string, healthIssues: string) => {

//     if (programLength === 0) {
//         programLength = 12;
//     }

//     if (numberOfDaysPerWeek === 0) {
//         numberOfDaysPerWeek = 6;
//     }

//     if (numberOfDaysPerWeek === 1) {
//         // 1 Day per week program
//         const one_day = await buildHevyOneDayRoutine(parsedResponse, programLength, excludeAreas, excludeEquipment, healthIssues);
//         return one_day;

//     } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
//         // An Upper / Lower Program
//         const ul = await buildHevyUpperLowerRoutine(parsedResponse, programLength, numberOfDaysPerWeek, excludeAreas, excludeEquipment, healthIssues);
//         return ul;

//     } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
//         // A Push / Pull / Leg Program
//         const ppl = await buildHevyPushPullLegsRoutine(parsedResponse, programLength, numberOfDaysPerWeek, excludeAreas, excludeEquipment, healthIssues);
//         return ppl;
//     } else if (numberOfDaysPerWeek === 5) {
//         // Chest / Back / Legs / Shoulders / Arms
//         const five_day = await buildHevyFiveDayRoutine(parsedResponse, programLength, excludeAreas, excludeEquipment, healthIssues);
//         return five_day;

//     } else if (numberOfDaysPerWeek === 7) {
//         // Push / Pull / Legs / Cardio
//         const seven_day = await buildHevySevenDayRoutine(parsedResponse, programLength, excludeAreas, excludeEquipment, healthIssues);
//         return seven_day;
//     }
// };

// export const buildHevyOneDayRoutine = async (split: TTextToJsonResponse, programLength: number, excludeAreas: string = "", excludeEquipment: string = "", healthIssues: string = ""): Promise<THevyRoutine[]> => {

//     const routines: THevyRoutine[] = [];
//     const hevyExercises = await getHevyExercises();

//     let currentId = 1;

//     for (let week = 0; week < programLength; week++) {
//         const weekRoutines = [
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[0]?.day_title ?? fallbackOneDay.workout_days[0].day_title,
//                 folder_id: week,
//                 order: "1",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackOneDay.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },

//         ];

//         routines.push(...weekRoutines);
//     }

//     return routines;
// };


// Turns one routine returned from AI into a program
// export const buildHevyPushPullLegsRoutine = async (split: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number, excludeAreas: string = "", excludeEquipment: string = "", healthIssues: string = ""): Promise<THevyRoutine[]> => {

//     const routines: THevyRoutine[] = [];
//     const hevyExercises = await getHevyExercises();

//     let currentId = 1;

//     if (numberOfDaysPerWeek === 3) {
//         for (let week = 0; week < programLength; week++) {
//             const weekRoutines = [
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[0]?.day_title ?? fallbackPPL.workout_days[0].day_title,
//                     folder_id: week,
//                     order: "1",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackPPL.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[1]?.day_title ?? fallbackPPL.workout_days[1].day_title,
//                     folder_id: week,
//                     order: "2",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[1]?.exercises ?? fallbackPPL.workout_days[1].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[2]?.day_title ?? fallbackPPL.workout_days[2].day_title,
//                     folder_id: week,
//                     order: "3",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[2]?.exercises ?? fallbackPPL.workout_days[2].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//             ];

//           routines.push(...weekRoutines);
//         }
//     } else if (numberOfDaysPerWeek === 6) {
//         for (let week = 0; week < programLength; week++) {
//             const weekRoutines = [
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[0]?.day_title ?? fallbackPPL.workout_days[0].day_title,
//                     folder_id: week,
//                     order: "1",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackPPL.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[1]?.day_title ?? fallbackPPL.workout_days[1].day_title,
//                     folder_id: week,
//                     order: "2",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[1]?.exercises ?? fallbackPPL.workout_days[1].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[2]?.day_title ?? fallbackPPL.workout_days[2].day_title,
//                     folder_id: week,
//                     order: "3",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[2]?.exercises ?? fallbackPPL.workout_days[2].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[0]?.day_title ?? fallbackPPL.workout_days[0].day_title,
//                     folder_id: week,
//                     order: "4",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackPPL.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[1]?.day_title ?? fallbackPPL.workout_days[1].day_title,
//                     folder_id: week,
//                     order: "5",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[1]?.exercises ?? fallbackPPL.workout_days[1].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[2]?.day_title ?? fallbackPPL.workout_days[2].day_title,
//                     folder_id: week,
//                     order: "6",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[2]?.exercises ?? fallbackPPL.workout_days[2].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//             ];

//           routines.push(...weekRoutines);
//         }

//     }

//     return routines;
// };

// export const buildHevyUpperLowerRoutine = async (split: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number, excludeAreas: string = "", excludeEquipment: string = "", healthIssues: string = ""): Promise<THevyRoutine[]> => {

//     const routines: THevyRoutine[] = [];
//     const hevyExercises = await getHevyExercises();

//     let currentId = 1;

//     if (numberOfDaysPerWeek === 2) {
//         for (let week = 0; week < programLength; week++) {
//             const weekRoutines = [
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[0]?.day_title ?? fallbackUpperLower.workout_days[0].day_title,
//                     folder_id: week,
//                     order: "1",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackUpperLower.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[1]?.day_title ?? fallbackUpperLower.workout_days[1].day_title,
//                     folder_id: week,
//                     order: "2",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[1]?.exercises ?? fallbackUpperLower.workout_days[1].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },

//             ];

//           routines.push(...weekRoutines);
//         }
//     } else if (numberOfDaysPerWeek === 4) {
//         for (let week = 0; week < programLength; week++) {
//             const weekRoutines = [
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[0]?.day_title ?? fallbackUpperLower.workout_days[0].day_title,
//                     folder_id: week,
//                     order: "1",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackUpperLower.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[1]?.day_title ?? fallbackUpperLower.workout_days[1].day_title,
//                     folder_id: week,
//                     order: "2",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[1]?.exercises ?? fallbackUpperLower.workout_days[1].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[0]?.day_title ?? fallbackUpperLower.workout_days[0].day_title,
//                     folder_id: week,
//                     order: "3",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackUpperLower.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },
//                 {
//                     id: String(currentId++),
//                     title: split?.workout_days[1]?.day_title ?? fallbackUpperLower.workout_days[1].day_title,
//                     folder_id: week,
//                     order: "4",
//                     notes: "",
//                     exercises: replaceTextToJsonExercisesHevy(split?.workout_days[1]?.exercises ?? fallbackUpperLower.workout_days[1].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//                 },

//             ];

//           routines.push(...weekRoutines);
//         }
//     }

//     return routines;
// };


// export const buildHevyFiveDayRoutine = async (split: TTextToJsonResponse, programLength: number, excludeAreas: string = "", excludeEquipment: string = "", healthIssues: string = ""): Promise<THevyRoutine[]> => {

//     const routines: THevyRoutine[] = [];
//     const hevyExercises = await getHevyExercises();

//     let currentId = 1;

//     for (let week = 0; week < programLength; week++) {
//         const weekRoutines = [
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[0]?.day_title ?? fallbackCBLSA.workout_days[0].day_title,
//                 folder_id: week,
//                 order: "1",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackCBLSA.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[1]?.day_title ?? fallbackCBLSA.workout_days[1].day_title,
//                 folder_id: week,
//                 order: "2",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[1]?.exercises ?? fallbackCBLSA.workout_days[1].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[2]?.day_title ?? fallbackCBLSA.workout_days[2].day_title,
//                 folder_id: week,
//                 order: "3",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[2]?.exercises ?? fallbackCBLSA.workout_days[2].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[3]?.day_title ?? fallbackCBLSA.workout_days[3].day_title,
//                 folder_id: week,
//                 order: "4",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[3]?.exercises ?? fallbackCBLSA.workout_days[3].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[4]?.day_title ?? fallbackCBLSA.workout_days[4].day_title,
//                 folder_id: week,
//                 order: "5",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[4]?.exercises ?? fallbackCBLSA.workout_days[4].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//         ];

//         routines.push(...weekRoutines);
//     }

//     return routines;
// };


// export const buildHevySevenDayRoutine = async (split: TTextToJsonResponse, programLength: number, excludeAreas: string = "", excludeEquipment: string = "", healthIssues: string = ""): Promise<THevyRoutine[]> => {

//     const routines: THevyRoutine[] = [];
//     const hevyExercises = await getHevyExercises();

//     let currentId = 1;

//     for (let week = 0; week < programLength; week++) {
//         const weekRoutines = [
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[0]?.day_title ?? fallbackSevenDay.workout_days[0].day_title,
//                 folder_id: week,
//                 order: "1",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackSevenDay.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[1]?.day_title ?? fallbackSevenDay.workout_days[1].day_title,
//                 folder_id: week,
//                 order: "2",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[1]?.exercises ?? fallbackSevenDay.workout_days[1].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[2]?.day_title ?? fallbackSevenDay.workout_days[2].day_title,
//                 folder_id: week,
//                 order: "3",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[2]?.exercises ?? fallbackSevenDay.workout_days[2].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[0]?.day_title ?? fallbackSevenDay.workout_days[0].day_title,
//                 folder_id: week,
//                 order: "4",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[0]?.exercises ?? fallbackSevenDay.workout_days[0].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[1]?.day_title ?? fallbackSevenDay.workout_days[1].day_title,
//                 folder_id: week,
//                 order: "5",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[1]?.exercises ?? fallbackSevenDay.workout_days[1].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[2]?.day_title ?? fallbackSevenDay.workout_days[2].day_title,
//                 folder_id: week,
//                 order: "6",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[2]?.exercises ?? fallbackSevenDay.workout_days[2].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//             {
//                 id: String(currentId++),
//                 title: split?.workout_days[3]?.day_title ?? fallbackSevenDay.workout_days[3].day_title,
//                 folder_id: week,
//                 order: "7",
//                 notes: "",
//                 exercises: replaceTextToJsonExercisesHevy(split?.workout_days[3]?.exercises ?? fallbackSevenDay.workout_days[3].exercises, hevyExercises, excludeAreas, excludeEquipment, healthIssues),
//             },
//         ];

//         routines.push(...weekRoutines);
//     }

//     return routines;
// };


