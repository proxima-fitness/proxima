"use client";

import { useState, useCallback, memo } from "react";
import {
    addExercise,
    addExerciseNote,
    addRoutineAsDay,
    createSuperset,
    deleteExercise,
    duplicateDay,
    duplicateWeek,
    editExerciseFromDialog,
    getNextSupersetId,
    removeFromSuperset,
} from "@/components/program-builder/mutations/handlers";
import { IOption } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { useProgramMutation } from "@/contexts/ProgramMutationContext";
import { ProgramGrid } from "./ProgramGrid";

interface IProps {
    orderedProgram: THevyRoutine[];
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    isMobile: boolean;
}

function ProgramEditorInner(props: IProps) {
    const { orderedProgram, setHevyProgram, isMobile } = props;
    const { runMutation } = useProgramMutation();

    const [addExerciseDialog, setAddExerciseDialog] = useState<THevyDialog>({ folder_id: 0, dayOrder: 0, isOpen: false });
    const [addNoteDialog, setAddNoteDialog] = useState<THevyDialog>({ folder_id: 0, dayOrder: 0, isOpen: false });
    const [addExerciseNoteDialog, setAddExerciseNoteDialog] = useState<THevyDialog>({ folder_id: 0, dayOrder: 0, isOpen: false });
    const [isEditExercise, setIsEditExercise] = useState(false);
    const [focusedCardId, setFocusedCardId] = useState<string>("");

    const handleIsEditExercise = useCallback((isEditExercise: boolean) => {
        setIsEditExercise(isEditExercise);
    }, []);

    const handleDuplicateWeek = useCallback((fromWeekIndex: number, toWeekIndexes: number[]) => {
        setHevyProgram((prev) => duplicateWeek(prev, fromWeekIndex, toWeekIndexes));
    }, [setHevyProgram]);

    const handleDuplicateDay = useCallback((
        fromWeekOrder: number,
        fromDayOrder: number,
        toWeekOrder: number,
        toDayOrderArray: IOption[],
    ) => {
        const toDayOrders = toDayOrderArray.map((day) => Number(day.value)).sort((a, b) => a - b);
        setHevyProgram((prev) =>
            duplicateDay(prev, fromWeekOrder, fromDayOrder, toWeekOrder, toDayOrders),
        );
    }, [setHevyProgram]);

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

    const handleDeleteExercise = useCallback((folder_id: number, dayOrder: number, exerciseIndex: number) => {
        setHevyProgram((prev) => deleteExercise(prev, [folder_id], dayOrder, exerciseIndex));
    }, [setHevyProgram]);

    const handleAddExercise = useCallback(async (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => {
        setHevyProgram((prev) => addExercise(prev, [folder_id], dayOrder, exercise));
    }, [setHevyProgram]);

    const handleAddRoutineAsDay = useCallback((routine: THevyRoutine, folder_id: number) => {
        setHevyProgram((prev) => {
            const next = addRoutineAsDay(prev, routine, folder_id);
            if (next === prev) {
                toast.error("Maximum 7 days per week");
            }
            return next;
        });
    }, [setHevyProgram]);

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

    const handleAddExerciseNote = useCallback((
        folder_id: number,
        dayOrder: number,
        exerciseIndex: number,
        prompt: string,
    ) => {
        setHevyProgram((prev) => addExerciseNote(prev, [folder_id], dayOrder, exerciseIndex, prompt));
    }, [setHevyProgram]);

    const handleCreateSuperset = useCallback((dayId: string, selectedExercises: number[]) => {
        setHevyProgram((prev) => createSuperset(prev, dayId, selectedExercises));
    }, [setHevyProgram]);

    const handleRemoveFromSuperset = useCallback((dayId: string, exerciseIndex: number) => {
        setHevyProgram((prev) => removeFromSuperset(prev, dayId, exerciseIndex));
    }, [setHevyProgram]);

    const handleEditExercise = useCallback((editExercise: THevyDialog) => {
        if (editExercise.editExercise) {
            setHevyProgram((prev) => editExerciseFromDialog(prev, editExercise));
        }
        setIsEditExercise(false);
    }, [setHevyProgram]);

    return (
        <ProgramGrid
            orderedProgram={orderedProgram}
            setHevyProgram={setHevyProgram}
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
            getNextSupersetId={getNextSupersetId}
            handleCreateSuperset={handleCreateSuperset}
            handleRemoveFromSuperset={handleRemoveFromSuperset}
            handleEditExercise={handleEditExercise}
            focusedCardId={focusedCardId}
            setFocusedCardId={setFocusedCardId}
        />
    );
}

export const ProgramEditor = memo(ProgramEditorInner);
