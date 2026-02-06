"use client";

import { useState, useEffect, useMemo, useReducer, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ImperativePanelHandle } from "react-resizable-panels";
import {
    ResizableHandle,
    ResizablePanel,
    ResizablePanelGroup,
  } from "@/components/ui/resizable";

import { Agent } from "@/components/program-builder/shared/agent/Agent";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MessageSquare, Calendar, Undo2 } from "lucide-react";
const SIDEBAR_POSITION_KEY = "andy-sidebar-position";
const SIDEBAR_SIZE_KEY = "andy-sidebar-size";
const COLLAPSED_SIZE = 30;
const EXPANDED_SIZE = 70;
import { useSearchParams } from "next/navigation";
import { usePreview } from "@/contexts/PreviewContext";
import { useIsHevy } from "@/contexts/HevyContext";
import { BuildProgramSkeleton } from "@/components/program-builder/shared/BuildProgramSkeleton";
import { appendOrderToHevyRoutines } from "@/components/program-builder/utils/format-responses";
import { HevyRoutine } from "@/components/program-builder/hevy/HevyRoutine";
import { Button } from "@/components/ui/button";
import { getSharedProgram } from "@/api/programs";
import { emptyHevyRoutineProgram } from "@/assets/constants";
import { IOption } from "@/components/ui/multi-select";
import { inferDaysPerWeek, inferProgramLength } from "@/components/program-builder/utils/helpers";
import { toast } from "sonner";
import { getNumberRoutineFolders, hevyAddExerciseToHevySetsConverter, reorderHevy, sortHevyByOrder } from "@/components/program-builder/utils";
import { applyPatch, type Operation } from "fast-json-patch";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { getTextFromChatMessage, isMessageAboutProgram } from "@/components/program-builder/utils/helpers"
import posthog from "posthog-js";
import { useUserContext } from "@/contexts/UserContext";


export function BuildProgramClient() {

    const { isHevy } = useIsHevy();
    const { user } = useUserContext();
    const { setIsPreview } = usePreview();
    const searchParams = useSearchParams();

    const shareId = searchParams.get('shareId') ?? '';
    const edit = searchParams.get('edit') ?? '';
    const resume = searchParams.get('resume') ?? '';
    const shared = searchParams.get('shared') ?? '';

    const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");
    const [sidebarSize, setSidebarSize] = useState(28);
    const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
    const [mobileTab, setMobileTab] = useState<string>("chat");

    /*************************************************************************************/
    /*** STATE FOR THE PROGRAM BUILDER ***/
    const [hevyProgram, setHevyProgram] = useState<THevyRoutine[]>([]);
    const hevyProgramRef = useRef<THevyRoutine[]>(hevyProgram);
    hevyProgramRef.current = hevyProgram;
    const [undoStack, setUndoStack] = useState<Operation[][]>([]);
    /*************************************************************************************/

    const empty = searchParams.get('empty') ?? '';
    const search = searchParams.get('search') ?? '';

    // TODO: These will be short term memory for now but eventually we will want some long term memory for the user
    const [sex, setSex] = useState<string>("");
    const [age, setAge] = useState<string>("");
    const [daysPerWeek, setDaysPerWeek] = useState<string>("");
    const [specificDays, setSpecificDays] = useState<IOption[]>([]);
    const [programLength, setProgramLength] = useState<""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12">("");
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

    const [explore, toggleExplore] = useReducer(prev => !prev, true);
    const [programTitle, setProgramTitle] = useState("My Proxima Program");
    const [addExerciseDialog, setAddExerciseDialog] = useState<THevyDialog>({folder_id: 0, dayOrder: 0, isOpen: false});
    // const [generateDayDialog, setGenerateDayDialog] = useState<THevyDialog>({folder_id: 0, dayOrder: 0, isOpen: false});
    const [addNoteDialog, setAddNoteDialog] = useState<THevyDialog>({folder_id: 0, dayOrder: 0, isOpen: false});
    const [addExerciseNoteDialog, setAddExerciseNoteDialog] = useState<THevyDialog>({folder_id: 0, dayOrder: 0, isOpen: false});
    const [isEditExercise, setIsEditExercise] = useState(false);
    const [generationError, setGenerationError] = useState<Error | null>(null);
    // Derive error state from useChat error - no need for effect, just use the error directly
    // The onError callback already handles setting generationError, but we also
    // check useChat's error for cases where the error comes through the hook


    // Track if initial search has been triggered for this component instance
    const initialSearchOccurred = useRef<boolean>(false);


    const { messages, sendMessage, setMessages, status, stop, error } = useChat({
        transport: new DefaultChatTransport({
          api: '/api/chat',
        }),
        onError: (err) => {
          console.error('Chat error:', err);
          setGenerationError(err);
          setIsBuilding(false);
        },
      });

      const activeError = generationError || error || null;

      const isSubmitted = status === 'submitted';
      const isStreaming = status === 'streaming';
      const isLoading = isSubmitted || isStreaming;

    const [input, setInput] = useState("");
    const [retryCount, setRetryCount] = useState(0);
    const [isBuilding, setIsBuilding] = useState(false);
    const prevIsBuildingRef = useRef(isBuilding);
    const MAX_RETRIES = 2;

            // Wrapper that sends current program and filter context with every chat request so the API
    // (and getCurrentProgram tool) see the actual state (e.g. when program was loaded via shareId).
    const sendMessageWithContext = useCallback(
        (message: Parameters<typeof sendMessage>[0], options?: Parameters<typeof sendMessage>[1]) => {
            const text = getTextFromChatMessage(message);
            const includeProgram = isMessageAboutProgram(text);
            const contextBody = {
                hevyProgram: includeProgram ? (hevyProgramRef?.current ?? hevyProgram) : [],
                daysPerWeek: daysPerWeek ? Number(daysPerWeek) : undefined,
                programLength: programLength ? Number(programLength) : undefined,
                excludeAreas: excludeAreas?.length ? excludeAreas.map((o) => o.value).join(", ") : "",
                excludeEquipment: excludeEquipment?.length ? excludeEquipment.map((o) => o.value).join(", ") : "",
                healthIssues: healthIssues?.length ? healthIssues.map((o) => o.value).join(", ") : "",
            };
            return sendMessage(message, { ...options, body: { ...contextBody, ...options?.body } });
        },
        [sendMessage, hevyProgram, hevyProgramRef, daysPerWeek, programLength, excludeAreas, excludeEquipment, healthIssues]
    );

    const sendMessageRef = useRef(sendMessageWithContext);
    const prevErrorRef = useRef<Error | null>(null);

    useEffect(() => {
        posthog.capture('page_view', { page: '/build-program', user: user?.id ?? "user_id_unknown" });
    }, [user]);

    useEffect(() => {
        if (activeError && prevErrorRef.current === null) {
            posthog.capture("ai_agent_error", {
                user: user?.id ?? "user_id_unknown",
                errorMessage: activeError?.message ?? "unknown",
            });
            prevErrorRef.current = activeError;
        }
        if (activeError === null) {
            prevErrorRef.current = null;
        }
    }, [activeError, user]);

    useEffect(() => {
        sendMessageRef.current = sendMessageWithContext;
    }, [sendMessageWithContext]);



    // Initialize with search parameter if present
    useEffect(() => {
        // Only send if we have a search value, haven't sent it yet in this instance, and sendMessage is available
        if (search && search.trim().length > 0 && !initialSearchOccurred.current && sendMessageRef.current) {
            initialSearchOccurred.current = true;
            sendMessageRef.current({ text: search });
            posthog.capture('sent_first_prompt_to_ai', { search: search, user: user?.id ?? "user_id_unknown" });
        }
    }, [search, user]);

    const handleSubmit = () => {
        if (!input.trim()) return

        sendMessageWithContext({ text: input });
        setInput('');
    }

    const handleStop = () => {
        stop();
        setIsBuilding(false);
    }

    const handleIsBuilding = useCallback((isBuilding: boolean) => {
        setIsBuilding(isBuilding);
    }, []);

    // Handle retry when generation fails
    const handleRetry = useCallback(() => {
        if (retryCount < MAX_RETRIES) {
            setGenerationError(null);
            setRetryCount(prev => prev + 1);
            setIsBuilding(true);
            sendMessageWithContext({ text: "Build my program" });
        }
    }, [retryCount, sendMessageWithContext]);

    // Clear error state (used when user wants to start fresh or use fallback)
    const handleClearError = useCallback(() => {
        setGenerationError(null);
        setRetryCount(0);
        setIsBuilding(false);
    }, []);

    // Handle timeout error - called when no progress is made for 45 seconds
    const handleTimeoutError = useCallback(() => {
        console.error('Workout generation timed out - no progress for 45 seconds');
        setGenerationError(new Error('Generation timed out. The AI took too long to respond.'));
        setIsBuilding(false);
        stop(); // Stop the current request
    }, [stop]);

    const handleIsEditExercise = (isEditExercise: boolean) => {
        setIsEditExercise(isEditExercise);
    };

    // // Duplicates the selected week to other selected weeks
    const handleDuplicateWeek = (fromWeekIndex: number, toWeekIndexes: number[]) => {

        setHevyProgram((prev) => {

            const filteredPrev = prev.filter((day) => !toWeekIndexes.includes(day.folder_id));

            const daysToCopy = prev.filter((day) => day.folder_id === fromWeekIndex);

            let maxId = Math.max(...prev.map((d) => Number(d.id)));

            const newDays = toWeekIndexes.flatMap((week) =>
                daysToCopy.map((day) => ({
                    ...day,
                    id: String(++maxId),
                    folder_id: week,
                })),
            );

            return reorderHevy([...filteredPrev, ...newDays]);
        });
    };

    // Duplicates the selected day to other days in the program on the selected week
    const handleDuplicateDay = (fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayOrderArray: IOption[]) => {

        const toDayOrders = toDayOrderArray.map((day) => Number(day.value)).sort((a, b) => a - b);

        setHevyProgram((prev) => {
            const dayToCopy = prev.find((day) => Number(day.folder_id) === fromWeekOrder && Number(day.order) === fromDayOrder);

            if (!dayToCopy) return prev;

            const existingDaysInTargetWeek = prev.filter((day) => Number(day.folder_id) === toWeekOrder);
            const maxExistingOrderinTargetWeek = Math.max(...existingDaysInTargetWeek.map((day) => Number(day.order)), 0);

            let newId = Math.max(...prev.map((day) => Number(day.id)), 0) + 1;
            let updatedDays = [...prev];

            const maxToDayOrder = Math.max(...toDayOrders);

            if (maxToDayOrder > maxExistingOrderinTargetWeek) {
                for (let i = maxExistingOrderinTargetWeek + 1; i <= maxToDayOrder; i++) {
                    if (
                        !existingDaysInTargetWeek.some((day) => Number(day.order) === i) &&
                        !toDayOrders.includes(i)
                    ) {
                        updatedDays.push({
                            id: String(newId++),
                            folder_id: toWeekOrder,
                            order: String(i),
                            exercises: [],
                            title: "",
                            notes: "",
                        });
                    }
                }
            }

            // Remove days that are going to be replaced
            updatedDays = updatedDays.filter((day) => !(day.folder_id === toWeekOrder && toDayOrders.includes(Number(day.order))));

            // Add new days in their place
            const newDays = toDayOrders.map((dayOrder) => ({
                ...dayToCopy,
                id: String(newId++),
                folder_id: toWeekOrder,
                order: String(dayOrder),
            }));

            return sortHevyByOrder([...newDays,...updatedDays]);
        });
    };

    // State for opening the Add Exercise Dialog with the correct week and day
    const handleOpenAddExerciseDialog = (addExerciseDialog: THevyDialog) => {
        if (addExerciseDialog.isOpen === false) {
            setIsEditExercise(false);
        }
        setAddExerciseDialog(addExerciseDialog);
    };

    // State for opening the Generate Day Dialog with the correct week and day
    // const handleOpenGenerateDayDialog = (generateDayDialog: THevyDialog) => {
    //     setGenerateDayDialog(generateDayDialog);
    // };

    // State for opening the Add Note Dialog with the correct week and day
    const handleOpenAddNoteDialog = (addNoteDialog: THevyDialog) => {
        setAddNoteDialog(addNoteDialog);
    };

    // State for opening the Add Exercise Note Dialog with the correct week and day
    const handleOpenAddExerciseNoteDialog = (addExerciseNoteDialog: THevyDialog) => {
        setAddExerciseNoteDialog(addExerciseNoteDialog);
    };

    // // Will re-generate the currently selected day based on a prompt
    // const handleGenerateDay = async (folder_id: number, dayOrder:number, prompt: string) => {
    //     const response = await aiRequest(1, prompt);
    //     if (response === undefined) {
    //         toast.error("Error generating day");
    //         return;
    //     }

    //     const parsedResponse = JSON.parse(response);
    //     // const oneDayRoutine = await buildHevyProgram(parsedResponse,1,1,"","","");
    //     if (oneDayRoutine) {
    //         setHevyProgram((prevProgram) =>
    //             prevProgram.map((routine) =>
    //                 routine.folder_id === folder_id && routine.order === dayOrder.toString()
    //                     ? { exercises: oneDayRoutine[0].exercises, id: routine.id, folder_id, order: dayOrder.toString(), title: oneDayRoutine[0].title ?? routine.title, notes: "" }
    //                     : routine
    //             )
    //         );
    //     }
    // };


    // Adds an empty day to the selected week
    const handleAddDay = (folder_id: number) => {

        const daysInFolder = hevyProgram.filter((day) => day.folder_id === folder_id);

        if (daysInFolder.length >= 7) {
            toast.error("Maximum 7 days per week");
            return;
        }

        setHevyProgram((prev) => {
            const nthDayOrder = prev.filter((day) => day.folder_id === folder_id).length + 1;

            const maxId = Math.max(...prev.map((d) => Number(d.id)));

            const newEmptyDay: THevyRoutine = {
                id: String(maxId + 1),
                folder_id,
                order: String(nthDayOrder),
                exercises: [],
                title: "",
                notes: "",
            };

            return [...prev, newEmptyDay];
        });
    };

    // // Deletes selected day from selected week by id
    const handleDeleteDay = (id: string) => {
        setHevyProgram((prev) => {
            let newDays = prev.filter((day) => day.id !== id);
            newDays = reorderHevy(newDays);
            return newDays;
        });
    };


    const handleEditTitle = (id: string, title: string) => {
        setHevyProgram((prev) =>
            prev.map((day) =>
                day.id === id ? { ...day, title: title} : day,
            ),
        );
    };

    // // Deletes an exercise from a workout day
    const handleDeleteExercise = (folder_id: number, dayOrder: number, exerciseIndex: number) => {
        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: day.exercises.filter((_, index) => index !== exerciseIndex),
                    };
                }
                return day;
            });
        });
    };

    // Adds an exercise to the workout day
    const handleAddExercise = async (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => {

        const sets = hevyAddExerciseToHevySetsConverter(exercise);

        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: [...day.exercises,
                            {
                                index: day.exercises.length + 1,
                                title: exercise?.selectedExercise?.title ?? "",
                                notes: "",
                                exercise_template_id: exercise?.selectedExercise?.id ?? "",
                                supersets_id: null,
                                sets: sets,
                                rest_seconds: exercise?.restSeconds ?? null,
                            },
                            ],
                    };
                }
                return day;
            });
        });
    };

    // Adds a routine as a day to the selected week
    const handleAddRoutineAsDay = (routine: THevyRoutine, folder_id: number) => {

        const daysInFolder = hevyProgram.filter((day) => day.folder_id === folder_id);

        if (daysInFolder.length >= 7) {
            toast.error("Maximum 7 days per week");
            return;
        }

        setHevyProgram((prev) => {
            const nthDayOrder = prev.filter((day) => day.folder_id === folder_id).length + 1;

            const maxId = Math.max(...prev.map((d) => Number(d.id)));

            const newEmptyDay: THevyRoutine = {
                id: String(maxId + 1),
                folder_id,
                order: String(nthDayOrder),
                exercises: routine.exercises,
                title: routine.title ?? "",
                notes: routine.notes ?? "",
            };

            return [...prev, newEmptyDay];
        });
    };

    // Adds a note to the selected day (routine)
    const handleAddRoutineNote = (folder_id: number, dayOrder: number, prompt: string) => {
        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return { ...day, notes: prompt };
                }
                return day;
            });
        });
    };

    // Adds a note to an exercise on a workout day
    const handleAddExerciseNote = (folder_id: number, dayOrder: number, exerciseIndex: number, prompt: string) => {
        setHevyProgram((prev) => {
            return prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: day.exercises.map((exercise, index) => index === exerciseIndex ? { ...exercise, notes: prompt } : exercise),
                    };
                } else {
                    return day;
                }
            });
        });
    };

    const getNextSupersetId = (day: THevyRoutine) => {
        const currentSupersetIds = Array.from(new Set(
            day.exercises
                .filter((e) => e.supersets_id !== null)
                .map((e) => e.supersets_id)
        )).sort((a, b) => (a || 0) - (b || 0));

        let nextId = 0;
        for (const currentId of currentSupersetIds) {
            if (currentId !== nextId) {
                return nextId;
            }
            nextId++;
        }
        return nextId;
    };

    const handleCreateSuperset = (dayId: string, selectedExercises: number[]) => {
        if (selectedExercises.length < 2) {
            return;
        }
        setHevyProgram((prev) => {
            return prev.map((routine) => {
                if (routine.id === dayId) {
                    const nextSupersetId = getNextSupersetId(routine);
                    return {
                        ...routine,
                        exercises: routine.exercises.map((exercise, index) => {
                            if (selectedExercises.includes(index)) {
                                return {
                                    ...exercise,
                                    supersets_id: nextSupersetId,
                                };
                            }
                            return exercise;
                        }),
                    };
                }
                return routine;
            });
        });
    };

    const handleRemoveFromSuperset = (dayId: string, exerciseIndex: number) => {
        setHevyProgram((prev) => {
            return prev.map((routine) => {
                if (routine.id === dayId) {
                    return {
                        ...routine,
                        exercises: routine.exercises.map((exercise, index) => {
                            if (index === exerciseIndex) {
                                return {
                                    ...exercise,
                                    supersets_id: null,
                                };
                            }
                            return exercise;
                        }),
                    };
                }
                return routine;
            });
        });
    };

    // // Edits an exercise on a workout day
    const handleEditExercise = async (editExercise: THevyDialog) => {

        if (editExercise.editExercise) {
            const sets = hevyAddExerciseToHevySetsConverter(editExercise.editExercise);

            setHevyProgram((prev) => {
                return prev.map((day) => {
                    if (Number(day.folder_id) === editExercise.folder_id && Number(day.order) === editExercise.dayOrder) {
                        return {
                            ...day,
                            exercises: day.exercises.map((exercise, index) => index === editExercise.exerciseIndex ? {
                                ...exercise,
                                index: day.exercises.length + 1,
                                title: editExercise?.editExercise?.selectedExercise?.title ?? "",
                                notes: exercise?.notes ?? "",
                                reason: exercise?.reason ?? "",
                                exercise_template_id: editExercise?.editExercise?.selectedExercise?.id ?? "",
                                supersets_id: exercise?.supersets_id ?? null,
                                sets: sets,
                                rest_seconds: editExercise?.editExercise?.restSeconds ?? null,
                            } : exercise),
                        };
                    }
                    return day;
                });
            });
        }

        setIsEditExercise(false);
    };

    const [focusedCardId, setFocusedCardId] = useState<string>("");
    const isMobile = useIsMobile();
    const numberOfWeeks = useMemo(() => getNumberRoutineFolders(hevyProgram), [hevyProgram]);
    const numberOfWeeksArr = useMemo(() => Array.from({ length: numberOfWeeks }, (_, i) => i), [numberOfWeeks]);

    // On mobile, auto-switch to My Program tab when build completes
    useEffect(() => {
        if (!isMobile) return;
        const wasBuilding = prevIsBuildingRef.current;
        const hasProgram = hevyProgram.some((r) => r.exercises.length > 0);
        if (wasBuilding && !isBuilding && hasProgram) {
            setMobileTab("program");
        }
        prevIsBuildingRef.current = isBuilding;
    }, [isBuilding, isMobile, hevyProgram, setMobileTab]);

    const addToUndoStack = useCallback((inversePatch: Operation[]) => {
        setUndoStack((prev) => [...prev, inversePatch]);
    }, []);

    const handleUndo = useCallback(() => {

        if (undoStack.length === 0) return;
        const inversePatch: Operation[] = undoStack[undoStack.length - 1];
        try {
            const result = applyPatch(
                hevyProgram as object,
                inversePatch,
                true,
                false
            ) as { newDocument: THevyRoutine[] };
            const newDocument = result.newDocument as THevyRoutine[];
            hevyProgramRef.current = newDocument;
            setHevyProgram(newDocument);
            setUndoStack((prev) => prev.slice(0, -1));
        } catch (e) {
            toast.error("Undo failed.");
            console.error("Undo failed.", e);
        }
    }, [hevyProgram, undoStack]);

    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
    useEffect(() => {
        setPortalTarget(document.getElementById("toolbar-undo-portal"));
    }, []);

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
            if (size >= 20 && size <= EXPANDED_SIZE) {
                setSidebarSize(size);
            }
        }
    }, []);


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

    useEffect(() => {
        if (typeof window !== "undefined") {
            // Don't overwrite localStorage with empty program when resuming
            if (hevyProgram.length === 0 && resume === 'true') {
                return;
            }
            localStorage.setItem("hevy-program-in-progress", JSON.stringify(hevyProgram));
            localStorage.setItem("hevy-request", JSON.stringify(request));
        }
    }, [hevyProgram, request, resume]);

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

    const onToggleExpand = useCallback(() => {
        const panel = sidebarPanelRef.current;
        if (!panel) return;
        const current = panel.getSize();
        if (current <= COLLAPSED_SIZE + 5) {
            panel.resize(EXPANDED_SIZE);
        } else {
            panel.resize(COLLAPSED_SIZE);
        }
    }, []);

    const isExpanded = sidebarSize >= EXPANDED_SIZE - 5;

    // Handler functions memoized to prevent unnecessary re-renders
    const handleSex = useCallback((value: string) => { setSex(value); }, []);
    const handleAge = useCallback((value: string) => { setAge(value); }, []);
    const handleDaysPerWeek = useCallback((value: string) => { setDaysPerWeek(value); }, []);
    const handleSpecificDays = useCallback((value: IOption[]) => { setSpecificDays(value); }, []);
    const handleProgramLength = useCallback((value: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12") => { setProgramLength(value); }, []);
    const handleWorkoutDuration = useCallback((value: string) => { setWorkoutDuration(value); }, []);
    const handleActivityLevel = useCallback((value: string) => { setActivityLevel(value); }, []);
    const handleGoals = useCallback((value: IOption[]) => { setGoals(value); }, []);
    const handleSpecialization = useCallback((value: IOption[]) => { setSpecialization(value); }, []);
    const handleEquipment = useCallback((value: IOption[]) => { setEquipment(value); }, []);
    const handleFocusAreas = useCallback((value: IOption[]) => { setFocusAreas(value); }, []);
    const handleDifficultyLevel = useCallback((value: IOption[]) => { setDifficultyLevel(value); }, []);
    const handleExcludeAreas = useCallback((value: IOption[]) => { setExcludeAreas(value); }, []);
    const handleExcludeEquipment = useCallback((value: IOption[]) => { setExcludeEquipment(value); }, []);
    const handleExcludeSpecializations = useCallback((value: IOption[]) => { setExcludeSpecializations(value); }, []);
    const handleHealthIssues = useCallback((value: IOption[]) => { setHealthIssues(value); }, []);
    const handleProgramTitle = useCallback((value: string) => { setProgramTitle(value); }, []);
    const handleExplore = useCallback(() => { toggleExplore(); }, []);

    // Auto-set filters from search prompt on initial load
    useEffect(() => {
        if (search && search.trim().length > 0) {
            // Only set if current filter value is empty (don't override user-set values)
            if (!daysPerWeek) {
                const inferredDays = inferDaysPerWeek(search);
                if (inferredDays) {
                    setDaysPerWeek(inferredDays);
                }
            }
            if (!programLength) {
                const inferredLength = inferProgramLength(search);
                if (inferredLength) {
                    setProgramLength(inferredLength);
                }
            }
        }
    }, [daysPerWeek, programLength, search]); // Only run when search changes, not when daysPerWeek/programLength change

    const undoButton = portalTarget && createPortal(
        undoStack.length > 0 ? (
            <Button
                size="sm"
                onClick={handleUndo}
                className="gap-2 bg-lightGold hover:bg-lightGold/80 text-black h-9"
            >
                <Undo2 className="h-4 w-4" />
                Undo
            </Button>
        ) : null,
        portalTarget
    );

    return (
        <>
            {undoButton}
            <div className="max-sm:hidden sm:block">
                <ResizablePanelGroup
                    direction="horizontal"
                >
                {sidebarPosition === "left" ? (
                    <>
                        <ResizablePanel
                            ref={sidebarPanelRef}
                            id="sidebar"
                            order={1}
                            defaultSize={sidebarSize}
                            onResize={(size) => {
                                setSidebarSize(size);
                                localStorage.setItem(SIDEBAR_SIZE_KEY, size.toString());
                            }}
                            minSize={20}
                            maxSize={EXPANDED_SIZE}
                            className="border-extraLightGray bg-extraLightGray dark:bg-extraDarkGray dark:text-white"
                        >
                            <Agent
                                search={search}
                                sidebarPosition={sidebarPosition}
                                onTogglePosition={toggleSidebarPosition}
                                onToggleExpand={onToggleExpand}
                                isExpanded={isExpanded}
                                setHevyProgram={setHevyProgram}
                                hevyProgram={hevyProgram}
                                hevyProgramRef={hevyProgramRef}
                                addToUndoStack={addToUndoStack}
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
                                messages={messages}
                                setMessages={setMessages}
                                sendMessageWithContext={sendMessageWithContext}
                                isBuilding={isBuilding}
                                handleIsBuilding={handleIsBuilding}
                                isLoading={isLoading}
                                error={activeError}
                                onRetry={handleRetry}
                                onClearError={handleClearError}
                                retryCount={retryCount}
                                maxRetries={MAX_RETRIES}
                                onTimeoutError={handleTimeoutError}
                                isSubmitted={isSubmitted}
                                input={input}
                                setInput={setInput}
                                handleSubmit={handleSubmit}
                                handleStop={handleStop}
                            />
                        </ResizablePanel>
                        <ResizableHandle withHandle className="" />
                        <ResizablePanel
                            id="main-content"
                            order={2}
                            minSize={30}
                            className="bg-white dark:bg-darkGray"
                        >
                            { hevyProgram.length > 0 ? (
                            <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden">
                                <HevyRoutine
                                    hevyProgram={appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[]}
                                    setHevyProgram={setHevyProgram}
                                    isMobile={isMobile}
                                    addExerciseDialog={addExerciseDialog}
                                    addNoteDialog={addNoteDialog}
                                    addExerciseNoteDialog={addExerciseNoteDialog}
                                    isEditExercise={isEditExercise}
                                    handleIsEditExercise={handleIsEditExercise}
                                    handleDuplicateWeek={handleDuplicateWeek}
                                    handleDuplicateDay={handleDuplicateDay}
                                    handleOpenAddExerciseDialog={handleOpenAddExerciseDialog}
                                    handleOpenAddNoteDialog={handleOpenAddNoteDialog}
                                    handleOpenAddExerciseNoteDialog={handleOpenAddExerciseNoteDialog}
                                    handleAddDay={handleAddDay}
                                    handleDeleteDay={handleDeleteDay}
                                    handleEditTitle={handleEditTitle}
                                    handleDeleteExercise={handleDeleteExercise}
                                    handleAddExercise={handleAddExercise}
                                    handleAddRoutineAsDay={handleAddRoutineAsDay}
                                    handleAddRoutineNote={handleAddRoutineNote}
                                    handleAddExerciseNote={handleAddExerciseNote}
                                    getNextSupersetId={getNextSupersetId}
                                    handleCreateSuperset={handleCreateSuperset}
                                    handleRemoveFromSuperset={handleRemoveFromSuperset}
                                    handleEditExercise={handleEditExercise}
                                    focusedCardId={focusedCardId}
                                    setFocusedCardId={setFocusedCardId}
                                    numberOfWeeks={numberOfWeeks}
                                    numberOfWeeksArr={numberOfWeeksArr}
                                />
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
                            className="bg-white dark:bg-darkGray"
                        >
                            { hevyProgram.length > 0 ? (
                            <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden">
                                <HevyRoutine
                                    hevyProgram={appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[]}
                                    setHevyProgram={setHevyProgram}
                                    isMobile={isMobile}
                                    addExerciseDialog={addExerciseDialog}
                                    addNoteDialog={addNoteDialog}
                                    addExerciseNoteDialog={addExerciseNoteDialog}
                                    isEditExercise={isEditExercise}
                                    handleIsEditExercise={handleIsEditExercise}
                                    handleDuplicateWeek={handleDuplicateWeek}
                                    handleDuplicateDay={handleDuplicateDay}
                                    handleOpenAddExerciseDialog={handleOpenAddExerciseDialog}
                                    handleOpenAddNoteDialog={handleOpenAddNoteDialog}
                                    handleOpenAddExerciseNoteDialog={handleOpenAddExerciseNoteDialog}
                                    handleAddDay={handleAddDay}
                                    handleDeleteDay={handleDeleteDay}
                                    handleEditTitle={handleEditTitle}
                                    handleDeleteExercise={handleDeleteExercise}
                                    handleAddExercise={handleAddExercise}
                                    handleAddRoutineAsDay={handleAddRoutineAsDay}
                                    handleAddRoutineNote={handleAddRoutineNote}
                                    handleAddExerciseNote={handleAddExerciseNote}
                                    getNextSupersetId={getNextSupersetId}
                                    handleCreateSuperset={handleCreateSuperset}
                                    handleRemoveFromSuperset={handleRemoveFromSuperset}
                                    handleEditExercise={handleEditExercise}
                                    focusedCardId={focusedCardId}
                                    setFocusedCardId={setFocusedCardId}
                                    numberOfWeeks={numberOfWeeks}
                                    numberOfWeeksArr={numberOfWeeksArr}
                                />
                            </div>
                            ) : (
                                <BuildProgramSkeleton />
                            )}
                        </ResizablePanel>
                        <ResizableHandle withHandle className="" />
                        <ResizablePanel
                            ref={sidebarPanelRef}
                            id="sidebar"
                            order={2}
                            defaultSize={sidebarSize}
                            onResize={(size) => {
                                setSidebarSize(size);
                                localStorage.setItem(SIDEBAR_SIZE_KEY, size.toString());
                            }}
                            minSize={20}
                            maxSize={EXPANDED_SIZE}
                            className="border-extraLightGray bg-extraLightGray dark:bg-extraDarkGray dark:text-white"
                        >
                            <Agent
                                search={search}
                                sidebarPosition={sidebarPosition}
                                onTogglePosition={toggleSidebarPosition}
                                onToggleExpand={onToggleExpand}
                                isExpanded={isExpanded}
                                setHevyProgram={setHevyProgram}
                                hevyProgram={hevyProgram}
                                hevyProgramRef={hevyProgramRef}
                                addToUndoStack={addToUndoStack}
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
                                messages={messages}
                                setMessages={setMessages}
                                sendMessageWithContext={sendMessageWithContext}
                                isBuilding={isBuilding}
                                handleIsBuilding={handleIsBuilding}
                                isLoading={isLoading}
                                error={activeError}
                                onRetry={handleRetry}
                                onClearError={handleClearError}
                                retryCount={retryCount}
                                maxRetries={MAX_RETRIES}
                                onTimeoutError={handleTimeoutError}
                                isSubmitted={isSubmitted}
                                input={input}
                                setInput={setInput}
                                handleSubmit={handleSubmit}
                                handleStop={handleStop}
                            />
                        </ResizablePanel>
                    </>
                )}
                </ResizablePanelGroup>
            </div>
            <div className="max-sm:block sm:hidden h-[calc(100vh-4rem)] flex flex-col relative">
                <Tabs value={mobileTab} onValueChange={(value) => {
                    // Prevent switching to Program tab if program has no exercises
                    if (value === "program" && !hevyProgram.some(r => r.exercises.length > 0)) {
                        return;
                    }
                    setMobileTab(value);
                }} className="flex flex-col h-full">
                    <TabsContent value="chat" className="flex-1 m-0 mt-0 px-4 pb-20">
                        <Agent
                            search={search}
                            sidebarPosition="left"
                            onTogglePosition={() => {}}
                            onToggleExpand={() => {}}
                            isExpanded={false}
                            setHevyProgram={setHevyProgram}
                            hevyProgram={hevyProgram}
                            hevyProgramRef={hevyProgramRef}
                            addToUndoStack={addToUndoStack}
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
                            messages={messages}
                            setMessages={setMessages}
                            sendMessageWithContext={sendMessageWithContext}
                            isBuilding={isBuilding}
                            handleIsBuilding={handleIsBuilding}
                            isLoading={isLoading}
                            error={activeError}
                            onRetry={handleRetry}
                            onClearError={handleClearError}
                            retryCount={retryCount}
                            maxRetries={MAX_RETRIES}
                            onTimeoutError={handleTimeoutError}
                            isSubmitted={isSubmitted}
                            input={input}
                            setInput={setInput}
                            handleSubmit={handleSubmit}
                            handleStop={handleStop}
                        />
                    </TabsContent>
                    <TabsContent value="program" className="flex-1 overflow-y-auto m-0 mt-0 px-4 pb-20 bg-white dark:bg-darkGray">
                        { hevyProgram.length > 0 ? (
                            <div className="w-full max-w-full overflow-x-hidden">
                                <HevyRoutine
                                    hevyProgram={appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[]}
                                    setHevyProgram={setHevyProgram}
                                    isMobile={isMobile}
                                    addExerciseDialog={addExerciseDialog}
                                    addNoteDialog={addNoteDialog}
                                    addExerciseNoteDialog={addExerciseNoteDialog}
                                    isEditExercise={isEditExercise}
                                    handleIsEditExercise={handleIsEditExercise}
                                    handleDuplicateWeek={handleDuplicateWeek}
                                    handleDuplicateDay={handleDuplicateDay}
                                    handleOpenAddExerciseDialog={handleOpenAddExerciseDialog}
                                    handleOpenAddNoteDialog={handleOpenAddNoteDialog}
                                    handleOpenAddExerciseNoteDialog={handleOpenAddExerciseNoteDialog}
                                    handleAddDay={handleAddDay}
                                    handleDeleteDay={handleDeleteDay}
                                    handleEditTitle={handleEditTitle}
                                    handleDeleteExercise={handleDeleteExercise}
                                    handleAddExercise={handleAddExercise}
                                    handleAddRoutineAsDay={handleAddRoutineAsDay}
                                    handleAddRoutineNote={handleAddRoutineNote}
                                    handleAddExerciseNote={handleAddExerciseNote}
                                    getNextSupersetId={getNextSupersetId}
                                    handleCreateSuperset={handleCreateSuperset}
                                    handleRemoveFromSuperset={handleRemoveFromSuperset}
                                    handleEditExercise={handleEditExercise}
                                    focusedCardId={focusedCardId}
                                    setFocusedCardId={setFocusedCardId}
                                    numberOfWeeks={numberOfWeeks}
                                    numberOfWeeksArr={numberOfWeeksArr}
                                />
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
                            disabled={!hevyProgram.some(r => r.exercises.length > 0)}
                            className={cn(
                                "flex-1 rounded-lg py-2 flex flex-row items-center justify-center gap-2 transition-colors",
                                hevyProgram.some(r => r.exercises.length > 0)
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
