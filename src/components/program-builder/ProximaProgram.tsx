"use client";

import { exampleProximaProgram } from "@/assets/constants";
import { useState } from "react";
import { toast } from "sonner"
import { AddExerciseDialog } from "./AddExerciseDialog";
import { Option } from "@/components/ui/multi-select";
import { GenerateDayDialog } from "./GenerateDayDialog";
import { WeekColumn } from "./WeekColumn";
import { v4 as uuidv4 } from "uuid";

interface IProps {
    program: TProgramCreatorDay[][];
}

export const ProximaProgram: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;

    const [newProgram, setNewProgram] = useState<TProgramCreatorDay[][]>(program);
    const [addExerciseDialog, setAddExerciseDialog] = useState<TDialog>({currentWeek: undefined, currentDay: undefined, isOpen: false});
    const [generateDayDialog, setGenerateDayDialog] = useState<TDialog>({currentWeek: undefined, currentDay: undefined, isOpen: false});

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
        const tmpProgram = [...newProgram];
        const toDayIndexes = toDayIndexArray.map((day) => Number(day.value) - 1);

        for (let i = 0; i < toDayIndexes.length; i++) {
            if (tmpProgram[toWeekIndex][toDayIndexes[i]]) {
                tmpProgram[toWeekIndex][toDayIndexes[i]].exercises = [...(tmpProgram[fromWeekIndex][fromDayIndex].exercises || [])];
            } else {
                const toWeekLength = newProgram[toWeekIndex].length;
                if (toWeekLength === 7) {
                    return;
                }
                const newEmptyDay: TProgramCreatorDay = {
                    order: String(toWeekLength + 1),
                    exercises: [...(tmpProgram[fromWeekIndex][fromDayIndex].exercises || [])],
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
            toast("You can only add up to 7 days per week");
            return;
        }
        const newEmptyDay: TProgramCreatorDay = {
            order: String(currentWeekLength + 1),
            exercises: [],
        }
        const tmpProgram = [...newProgram];
        tmpProgram[currentWeek].push(newEmptyDay);
        setNewProgram(tmpProgram);

        return;
    };

    // Deletes selected day from selected week
    const handleDeleteDay = (currentWeek: number, currentDay: number) => {
        const tmpProgram = [...newProgram];

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
        const tmpProgram = [...newProgram];

        if (tmpProgram[currentWeekIndex][currentDay - 1].exercises.length === 10) {
            toast.error("Maximum 10 Exercises per day");
            return;
        }
        tmpProgram[currentWeekIndex][currentDay - 1].exercises.push(exercise);
        setNewProgram(tmpProgram);
        return;
    };

    const handleEditTitle = (currentWeek: number, currentDay: number, day_title: string) => {
        const tmpProgram = [...newProgram];
        tmpProgram[currentWeek][currentDay - 1].day_title = day_title;
        setNewProgram(tmpProgram);
    };

    return (
        <>
            <div className="flex flex-row gap-4">
                { newProgram.map((week, index) => {
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
                        />

                    )
                } ) }
            </div>
            <AddExerciseDialog addExerciseDialog={ addExerciseDialog } handleAddExercise={ handleAddExercise } handleAddExerciseDialog={ handleAddExerciseDialog } />
            <GenerateDayDialog handleGenerateDay={ handleGenerateDay } generateDayDialog={ generateDayDialog } handleGenerateDayDialog={ handleGenerateDayDialog } />
        </>
    );
};
