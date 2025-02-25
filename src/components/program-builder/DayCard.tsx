import { Card } from "@/components/ui/card";
import { MenuIcon, EllipsisIcon, CopyIcon } from "lucide-react";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface IProps {
    day: number;
}

export const DayCard: React.FC<IProps> = (props) => {

    const {
        day,
    } = props;

    return (
        <Card className="group py-4 px-4 min-w-[440px] max-w-[440px] bg-lightGray">
            <div className="flex flex-row justify-between items-center">
                <div className="font-main text-xl flex flex-row gap-4">
                    <MenuIcon />
                    Day {day}
                </div>
                <div className="flex flex-row gap-4">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="hidden group-hover:block">
                                <EllipsisIcon />
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            <p>More</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger className="hidden group-hover:block">
                                <CopyIcon />
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
        </Card>
    );
};
