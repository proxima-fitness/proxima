import { EllipsisIcon, CopyIcon } from "lucide-react";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

interface IProps {
    weeks: number;
}

export const WeeksBar: React.FC<IProps> = (props) => {

    const {
        weeks,
    } = props;

    const weeksArray = Array.from({ length: weeks }, (_,i) => i);

    return (
        <div className="py-4 px-4 flex flex-row flex-nowrap gap-2">
            { weeksArray.map((week) => (
                <div key={ week } className="pr-8 min-w-[440px] max-w-[440px] h-[40px] flex flex-row justify-between items-center">
                    <div className="">
                        Week {week + 1}
                    </div>
                    <div className="flex flex-row gap-4">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger>
                                    <EllipsisIcon />
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                <p>More</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger className="">
                                    <CopyIcon />
                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                    <p>Duplicate Week</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            ))}
        </div>
    )
}
