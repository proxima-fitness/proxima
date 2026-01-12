"use client";

import { useState, useEffect, useMemo } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable";

import { AgentChat } from "@/components/program-builder/shared/AgentChat";
const SIDEBAR_POSITION_KEY = "andy-sidebar-position";
const SIDEBAR_SIZE_KEY = "andy-sidebar-size";
import { useSearchParams } from "next/navigation";
import { usePreview } from "@/contexts/PreviewContext";
import { useIsHevy } from "@/contexts/HevyContext";
import { BuildProgramSkeleton } from "@/components/program-builder/shared/BuildProgramSkeleton";
import { appendOrderToHevyRoutines } from "@/components/program-builder/utils/format-responses";
import { HevyRoutine } from "@/components/program-builder/hevy/HevyRoutine";
import { getSharedProgram } from "@/api/programs";

export function BuildProgramClient() {

    const { isHevy } = useIsHevy();
    const { setIsPreview } = usePreview();
    const searchParams = useSearchParams();

    const shareId = searchParams.get('shareId') ?? '';
    const edit = searchParams.get('edit') ?? '';
    const resume = searchParams.get('resume') ?? '';
    const shared = searchParams.get('shared') ?? '';

    useEffect(() => {

        const fetchSharedProgram = async () => {
            const sharedProgram = await getSharedProgram(shareId);
            if (sharedProgram) {
                setHevyProgram(sharedProgram);
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
                setHevyProgram(JSON.parse(program));
            }
        }

        if (shared === 'true') {
            fetchSharedProgram();
        }


    }, [edit, setIsPreview, resume, isHevy, shared, shareId]);

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


    const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");
    const [sidebarSize, setSidebarSize] = useState(20);

    // Single Source of Truth for the Program Displayed in the AI Program Builder
    const [hevyProgram, setHevyProgram] = useState<THevyRoutine[]>([]);

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
            <div className="max-sm:block sm:hidden">
                { hevyProgram.length > 0 ? (
                <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden">
                    <HevyRoutine request={ request } hevyProgram={ appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[] } setHevyProgram={ setHevyProgram } />
                </div>
                ) : (
                    <BuildProgramSkeleton />
                )}
            </div>
        </>
    );
}
