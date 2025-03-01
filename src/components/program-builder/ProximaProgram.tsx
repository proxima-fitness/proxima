"use client";

import { Button } from "@/components/ui/button";
import { DayCard } from "./DayCard";
import { WeeksBar } from "./WeeksBar";
import { PlusIcon } from "lucide-react";
import { exampleProximaProgram } from "@/assets/constants";
import { useCallback, useState } from "react";
import { toast } from "sonner"
import { AddExerciseDialog } from "./AddExerciseDialog";
import { Option } from "@/components/ui/multi-select";
import { GenerateDayDialog } from "./GenerateDayDialog";


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
        const tmpProgram = [...newProgram];
        for (let i = 0; i < toWeekIndexes.length; i++) {
            tmpProgram[Number(toWeekIndexes[i])] = tmpProgram[fromWeekIndex];
        }
        setNewProgram(tmpProgram);
        return;
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

        return;
    };

    // Adds an exercise to the workout day
    const handleAddExercise = (currentWeek: number, currentDay: number, exercise: TProgramCreatorExercise) => {

        // console.log("Entered Handle Add Exercise week: day:", currentWeek, currentDay);
        // console.log("exercise:", exercise);
        // construct a TProgramCreatorExercise and add it to newProgram
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
                        <div key={ index } className="flex flex-col min-w-[440px] max-w-[440px] gap-4 items-center">
                            <WeeksBar
                                weekIndex={ index  }
                                programLength={ exampleProximaProgram.length }
                                handleDuplicateWeek={ handleDuplicateWeek }
                            />
                            { week.map((day, idx) => (
                                <DayCard
                                    key={ day.order }
                                    day={ day }
                                    handleDuplicateDay={ handleDuplicateDay }
                                    handleEditTitle={ handleEditTitle }
                                    days={ week.length }
                                    handleDeleteDay={ handleDeleteDay }
                                    weekIndex={ index }
                                    programLength={ exampleProximaProgram.length }
                                    handleAddExerciseDialog={ handleAddExerciseDialog }
                                    handleGenerateDayDialog={ handleGenerateDayDialog }
                                />
                            ) ) }
                            <Button onClick={ () => handleAddDay(index) } className="mb-4 w-44 font-bold uppercase h-12 rounded-lg bg-lightSecondary hover:bg-lightSecondary text-white"><PlusIcon />Add Day</Button>
                        </div>
                    )
                } ) }
            </div>
            <AddExerciseDialog addExerciseDialog={ addExerciseDialog } handleAddExercise={ handleAddExercise } handleAddExerciseDialog={ handleAddExerciseDialog } />
            <GenerateDayDialog handleGenerateDay={ handleGenerateDay } generateDayDialog={ generateDayDialog } handleGenerateDayDialog={ handleGenerateDayDialog } />
        </>
    );
};
