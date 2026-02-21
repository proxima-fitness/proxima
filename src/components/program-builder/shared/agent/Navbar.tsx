import {
    Maximize2,
    Minimize2,
    PanelLeft,
    PanelRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


interface IProps {
    onTogglePosition: () => void;
    onToggleExpand: () => void;
    isExpanded: boolean;
    sidebarPosition: "left" | "right";
}

export const Navbar: React.FC<IProps> = (props) => {

    const { onTogglePosition, onToggleExpand, isExpanded, sidebarPosition } = props;

    return (
        <div className="min-h-12  px-2 flex flex-row justify-between items-center gap-2 shrink-0 border-b">
                <div className="flex flex-row gap-2 max-sm:hidden">
                </div>
                <div className="max-sm:hidden flex flex-row gap-2">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-black dark:text-white bg-white dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600"
                                    onClick={onToggleExpand}
                                >
                                    {isExpanded ? (
                                        <Minimize2 className="h-5 w-5" />
                                    ) : (
                                        <Maximize2 className="h-5 w-5" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900">
                                {isExpanded ? "Collapse chat" : "Expand chat"}
                            </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-black dark:text-white bg-white dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600"
                                    onClick={onTogglePosition}
                                >
                                    {sidebarPosition === "left" ? (
                                        <PanelRight className="h-5 w-5" />
                                    ) : (
                                        <PanelLeft className="h-5 w-5" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900">
                                {sidebarPosition === "left" ? "Move sidebar to right" : "Move sidebar to left"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
    )
}
