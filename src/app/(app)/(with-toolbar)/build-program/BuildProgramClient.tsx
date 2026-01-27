/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useState, useEffect, useMemo, useRef, useReducer } from "react";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable";

import { Agent } from "@/components/program-builder/shared/agent/Agent";
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
import { IOption } from "@/components/ui/multi-select";

export function BuildProgramClient() {

    const { isHevy } = useIsHevy();
    const { setIsPreview } = usePreview();
    const searchParams = useSearchParams();

    const shareId = searchParams.get('shareId') ?? '';
    const edit = searchParams.get('edit') ?? '';
    const resume = searchParams.get('resume') ?? '';
    const shared = searchParams.get('shared') ?? '';

    const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");
    const [sidebarSize, setSidebarSize] = useState(28);
    const [mobileTab, setMobileTab] = useState<string>("chat");

    /*************************************************************************************/
    /*** STATE FOR THE PROGRAM BUILDER ***/
    const [hevyProgram, setHevyProgram] = useState<THevyRoutine[]>([]);
    /*************************************************************************************/

    const empty = searchParams.get('empty') ?? '';
    const search = searchParams.get('search') ?? '';

    // TODO: These will be short term memory for now but eventually we will want some long term memory for the user
    const [sex, setSex] = useState<string>("");
    const [age, setAge] = useState<string>("");
    const [daysPerWeek, setDaysPerWeek] = useState<string>("");
    const [specificDays, setSpecificDays] = useState<IOption[]>([]);
    const [programLength, setProgramLength] = useState<string>("");
    const [workoutDuration, setWorkoutDuration] = useState<string>("");
    const [activityLevel, setActivityLevel] = useState<string>("");
    const [goals, setGoals] = useState<IOption[]>([]);
    const [specialization, setSpecialization] = useState<IOption[]>([]);
    const [equipment, setEquipment] = useState<IOption[]>([]);
    const [focusAreas, setFocusAreas] = useState<IOption[]>([]);
    const [difficultyLevel, setDifficultyLevel] = useState<IOption[]>([]);
    const [excludeAreas, setExcludeAreas] = useState<IOption[]>([]);
    const [excludeEquipment, setExcludeEquipment] = useState<IOption[]>(
        [
            { label: "Bodyweight", value: "bodyweight" },
            { label: "Band", value: "band" },
            { label: "Suspension", value: "suspension" },
            { label: "Resistance band", value: "resistance_band" },
            { label: "Plate", value: "plate" },
            { label: "Other", value: "other" },
            { label: "None", value: "none" },
        ]
    );


    const [excludeSpecializations, setExcludeSpecializations] = useState<IOption[]>([]);
    const [healthIssues, setHealthIssues] = useState<IOption[]>([]);

    console.log("excludeEquipment", excludeEquipment);
    console.log("programLength", programLength);
    console.log("daysPerWeek", daysPerWeek);
    console.log("healthIssues", healthIssues);

    const [explore, toggleExplore] = useReducer(prev => !prev, true);
    const [programTitle, setProgramTitle] = useState("My Proxima Program");


    useEffect(() => {
        const emptyParam = searchParams.get('empty') ?? '';

        const fetchSharedProgram = async () => {
            const sharedProgram = await getSharedProgram(Number(shareId));
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



    // Auto-switch to program tab when program finishes generating
    const prevProgramLengthRef = useRef(hevyProgram.length);
    useEffect(() => {
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
        specificDays: specificDays.map(opt => opt.value).join(', '),
        programLength,
        workoutDuration,
        activityLevel,
        goals: goals.map(opt => opt.value).join(', '),
        specialization: specialization.map(opt => opt.value).join(', '),
        equipment: equipment.map(opt => opt.value).join(', '),
        focusAreas: focusAreas.map(opt => opt.value).join(', '),
        difficultyLevel: difficultyLevel.map(opt => opt.value).join(', '),
        excludeAreas: excludeAreas.map(opt => opt.value).join(', '),
        excludeEquipment: excludeEquipment.map(opt => opt.value).join(', '),
        excludeSpecializations: excludeSpecializations.map(opt => opt.value).join(', '),
        healthIssues: healthIssues.map(opt => opt.value).join(', '),
        programTitle,
        explore: explore ? "true" : "false",
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

    // Handler functions to avoid tight coupling
    const handleSex = (value: string) => { setSex(value); };
    const handleAge = (value: string) => { setAge(value); };
    const handleDaysPerWeek = (value: string) => { setDaysPerWeek(value); };
    const handleSpecificDays = (value: IOption[]) => { setSpecificDays(value); };
    const handleProgramLength = (value: string) => { setProgramLength(value); };
    const handleWorkoutDuration = (value: string) => { setWorkoutDuration(value); };
    const handleActivityLevel = (value: string) => { setActivityLevel(value); };
    const handleGoals = (value: IOption[]) => { setGoals(value); };
    const handleSpecialization = (value: IOption[]) => { setSpecialization(value); };
    const handleEquipment = (value: IOption[]) => { setEquipment(value); };
    const handleFocusAreas = (value: IOption[]) => { setFocusAreas(value); };
    const handleDifficultyLevel = (value: IOption[]) => { setDifficultyLevel(value); };
    const handleExcludeAreas = (value: IOption[]) => { setExcludeAreas(value); };
    const handleExcludeEquipment = (value: IOption[]) => { setExcludeEquipment(value); };
    const handleExcludeSpecializations = (value: IOption[]) => { setExcludeSpecializations(value); };
    const handleHealthIssues = (value: IOption[]) => { setHealthIssues(value); };
    const handleProgramTitle = (value: string) => { setProgramTitle(value); };
    const handleExplore = () => { toggleExplore(); };

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
                            <Agent
                                search={search}
                                sidebarPosition={sidebarPosition}
                                onTogglePosition={toggleSidebarPosition}
                                setHevyProgram={setHevyProgram}
                                hevyProgram={hevyProgram}
                                sex={sex}
                                age={age}
                                daysPerWeek={daysPerWeek}
                                specificDays={specificDays}
                                programLength={programLength}
                                workoutDuration={workoutDuration}
                                activityLevel={activityLevel}
                                goals={goals}
                                specialization={specialization}
                                equipment={equipment}
                                focusAreas={focusAreas}
                                difficultyLevel={difficultyLevel}
                                excludeAreas={excludeAreas}
                                excludeEquipment={excludeEquipment}
                                excludeSpecializations={excludeSpecializations}
                                healthIssues={healthIssues}
                                programTitle={programTitle}
                                explore={explore}
                                handleSex={handleSex}
                                handleAge={handleAge}
                                handleDaysPerWeek={handleDaysPerWeek}
                                handleSpecificDays={handleSpecificDays}
                                handleProgramLength={handleProgramLength}
                                handleWorkoutDuration={handleWorkoutDuration}
                                handleActivityLevel={handleActivityLevel}
                                handleGoals={handleGoals}
                                handleSpecialization={handleSpecialization}
                                handleEquipment={handleEquipment}
                                handleFocusAreas={handleFocusAreas}
                                handleDifficultyLevel={handleDifficultyLevel}
                                handleExcludeAreas={handleExcludeAreas}
                                handleExcludeEquipment={handleExcludeEquipment}
                                handleExcludeSpecializations={handleExcludeSpecializations}
                                handleHealthIssues={handleHealthIssues}
                                handleProgramTitle={handleProgramTitle}
                                handleExplore={handleExplore}
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
                            <Agent
                                search={search}
                                sidebarPosition={sidebarPosition}
                                onTogglePosition={toggleSidebarPosition}
                                setHevyProgram={setHevyProgram}
                                hevyProgram={hevyProgram}
                                sex={sex}
                                age={age}
                                daysPerWeek={daysPerWeek}
                                specificDays={specificDays}
                                programLength={programLength}
                                workoutDuration={workoutDuration}
                                activityLevel={activityLevel}
                                goals={goals}
                                specialization={specialization}
                                equipment={equipment}
                                focusAreas={focusAreas}
                                difficultyLevel={difficultyLevel}
                                excludeAreas={excludeAreas}
                                excludeEquipment={excludeEquipment}
                                excludeSpecializations={excludeSpecializations}
                                healthIssues={healthIssues}
                                programTitle={programTitle}
                                explore={explore}
                                handleSex={handleSex}
                                handleAge={handleAge}
                                handleDaysPerWeek={handleDaysPerWeek}
                                handleSpecificDays={handleSpecificDays}
                                handleProgramLength={handleProgramLength}
                                handleWorkoutDuration={handleWorkoutDuration}
                                handleActivityLevel={handleActivityLevel}
                                handleGoals={handleGoals}
                                handleSpecialization={handleSpecialization}
                                handleEquipment={handleEquipment}
                                handleFocusAreas={handleFocusAreas}
                                handleDifficultyLevel={handleDifficultyLevel}
                                handleExcludeAreas={handleExcludeAreas}
                                handleExcludeEquipment={handleExcludeEquipment}
                                handleExcludeSpecializations={handleExcludeSpecializations}
                                handleHealthIssues={handleHealthIssues}
                                handleProgramTitle={handleProgramTitle}
                                handleExplore={handleExplore}
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
                        <Agent
                            search={search}
                            sidebarPosition="left"
                            onTogglePosition={ () => {}}
                            setHevyProgram={setHevyProgram}
                            hevyProgram={hevyProgram}
                            sex={sex}
                            age={age}
                            daysPerWeek={daysPerWeek}
                            specificDays={specificDays}
                            programLength={programLength}
                            workoutDuration={workoutDuration}
                            activityLevel={activityLevel}
                            goals={goals}
                            specialization={specialization}
                            equipment={equipment}
                            focusAreas={focusAreas}
                            difficultyLevel={difficultyLevel}
                            excludeAreas={excludeAreas}
                            excludeEquipment={excludeEquipment}
                            excludeSpecializations={excludeSpecializations}
                            healthIssues={healthIssues}
                            programTitle={programTitle}
                            explore={explore}
                            handleSex={handleSex}
                            handleAge={handleAge}
                            handleDaysPerWeek={handleDaysPerWeek}
                            handleSpecificDays={handleSpecificDays}
                            handleProgramLength={handleProgramLength}
                            handleWorkoutDuration={handleWorkoutDuration}
                            handleActivityLevel={handleActivityLevel}
                            handleGoals={handleGoals}
                            handleSpecialization={handleSpecialization}
                            handleEquipment={handleEquipment}
                            handleFocusAreas={handleFocusAreas}
                            handleDifficultyLevel={handleDifficultyLevel}
                            handleExcludeAreas={handleExcludeAreas}
                            handleExcludeEquipment={handleExcludeEquipment}
                            handleExcludeSpecializations={handleExcludeSpecializations}
                            handleHealthIssues={handleHealthIssues}
                            handleProgramTitle={handleProgramTitle}
                            handleExplore={handleExplore}
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
