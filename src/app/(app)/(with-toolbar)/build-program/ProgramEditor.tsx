"use client";

import { useState, useCallback, memo } from "react";
import { addExerciseFormToInsertPayload } from "@/components/program-builder/mutations/handlers";
import { IOption } from "@/components/ui/multi-select";
import { useProgramMutation } from "@/contexts/ProgramMutationContext";
import { ProgramGrid } from "./ProgramGrid";

interface IProps {
    orderedProgram: THevyRoutine[];
    isMobile: boolean;
}

function ProgramEditorInner(props: IProps) {
    const { orderedProgram, isMobile } = props;
    const { runMutation } = useProgramMutation();

    const [addExerciseDialog, setAddExerciseDialog] = useState<THevyDialog>({ folder_id: 0, dayOrder: 0, isOpen: false });
    const [addNoteDialog, setAddNoteDialog] = useState<THevyDialog>({ folder_id: 0, dayOrder: 0, isOpen: false });
    const [addExerciseNoteDialog, setAddExerciseNoteDialog] = useState<THevyDialog>({ folder_id: 0, dayOrder: 0, isOpen: false });
    const [isEditExercise, setIsEditExercise] = useState(false);
    const [focusedCardId, setFocusedCardId] = useState<string>("");

    const handleIsEditExercise = useCallback((isEditExercise: boolean) => {
        setIsEditExercise(isEditExercise);
    }, []);

    const handleDuplicateWeek = useCallback(
        (fromWeekIndex: number, toWeekIndexes: number[]) => {
            runMutation("duplicate_week", { fromWeekIndex, toWeekIndexes });
        },
        [runMutation],
    );

    const handleDuplicateDay = useCallback(
        (
            fromWeekOrder: number,
            fromDayOrder: number,
            toWeekOrder: number,
            toDayOrderArray: IOption[],
        ) => {
            const toDayOrders = toDayOrderArray.map((day) => Number(day.value)).sort((a, b) => a - b);
            runMutation("duplicate_day", {
                fromWeekIndex: fromWeekOrder,
                fromDayOrder,
                toWeekIndex: toWeekOrder,
                toDayOrders,
            });
        },
        [runMutation],
    );

    const handleOpenAddExerciseDialog = useCallback((addExerciseDialog: THevyDialog) => {
        if (addExerciseDialog.isOpen === false) {
            setIsEditExercise(false);
        }
        setAddExerciseDialog(addExerciseDialog);
    }, []);

    const handleOpenAddNoteDialog = useCallback((addNoteDialog: THevyDialog) => {
        setAddNoteDialog(addNoteDialog);
    }, []);

    const handleOpenAddExerciseNoteDialog = useCallback((addExerciseNoteDialog: THevyDialog) => {
        setAddExerciseNoteDialog(addExerciseNoteDialog);
    }, []);

    const handleAddDay = useCallback(
        (folder_id: number) => {
            runMutation("add_day", { folderIds: [folder_id] });
        },
        [runMutation],
    );

    const handleDeleteDay = useCallback(
        (id: string) => {
            runMutation("delete_day", { dayId: id });
        },
        [runMutation],
    );

    const handleDeleteWeek = useCallback(
        (folder_id: number) => {
            runMutation("delete_week", { folderIds: [folder_id] });
        },
        [runMutation],
    );

    const handleEditTitle = useCallback(
        (id: string, title: string) => {
            const day = orderedProgram.find((routine) => routine.id === id);
            if (!day) return;
            runMutation("edit_day_title", {
                folderIds: [Number(day.folder_id)],
                dayOrder: Number(day.order),
                title,
            });
        },
        [orderedProgram, runMutation],
    );

    const handleDeleteExercise = useCallback(
        (folder_id: number, dayOrder: number, exerciseIndex: number) => {
            runMutation("delete_exercise", {
                folderIds: [folder_id],
                dayOrder,
                exerciseIndex,
            });
        },
        [runMutation],
    );

    const handleAddExercise = useCallback(
        async (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => {
            const day = orderedProgram.find(
                (routine) =>
                    Number(routine.folder_id) === folder_id && Number(routine.order) === dayOrder,
            );
            runMutation("insert_exercise", {
                folderIds: [folder_id],
                dayOrder,
                exerciseIndex: day?.exercises.length ?? 0,
                exercise: addExerciseFormToInsertPayload(exercise),
            });
        },
        [orderedProgram, runMutation],
    );

    const handleAddRoutineAsDay = useCallback(
        (routine: THevyRoutine, folder_id: number) => {
            runMutation("add_routine_as_day", {
                folderIds: [folder_id],
                routine: {
                    exercises: routine.exercises,
                    title: routine.title ?? "",
                    notes: routine.notes ?? "",
                },
            });
        },
        [runMutation],
    );

    const handleAddRoutineNote = useCallback(
        (folder_id: number, dayOrder: number, prompt: string) => {
            runMutation("add_day_notes", {
                folderIds: [folder_id],
                dayOrder,
                notes: prompt,
            });
        },
        [runMutation],
    );

    const handleAddExerciseNote = useCallback(
        (folder_id: number, dayOrder: number, exerciseIndex: number, prompt: string) => {
            runMutation("add_exercise_notes", {
                folderIds: [folder_id],
                dayOrder,
                exerciseIndex,
                notes: prompt,
            });
        },
        [runMutation],
    );

    const handleCreateSuperset = useCallback(
        (dayId: string, selectedExercises: number[]) => {
            runMutation("create_superset", { dayId, exerciseIndexes: selectedExercises });
        },
        [runMutation],
    );

    const handleRemoveFromSuperset = useCallback(
        (dayId: string, exerciseIndex: number) => {
            runMutation("remove_from_superset", { dayId, exerciseIndex });
        },
        [runMutation],
    );

    const handleEditExercise = useCallback(
        (editExerciseDialog: THevyDialog) => {
            if (editExerciseDialog.editExercise) {
                runMutation("edit_exercise", {
                    folderIds: [editExerciseDialog.folder_id],
                    dayOrder: editExerciseDialog.dayOrder,
                    exerciseIndex: editExerciseDialog.exerciseIndex ?? 0,
                    exercise: addExerciseFormToInsertPayload(editExerciseDialog.editExercise),
                });
            }
            setIsEditExercise(false);
        },
        [runMutation],
    );

    return (
        <ProgramGrid
            orderedProgram={orderedProgram}
            isMobile={isMobile}
            addExerciseDialog={addExerciseDialog}
            addNoteDialog={addNoteDialog}
            addExerciseNoteDialog={addExerciseNoteDialog}
            isEditExercise={isEditExercise}
            handleIsEditExercise={handleIsEditExercise}
            handleDuplicateWeek={handleDuplicateWeek}
            handleDeleteWeek={handleDeleteWeek}
            handleDuplicateDay={handleDuplicateDay}
            handleOpenAddExerciseDialog={handleOpenAddExerciseDialog}
            handleOpenAddNoteDialog={handleOpenAddNoteDialog}
            handleOpenAddExerciseNoteDialog={handleOpenAddExerciseNoteDialog}
            handleAddDay={handleAddDay}
            handleDeleteDay={handleDeleteDay}
            handleEditTitle={handleEditTitle}
            handleDeleteExercise={handleDeleteExercise}
            handleAddExercise={handleAddExercise}
            handleAddRoutineAsDay={handleAddRoutineAsDay}
            handleAddRoutineNote={handleAddRoutineNote}
            handleAddExerciseNote={handleAddExerciseNote}
            handleCreateSuperset={handleCreateSuperset}
            handleRemoveFromSuperset={handleRemoveFromSuperset}
            handleEditExercise={handleEditExercise}
            focusedCardId={focusedCardId}
            setFocusedCardId={setFocusedCardId}
        />
    );
}

export const ProgramEditor = memo(ProgramEditorInner);
