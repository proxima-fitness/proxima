"use client";

import { Button } from "@/components/ui/button";
import { DayCard } from "./DayCard";
import { WeeksBar } from "./WeeksBar";
import { PlusIcon } from "lucide-react";
import { exampleProximaProgram } from "@/assets/constants";
import { useCallback, useState } from "react";
import { toast } from "sonner"
import { AddExerciseDialog } from "./AddExerciseDialog";

interface IProps {
    program: TProgramCreatorDay[][];
}

export const ProximaProgram: React.FC<IProps> = (props) => {

    const {
        program,
    } = props;


    const [newProgram, setNewProgram] = useState<TProgramCreatorDay[][]>(program);
    const [addExerciseDialog, setAddExerciseDialog] = useState<TAddExerciseDialog>({currentWeek: undefined, currentDay: undefined, isOpen: false});
    // const handleDuplicateWeek = (currentWeek: number, duplicatedToWeeks: number[], newProgram: TProgramCreatorDay[][]) => {

    // };

    // const handleDuplicateDay = (currentDay: number, duplicatedToDays: number[], duplicatedToWeek: number[], newProgram: TProgramCreatorDay[][]) => {

    // };

    // State for opening the Add Exercise Dialog with the correct week and day
    const handleAddExerciseDialog= (addExerciseDialog: TAddExerciseDialog) => {
        setAddExerciseDialog(addExerciseDialog);
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

        console.log("Entered Handle Add Exercise week: day:", currentWeek, currentDay);
        console.log("exercise:", exercise);
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
                            <WeeksBar weekIndex={ index  } programLength={ exampleProximaProgram.length } />
                            { week.map((day, idx) => (
                                <DayCard key={ day.order } day={ day } handleEditTitle={ handleEditTitle } days={ week.length } handleDeleteDay={ handleDeleteDay } weekIndex={ index } programLength={ exampleProximaProgram.length } handleAddExerciseDialog={ handleAddExerciseDialog } />
                            ) ) }
                            <Button onClick={ () => handleAddDay(index) } className="mb-4 w-44 font-bold uppercase h-12 rounded-[40px] bg-lightSecondary hover:bg-lightSecondary text-white"><PlusIcon />Add Day</Button>
                        </div>
                    )
                } ) }
            </div>
            <AddExerciseDialog addExerciseDialog={ addExerciseDialog } handleAddExercise={ handleAddExercise } handleAddExerciseDialog={ handleAddExerciseDialog } />
        </>
    );
};
