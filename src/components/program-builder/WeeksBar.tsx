"use client";

import { CopyIcon } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useState } from "react";
import { DuplicateWeek } from "./DuplicateWeek";

interface IProps {
    weekIndex: number;
    programLength: number;
    handleDuplicateWeek: (fromWeekIndex: number, toWeekIndexes: number[]) => void;
}

export const WeeksBar: React.FC<IProps> = (props) => {

    const {
        weekIndex,
        programLength,
        handleDuplicateWeek,
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
                    Week {weekIndex + 1}
                </div>
                <div className="flex flex-row gap-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="">
                                <div onClick={ () => handleDuplicateWeekOpen(weekIndex, true) }>
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
        <DuplicateWeek
            weekIndex={ selectedWeek }
            programLength={ programLength }
            duplicateWeekOpen={ duplicateWeekOpen }
            setDuplicateWeekOpen={ setDuplicateWeekOpen }
            handleDuplicateWeek={ handleDuplicateWeek }
        />
        </>
    )
}
