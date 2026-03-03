import { getHevyExercises } from "@/components/program-builder/api/hevy";
import { amrapAsNumber } from "@/utils/general/helpers";
import * as Papa from "papaparse";

// Used to add week order and Id to program days for the drag and drop
export const appendWeekOrderAndIdToProgramDays = (program: TProgramCreatorDay[][]) => {

    if (!program || program.length === 0) return [];

    let idCounter = 1;

    const updatedProgram = program.map((week, index) =>
        week.map((day) => ({
            ...day,
            weekOrder: String(index), // Weeks are 0-indexed and days are 1-indexed. Someone please fix this monstrosity.
            id: String(idCounter++),
        })));
    return updatedProgram;
};

export const appendOrderToHevyRoutines = (routines: THevyRoutine[]): THevyRoutine[] => {

    if (!routines || routines.length === 0) return [];

    const sortedRoutines = [...routines].sort((a, b) => a.folder_id - b.folder_id);

    let currentFolderId = sortedRoutines[0].folder_id;
    let orderCounter = 1;

    const updatedRoutines: THevyRoutine[] = sortedRoutines.map((routine) => {
        if (routine.folder_id !== currentFolderId) {
            currentFolderId = routine.folder_id;
            orderCounter = 1; // Reset order for each new folder
        }

        const updatedRoutine = {
            ...routine,
            order: String(orderCounter),
        };

        orderCounter++;
        return updatedRoutine;
    });

    return updatedRoutines;
};


// Flattens program into days with weekOrder and dayOrder fields. Will then be sorted with the drag and drop and upon output will be re-constructed into the proxima_program_schema
export const flattenProgram = (program: TProgramCreatorDay[][]) => {
    return program.flat();
};

// Re-orders the day order field on the de-structured proxima program
export const reorder = (days: TProgramCreatorDay[]) => {

    const groupedByWeek: Record<number, TProgramCreatorDay[]> = days.reduce((acc, item) => {
        if (typeof item.weekOrder !== "string") return acc;
        const wkOrder = Number(item.weekOrder);
        if (!acc[wkOrder]) acc[wkOrder] = [];
        acc[wkOrder].push(item);
        return acc;
    }, {} as Record<number, TProgramCreatorDay[]>);


    days = Object.values(groupedByWeek).flatMap((group) =>
        group.map((item, index) => ({
            ...item,
            order: String(index + 1), // 1-based order per weekOrder
        })),
    );

    return days;
};


// Re-orders the day order field on the Hevy routine program
export const reorderHevy = (routines: THevyRoutine[]): THevyRoutine[] => {
    // Group routines by folder_id
    const groupedByFolder: Record<number, THevyRoutine[]> = routines.reduce((acc, item) => {
        if (!acc[item.folder_id]) acc[item.folder_id] = [];
        acc[item.folder_id].push(item);
        return acc;
    }, {} as Record<number, THevyRoutine[]>);

    // Reorder the routines and add an order based on folder_id grouping
    const updatedRoutines = Object.values(groupedByFolder).flatMap((group) =>
        group.map((item, index) => ({
            ...item,
            order: String(index + 1), // 1-based order within each folder_id group
        })),
    );

    return updatedRoutines;
};

// Sorting by day order not by order in the array
export const sortHevyByOrder = (routines: THevyRoutine[]): THevyRoutine[] => {
    const groupedByFolder: Record<number, THevyRoutine[]> = routines.reduce((acc, item) => {
        if (!acc[item.folder_id]) acc[item.folder_id] = [];
        acc[item.folder_id].push(item);
        return acc;
    }, {} as Record<number, THevyRoutine[]>);

    const sortedRoutines = Object.values(groupedByFolder).flatMap((group) =>
        group.sort((a, b) => Number(a.order) - Number(b.order))
    );

    return sortedRoutines;
};


export const removeOrderHevy = (routines: THevyRoutine[]): Omit<THevyRoutine, 'order'>[] => {
    return routines?.map(({ order, ...rest }) => rest);
};

export const deFlattenHevyRoutine = (routines: THevyRoutine[]): THevyRoutine[][] => {
    return Object.entries(
      routines.reduce<Record<number, THevyRoutine[]>>((acc, routine) => {
        const folderId = routine.folder_id;

        if (!acc[folderId]) {
          acc[folderId] = [];
        }

        acc[folderId].push(routine);
        return acc;
      }, {}),
    )
      // Sort folder groups by folder_id
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      // Return just the routines sorted by their order within each folder
      .map(([, group]) => group.sort((a, b) => parseInt(a.order ?? "1") - parseInt(b.order ?? "1")));
  };


export const deFlattenProgram = (flattenedProgram: TProgramCreatorDay[]): TProgramCreatorDay[][] => {
    return Object.entries(
      flattenedProgram.reduce<Record<number, TProgramCreatorDay[]>>((acc, day) => {
        const { weekOrder, id, ...rest } = day; // Destructure to remove weekOrder
        const week = parseInt(weekOrder || '0'); // Ensure it's treated as a number

        if (!acc[week]) {
          acc[week] = [];
        }

        acc[week].push(rest); // Push the rest of the day (without weekOrder) to the correct week
        return acc;
      }, {}),
    )
      // Sort the weeks based on weekOrder (keys)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      // Map the entries to return just the days in the correct week order
      .map(([, days]) => days.sort((a, b) => parseInt(a.order) - parseInt(b.order))); // Sort days by order
  };


// Converts TProgramCreatorDay[][] into TScheduleWorkouts[][]
export const programCreatorDayToScheduleWorkouts = (program: TProgramCreatorDay[][]): TScheduleWorkouts[][] => {
    return program.map((week, weekIndex) =>
        week.map((day) => ({
            nthDay: Number(day.order),
            nthWeek: weekIndex,
            day_title: day.day_title,
            program_workout_exercises: (day.exercises || []).map(exercise => ({
                reps: exercise.reps_type?.reps,
                reps_max: exercise.reps_type?.reps_max,
                reps_range: exercise.reps_type?.reps_range,
                time_taken: exercise.reps_type?.time_taken,
                time_range: exercise.reps_type?.time_range,
                amrap: exercise.reps_type?.amrap,
                rpe: exercise.intensity?.rpe,
                rpe_range: exercise.intensity?.rpe_range,
                percent_rm: exercise.intensity?.percent_rm,
                weights: exercise.intensity?.weights,
                exercises: exercise.hevy_exercise_templates,
            })),
        })),
    );
};

export const getNumberRoutineFolders = (routines: THevyRoutine[]): number => {
    if (routines.length === 0) return 12;

    const folderIds = routines.map(routine => routine.folder_id);
    const minFolderId = Math.min(...folderIds);
    const maxFolderId = Math.max(...folderIds);

    return maxFolderId - minFolderId + 1;
};

/** One row per set (or one row for identical sets) for CSV export. Column names are stable for imports (e.g. Google Sheets). */
export type HevyCsvRow = {
    week: number;
    day: string;
    routine_title: string;
    routine_notes: string;
    exercise_title: string;
    exercise_notes: string;
    rest_seconds: string | null;
    set_index: number;
    set_type: string;
    sets_count: number;
    weight_kg: number | null;
    reps: number | null;
    distance_meters: number | null;
    duration_seconds: number | null;
    rpe: number | null;
    custom_metric: number | null;
    actual_rpe: number | null;
    actual_weight: number | null;
};

/** Data-only columns for CSV (no week/day). Order used for header and data rows. */
const HEVY_CSV_DATA_COLUMNS: (keyof Omit<HevyCsvRow, "week" | "day">)[] = [
    "routine_title",
    "routine_notes",
    "exercise_title",
    "exercise_notes",
    "rest_seconds",
    "set_index",
    "set_type",
    "sets_count",
    "weight_kg",
    "reps",
    "distance_meters",
    "duration_seconds",
    "rpe",
    "custom_metric",
    "actual_rpe",
    "actual_weight",
];

/** Human-readable header labels for CSV export. Keys not present use the column key. */
const HEVY_CSV_HEADER_LABELS: Partial<Record<(typeof HEVY_CSV_DATA_COLUMNS)[number], string>> = {
    actual_rpe: "Actual RPE",
    actual_weight: "Actual Weight",
};

/** Returns true when all sets share the same rep metric value, type, weight_kg, and RPE (aligned with HevyExerciseVisualizer). */
function canCollapseExerciseSets(sets: THevySets[]): boolean {
    if (sets.length === 0) return false;
    const first = sets[0];
    const repMetric: keyof Pick<THevySets, "reps" | "distance_meters" | "duration_seconds" | "custom_metric"> =
        first.reps != null && first.reps > 0 ? "reps" :
        first.distance_meters != null && first.distance_meters > 0 ? "distance_meters" :
        first.duration_seconds != null && first.duration_seconds > 0 ? "duration_seconds" :
        first.custom_metric != null && first.custom_metric > 0 ? "custom_metric" :
        "reps";
    const sameRepMetric = sets.every((s, i, arr) => (s[repMetric] ?? null) === (arr[0][repMetric] ?? null));
    const sameType = sets.every((s, i, arr) => (s.type ?? "") === (arr[0].type ?? ""));
    const sameWeight = sets.every((s, i, arr) => (s.weight_kg ?? null) === (arr[0].weight_kg ?? null));
    const rpeValues = sets.map((s) => s.rpe).filter((r): r is number => r != null && r > 0);
    const sameRpe = rpeValues.length === 0 || (rpeValues.length === sets.length && rpeValues.every((v) => v === rpeValues[0]));
    return sameRepMetric && sameType && sameWeight && sameRpe;
}

/** Flattens THevyRoutine[] into CSV rows. When reps and intensity are the same for all sets in an exercise, emits one row with sets_count = N; otherwise one row per set with sets_count = 1. */
export const hevyRoutinesToCsvRows = (routines: THevyRoutine[]): HevyCsvRow[] => {
    const rows: HevyCsvRow[] = [];
    for (const routine of routines) {
        const week = routine.folder_id + 1;
        const day = routine.order ?? "";
        const routineTitle = routine.title ?? "";
        const routineNotes = routine.notes ?? "";
        for (const exercise of routine.exercises ?? []) {
            const exerciseTitle = exercise.title ?? "";
            const exerciseNotes = exercise.notes ?? "";
            const restSeconds = exercise.rest_seconds ?? null;
            const sets = exercise.sets ?? [];
            if (sets.length === 0) continue;
            if (canCollapseExerciseSets(sets)) {
                const set = sets[0];
                rows.push({
                    week,
                    day,
                    routine_title: routineTitle,
                    routine_notes: routineNotes,
                    exercise_title: exerciseTitle,
                    exercise_notes: exerciseNotes,
                    rest_seconds: restSeconds,
                    set_index: 0,
                    set_type: set.type ?? "",
                    sets_count: sets.length,
                    weight_kg: set.weight_kg ?? null,
                    reps: set.reps ?? null,
                    distance_meters: set.distance_meters ?? null,
                    duration_seconds: set.duration_seconds ?? null,
                    rpe: set.rpe ?? null,
                    custom_metric: set.custom_metric ?? null,
                    actual_rpe: null,
                    actual_weight: null,
                });
            } else {
                for (const set of sets) {
                    rows.push({
                        week,
                        day,
                        routine_title: routineTitle,
                        routine_notes: routineNotes,
                        exercise_title: exerciseTitle,
                        exercise_notes: exerciseNotes,
                        rest_seconds: restSeconds,
                        set_index: set.index,
                        set_type: set.type ?? "",
                        sets_count: 1,
                        weight_kg: set.weight_kg ?? null,
                        reps: set.reps ?? null,
                        distance_meters: set.distance_meters ?? null,
                        duration_seconds: set.duration_seconds ?? null,
                        rpe: set.rpe ?? null,
                        custom_metric: set.custom_metric ?? null,
                        actual_rpe: null,
                        actual_weight: null,
                    });
                }
            }
        }
    }
    return rows;
};

function rowToDataCells(row: HevyCsvRow): string[] {
    return HEVY_CSV_DATA_COLUMNS.map((key) => {
        const v = row[key];
        if (v === null || v === undefined) return "";
        return String(v);
    });
}

function emptyRow(length: number): string[] {
    return Array.from({ length }, () => "");
}

/** Builds full CSV string with "Week N" and "Day N" title rows only (no week/day columns). Repeats data header before each day. */
export function hevyRoutinesToCsvWithWeekAndDayTitles(routines: THevyRoutine[]): string {
    const rows = hevyRoutinesToCsvRows(routines);
    if (rows.length === 0) return "";

    const numCols = HEVY_CSV_DATA_COLUMNS.length;
    const byWeek = new Map<number, HevyCsvRow[]>();
    for (const row of rows) {
        const list = byWeek.get(row.week) ?? [];
        list.push(row);
        byWeek.set(row.week, list);
    }
    const weeks = Array.from(byWeek.keys()).sort((a, b) => a - b);
    const csvRows: string[][] = [];

    for (const week of weeks) {
        const weekRows = byWeek.get(week) ?? [];
        const byDay = new Map<string, HevyCsvRow[]>();
        for (const row of weekRows) {
            const list = byDay.get(row.day) ?? [];
            list.push(row);
            byDay.set(row.day, list);
        }
        const days = Array.from(byDay.keys()).sort((a, b) => Number(a) - Number(b));

        const weekTitleRow = emptyRow(numCols);
        weekTitleRow[0] = `Week ${week}`;
        csvRows.push(weekTitleRow);
        csvRows.push(emptyRow(numCols));

        for (const day of days) {
            const dayRows = byDay.get(day) ?? [];
            const dayTitleRow = emptyRow(numCols);
            dayTitleRow[0] = `Day ${day}`;
            csvRows.push(dayTitleRow);
            csvRows.push(
                HEVY_CSV_DATA_COLUMNS.map((key) => HEVY_CSV_HEADER_LABELS[key] ?? key)
            );
            for (const row of dayRows) {
                csvRows.push(rowToDataCells(row));
            }
            csvRows.push(emptyRow(numCols));
        }
    }

    return Papa.unparse(csvRows);
}

// Converts TAddExercise type into TProgramCreatorExercise type
export const addExerciseToProgramCreatorExerciseConverter = async (addExercise: TAddExercise, hevyExercises?: THevyExerciseTemplate[]) => {
    let addReps = [];
    let addIntensity = [];
    let sets = 0;
    if (addExercise.repTypeValue === "amrap") {
        addReps = addExercise.reps.map(() => addExercise.repTypeValue);
        sets = addExercise.reps.length;
    } else if (addExercise.repTypeValue === "reps_range" || addExercise.repTypeValue === "time_range") {
        addReps = addExercise.repsWithTimeAndRepRange;
        sets = addExercise.repsWithTimeAndRepRange.length;
    } else {
        addReps = addExercise.reps;
        sets = addExercise.reps.length;
    }
    if (addExercise.intensityValue === "rpe_range") {
        addIntensity = addExercise.intensityDataWithRPERange;
    } else {
        addIntensity = addExercise.intensityData;
    }

    const exercises = hevyExercises ?? await getHevyExercises();
    const exercise = exercises.find((ex) => ex.id === addExercise.id);

    return {
        exercise,
        sets: sets,
        sets_type: addExercise.setTypes,
        reps_type: { [ addExercise.repTypeValue ] : addReps },
        intensity: { [ addExercise.intensityValue ]: addIntensity},
    } as TProgramCreatorExercise;

};

// Convertes TAddExercise to THevyExercise type
export const hevyAddExerciseToHevySetsConverter = (addExercise: THevyAddExercise): THevySets[] => {
    const sets: THevySets[] = (addExercise.reps ?? []).map((rep, setIndex) => {
        return {
            index: setIndex,
            type: addExercise.setTypes[setIndex],
            weight_kg: addExercise.intensityValue === "weight_kg" ? addExercise.intensityData?.[setIndex] ?? null: null,
            reps: addExercise.repTypeValue.includes("reps") ? rep ?? null : null,
            distance_meters: addExercise.repTypeValue.includes("distance_meters") ? rep ?? null : null,
            duration_seconds: addExercise.repTypeValue.includes("duration_seconds") ? rep ?? null : null,
            rpe: addExercise.intensityValue.includes("rpe") ? addExercise.intensityData?.[setIndex] ?? null : null,
            custom_metric: addExercise.repTypeValue.includes("custom_metric") ? rep ?? null : null,
        };
    });

    return sets;
};

// Converts THevyExercise into THevyAddExercise
export const convertHevyExerciseIntoHevyAddExercise = async (exercise: THevyExercise, customExercises?: THevyExerciseTemplate[], hevyExercises?: THevyExerciseTemplate[]): Promise<THevyAddExercise> => {

    // Determine the repTypeValue based on the first non-zero value in a rep-type field
    const firstSet = exercise.sets[0];

    let repTypeValue: THevyAddExercise["repTypeValue"] = "reps";
    if (firstSet?.distance_meters !== null && firstSet?.distance_meters > 0) {
      repTypeValue = "distance_meters";
    } else if (firstSet?.duration_seconds !== null && firstSet?.duration_seconds > 0) {
      repTypeValue = "duration_seconds";
    } else if (firstSet?.custom_metric !== null && firstSet?.custom_metric > 0) {
      repTypeValue = "custom_metric";
    }

    // Determine intensityValue
    const intensityValue: THevyAddExercise["intensityValue"] =
      firstSet?.weight_kg ?? 0 > 0 ? "weight_kg" : "rpe";

    const rawReps = exercise.sets.map(set => {
        switch (repTypeValue) {
            case "reps":
            return set.reps;
            case "distance_meters":
            return set.distance_meters;
            case "duration_seconds":
            return set.duration_seconds;
            case "custom_metric":
            return set.custom_metric;
        }
    });
    const filteredReps = rawReps.filter((val): val is number => val !== null && val !== undefined);
    const reps: number[] | null = filteredReps.length > 0 ? filteredReps : null;

    const rawIntensityValues = exercise.sets.map(set => intensityValue === "weight_kg" ? set.weight_kg : set.rpe);
    const filteredIntensityData = rawIntensityValues.filter(
        (val): val is number => val !== null && val !== undefined
    );
    const intensityData: number[] | null = filteredIntensityData.length > 0 ? filteredIntensityData : null;

    // Get the exercise template data: use provided list or fetch via getHevyExercises()
    let exerciseTemplate: THevyExerciseTemplate | undefined;
    const exercises = hevyExercises ?? await getHevyExercises();
    exerciseTemplate = exercises.find((ex) => ex.id === exercise.exercise_template_id);

    // If not found and custom exercises are provided, search there
    if (!exerciseTemplate && customExercises) {
        exerciseTemplate = customExercises.find(ex => ex.id === exercise.exercise_template_id);
    }

    // If still not found, throw an error
    if (!exerciseTemplate) {
        throw new Error(`Exercise template with ID ${exercise.exercise_template_id} not found`);
    }

    return {
        selectedExercise: exerciseTemplate,
        repTypeValue,
        intensityValue,
        reps,
        intensityData,
        restSeconds: exercise.rest_seconds,
        setTypes: exercise.sets.map(set => (set.type) as ("normal" | "warmup" | "dropset" | "failure")),
    };
};


// Converts TProgramCreatorExercise into TAddExercise type
export const convertProgramCreatorExerciseToAddExercise = (programCreatorExercise: TProgramCreatorExercise): TAddExercise => {

    if (!programCreatorExercise.hevy_exercise_templates) {
      throw new Error("Missing exercise data.");
    }

    const { hevy_exercise_templates, reps_type, intensity, sets_type } = programCreatorExercise;

    // Determine repTypeValue
    const repTypeValue =
      reps_type?.reps ? "reps" :
      reps_type?.reps_max ? "reps_max" :
      reps_type?.reps_range ? "reps_range" :
      reps_type?.time_taken ? "time_taken" :
      reps_type?.time_range ? "time_range" :
      reps_type?.amrap ? "amrap" :
      undefined;

    if (!repTypeValue) {
      throw new Error("Invalid or missing reps_type.");
    }

    // Determine intensityValue
    const intensityValue =
      intensity?.percent_rm ? "percent_rm" :
      intensity?.rpe_range ? "rpe_range" :
      intensity?.rpe ? "rpe" :
      intensity?.weights ? "weights" :
      undefined;

    if (!intensityValue) {
      throw new Error("Invalid or missing intensity.");
    }

    // Populate data fields
    const reps = reps_type?.reps || reps_type?.reps_max || reps_type?.time_taken || amrapAsNumber(reps_type?.amrap) || []; // AMRAP NEEDS TO BE FIXED HERE
    const intensityData = intensity?.percent_rm || intensity?.rpe || intensity?.weights || [];
    const repsWithTimeAndRepRange =
      reps_type?.reps_range || reps_type?.time_range || [];
    const intensityDataWithRPERange = intensity?.rpe_range || [];

    // Return the mapped TAddExercise object
    return {
      id: hevy_exercise_templates.id,
      repTypeValue,
      intensityValue,
      setTypes: sets_type ?? ["normal","normal","normal","normal"],
      reps,
      intensityData,
      repsWithTimeAndRepRange,
      intensityDataWithRPERange,
    };
};
