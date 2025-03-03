"use client";

import { exampleProximaProgram } from "@/assets/constants";
import { useState } from "react";
import { toast } from "sonner"
import { AddExerciseDialog } from "./AddExerciseDialog";
import { Option } from "@/components/ui/multi-select";
import { GenerateDayDialog } from "./GenerateDayDialog";
import { WeekColumn } from "./WeekColumn";
import { v4 as uuidv4 } from "uuid";
import { addExerciseToProgramCreatorExerciseConverter } from "@/utils/helpers";
import { useExercises } from "@/api/hooks";
import { rectSortingStrategy } from "@dnd-kit/sortable";
import { MultipleContainers } from "../generic/MultipleContainers";

interface IProps {
    program: TProgramCreatorDay[][];
}

export const ProximaProgram: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    const { data: exercises }  = useExercises();

    const [newProgram, setNewProgram] = useState<TProgramCreatorDay[][]>(program);
    const [addExerciseDialog, setAddExerciseDialog] = useState<TDialog>({currentWeek: undefined, currentDay: undefined, isOpen: false});
    const [generateDayDialog, setGenerateDayDialog] = useState<TDialog>({currentWeek: undefined, currentDay: undefined, isOpen: false});
    const [isEditExercise, setIsEditExercise] = useState(false);

    const handleIsEditExercise = (isEditExercise: boolean) => {
        setIsEditExercise(isEditExercise);
    };

    // Duplicates a whole week to another week within the program
    const handleDuplicateWeek = (fromWeekIndex: number, toWeekIndexes: number[]) => {
        setNewProgram((prevProgram) => {
            return prevProgram.map((week, idx) => {
                if (toWeekIndexes.includes(idx)) {
                    return JSON.parse(JSON.stringify(prevProgram[fromWeekIndex])); // Deep copy to prevent reference issues
                }
                return week;
            });
        });
    };

    // Duplicates the selected day to other days in the program on the selected week
    const handleDuplicateDay = (fromWeekIndex: number, fromDayIndex: number, toWeekIndex: number, toDayIndexArray: Option[] ) => {
        const tmpProgram = structuredClone(newProgram);
        const toWeekLength = tmpProgram[toWeekIndex].length;

        const toDayIndexes = toDayIndexArray.map((day) => Number(day.value) - 1).sort((a, b) => a - b);
        const lastSelectedDayIndex = toDayIndexes[toDayIndexes.length-1];

        for (let i = toWeekLength; i <= lastSelectedDayIndex; i++) {
            if (toWeekLength === 7) {
                return;
            }

            if (toDayIndexes.includes(i)) {
                const duplicatedDay: TProgramCreatorDay = {
                    order: String(i + 1),
                    exercises: [...(tmpProgram[fromWeekIndex][fromDayIndex].exercises || [])],
                }
                tmpProgram[toWeekIndex].push(duplicatedDay);
            } else {
                const newEmptyDay: TProgramCreatorDay = {
                    order: String(i + 1),
                    exercises: [],
                }
                tmpProgram[toWeekIndex].push(newEmptyDay);
            }
        };

        setNewProgram(tmpProgram);
        return;
    };

    // State for opening the Add Exercise Dialog with the correct week and day
    const handleAddExerciseDialog = (addExerciseDialog: TDialog) => {
        setAddExerciseDialog(addExerciseDialog);
    };

    // State for opening the Generate Day Dialog with the correct week and day
    const handleGenerateDayDialog = (generateDayDialog: TDialog) => {
        setGenerateDayDialog(generateDayDialog);
    };

    const handleGenerateDay = (currentWeekIndex: number, currentDayIndex:number, prompt: string) => {
        // Do AI re-generation of a day here
    };

    // Adds an empty day to the selected week
    const handleAddDay = (currentWeek: number) => {

        const currentWeekLength = newProgram[currentWeek].length;
        if (currentWeekLength === 7) {
            toast.error("You can only add up to 7 days per week");
            return;
        }
        const newEmptyDay: TProgramCreatorDay = {
            order: String(currentWeekLength + 1),
            exercises: [],
        }
        const tmpProgram = structuredClone(newProgram);
        tmpProgram[currentWeek].push(newEmptyDay);
        setNewProgram(tmpProgram);

        return;
    };

    // Deletes selected day from selected week
    const handleDeleteDay = (currentWeek: number, currentDay: number) => {
        const tmpProgram = structuredClone(newProgram);

        tmpProgram[currentWeek] = tmpProgram[currentWeek].filter((day: { order: string; }) => Number(day.order) !== currentDay)
        .map((day, index) => ({
            ...day,
            order: (index + 1).toString(),
        }));

        setNewProgram(tmpProgram);
        toast.error("Day deleted");
        return;
    };

    // Adds an exercise to the workout day
    const handleAddExercise = (currentWeekIndex: number, currentDay: number, exercise: TProgramCreatorExercise) => {
        const tmpProgram = structuredClone(newProgram);

        if (tmpProgram[currentWeekIndex][currentDay - 1].exercises.length === 10) {
            toast.error("Maximum 10 Exercises per day");
            return;
        }
        tmpProgram[currentWeekIndex][currentDay - 1].exercises.push(exercise);
        setNewProgram(tmpProgram);
        return;
    };

    const handleEditTitle = (currentWeek: number, currentDay: number, day_title: string) => {
        const tmpProgram = structuredClone(newProgram);
        tmpProgram[currentWeek][currentDay - 1].day_title = day_title;
        setNewProgram(tmpProgram);
    };

    const handleDeleteExercise = (currentWeekIndex: number, currentDay: number, exerciseIndex: number) => {
        const tmpProgram = structuredClone(newProgram);

        tmpProgram[currentWeekIndex][currentDay - 1].exercises = tmpProgram[currentWeekIndex][currentDay - 1].exercises.filter(
            (_, index) => index !== exerciseIndex
        );

        setNewProgram(tmpProgram);
    };

    const handleEditExercise = async (editExercise: TDialog) => {
        const tmpProgram = structuredClone(newProgram);
        const convertedEditExercise = await addExerciseToProgramCreatorExerciseConverter(editExercise.editExercise);
        tmpProgram[editExercise.currentWeek][editExercise.currentDay - 1].exercises[editExercise.exerciseIndex] = convertedEditExercise;
        setNewProgram(tmpProgram);
        setIsEditExercise(false);
        return;
    };

    return (
        <>
            <div className="flex flex-row gap-4">
                {/* { newProgram.map((week, index) => {
                    return (
                        <WeekColumn
                            key={ uuidv4() }
                            index={ index }
                            programLength={ exampleProximaProgram.length }
                            handleDuplicateWeek={ handleDuplicateWeek }
                            week={ week }
                            handleDuplicateDay={ handleDuplicateDay }
                            handleEditTitle={ handleEditTitle }
                            handleDeleteDay={ handleDeleteDay }
                            handleAddExerciseDialog={ handleAddExerciseDialog }
                            handleGenerateDayDialog={ handleGenerateDayDialog }
                            handleAddDay={ handleAddDay }
                            handleDeleteExercise={ handleDeleteExercise }
                            handleIsEditExercise={ handleIsEditExercise }
                        />

                    )
                } ) } */}
                <MultipleContainers
                    itemCount={5}
                    strategy={rectSortingStrategy}
                    vertical={ false }
                />
            </div>
            { addExerciseDialog.isOpen &&
                <AddExerciseDialog
                    addExerciseDialog={ addExerciseDialog }
                    isEditExercise={ isEditExercise }
                    handleEditExercise={ handleEditExercise }
                    handleAddExercise={ handleAddExercise }
                    handleAddExerciseDialog={ handleAddExerciseDialog }
                />
            }
            <GenerateDayDialog
                handleGenerateDay={ handleGenerateDay }
                generateDayDialog={ generateDayDialog }
                handleGenerateDayDialog={ handleGenerateDayDialog }
            />
        </>
    );
};
