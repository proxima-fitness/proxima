import { getHevyExercises } from "@/api/hevy";
import { fallbackCBLSA, fallbackOneDay, fallbackPPL, fallbackSevenDay, fallbackUpperLower } from "@/assets/constants";
import { replaceTextToJsonExercisesHevy } from "./format-responses";

// Returns a default program if the AI failed
export const buildHevyFallbackProgram = async (programLength: number, numberOfDaysPerWeek: number) => {

    if (programLength === 0) {
        programLength = 12;
    }

    if (numberOfDaysPerWeek === 0) {
        numberOfDaysPerWeek = 6;
    }

    if (numberOfDaysPerWeek === 1) {
        // 1 Day per week program
        const one_day = await buildHevyOneDayRoutine(fallbackOneDay, programLength);
        return one_day;

    } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
        // An Upper / Lower Program
        const ul = await buildHevyUpperLowerRoutine(fallbackUpperLower, programLength, numberOfDaysPerWeek);
        return ul;

    } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
        // A Push / Pull / Leg Program
        const ppl = await buildHevyPushPullLegsRoutine(fallbackPPL, programLength, numberOfDaysPerWeek);
        return ppl;

    } else if (numberOfDaysPerWeek === 5) {
        // Chest / Back / Legs / Shoulders / Arms
        const five_day = await buildHevyFiveDayRoutine(fallbackCBLSA, programLength);
        return five_day;

    } else if (numberOfDaysPerWeek === 7) {
        // Push / Pull / Legs / Cardio
        const seven_day = await buildHevySevenDayRoutine(fallbackSevenDay, programLength);
        return seven_day;
    }

};

export const buildHevyProgram = async (parsedResponse: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number ) => {

    if (programLength === 0) {
        programLength = 12;
    }

    if (numberOfDaysPerWeek === 0) {
        numberOfDaysPerWeek = 6;
    }

    if (numberOfDaysPerWeek === 1) {
        // 1 Day per week program
        const one_day = await buildHevyOneDayRoutine(parsedResponse, programLength);
        return one_day;

    } else if (numberOfDaysPerWeek === 2 || numberOfDaysPerWeek === 4) {
        // An Upper / Lower Program
        const ul = await buildHevyUpperLowerRoutine(parsedResponse, programLength, numberOfDaysPerWeek);
        return ul;

    } else if (numberOfDaysPerWeek === 3 || numberOfDaysPerWeek === 6) {
        // A Push / Pull / Leg Program
        const ppl = await buildHevyPushPullLegsRoutine(parsedResponse, programLength, numberOfDaysPerWeek);
        return ppl;
    } else if (numberOfDaysPerWeek === 5) {
        // Chest / Back / Legs / Shoulders / Arms
        const five_day = await buildHevyFiveDayRoutine(parsedResponse, programLength);
        return five_day;

    } else if (numberOfDaysPerWeek === 7) {
        // Push / Pull / Legs / Cardio
        const seven_day = await buildHevySevenDayRoutine(parsedResponse, programLength);
        return seven_day;
    }
};

export const buildHevyOneDayRoutine = async (split: TTextToJsonResponse, programLength: number): Promise<THevyRoutine[]> => {

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


// Turns one routine returned from AI into a program
export const buildHevyPushPullLegsRoutine = async (split: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number): Promise<THevyRoutine[]> => {

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

export const buildHevyUpperLowerRoutine = async (split: TTextToJsonResponse, programLength: number, numberOfDaysPerWeek: number): Promise<THevyRoutine[]> => {

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


export const buildHevyFiveDayRoutine = async (split: TTextToJsonResponse, programLength: number): Promise<THevyRoutine[]> => {

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


export const buildHevySevenDayRoutine = async (split: TTextToJsonResponse, programLength: number): Promise<THevyRoutine[]> => {

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


