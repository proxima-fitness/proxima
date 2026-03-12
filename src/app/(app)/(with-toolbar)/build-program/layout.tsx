/**
 * @module (app)/(with-toolbar)/build-program/layout
 *
 * Layout for the build-program route. Sticky toolbar: breadcrumbs, set-type
 * badges (Warmup/Working/Drop/Failure), and step/undo controls. Sits at
 * src/app/(app)/(with-toolbar)/build-program/layout.tsx; wraps build-program page.
 *
 * Depends on: Breadcrumbs, StepButton, Badge, Tooltip components.
 * Used by: build-program/page and its BuildProgramClient.
 */

import { Breadcrumbs } from "@/components/program-builder/shared/Breadcrumbs";
import { ReactNode, Suspense } from "react";
import { StepButton } from "@/components/program-builder/shared/StepButton";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Program builder toolbar layout; breadcrumbs, set-type tooltips, undo/step area.
 *
 * @param props.children - Build-program page content (BuildProgramClient).
 */
export default function ProgramBuilderLayout({ children }: { children: ReactNode }) {
    return (
        <div className="h-screen flex flex-col overflow-hidden">
            <div className="max-sm:hidden shrink-0 z-50 p-2 bg-extraLightGray dark:bg-extraDarkGray border-b-2 dark:border-darkGray border-white flex flex-row items-center text-xl text-black dark:text-white">
                <div className="flex-1 min-w-0 overflow-hidden">
                    <Breadcrumbs />
                </div>
                {/* <ProgramBuilderTabs /> */}

                {/* Set Types - Centered on desktop only */}
                <div className="hidden md:flex shrink-0 justify-center items-center gap-2">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="outline" className="bg-gray-300 dark:text-black border-none text-xs gap-2 justify-start">
                                    Warmup
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-600 max-w-xs text-white rounded-lg">
                                <p><strong>Definition:</strong> A warmup set prepares your muscles and joints for the working sets. Performed with lighter weight to increase blood flow and reduce injury risk.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge variant="outline" className="text-xs gap-2 justify-start">
                                     Working
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-600 max-w-xs text-white rounded-lg">
                                <p><strong>Definition:</strong> A working set is your main training set performed at your target intensity. This is where you build strength and muscle.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="outline"
                                    className="bg-[#33bbcf] text-white border-none text-xs gap-2 justify-start"
                                >
                                     Drop
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-600 max-w-xs text-white rounded-lg">
                                <p><strong>Definition:</strong> A drop set involves immediately reducing the weight after reaching failure and continuing the set. Used to maximize muscle fatigue and growth.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Badge
                                    variant="outline"
                                    className="bg-[#01579B] text-white border-none text-xs gap-2 justify-start"
                                >
                                     Failure
                                </Badge>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-600 max-w-xs text-white rounded-lg">
                                <p><strong>Definition:</strong> A failure set is performed until you cannot complete another rep with proper form. Used to maximize muscle recruitment and growth.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <div className="flex-1 min-w-0 flex flex-row items-center justify-end gap-4 max-sm:ml-auto">
                    {/* <ToolsTabs /> */}
                    <div className="flex items-center gap-2">
                        <div id="toolbar-undo-portal" />
                        <div id="toolbar-save-portal" />
                        <Suspense fallback={null}>
                            <StepButton />
                        </Suspense>
                    </div>
                </div>
            </div>
            {children}
        </div>

    );
};

