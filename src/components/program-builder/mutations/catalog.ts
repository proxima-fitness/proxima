import { defineProgramMutation } from "./defineProgramMutation";
import {
    addDay,
    addDayNotes,
    addExerciseNote,
    addRoutineAsDay,
    createSuperset,
    deleteDay,
    deleteExercise,
    deleteWeek,
    duplicateDay,
    duplicateWeek,
    editDayTitle,
    editExercise,
    insertExercise,
    removeFromSuperset,
    reorderDayInWeek,
    updateSet,
} from "./handlers";
import {
    addDayNotesSchema,
    addDaySchema,
    addExerciseNotesSchema,
    addRoutineAsDaySchema,
    createSupersetSchema,
    deleteDaySchema,
    deleteExerciseSchema,
    deleteWeekSchema,
    duplicateDaySchema,
    duplicateWeekSchema,
    editDayTitleSchema,
    editExerciseSchema,
    insertExerciseSchema,
    removeFromSupersetSchema,
    reorderDayInWeekSchema,
    toHevyAddExercise,
    toHevyExercise,
    updateSetSchema,
} from "./schemas";
import {
    mutationFailure,
    mutationSuccess,
    type TMutationResult,
    type TProgramMutationDefinition,
} from "./types";

function weekFullResult(program: THevyRoutine[], next: THevyRoutine[]): TMutationResult {
    if (next === program) {
        return mutationFailure("Maximum 7 days per week");
    }
    return mutationSuccess(next);
}

export const programMutationCatalog: TProgramMutationDefinition[] = [
    defineProgramMutation({
        id: "insert_exercise",
        description: "Insert an exercise at a 0-based index on one or more days.",
        schema: insertExerciseSchema,
        run: (program, args) =>
            mutationSuccess(
                insertExercise(
                    program,
                    args.folderIds,
                    args.dayOrder,
                    args.exerciseIndex,
                    args.exercise,
                ),
            ),
    }),
    defineProgramMutation({
        id: "edit_exercise",
        description: "Replace an exercise using add-exercise dialog shape.",
        schema: editExerciseSchema,
        run: (program, args) =>
            mutationSuccess(
                editExercise(
                    program,
                    args.folderIds,
                    args.dayOrder,
                    args.exerciseIndex,
                    toHevyAddExercise(args.exercise),
                ),
            ),
    }),
    defineProgramMutation({
        id: "delete_exercise",
        description: "Remove an exercise by 0-based index.",
        schema: deleteExerciseSchema,
        run: (program, args) =>
            mutationSuccess(
                deleteExercise(program, args.folderIds, args.dayOrder, args.exerciseIndex),
            ),
    }),
    defineProgramMutation({
        id: "update_set",
        description: "Patch fields on a single set row.",
        schema: updateSetSchema,
        run: (program, args) =>
            mutationSuccess(
                updateSet(
                    program,
                    args.folderIds,
                    args.dayOrder,
                    args.exerciseIndex,
                    args.setIndex,
                    args.set,
                ),
            ),
    }),
    defineProgramMutation({
        id: "edit_day_title",
        description: "Set the day title on one or more matching days.",
        schema: editDayTitleSchema,
        run: (program, args) =>
            mutationSuccess(
                editDayTitle(program, args.folderIds, args.dayOrder, args.title),
            ),
    }),
    defineProgramMutation({
        id: "add_day_notes",
        description: "Set routine notes on one or more matching days.",
        schema: addDayNotesSchema,
        run: (program, args) =>
            mutationSuccess(
                addDayNotes(program, args.folderIds, args.dayOrder, args.notes),
            ),
    }),
    defineProgramMutation({
        id: "add_exercise_notes",
        description: "Set notes on a single exercise.",
        schema: addExerciseNotesSchema,
        run: (program, args) =>
            mutationSuccess(
                addExerciseNote(
                    program,
                    args.folderIds,
                    args.dayOrder,
                    args.exerciseIndex,
                    args.notes,
                ),
            ),
    }),
    defineProgramMutation({
        id: "delete_day",
        description: "Delete a day by builder routine id.",
        schema: deleteDaySchema,
        run: (program, args) => mutationSuccess(deleteDay(program, args.dayId)),
    }),
    defineProgramMutation({
        id: "add_day",
        description: "Append an empty day to a week.",
        schema: addDaySchema,
        run: (program, args) =>
            weekFullResult(program, addDay(program, args.folderIds[0])),
    }),
    defineProgramMutation({
        id: "delete_week",
        description: "Remove a week and reindex later weeks.",
        schema: deleteWeekSchema,
        run: (program, args) =>
            mutationSuccess(deleteWeek(program, args.folderIds[0])),
    }),
    defineProgramMutation({
        id: "create_superset",
        description: "Group two or more exercises into a superset.",
        schema: createSupersetSchema,
        run: (program, args) =>
            mutationSuccess(createSuperset(program, args.dayId, args.exerciseIndexes)),
    }),
    defineProgramMutation({
        id: "remove_from_superset",
        description: "Remove one exercise from its superset.",
        schema: removeFromSupersetSchema,
        run: (program, args) =>
            mutationSuccess(removeFromSuperset(program, args.dayId, args.exerciseIndex)),
    }),
    defineProgramMutation({
        id: "duplicate_week",
        description: "Copy all days from one week into other weeks.",
        schema: duplicateWeekSchema,
        agentExposed: false,
        run: (program, args) =>
            mutationSuccess(
                duplicateWeek(program, args.fromWeekIndex, args.toWeekIndexes),
            ),
    }),
    defineProgramMutation({
        id: "duplicate_day",
        description: "Copy one day into other day slots on a target week.",
        schema: duplicateDaySchema,
        agentExposed: false,
        run: (program, args) =>
            mutationSuccess(
                duplicateDay(
                    program,
                    args.fromWeekIndex,
                    args.fromDayOrder,
                    args.toWeekIndex,
                    args.toDayOrders,
                ),
            ),
    }),
    defineProgramMutation({
        id: "reorder_day_in_week",
        description: "Move a day within a week before another day or to the end.",
        schema: reorderDayInWeekSchema,
        agentExposed: false,
        run: (program, args) =>
            mutationSuccess(
                reorderDayInWeek(program, args.folderId, args.dayId, args.beforeDayId),
            ),
    }),
    defineProgramMutation({
        id: "add_routine_as_day",
        description: "Append a copied routine as a new day in a week.",
        schema: addRoutineAsDaySchema,
        agentExposed: false,
        run: (program, args) =>
            weekFullResult(
                program,
                addRoutineAsDay(
                    program,
                    {
                        ...args.routine,
                        exercises: args.routine.exercises.map(toHevyExercise),
                    },
                    args.folderIds[0],
                ),
            ),
    }),
];

export const programMutationCatalogById = Object.fromEntries(
    programMutationCatalog.map((mutation) => [mutation.id, mutation]),
) as Record<string, TProgramMutationDefinition>;

export const agentExposedMutations = programMutationCatalog.filter(
    (mutation) => mutation.agentExposed,
);
