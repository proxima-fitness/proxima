"use client";

/**
 * Program routine view: builds props for HevyRoutine and conditionally renders
 * HevyRoutine or BuildProgramSkeleton. Extracted from BuildProgram to own
 * routine view wiring and limit re-renders via memo.
 */

import { memo, useMemo } from "react";
import { HevyRoutine } from "@/components/program-builder/hevy/HevyRoutine";
import { BuildProgramSkeleton } from "@/components/program-builder/shared/BuildProgramSkeleton";
import { getNumberRoutineFolders } from "@/components/program-builder/utils";
import type { IOption } from "@/components/ui/multi-select";

export interface IProps {
    orderedProgram: THevyRoutine[];
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    isMobile: boolean;
    addExerciseDialog: THevyDialog;
    addNoteDialog: THevyDialog;
    addExerciseNoteDialog: THevyDialog;
    isEditExercise: boolean;
    handleIsEditExercise: (isEditExercise: boolean) => void;
    handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
    handleDuplicateDay: (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayIndexArray: IOption[]) => void;
    handleOpenAddExerciseDialog: (addExerciseDialog: THevyDialog) => void;
    handleOpenAddNoteDialog: (addNoteDialog: THevyDialog) => void;
    handleOpenAddExerciseNoteDialog: (addExerciseNoteDialog: THevyDialog) => void;
    handleAddDay: (folder_id: number) => void;
    handleDeleteDay: (id: string) => void;
    handleEditTitle: (id: string, title: string) => void;
    handleDeleteExercise: (folder_id: number, dayOrder: number, exerciseIndex: number) => void;
    handleAddExercise: (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => Promise<void>;
    handleAddRoutineAsDay: (routine: THevyRoutine, folder_id: number) => void;
    handleAddRoutineNote: (folder_id: number, dayOrder: number, prompt: string) => void;
    handleAddExerciseNote: (folder_id: number, dayOrder: number, exerciseIndex: number, prompt: string) => void;
    getNextSupersetId: (day: THevyRoutine) => number;
    handleCreateSuperset: (dayId: string, selectedExercises: number[]) => void;
    handleRemoveFromSuperset: (dayId: string, exerciseIndex: number) => void;
    handleEditExercise: (editExercise: THevyDialog) => void;
    focusedCardId: string;
    setFocusedCardId: (focusedCardId: string) => void;
}

function ProgramGridInner({
    orderedProgram,
    setHevyProgram,
    isMobile,
    addExerciseDialog,
    addNoteDialog,
    addExerciseNoteDialog,
    isEditExercise,
    handleIsEditExercise,
    handleDuplicateWeek,
    handleDuplicateDay,
    handleOpenAddExerciseDialog,
    handleOpenAddNoteDialog,
    handleOpenAddExerciseNoteDialog,
    handleAddDay,
    handleDeleteDay,
    handleEditTitle,
    handleDeleteExercise,
    handleAddExercise,
    handleAddRoutineAsDay,
    handleAddRoutineNote,
    handleAddExerciseNote,
    getNextSupersetId,
    handleCreateSuperset,
    handleRemoveFromSuperset,
    handleEditExercise,
    focusedCardId,
    setFocusedCardId,
}: IProps) {
    const numberOfWeeks = useMemo(
        () => getNumberRoutineFolders(orderedProgram),
        [orderedProgram]
    );
    const numberOfWeeksArr = useMemo(
        () => Array.from({ length: numberOfWeeks }, (_, i) => i),
        [numberOfWeeks]
    );

    const routineProps = useMemo(
        () => ({
            hevyProgram: orderedProgram,
            setHevyProgram,
            isMobile,
            addExerciseDialog,
            addNoteDialog,
            addExerciseNoteDialog,
            isEditExercise,
            handleIsEditExercise,
            handleDuplicateWeek,
            handleDuplicateDay,
            handleOpenAddExerciseDialog,
            handleOpenAddNoteDialog,
            handleOpenAddExerciseNoteDialog,
            handleAddDay,
            handleDeleteDay,
            handleEditTitle,
            handleDeleteExercise,
            handleAddExercise,
            handleAddRoutineAsDay,
            handleAddRoutineNote,
            handleAddExerciseNote,
            getNextSupersetId,
            handleCreateSuperset,
            handleRemoveFromSuperset,
            handleEditExercise,
            focusedCardId,
            setFocusedCardId,
            numberOfWeeks,
            numberOfWeeksArr,
        }),
        [
            orderedProgram,
            setHevyProgram,
            isMobile,
            addExerciseDialog,
            addNoteDialog,
            addExerciseNoteDialog,
            isEditExercise,
            handleIsEditExercise,
            handleDuplicateWeek,
            handleDuplicateDay,
            handleOpenAddExerciseDialog,
            handleOpenAddNoteDialog,
            handleOpenAddExerciseNoteDialog,
            handleAddDay,
            handleDeleteDay,
            handleEditTitle,
            handleDeleteExercise,
            handleAddExercise,
            handleAddRoutineAsDay,
            handleAddRoutineNote,
            handleAddExerciseNote,
            getNextSupersetId,
            handleCreateSuperset,
            handleRemoveFromSuperset,
            handleEditExercise,
            focusedCardId,
            setFocusedCardId,
            numberOfWeeks,
            numberOfWeeksArr,
        ]
    );

    return orderedProgram.length > 0 ? (
        <HevyRoutine {...routineProps} />
    ) : (
        <BuildProgramSkeleton />
    );
}

export const ProgramGrid = memo(ProgramGridInner);
