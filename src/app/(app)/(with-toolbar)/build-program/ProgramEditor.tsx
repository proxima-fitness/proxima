"use client";

import { useState, useCallback, memo } from "react";
import {
    addDay,
    addDayNotes,
    addExercise,
    addExerciseNote,
    addRoutineAsDay,
    createSuperset,
    deleteDay,
    deleteExercise,
    deleteWeek,
    duplicateDay,
    duplicateWeek,
    editExerciseFromDialog,
    editTitle,
    getNextSupersetId,
    removeFromSuperset,
} from "@/components/program-builder/mutations/handlers";
import { IOption } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { ProgramGrid } from "./ProgramGrid";

interface IProps {
    orderedProgram: THevyRoutine[];
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    isMobile: boolean;
}

function ProgramEditorInner(props: IProps) {
    const { orderedProgram, setHevyProgram, isMobile } = props;

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

    const handleAddDay = useCallback((folder_id: number) => {
        setHevyProgram((prev) => {
            const next = addDay(prev, folder_id);
            if (next === prev) {
                toast.error("Maximum 7 days per week");
            }
            return next;
        });
    }, [setHevyProgram]);

    const handleDeleteDay = useCallback((id: string) => {
        setHevyProgram((prev) => deleteDay(prev, id));
    }, [setHevyProgram]);

    const handleDeleteWeek = useCallback((folder_id: number) => {
        setHevyProgram((prev) => deleteWeek(prev, folder_id));
    }, [setHevyProgram]);

    const handleEditTitle = useCallback((id: string, title: string) => {
        setHevyProgram((prev) => editTitle(prev, id, title));
    }, [setHevyProgram]);

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

    const handleAddRoutineNote = useCallback((folder_id: number, dayOrder: number, prompt: string) => {
        setHevyProgram((prev) => addDayNotes(prev, [folder_id], dayOrder, prompt));
    }, [setHevyProgram]);

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
