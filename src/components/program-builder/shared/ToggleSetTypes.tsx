import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { TooltipContent } from "@/components/ui/tooltip";
import { TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tooltip } from "@/components/ui/tooltip";
import { ActivityIcon, TrendingDownIcon } from "lucide-react";
import { SkullIcon } from "lucide-react";

interface IProps {
    setType: string;
    handleSetType: (setType: string) => void;
}

export const ToggleSetTypes = (props: IProps) => {

    const { setType, handleSetType } = props;

    return (
        <>
            <TooltipProvider delayDuration={ 0 }>
                <ToggleGroup value={ setType } onValueChange={ handleSetType } type="single" size="sm">
                    <Tooltip>
                        <TooltipTrigger className="">
                            <ToggleGroupItem value="warmup" aria-label="Toggle warmup">
                                <ActivityIcon className="w-4 h-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            Warmup Set
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger className="">
                            <ToggleGroupItem value="drop" aria-label="Toggle drop">
                                <TrendingDownIcon className="w-4 h-4" />
                            </ToggleGroupItem>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-600 text-white rounded-lg">
                            Drop Set
                        </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                        <TooltipTrigger className="">
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