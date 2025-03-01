"use client";

import { Card } from "@/components/ui/card";
import { EllipsisIcon, CopyIcon, PlusIcon } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "../ui/button";
import { DuplicateDay } from "./DuplicateDay";
import { useState } from "react";
import { Option } from "@/components/ui/multi-select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";
import { ExerciseGif } from "../generic/ExerciseGif";
import { Input } from "../ui/input";


interface IProps {
    day: TProgramCreatorDay;
    days: number;
    weekIndex: number;
    programLength: number;
    handleEditTitle: (currentWeek: number, currentDay: number, day_title: string) => void;
    handleDeleteDay: (currentWeek: number, currentDay: number) => void;
    handleAddExerciseDialog: (addExercise: TDialog) => void;
    handleDuplicateDay: (currentWeek: number, currentDay: number, duplicatedToWeek: number, duplicatedToDays: Option[]) => void;
    handleGenerateDayDialog: (generateDayDialog: TDialog) => void;
}

export const DayCard: React.FC<IProps> = (props) => {

    const {
        day,
        days,
        weekIndex,
        programLength,
        handleDeleteDay,
        handleEditTitle,
        handleAddExerciseDialog,
        handleDuplicateDay,
        handleGenerateDayDialog,
    } = props;

    const [duplicateDayOpen, setDuplicateDayOpen] = useState(false);
    const [editTitleOpen, setEditTitleOpen] = useState(false);
    const [currentTitle, setCurrentTitle] = useState(day.day_title ?? "");

    const handleDuplicateDayOpen = (day: number, duplicateDayOpen: boolean) => {
        setDuplicateDayOpen(duplicateDayOpen);
    };

    const handleEditExercise  = (day: TProgramCreatorDay, exercise: TProgramCreatorExercise) => {
        // implement this
    };

    return (
        <>

        <Card className="group py-4 px-4 min-w-[440px] max-w-[440px] bg-lightGray">
            <div className="flex flex-row justify-between items-center">
                <div className="font-main text-xl flex flex-row gap-4">
                    Day {day.order}
                </div>
                <div className="font-secondary text-xl">
                    { editTitleOpen ?
                        <Input
                            value={ currentTitle }
                            onInput={ (event) => setCurrentTitle(String(event.currentTarget.value) ?? "") }
                            onBlur={ (event) => {
                                handleEditTitle(weekIndex, Number(day.order), String(event.currentTarget.value));
                                setEditTitleOpen(false);
                            } }
                            onKeyDown={ (e) => {
                                if (e.key === 'Enter') {
                                    handleEditTitle(weekIndex, Number(day.order), e.currentTarget.value);
                                    setEditTitleOpen(false);
                                }
                            } }
                            autoFocus
                        />
                        :
                        <>
                            {day.day_title}
                        </>
                    }
                </div>
                <div className="flex flex-row gap-4">
                    <DropdownMenu>
                        <DropdownMenuTrigger
                            className="cursor-pointer group-hover:opacity-100 group-active:opacity-100 group-hover:pointer-events-auto group-active:pointer-events-auto opacity-0 pointer-events-none"
                            asChild
                        >
                            <EllipsisIcon />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="bottom">
                            <DropdownMenuItem className="cursor-pointer" onClick={ () => handleDeleteDay(weekIndex, Number(day.order))}>
                                Delete
                                <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={ () => setEditTitleOpen(true)} className="cursor-pointer">
                                Edit Title
                                <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={ () => handleGenerateDayDialog({ currentWeek: weekIndex, currentDay: Number(day.order), isOpen: true }) } className="cursor-pointer">
                                Generate Day
                                <DropdownMenuShortcut>⌘G</DropdownMenuShortcut>
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger
                                className="cursor-pointer group-hover:opacity-100 group-active:opacity-100 group-hover:pointer-events-auto group-active:pointer-events-auto opacity-0 pointer-events-none"
                            >
                                <div onClick={ () => setDuplicateDayOpen(true) }>
                                    <CopyIcon />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                <p>Duplicate Day</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
            <div className="text-sm flex flex-row justify-between mt-4 gap-4 border-t-2 border-b-2 py-2 border-gray-200">
                <div className="flex flex-row gap-4 max-w-[50%]">
                    <div>
                        #
                    </div>
                    <div>
                        Exercise
                    </div>
                </div>
                <div className="flex flex-row justify-center items-center gap-4 max-w-[50%] w-[50%]">
                    <div className="flex flex-row justify-end items-center min-w-[33%]">
                        Sets
                    </div>
                    <div className="flex flex-row justify-center items-center min-w-[33%]">
                        Reps
                    </div>
                    <div className=" flex flex-row justify-start items-center min-w-[33%]">
                        Intensity
                    </div>
                </div>
            </div>
            <div>
            { day?.exercises?.map((exercise : TProgramCreatorExercise, i: number) => (
                    <div key={ "Week" + (weekIndex + 1) + "Day" + i } className="flex flex-row justify-between items-center text-sm border-b-2 py-2 border-gray-200"onClick={ () => handleEditExercise(day, exercise) }>
                        <div className="flex flex-row gap-2 items-center justify-start max-w-[50%]">
                            <div className="text-lightSecondary pr-1">
                            { i + 1}
                            </div>
                            <ExerciseGif thumbnailOrImage={ "thmb" } name={ exercise.exercise?.name_english } gif_id={ exercise.exercise?.gif_id ?? "" } resolution={ "180" } file_type={ 'jpg' } />
                            <div>{ exercise.exercise?.name_english }</div>
                        </div>
                        <div className="text-center flex flex-row items-center justify-end max-w-[50%] w-[50%] h-full">
                            <div className="min-w-[33%] flex flex-col justify-center items-center">
                                { exercise.reps_type?.reps && (
                                    exercise.reps_type.reps.every((reps, i, arr) => reps === arr[0]) ? (
                                        `${exercise.sets}`
                                    ) : (
                                        Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                            <div key={ index }>{index + 1}</div>
                                        ))
                                    )
                                    )}
                                { exercise.reps_type?.reps_max && (
                                    exercise.reps_type.reps_max.every((reps, i, arr) => reps === arr[0]) ? (
                                        `${exercise.sets}`
                                    ) : (
                                        Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                            <div key={ index }>{index + 1}</div>
                                        ))
                                    )
                                )}
                                { exercise.reps_type?.time_taken && (
                                    exercise.reps_type.time_taken.every((reps, i, arr) => reps === arr[0]) ? (
                                        `${exercise.sets}`
                                    ) : (
                                        Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                            <div key={ index }>{index + 1}</div>
                                        ))
                                    )
                                )}
                                { exercise.reps_type?.amrap && (
                                    exercise.reps_type.amrap.every((reps, i, arr) => reps === arr[0]) ? (
                                        `${exercise.sets}`
                                    ) : (
                                        Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                            <div key={ index }>{index + 1}</div>
                                        ))
                                    )
                                    )}
                                { exercise.reps_type?.time_range && (
                                    exercise.reps_type.time_range.every((reps, i, arr) => reps === arr[0]) ? (
                                        `${exercise.sets}`
                                    ) : (
                                        Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                            <div key={ index }>{index + 1}</div>
                                        ))
                                    )
                                )}
                                { exercise.reps_type?.reps_range && (
                                    exercise.reps_type.reps_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                        `${exercise.sets}`
                                    ) : (
                                        Array.from({ length: exercise.sets || 0 }, (_, index) => (
                                            <div key={ index }>{index + 1}</div>
                                        ))
                                    )
                                )}
                            </div>
                            <div className="min-w-[33%] flex flex-row justify-center items-center">
                                { exercise.reps_type?.amrap && "AMRAP" }
                                { exercise.reps_type?.reps && (
                                    exercise.reps_type.reps.every((reps, i, arr) => reps === arr[0]) ? (
                                        <div>{exercise.reps_type.reps[0]}</div>
                                    ) : (
                                        exercise.reps_type.reps.map((repsNumber, index) => (
                                            <div key={ index }>{ repsNumber }</div>
                                        ))
                                    )
                                )}
                                { exercise.reps_type?.reps_max && (
                                    exercise.reps_type.reps_max.every((reps, i, arr) => reps === arr[0]) ? (
                                        <div>{">"} {exercise.reps_type.reps_max[0]}</div>
                                    ) : (
                                        exercise.reps_type.reps_max.map((repsNumber, index) => (
                                            <div key={ index }>{">"} { repsNumber }</div>
                                        ))
                                    )
                                )}
                                { exercise.reps_type?.reps_range && (
                                    exercise.reps_type.reps_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                        <div>{ exercise.reps_type.reps_range[0][0]}-{exercise.reps_type.reps_range[0][1] }</div>
                                    ) : (
                                        exercise.reps_type.reps_range.map((range, index) => (
                                            <div key={ index }>{range[0]} - {range[1]}</div>
                                        ))
                                    )
                                )}
                                { exercise.reps_type?.time_taken && (
                                    exercise.reps_type.time_taken.every((reps, i, arr) => reps === arr[0]) ? (
                                        <div>{exercise.reps_type.time_taken[0]} s</div>
                                    ) : (
                                        exercise.reps_type.time_taken.map((repsNumber, index) => (
                                            <div key={ index }>{ repsNumber } s</div>
                                        ))
                                    )
                                )}
                                { exercise.reps_type?.time_range && (
                                    exercise.reps_type.time_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                        <div>{ exercise.reps_type.time_range[0][0]}-{exercise.reps_type.time_range[0][1] } s</div>
                                    ) : (
                                        exercise.reps_type.time_range.map((range, index) => (
                                            <div key={ index }>{range[0]} - {range[1]} s</div>
                                        ))
                                    )
                                )}
                            </div>
                            <div className="min-w-[33%] flex flex-row justify-center items-center">
                                { exercise.intensity?.percent_rm && (
                                    exercise.intensity.percent_rm.every((perVal, i, arr) => perVal === arr[0]) ? (
                                        <div>{ exercise.intensity.percent_rm[0]}% 1RM</div>
                                    ) : (
                                        exercise.intensity.percent_rm.map((perVal, index) => (
                                            <div key={ index }>{perVal} % 1RM</div>
                                        ))
                                    )
                                )}
                                { exercise.intensity?.rpe && (
                                    exercise.intensity.rpe.every((rpeVal, i, arr) => rpeVal === arr[0]) ? (
                                        <div>{exercise.intensity.rpe[0]} RPE</div>
                                    ) : (
                                        exercise.intensity.rpe.map((rpeVal, index) => (
                                            <div key={ index }>{rpeVal} RPE</div>
                                        ))
                                    )
                                )}
                                { exercise.intensity?.weights && (
                                    exercise.intensity.weights.every((weightVal, i, arr) => weightVal === arr[0]) ? (
                                        <div>{exercise.intensity.weights[0]} lbs</div>
                                    ) : (
                                        exercise.intensity.weights.map((weightVal, index) => (
                                            <div key={ index }>{ weightVal } lbs</div>
                                        ))
                                    )
                                )}
                                { exercise.intensity?.rpe_range && (
                                    exercise.intensity.rpe_range.every((range, i, arr) => JSON.stringify(range) === JSON.stringify(arr[0])) ? (
                                        <div>{ exercise.intensity.rpe_range[0][0]}-{exercise.intensity.rpe_range[0][1] } RPE</div>
                                    ) : (
                                        exercise.intensity.rpe_range.map((range, index) => (
                                            <div key={ index }>{range[0]} - {range[1]} RPE</div>
                                        ))
                                    )
                                )}
                            </div>
                        </div>

                    </div>
                ) ) }
            </div>
            <div className="flex items-center justify-center" onClick={ () => handleAddExerciseDialog({currentWeek: weekIndex, currentDay: Number(day.order), isOpen: true}) }>
                <Button variant="ghost" className="mt-1 w-full font-bold uppercase h-12 hover:bg-gray-200 text-black"><PlusIcon />Add Exercise</Button>
            </div>
        </Card>
        <DuplicateDay
            programLength={ programLength }
            weekIndex={ weekIndex }
            day={ day }
            days={ days }
            duplicateDayOpen={ duplicateDayOpen }
            setDuplicateDayOpen={ setDuplicateDayOpen }
            handleDuplicateDay={ handleDuplicateDay }
        />
        </>
    );
};
