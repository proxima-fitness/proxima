"use client";

/**
 * Compact toolbar control: opens a popover with set-type definitions (warmup, working, drop, failure).
 * Touch- and keyboard-friendly replacement for inline badge tooltips.
 */
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function BuildProgramSetTypesPopover() {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-9 shrink-0 gap-1.5 px-2 font-secondary font-semibold"
                    aria-label="Legend: warmup, working, drop, and failure sets"
                >
                    <Info className="h-4 w-4" aria-hidden />
                    <span className="hidden lg:inline">Legend</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 max-w-[min(20rem,calc(100vw-2rem))]" align="end">
                <p className="mb-3 text-sm font-semibold text-foreground">Legend</p>
                <ul className="m-0 flex list-none flex-col gap-3 p-0 text-sm">
                    <li>
                        <Badge variant="outline" className="mb-1 bg-gray-300 dark:text-black border-none text-xs w-full justify-start">
                            Warmup
                        </Badge>
                        <p className="text-muted-foreground">
                            A warmup set prepares your muscles and joints for the working sets.
                            Performed with lighter weight to increase blood flow and reduce injury risk.
                        </p>
                    </li>
                    <li>
                        <Badge variant="outline" className="mb-1 text-xs w-full justify-start">
                            Working
                        </Badge>
                        <p className="text-muted-foreground">
                            A working set is your main training set performed at your target intensity.
                            This is where you build strength and muscle.
                        </p>
                    </li>
                    <li>
                        <Badge
                            variant="outline"
                            className="mb-1 bg-[#33bbcf] text-white border-none text-xs w-full justify-start"
                        >
                            Drop
                        </Badge>
                        <p className="text-muted-foreground">
                            A drop set involves immediately reducing the weight after reaching failure
                            and continuing the set. Used to maximize muscle fatigue and growth.
                        </p>
                    </li>
                    <li>
                        <Badge
                            variant="outline"
                            className="mb-1 bg-[#01579B] text-white border-none text-xs w-full justify-start"
                        >
                            Failure
                        </Badge>
                        <p className="text-muted-foreground">
                            A failure set is performed until you cannot complete another rep with proper
                            form. Used to maximize muscle recruitment and growth.
                        </p>
                    </li>
                </ul>
            </PopoverContent>
        </Popover>
    );
}
