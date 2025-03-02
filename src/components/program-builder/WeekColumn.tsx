import React = require("react");
import { WeeksBar } from "./WeeksBar";
import { Button } from "../ui/button";
import { DayCard } from "./DayCard";
import { Option } from '@/components/ui/multi-select';
import { PlusIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

interface IProps {
    index: number;
    programLength: number;
    handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
    week: TProgramCreatorDay[];
    handleDuplicateDay: (fromWeekIndex: number, fromDayIndex: number, toWeekIndex: number, toDayIndexArray: Option[]) => void;
    handleEditTitle: (currentWeek: number, currentDay: number, day_title: string) => void;
    handleDeleteDay: (currentWeek: number, currentDay: number) => void;
    handleAddExerciseDialog: (addExerciseDialog: TDialog) => void;
    handleGenerateDayDialog: (generateDayDialog: TDialog) => void;
    handleAddDay: (currentWeek: number) => void;
    handleDeleteExercise: (currentWeekIndex: number, currentDay: number, exerciseIndex: number) => void;
    handleIsEditExercise: (isEditExercise: boolean) => void;
}

export const WeekColumn: React.FC<IProps> = (props) => {

    const {
        index,
        programLength,
        handleDuplicateWeek,
        handleDuplicateDay,
        handleEditTitle,
        handleDeleteDay,
        handleAddExerciseDialog,
        handleGenerateDayDialog,
        handleAddDay,
        handleDeleteExercise,
        handleIsEditExercise,
        week,
    } = props;

    return (
        <div className="flex flex-col min-w-[440px] max-w-[440px] gap-4 items-center">
            <WeeksBar
                weekIndex={ index  }
                programLength={ programLength }
                handleDuplicateWeek={ handleDuplicateWeek }
            />
            { week.map((day, idx) => (
                <DayCard
                    key={ uuidv4() }
                    day={ day }
                    handleDuplicateDay={ handleDuplicateDay }
                    handleEditTitle={ handleEditTitle }
                    days={ week.length }
                    handleDeleteDay={ handleDeleteDay }
                    weekIndex={ index }
                    programLength={ programLength }
                    handleAddExerciseDialog={ handleAddExerciseDialog }
                    handleGenerateDayDialog={ handleGenerateDayDialog }
                    handleDeleteExercise={ handleDeleteExercise }
                    handleIsEditExercise={ handleIsEditExercise }
                />
            ) ) }
            <Button
                onClick={ () => handleAddDay(index) }
                className="mb-4 w-44 font-bold uppercase h-12 rounded-lg bg-lightSecondary hover:bg-lightSecondary text-white">
                    <PlusIcon />
                    Add Day
            </Button>
        </div>
    )
}
