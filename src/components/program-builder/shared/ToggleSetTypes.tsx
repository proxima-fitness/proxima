import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";
import { ActivityIcon, TrendingDownIcon } from "lucide-react";
import { SkullIcon } from "lucide-react";
import { useState } from "react";

interface IProps {
    setIndex: number;
    setType: string;
    handleSetType: (value: string, index: number) => void
}

export const ToggleSetTypes = (props: IProps) => {

    const { setIndex, setType, handleSetType } = props;

    const [currentValue, setCurrentValue] = useState(setType);

    return (
        <>
            <TooltipProvider delayDuration={ 0 }>
                <ToggleGroup value={ currentValue } onValueChange={ (value: string) => { handleSetType(value, setIndex); setCurrentValue(value); } } type="single" size="sm">
                    <Tooltip>
                        <TooltipTrigger asChild className="">
                            <ToggleGroupItem value="warmup" aria-label="Toggle warmup">
                                <ActivityIcon className="w-4 h-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            Warmup Set
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild className="">
                            <ToggleGroupItem value="dropset" aria-label="Toggle drop">
                                <TrendingDownIcon className="w-4 h-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            Drop Set
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger asChild className="">
                            <ToggleGroupItem value="failure" aria-label="Toggle failure">
                                <SkullIcon className="w-4 h-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            Failure Set
                        </TooltipContent>
                    </Tooltip>
                </ToggleGroup>
            </TooltipProvider>
        </>
    );
};