/**
 * @module Navbar
 * Agent toolbar: hide chat, expand/collapse, move sidebar left/right. Desktop only.
 * Depends on: Button, Tooltip. Used by: Agent.
 */
import {
    Maximize2,
    Minimize2,
    PanelLeft,
    PanelLeftClose,
    PanelRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"


/** Props for the agent navbar. */
interface IProps {
    onTogglePosition: () => void;
    onToggleExpand: () => void;
    onToggleHide?: () => void;
    isExpanded: boolean;
    sidebarPosition: "left" | "right";
}

/** Toolbar with hide, expand/collapse, and sidebar position buttons. */
export const Navbar: React.FC<IProps> = (props) => {

    const { onTogglePosition, onToggleExpand, onToggleHide, isExpanded, sidebarPosition } = props;

    return (
        <div className="min-h-12  px-2 flex flex-row justify-between items-center gap-2 shrink-0 border-b max-sm:hidden">
                <div className="flex flex-row gap-2 max-sm:hidden">
                    {onToggleHide && (
                        <TooltipProvider delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="size-10 shrink-0 rounded-full text-black dark:text-white bg-white dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-800"
                                        onClick={onToggleHide}
                                        aria-label="Hide chat"
                                    >
                                        <PanelLeftClose className="h-5 w-5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent className="bg-lightSecondary text-white">Hide chat</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    )}
                </div>
                <div className="max-sm:hidden flex flex-row gap-2">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-10 shrink-0 rounded-full text-black dark:text-white bg-white dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-800"
                                    onClick={onToggleExpand}
                                    aria-label={isExpanded ? "Collapse chat" : "Expand chat"}
                                >
                                    {isExpanded ? (
                                        <Minimize2 className="h-5 w-5" />
                                    ) : (
                                        <Maximize2 className="h-5 w-5" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-lightSecondary text-white">{isExpanded ? "Collapse chat" : "Expand chat"}</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="size-10 shrink-0 rounded-full text-black dark:text-white bg-white dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-800"
                                    onClick={onTogglePosition}
                                    aria-label={sidebarPosition === "left" ? "Move sidebar to right" : "Move sidebar to left"}
                                >
                                    {sidebarPosition === "left" ? (
                                        <PanelRight className="h-5 w-5" />
                                    ) : (
                                        <PanelLeft className="h-5 w-5" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-lightSecondary text-white">
                                {sidebarPosition === "left" ? "Move sidebar to right" : "Move sidebar to left"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
    )
}
