/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable";

import { AgentChat } from "@/components/program-builder/shared/AgentChat";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MessageSquare, Calendar } from "lucide-react";
const SIDEBAR_POSITION_KEY = "andy-sidebar-position";
const SIDEBAR_SIZE_KEY = "andy-sidebar-size";
import { useSearchParams } from "next/navigation";
import { usePreview } from "@/contexts/PreviewContext";
import { useIsHevy } from "@/contexts/HevyContext";
import { BuildProgramSkeleton } from "@/components/program-builder/shared/BuildProgramSkeleton";
import { appendOrderToHevyRoutines } from "@/components/program-builder/utils/format-responses";
import { HevyRoutine } from "@/components/program-builder/hevy/HevyRoutine";
import { getSharedProgram } from "@/api/programs";
import { emptyHevyRoutineProgram } from "@/assets/constants";

export function BuildProgramClient() {

    const { isHevy } = useIsHevy();
    const { setIsPreview } = usePreview();
    const searchParams = useSearchParams();

    const shareId = searchParams.get('shareId') ?? '';
    const edit = searchParams.get('edit') ?? '';
    const resume = searchParams.get('resume') ?? '';
    const shared = searchParams.get('shared') ?? '';

    // State declarations
    const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");
    const [sidebarSize, setSidebarSize] = useState(20);
    const [mobileTab, setMobileTab] = useState<string>("chat");
    const [hevyProgram, setHevyProgram] = useState<THevyRoutine[]>([]);

    useEffect(() => {
        const emptyParam = searchParams.get('empty') ?? '';

        const fetchSharedProgram = async () => {
            const sharedProgram = await getSharedProgram(shareId);
            if (sharedProgram) {
                setHevyProgram(appendOrderToHevyRoutines(sharedProgram));
            }
        }


        if (edit === 'true') {
            setIsPreview(false);
        } else {
            setIsPreview(true);
        }

        if (resume === 'true') {
            const program = localStorage.getItem('hevy-program-in-progress');
            if (program) {
                setHevyProgram(appendOrderToHevyRoutines(JSON.parse(program)));
            }
        }

        if (shared === 'true') {
            fetchSharedProgram();
        }

        if (emptyParam === 'true') {
            setHevyProgram(appendOrderToHevyRoutines(emptyHevyRoutineProgram));
        }


    }, [edit, setIsPreview, resume, isHevy, shared, shareId, searchParams]);

    // Load sidebar position and size from localStorage on mount
    useEffect(() => {
        const savedPosition = localStorage.getItem(SIDEBAR_POSITION_KEY) as "left" | "right" | null;
        if (savedPosition === "left" || savedPosition === "right") {
            setSidebarPosition(savedPosition);
        }
        const savedSize = localStorage.getItem(SIDEBAR_SIZE_KEY);
        if (savedSize) {
            const size = parseFloat(savedSize);
            if (size >= 20 && size <= 70) {
                setSidebarSize(size);
            }
        }
    }, []);

    const empty = searchParams.get('empty') ?? '';
    const search = searchParams.get('search') ?? '';
    const sex = searchParams.get('sex') ?? '';
    const age = searchParams.get('age') ?? '';
    const daysPerWeek = searchParams.get('daysPerWeek') ?? '';
    const specificDays = searchParams.get('specificDays') ?? '';
    const programLength = searchParams.get('programLength') ?? '';
    const workoutDuration = searchParams.get('workoutDuration') ?? '';
    const activityLevel = searchParams.get('activityLevel') ?? '';
    const goals = searchParams.get('goals') ?? '';
    const specialization = searchParams.get('specialization') ?? '';
    const equipment = searchParams.get('equipment') ?? '';
    const focusAreas = searchParams.get('focusAreas') ?? '';
    const difficultyLevel = searchParams.get('difficultyLevel') ?? '';
    const excludeAreas = searchParams.get('excludeAreas') ?? '';
    const excludeEquipment = searchParams.get('excludeEquipment') ?? '';
    const excludeSpecializations = searchParams.get('excludeSpecializations') ?? '';
    const healthIssues = searchParams.get('healthIssues') ?? '';
    const programTitle = searchParams.get('programTitle') ?? '';
    const explore = searchParams.get('explore') ?? '';

    // Switch back to chat tab if program is cleared while on program tab
    useEffect(() => {
        if (hevyProgram.length === 0 && mobileTab === "program") {
            setMobileTab("chat");
        }
    }, [hevyProgram.length, mobileTab]);

    // Auto-switch to program tab when program finishes generating
    const prevProgramLengthRef = useRef(hevyProgram.length);
    useEffect(() => {
        // If program was just generated (went from 0 to > 0), switch to program tab
        if (prevProgramLengthRef.current === 0 && hevyProgram.length > 0) {
            setMobileTab("program");
        }
        prevProgramLengthRef.current = hevyProgram.length;
    }, [hevyProgram.length]);

    const request = useMemo(() => ({
        empty,
        search,
        sex,
        age,
        daysPerWeek,
        specificDays,
        programLength,
        workoutDuration,
        activityLevel,
        goals,
        specialization,
        equipment,
        focusAreas,
        difficultyLevel,
        excludeAreas,
        excludeEquipment,
        excludeSpecializations,
        healthIssues,
        programTitle,
        explore,
      } as TTextToJsonRequest), [
        empty,
        search,
        sex,
        age,
        daysPerWeek,
        specificDays,
        programLength,
        workoutDuration,
        activityLevel,
        goals,
        specialization,
        equipment,
        focusAreas,
        difficultyLevel,
        excludeAreas,
        excludeEquipment,
        excludeSpecializations,
        healthIssues,
        programTitle,
        explore,
    ]);

    // Save the prompt to local storage so that it can be saved to the database
    useEffect(() => {
        if (typeof window !== "undefined") {
            localStorage.setItem("prompt", JSON.stringify(search));
        }
    }, [search]);

    const toggleSidebarPosition = () => {
        setSidebarPosition((prev) => {
            const newPosition = prev === "left" ? "right" : "left";
            localStorage.setItem(SIDEBAR_POSITION_KEY, newPosition);
            return newPosition;
        });
    };

    // No-op function for mobile since sidebar position toggle isn't relevant
    const mobileToggleSidebarPosition = () => {};


    return (
        <>
            <div className="max-sm:hidden sm:block">
                <ResizablePanelGroup
                    direction="horizontal"
                >
                {sidebarPosition === "left" ? (
                    <>
                        <ResizablePanel
                            id="sidebar"
                            order={1}
                            defaultSize={sidebarSize}
                            onResize={(size) => {
                                setSidebarSize(size);
                                localStorage.setItem(SIDEBAR_SIZE_KEY, size.toString());
                            }}
                            minSize={20}
                            maxSize={70}
                            className="border-extraLightGray bg-extraLightGray dark:bg-extraDarkGray dark:text-white"
                        >
                            <AgentChat
                                sidebarPosition={sidebarPosition}
                                onTogglePosition={toggleSidebarPosition}
                                setHevyProgram={setHevyProgram}
                                hevyProgram={hevyProgram}
                            />
                        </ResizablePanel>
                        <ResizableHandle withHandle className="" />
                        <ResizablePanel
                            id="main-content"
                            order={2}
                            minSize={30}
                        >
                            { hevyProgram.length > 0 ? (
                            <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden">
                                <HevyRoutine request={ request } hevyProgram={  appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[] } setHevyProgram={ setHevyProgram } />
                            </div>
                            ) : (
                                <BuildProgramSkeleton />
                            )}
                        </ResizablePanel>
                    </>
                ) : (
                    <>
                        <ResizablePanel
                            id="main-content"
                            order={1}
                            minSize={30}
                        >
                            { hevyProgram.length > 0 ? (
                            <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden">
                                <HevyRoutine request={ request } hevyProgram={ appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[] } setHevyProgram={ setHevyProgram } />
                            </div>
                            ) : (
                                <BuildProgramSkeleton />
                            )}
                        </ResizablePanel>
                        <ResizableHandle withHandle className="" />
                        <ResizablePanel
                            id="sidebar"
                            order={2}
                            defaultSize={sidebarSize}
                            onResize={(size) => {
                                setSidebarSize(size);
                                localStorage.setItem(SIDEBAR_SIZE_KEY, size.toString());
                            }}
                            minSize={20}
                            maxSize={70}
                            className="border-extraLightGray bg-extraLightGray dark:bg-extraDarkGray dark:text-white"
                        >
                            <AgentChat
                                sidebarPosition={sidebarPosition}
                                onTogglePosition={toggleSidebarPosition}
                                setHevyProgram={setHevyProgram}
                                hevyProgram={hevyProgram}
                            />
                        </ResizablePanel>
                    </>
                )}
                </ResizablePanelGroup>
            </div>
            <div className="max-sm:block sm:hidden h-[calc(100vh-4rem)] flex flex-col relative">
                <Tabs value={mobileTab} onValueChange={(value) => {
                    // Prevent switching to Program tab if no program exists
                    if (value === "program" && hevyProgram.length === 0) {
                        return;
                    }
                    setMobileTab(value);
                }} className="flex flex-col h-full">
                    <TabsContent value="chat" className="flex-1 m-0 mt-0 px-4 pb-20">
                        <AgentChat
                            sidebarPosition="left"
                            onTogglePosition={mobileToggleSidebarPosition}
                            setHevyProgram={setHevyProgram}
                            hevyProgram={hevyProgram}
                        />
                    </TabsContent>
                    <TabsContent value="program" className="flex-1 overflow-y-auto m-0 mt-0 px-4 pb-20">
                        { hevyProgram.length > 0 ? (
                            <div className="w-full max-w-full overflow-x-hidden">
                                <HevyRoutine request={ request } hevyProgram={ appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[] } setHevyProgram={ setHevyProgram } />
                            </div>
                        ) : (
                            <BuildProgramSkeleton />
                        )}
                    </TabsContent>
                    <TabsList className="fixed bottom-0 left-0 right-0 w-full justify-around rounded-none border-t bg-background shadow-lg px-4 py-3 h-[70px] z-50">
                        <TabsTrigger
                            value="chat"
                            className={cn(
                                "flex-1 data-[state=active]:font-semibold data-[state=active]:text-lightSecondary data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 rounded-lg py-2 flex flex-row items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-900 transition-colors"
                            )}
                        >
                            <MessageSquare className="h-5 w-5" />
                            <span>Chat</span>
                        </TabsTrigger>
                        <TabsTrigger
                            value="program"
                            disabled={hevyProgram.length === 0}
                            className={cn(
                                "flex-1 rounded-lg py-2 flex flex-row items-center justify-center gap-2 transition-colors",
                                hevyProgram.length > 0
                                    ? "data-[state=active]:font-semibold data-[state=active]:text-lightSecondary data-[state=active]:bg-gray-100 dark:data-[state=active]:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900"
                                    : "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Calendar className="h-5 w-5" />
                            <span>My Program</span>
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>
        </>
    );
}
