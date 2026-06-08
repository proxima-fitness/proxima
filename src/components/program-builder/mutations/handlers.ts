/**
 * Pure mutations on a Hevy program snapshot.
 *
 * Each function takes the current program and returns a new program (or the same
 * reference when the operation is a no-op). Callers own persistence, undo, and
 * user feedback such as toasts.
 */

import {
    hevyAddExerciseToHevySetsConverter,
    reorderHevy,
    sortHevyByOrder,
} from "@/components/program-builder/utils/format-responses";

import type { TInsertExercisePayload } from "./schemas";
import { toHevySet } from "./schemas";


// --- Duplication ---

/**
 * Copy every day in `fromWeekIndex` into each week listed in `toWeekIndexes`.
 *
 * Any days already present in a target week are removed before the copy, so
 * target weeks end up mirroring the source week exactly. New day records receive
 * fresh ids; folder_id and day order are normalized via reorderHevy.
 *
 * @param program - Current program snapshot (flat list of day routines).
 * @param fromWeekIndex - Source week index (`folder_id`) to copy from.
 * @param toWeekIndexes - Target week indices; each receives a full copy of the source week.
 * @returns Updated program with target weeks replaced and ordering normalized.
 */
export function duplicateWeek(
    program: THevyRoutine[],
    fromWeekIndex: number,
    toWeekIndexes: number[],
): THevyRoutine[] {
    const filteredPrev = program.filter((day) => !toWeekIndexes.includes(day.folder_id));
    const daysToCopy = program.filter((day) => day.folder_id === fromWeekIndex);
    let maxId = Math.max(...program.map((d) => Number(d.id)));
    const newDays = toWeekIndexes.flatMap((week) =>
        daysToCopy.map((day) => ({
            ...day,
            id: String(++maxId),
            folder_id: week,
        })),
    );
    return reorderHevy([...filteredPrev, ...newDays]);
}

/**
 * Copy one source day onto specific day slots in a target week.
 *
 * Days at the target slots are replaced. If a target slot is beyond the week's
 * current length, blank placeholder days are created for intermediate slots
 * first.
 *
 * @param program - Current program snapshot.
 * @param fromWeekOrder - Source week index (`folder_id`).
 * @param fromDayOrder - Source day order within the source week (1-based).
 * @param toWeekOrder - Target week index (`folder_id`).
 * @param toDayOrders - Day orders within the target week to overwrite with the copy.
 * @returns Updated program, or the same reference when the source day is not found.
 */
export function duplicateDay(
    program: THevyRoutine[],
    fromWeekOrder: number,
    fromDayOrder: number,
    toWeekOrder: number,
    toDayOrders: number[],
): THevyRoutine[] {
    const dayToCopy = program.find(
        (day) => Number(day.folder_id) === fromWeekOrder && Number(day.order) === fromDayOrder,
    );

    if (!dayToCopy) return program;

    const existingDaysInTargetWeek = program.filter((day) => Number(day.folder_id) === toWeekOrder);
    const maxExistingOrderinTargetWeek = Math.max(
        ...existingDaysInTargetWeek.map((day) => Number(day.order)),
        0,
    );

    let newId = Math.max(...program.map((day) => Number(day.id)), 0) + 1;
    let updatedDays = [...program];

    const maxToDayOrder = Math.max(...toDayOrders);

    if (maxToDayOrder > maxExistingOrderinTargetWeek) {
        for (let i = maxExistingOrderinTargetWeek + 1; i <= maxToDayOrder; i++) {
            if (
                !existingDaysInTargetWeek.some((day) => Number(day.order) === i) &&
                !toDayOrders.includes(i)
            ) {
                updatedDays.push({
                    id: String(newId++),
                    folder_id: toWeekOrder,
                    order: String(i),
                    exercises: [],
                    title: "",
                    notes: "",
                });
            }
        }
    }

    updatedDays = updatedDays.filter(
        (day) => !(day.folder_id === toWeekOrder && toDayOrders.includes(Number(day.order))),
    );

    const newDays = toDayOrders.map((dayOrder) => ({
        ...dayToCopy,
        id: String(newId++),
        folder_id: toWeekOrder,
        order: String(dayOrder),
    }));

    return sortHevyByOrder([...newDays, ...updatedDays]);
}


// --- Day structure ---

/**
 * Append an empty day to the end of a week.
 *
 * The new day receives the next sequential order within the week.
 *
 * @param program - Current program snapshot.
 * @param folder_id - Week index (`folder_id`) to add the day to.
 * @returns Updated program with a new empty day appended, or the same reference when the week already has seven days.
 */
export function addDay(program: THevyRoutine[], folder_id: number): THevyRoutine[] {
    const daysInFolder = program.filter((day) => day.folder_id === folder_id);
    if (daysInFolder.length >= 7) {
        return program;
    }
    const nthDayOrder = daysInFolder.length + 1;
    const maxId = Math.max(...program.map((d) => Number(d.id)));
    const newEmptyDay: THevyRoutine = {
        id: String(maxId + 1),
        folder_id,
        order: String(nthDayOrder),
        exercises: [],
        title: "",
        notes: "",
    };
    return [...program, newEmptyDay];
}

/**
 * Remove a day by its stable id and compact week/day ordering.
 *
 * Remaining days are reindexed so folder_id and order stay contiguous.
 *
 * @param program - Current program snapshot.
 * @param id - Stable day id of the routine to remove.
 * @returns Updated program with the day removed and ordering compacted.
 */
export function deleteDay(program: THevyRoutine[], id: string): THevyRoutine[] {
    let newDays = program.filter((day) => day.id !== id);
    newDays = reorderHevy(newDays);
    return newDays;
}

/**
 * Remove an entire week and shift later weeks down by one folder_id.
 *
 * All days with the given folder_id are dropped; surviving weeks are reordered.
 *
 * @param program - Current program snapshot.
 * @param folder_id - Week index (`folder_id`) to remove.
 * @returns Updated program with the week removed and later weeks reindexed.
 */
export function deleteWeek(program: THevyRoutine[], folder_id: number): THevyRoutine[] {
    const withoutWeek = program.filter((day) => day.folder_id !== folder_id);
    const reindexed = withoutWeek.map((day) =>
        day.folder_id > folder_id ? { ...day, folder_id: day.folder_id - 1 } : day,
    );
    return reorderHevy(reindexed);
}


// --- Day metadata ---

/**
 * Set the title on the day identified by id.
 *
 * Used by the human builder, which addresses days by card id rather than
 * week/order coordinates.
 *
 * @param program - Current program snapshot.
 * @param id - Stable day id of the routine to rename.
 * @param title - New day title.
 * @returns Updated program with the matching day's title replaced.
 */
export function editTitle(program: THevyRoutine[], id: string, title: string): THevyRoutine[] {
    return program.map((day) => (day.id === id ? { ...day, title } : day));
}

/**
 * Set the title on a given day order across one or more weeks.
 *
 * Every day whose folder_id is in folderIds and whose order matches dayOrder
 * receives the new title. Used when the agent targets weeks by index.
 *
 * @param program - Current program snapshot.
 * @param folderIds - Week indices (`folder_id` values) to match.
 * @param dayOrder - Day order within each matched week (1-based).
 * @param title - New day title.
 * @returns Updated program with all matching days renamed.
 */
export function editDayTitle(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    title: string,
): THevyRoutine[] {
    return program.map((day) =>
        folderIds.includes(Number(day.folder_id)) && Number(day.order) === dayOrder
            ? { ...day, title }
            : day,
    );
}


// --- Exercises ---

/**
 * Remove one exercise from matching days by its position in the exercises array.
 *
 * Does not renumber exercise.index fields on survivors; only the array changes.
 *
 * @param program - Current program snapshot.
 * @param folderIds - Week indices (`folder_id` values) to match.
 * @param dayOrder - Day order within each matched week (1-based).
 * @param exerciseIndex - Zero-based index into the day's exercises array.
 * @returns Updated program with the exercise removed from matching days.
 */
export function deleteExercise(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    exerciseIndex: number,
): THevyRoutine[] {
    return program.map((day) => {
        if (folderIds.includes(Number(day.folder_id)) && Number(day.order) === dayOrder) {
            return {
                ...day,
                exercises: day.exercises.filter((_, index) => index !== exerciseIndex),
            };
        }
        return day;
    });
}

/**
 * Add an exercise built from the add-exercise dialog form.
 *
 * Converts form fields to Hevy sets via hevyAddExerciseToHevySetsConverter. When
 * exerciseIndex is omitted or equals the current length, the exercise is
 * appended; otherwise it is inserted at that array position. New exercises start
 * with no superset and empty notes.
 *
 * @param program - Current program snapshot.
 * @param folderIds - Week indices (`folder_id` values) to match.
 * @param dayOrder - Day order within each matched week (1-based).
 * @param exercise - Add-exercise dialog form state to convert into a Hevy exercise.
 * @param exerciseIndex - Optional zero-based insert position; omit to append.
 * @returns Updated program with the new exercise on matching days.
 */
export function addExercise(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    exercise: THevyAddExercise,
    exerciseIndex?: number,
): THevyRoutine[] {
    const sets = hevyAddExerciseToHevySetsConverter(exercise);
    return program.map((day) => {
        if (!folderIds.includes(Number(day.folder_id)) || Number(day.order) !== dayOrder) {
            return day;
        }

        const newExercise: THevyExercise = {
            index: day.exercises.length + 1,
            title: exercise?.selectedExercise?.title ?? "",
            notes: "",
            exercise_template_id: exercise?.selectedExercise?.id ?? "",
            supersets_id: null,
            sets,
            rest_seconds: exercise?.restSeconds ?? null,
        };

        if (exerciseIndex === undefined || exerciseIndex === day.exercises.length) {
            return {
                ...day,
                exercises: [...day.exercises, newExercise],
            };
        }

        const exercises = [...day.exercises];
        exercises.splice(exerciseIndex, 0, newExercise);
        return { ...day, exercises };
    });
}

/**
 * Insert a fully specified exercise record at a given array index.
 *
 * Agent-facing counterpart to addExercise: accepts a raw payload instead of
 * dialog form state. Appends when exerciseIndex equals the current length.
 *
 * @param program - Current program snapshot.
 * @param folderIds - Week indices (`folder_id` values) to match.
 * @param dayOrder - Day order within each matched week (1-based).
 * @param exerciseIndex - Zero-based insert position; use length to append.
 * @param payload - Pre-built exercise fields and sets (no form conversion).
 * @returns Updated program with the exercise inserted on matching days.
 */
export function insertExercise(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    exerciseIndex: number,
    payload: TInsertExercisePayload,
): THevyRoutine[] {
    const sets = payload.sets.map(toHevySet);
    return program.map((day) => {
        if (!folderIds.includes(Number(day.folder_id)) || Number(day.order) !== dayOrder) {
            return day;
        }

        const newExercise: THevyExercise = {
            index: day.exercises.length + 1,
            title: payload.title ?? "",
            notes: payload.notes ?? "",
            exercise_template_id: payload.exercise_template_id ?? "",
            supersets_id: payload.supersets_id ?? null,
            sets,
            rest_seconds: payload.rest_seconds ?? null,
            ...(payload.reason !== undefined ? { reason: payload.reason } : {}),
        };

        if (exerciseIndex === day.exercises.length) {
            return { ...day, exercises: [...day.exercises, newExercise] };
        }

        const exercises = [...day.exercises];
        exercises.splice(exerciseIndex, 0, newExercise);
        return { ...day, exercises };
    });
}


// --- Day from routine / notes ---

/**
 * Append a day to a week using exercises, title, and notes from an existing routine.
 *
 * Same seven-day cap as addDay.
 *
 * @param program - Current program snapshot.
 * @param routine - Source content (exercises, title, notes) for the new day.
 * @param folder_id - Week index (`folder_id`) to append the day to.
 * @returns Updated program with the new day appended, or the same reference when the week already has seven days.
 */
export function addRoutineAsDay(
    program: THevyRoutine[],
    routine: Pick<THevyRoutine, "exercises" | "title" | "notes">,
    folder_id: number,
): THevyRoutine[] {
    const daysInFolder = program.filter((day) => day.folder_id === folder_id);
    if (daysInFolder.length >= 7) {
        return program;
    }
    const nthDayOrder = daysInFolder.length + 1;
    const maxId = Math.max(...program.map((d) => Number(d.id)));
    const newEmptyDay: THevyRoutine = {
        id: String(maxId + 1),
        folder_id,
        order: String(nthDayOrder),
        exercises: routine.exercises,
        title: routine.title ?? "",
        notes: routine.notes ?? "",
    };
    return [...program, newEmptyDay];
}

/**
 * Replace day-level notes on every matching week/day coordinate.
 *
 * @param program - Current program snapshot.
 * @param folderIds - Week indices (`folder_id` values) to match.
 * @param dayOrder - Day order within each matched week (1-based).
 * @param notes - New day-level notes (replaces existing).
 * @returns Updated program with notes set on all matching days.
 */
export function addDayNotes(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    notes: string,
): THevyRoutine[] {
    return program.map((day) => {
        if (folderIds.includes(Number(day.folder_id)) && Number(day.order) === dayOrder) {
            return { ...day, notes };
        }
        return day;
    });
}

/**
 * Replace notes on one exercise, identified by array index within matching days.
 *
 * @param program - Current program snapshot.
 * @param folderIds - Week indices (`folder_id` values) to match.
 * @param dayOrder - Day order within each matched week (1-based).
 * @param exerciseIndex - Zero-based index into the day's exercises array.
 * @param notes - New exercise notes (replaces existing).
 * @returns Updated program with notes set on the matching exercise.
 */
export function addExerciseNote(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    exerciseIndex: number,
    notes: string,
): THevyRoutine[] {
    return program.map((day) => {
        if (folderIds.includes(Number(day.folder_id)) && Number(day.order) === dayOrder) {
            return {
                ...day,
                exercises: day.exercises.map((exercise, index) =>
                    index === exerciseIndex ? { ...exercise, notes } : exercise,
                ),
            };
        }
        return day;
    });
}


// --- Supersets ---

/**
 * Pick the lowest unused superset id for a day.
 *
 * Scans existing supersets_id values and returns the first gap, or the next
 * integer after the highest id when there are no gaps.
 *
 * @param day - A single day routine whose exercises may already belong to supersets.
 * @returns The next available supersets_id for that day.
 */
export function getNextSupersetId(day: THevyRoutine): number {
    const currentSupersetIds = Array.from(
        new Set(
            day.exercises
                .filter((e) => e.supersets_id !== null)
                .map((e) => e.supersets_id),
        ),
    ).sort((a, b) => (a || 0) - (b || 0));
    let nextId = 0;
    for (const currentId of currentSupersetIds) {
        if (currentId !== nextId) return nextId;
        nextId++;
    }
    return nextId;
}

/**
 * Group two or more exercises on a day into a new superset.
 *
 * Selected indices receive a shared supersets_id allocated by getNextSupersetId.
 *
 * @param program - Current program snapshot.
 * @param dayId - Stable id of the day routine to modify.
 * @param selectedExercises - Zero-based exercise indices to group (minimum two).
 * @returns Updated program, or the same reference when fewer than two exercises are selected.
 */
export function createSuperset(
    program: THevyRoutine[],
    dayId: string,
    selectedExercises: number[],
): THevyRoutine[] {
    if (selectedExercises.length < 2) return program;

    return program.map((routine) => {
        if (routine.id !== dayId) return routine;
        const nextSupersetId = getNextSupersetId(routine);
        return {
            ...routine,
            exercises: routine.exercises.map((exercise, index) =>
                selectedExercises.includes(index)
                    ? { ...exercise, supersets_id: nextSupersetId }
                    : exercise,
            ),
        };
    });
}

/**
 * Detach one exercise from its superset by clearing supersets_id.
 *
 * Other exercises in the same superset are unaffected.
 *
 * @param program - Current program snapshot.
 * @param dayId - Stable id of the day routine containing the exercise.
 * @param exerciseIndex - Zero-based index of the exercise to detach.
 * @returns Updated program with supersets_id cleared on the matching exercise.
 */
export function removeFromSuperset(
    program: THevyRoutine[],
    dayId: string,
    exerciseIndex: number,
): THevyRoutine[] {
    return program.map((routine) => {
        if (routine.id !== dayId) return routine;
        return {
            ...routine,
            exercises: routine.exercises.map((exercise, index) =>
                index === exerciseIndex ? { ...exercise, supersets_id: null } : exercise,
            ),
        };
    });
}


// --- Exercise edit ---

/**
 * Replace an exercise's template, sets, and rest from the add-exercise form.
 *
 * Preserves notes, reason, and superset membership on the existing record.
 * Rebuilds sets from the form via hevyAddExerciseToHevySetsConverter.
 *
 * @param program - Current program snapshot.
 * @param folderIds - Week indices (`folder_id` values) to match.
 * @param dayOrder - Day order within each matched week (1-based).
 * @param exerciseIndex - Zero-based index of the exercise to replace.
 * @param exercise - Add-exercise dialog form state for the replacement.
 * @returns Updated program with the exercise replaced on matching days.
 */
export function editExercise(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    exerciseIndex: number,
    exercise: THevyAddExercise,
): THevyRoutine[] {
    const sets = hevyAddExerciseToHevySetsConverter(exercise);
    return program.map((day) => {
        if (!folderIds.includes(Number(day.folder_id)) || Number(day.order) !== dayOrder) {
            return day;
        }
        return {
            ...day,
            exercises: day.exercises.map((existingExercise, index) =>
                index === exerciseIndex
                    ? {
                          ...existingExercise,
                          index: day.exercises.length + 1,
                          title: exercise?.selectedExercise?.title ?? "",
                          notes: existingExercise?.notes ?? "",
                          reason: existingExercise?.reason ?? "",
                          exercise_template_id: exercise?.selectedExercise?.id ?? "",
                          supersets_id: existingExercise?.supersets_id ?? null,
                          sets,
                          rest_seconds: exercise?.restSeconds ?? null,
                      }
                    : existingExercise,
            ),
        };
    });
}

/**
 * Apply an in-progress edit from THevyDialog state.
 *
 * Resolves week, day, and exercise index from the dialog and delegates to
 * editExercise.
 *
 * @param program - Current program snapshot.
 * @param editExerciseDialog - Dialog state carrying location and form payload.
 * @returns Updated program, or the same reference when editExercise is absent from the dialog.
 */
export function editExerciseFromDialog(
    program: THevyRoutine[],
    editExerciseDialog: THevyDialog,
): THevyRoutine[] {
    if (!editExerciseDialog.editExercise) return program;

    return editExercise(
        program,
        [editExerciseDialog.folder_id],
        editExerciseDialog.dayOrder,
        editExerciseDialog.exerciseIndex ?? 0,
        editExerciseDialog.editExercise,
    );
}


// --- Sets ---

/**
 * Merge partial fields into one set on one exercise.
 *
 * Only the set at setIndex on the exercise at exerciseIndex is updated; other
 * sets and exercises are copied unchanged.
 *
 * @param program - Current program snapshot.
 * @param folderIds - Week indices (`folder_id` values) to match.
 * @param dayOrder - Day order within each matched week (1-based).
 * @param exerciseIndex - Zero-based index of the exercise containing the set.
 * @param setIndex - Zero-based index of the set to update.
 * @param set - Partial set fields to shallow-merge into the existing set.
 * @returns Updated program with the matching set merged on matching days.
 */
export function updateSet(
    program: THevyRoutine[],
    folderIds: number[],
    dayOrder: number,
    exerciseIndex: number,
    setIndex: number,
    set: Partial<THevySets>,
): THevyRoutine[] {
    return program.map((day) => {
        if (!folderIds.includes(Number(day.folder_id)) || Number(day.order) !== dayOrder) {
            return day;
        }
        return {
            ...day,
            exercises: day.exercises.map((exercise, index) => {
                if (index !== exerciseIndex) return exercise;
                return {
                    ...exercise,
                    sets: exercise.sets.map((existingSet, existingSetIndex) =>
                        existingSetIndex === setIndex ? { ...existingSet, ...set } : existingSet,
                    ),
                };
            }),
        };
    });
}


// --- Reorder ---

/**
 * Move a day card within a week after a drag-and-drop operation.
 *
 * The moved day is assigned folder_id of the target week. Pass beforeDayId to
 * insert immediately before that day, or null to place at the end of the week.
 * Normalizes order via reorderHevy.
 *
 * @param program - Current program snapshot.
 * @param folder_id - Target week index (`folder_id`) for the moved day.
 * @param cardId - Stable id of the day routine being moved.
 * @param beforeDayId - Id of the day to insert before, or null to move to the end of the week.
 * @returns Updated program with the day repositioned, or the same reference when the card is missing or dropped onto itself.
 */
export function reorderDayInWeek(
    program: THevyRoutine[],
    folder_id: number,
    cardId: string,
    beforeDayId: string | null,
): THevyRoutine[] {
    const before = beforeDayId ?? "-1";

    if (before === cardId) return program;

    let copy = [...program];

    let cardToTransfer = copy.find((c) => c.id === cardId);
    if (!cardToTransfer) return program;
    cardToTransfer = { ...cardToTransfer, folder_id };

    copy = copy.filter((c) => c.id !== cardId);

    const moveToBack = before === "-1";

    if (moveToBack) {
        copy.push(cardToTransfer);
    } else {
        const insertAtIndex = copy.findIndex((el) => el.id === before);
        if (insertAtIndex === undefined) return program;

        copy.splice(insertAtIndex, 0, cardToTransfer);
    }

    return reorderHevy(copy);
}
