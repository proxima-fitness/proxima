"use client";

import { EllipsisIcon, CopyIcon } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react";
import { DuplicateWeek } from "./DuplicateWeek";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
  } from "@/components/ui/popover"

interface IProps {
    week: number;
    weeks: number[];
}

export const WeeksBar: React.FC<IProps> = (props) => {

    const {
        week,
        weeks,
    } = props;

    const [selectedWeek, setSelectedWeek] = useState<number>();
    const [duplicateWeekOpen, setDuplicateWeekOpen] = useState(false);

    const handleDuplicateWeekOpen = (week: number, duplicateWeekOpen: boolean) => {
        setSelectedWeek(week);
        setDuplicateWeekOpen(duplicateWeekOpen);
    };

    return (
        <>
        <div className="pt-2 px-4 flex flex-row flex-nowrap gap-2">
            <div className="px-2 min-w-[440px] max-w-[440px] h-[40px] flex flex-row justify-between items-center">
                <div className="">
                    Week {week}
                </div>
                <div className="flex flex-row gap-4">
                    {/* <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <EllipsisIcon />
                                    </PopoverTrigger>
                                    <PopoverContent>
                                        <div>
                                            Day Title
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            <p>More</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider> */}
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="">
                                <div onClick={ () => handleDuplicateWeekOpen(week, true) }>
                                    <CopyIcon />
                                </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                <p>Duplicate Week</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
        </div>
        <DuplicateWeek week={ selectedWeek } weeks={ weeks } duplicateWeekOpen={ duplicateWeekOpen } setDuplicateWeekOpen={ setDuplicateWeekOpen } />
        </>
    )
}
