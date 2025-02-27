"use client";

import { Card } from "@/components/ui/card";
import { MenuIcon, EllipsisIcon, CopyIcon, PlusIcon } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "../ui/button";
import { DuplicateDay } from "./DuplicateDay";
import { useRef, useState } from "react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuShortcut,
    DropdownMenuTrigger,
  } from "@/components/ui/dropdown-menu";


interface IProps {
    day: TProgramCreatorDay;
    days: number;
    week: number;
    programLength: number;
}

export const DayCard: React.FC<IProps> = (props) => {

    const {
        day,
        days,
        week,
        programLength,
    } = props;

    const [duplicateDayOpen, setDuplicateDayOpen] = useState(false);

    const handleDuplicateDayOpen = (day: number, duplicateDayOpen: boolean) => {
        setDuplicateDayOpen(duplicateDayOpen);
    };

    return (
        <>

        <Card className="group py-4 px-4 min-w-[440px] max-w-[440px] bg-lightGray">
            <div className="flex flex-row justify-between items-center">
                <div className="font-main text-xl flex flex-row gap-4">
                    <MenuIcon />
                    Day {day.order}
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
                            <DropdownMenuItem>
                                Delete
                                <DropdownMenuShortcut>⌘D</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                                Edit Title
                                <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
                            </DropdownMenuItem>
                            <DropdownMenuItem>
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
            <div className="flex flex-row justify-between mt-4 gap-4 border-t-2 border-b-2 py-2 border-gray-200">
                <div className="flex flex-row gap-4 max-w-[50%]">
                    <div>
                        #
                    </div>
                    <div>
                        Exercise
                    </div>
                </div>
                <div className="flex flex-row justify-start gap-4 max-w-[50%]">
                    <div>
                        Sets
                    </div>
                    <div>
                        Reps
                    </div>
                    <div>
                        Intensity
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center">
                <Button variant="ghost" className="pt-6 w-44 font-bold uppercase h-12 rounded-[40px] text-black"><PlusIcon />Add Exercise</Button>
            </div>
        </Card>
        <DuplicateDay programLength={ programLength } week={ week } day={ day } days={ days } duplicateDayOpen={ duplicateDayOpen } setDuplicateDayOpen={ setDuplicateDayOpen } />
        </>
    );
};
