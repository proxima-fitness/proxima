"use client";

/**
 * @module (app)/(with-toolbar)/build-program/BuildProgramClient
 *
 * Full AI program-builder UI: chat + program editor (Hevy-style routines), filters,
 * share/resume/empty/search URL handling, undo, dialogs. Sits under build-program
 * layout; drives useChat, program state, and tool calls.
 *
 * Depends on: useChat, UserContext, PreviewContext, HevyContext, resizable panels,
 * Agent, HevyRoutine, program-builder utils, API (getSharedProgram, recordLlmRequest).
 * Used by: build-program/page.tsx.
 */

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
const PENDING_ATTACHMENTS_KEY = "pending-attachments";
const PENDING_INITIAL_PROMPT_KEY = "pending-initial-prompt";
const LONG_PROMPT_PLACEHOLDER = "__long_prompt__";
const COLLAPSED_SIZE = 30;
const EXPANDED_SIZE = 70;
import { useSearchParams } from "next/navigation";
import { usePreview } from "@/contexts/PreviewContext";
import { useIsHevy } from "@/contexts/HevyContext";
import { BuildProgramSkeleton } from "@/components/program-builder/shared/BuildProgramSkeleton";
import { appendOrderToHevyRoutines } from "@/components/program-builder/utils/format-responses";
import { HevyRoutine } from "@/components/program-builder/hevy/HevyRoutine";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSharedProgram } from "@/api/programs";
import { emptyHevyRoutineProgram, focusAreasOptions, equipmentOptions, healthIssuesOptions } from "@/assets/constants";
import { IOption } from "@/components/ui/multi-select";
import { inferDaysPerWeek, inferProgramLength, inferExcludeAreas, inferExcludeEquipment, inferHealthIssues } from "@/components/program-builder/utils/helpers";
import { toast } from "sonner";
import { getNumberRoutineFolders, hevyAddExerciseToHevySetsConverter, reorderHevy, sortHevyByOrder } from "@/components/program-builder/utils";
import { applyPatch, type Operation } from "fast-json-patch";

/** Editor state: program + undo stack for atomic transitions and stable handleUndo */
type EditorState = {
    hevyProgram: THevyRoutine[];
    undoStack: Operation[][];
};

type EditorAction =
    | { type: "APPLY_PATCH"; newDocument: THevyRoutine[]; inversePatch: Operation[] }
    | { type: "UNDO" }
    | { type: "REPLACE_PROGRAM"; program: THevyRoutine[] }
    | { type: "UPDATE_PROGRAM"; updater: (prev: THevyRoutine[]) => THevyRoutine[] };

function editorReducer(state: EditorState, action: EditorAction): EditorState {
    switch (action.type) {
        case "APPLY_PATCH":
            return {
                hevyProgram: action.newDocument,
                undoStack: [...state.undoStack, action.inversePatch],
            };
        case "UNDO": {
            if (state.undoStack.length === 0) return state;
            const inversePatch = state.undoStack[state.undoStack.length - 1];
            try {
                const result = applyPatch(
                    state.hevyProgram as object,
                    inversePatch,
                    true,
                    false
                ) as { newDocument: THevyRoutine[] };
                return {
                    hevyProgram: result.newDocument as THevyRoutine[],
                    undoStack: state.undoStack.slice(0, -1),
                };
            } catch (e) {
                toast.error("Undo failed.");
                console.error("Undo failed.", e);
                return state;
            }
        }
        case "REPLACE_PROGRAM":
            return { ...state, hevyProgram: action.program };
        case "UPDATE_PROGRAM":
            return { ...state, hevyProgram: action.updater(state.hevyProgram) };
        default:
            return state;
    }
}
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import { getTextFromChatMessage, isMessageAboutProgram } from "@/components/program-builder/utils/helpers"
import posthog from "posthog-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUserContext } from "@/contexts/UserContext";
import { recordLlmRequest } from "@/api/featureLimits";

const chatTransport = new DefaultChatTransport({ api: "/api/chat" });

/**
 * Program builder client: chat sidebar, program state (hevyProgram), filters,
 * URL params (shareId, edit, resume, shared, empty, search). No props; reads
 * searchParams and context. No props; reads searchParams and context.
 */
export function BuildProgramClient() {
    const { isHevy } = useIsHevy();
    const { user } = useUserContext();
    const queryClient = useQueryClient();
    const { mutate: incrementLlmRequests } = useMutation({
        mutationFn: () => recordLlmRequest(user),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feature-limits"] });
        },
    });
    const { setIsPreview } = usePreview();
    const searchParams = useSearchParams();

    const shareId = searchParams.get('shareId') ?? '';
    const edit = searchParams.get('edit') ?? '';
    const resume = searchParams.get('resume') ?? '';
    const shared = searchParams.get('shared') ?? '';

    const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");
    const [sidebarSize, setSidebarSize] = useState(28);
    const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
    const lastSidebarSizeRef = useRef(28);
    const [isChatHidden, setIsChatHidden] = useState(false);
    const [mobileTab, setMobileTab] = useState<string>("chat");

    /*************************************************************************************/
    /*** STATE FOR THE PROGRAM BUILDER (reducer for atomic undo + stable handleUndo) ***/
    const [{ hevyProgram, undoStack }, dispatchEditor] = useReducer(editorReducer, {
        hevyProgram: [],
        undoStack: [],
    });
    const setHevyProgram = useCallback(
        (value: THevyRoutine[] | ((prev: THevyRoutine[]) => THevyRoutine[])) => {
            if (typeof value === "function") {
                dispatchEditor({ type: "UPDATE_PROGRAM", updater: value });
            } else {
                dispatchEditor({ type: "REPLACE_PROGRAM", program: value });
            }
        },
        []
    );
    const applyPatchWithUndo = useCallback(
        (newDocument: THevyRoutine[], inversePatch: Operation[]) => {
            dispatchEditor({ type: "APPLY_PATCH", newDocument, inversePatch });
        },
        []
    );
    const orderedProgram = useMemo(
        () => appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[],
        [hevyProgram]
    );
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


    const initialSearchOccurred = useRef<boolean>(false);
    const sharedProgramLoadAttemptedRef = useRef<boolean>(false);
    const resumeLoadAttemptedRef = useRef<boolean>(false);


    const { messages, sendMessage, setMessages, status, stop, error } = useChat({
        transport: chatTransport,
        onError: (err) => {
          console.error('Chat error:', err);
          setGenerationError(err);
          setIsBuilding(false);
        },
      });

    // useEffect(() => {
    //     console.log("Chat message history:", messages);
    // }, [messages]);

      const activeError = generationError || error || null;

      const isSubmitted = status === 'submitted';
      const isStreaming = status === 'streaming';
      const isLoading = isSubmitted || isStreaming;

    const [retryCount, setRetryCount] = useState(0);
    const [isBuilding, setIsBuilding] = useState(false);
    const MAX_RETRIES = 2;

            // Wrapper that sends current program and filter context with every chat request so the API
    // (and getCurrentProgram tool) see the actual state (e.g. when program was loaded via shareId).
    const sendMessageWithContext = useCallback(
        (message: Parameters<typeof sendMessage>[0], options?: Parameters<typeof sendMessage>[1]) => {
            incrementLlmRequests(undefined, { onError: (err) => console.error("Failed to record LLM usage", err) });
            const text = getTextFromChatMessage(message);
            const includeProgram = isMessageAboutProgram(text);
            const contextBody = {
                hevyProgram: includeProgram ? hevyProgram : [],
                daysPerWeek: daysPerWeek ? Number(daysPerWeek) : undefined,
                programLength: programLength ? Number(programLength) : undefined,
                excludeAreas: excludeAreas?.length ? excludeAreas.map((o) => o.value).join(", ") : "",
                excludeEquipment: excludeEquipment?.length ? excludeEquipment.map((o) => o.value).join(", ") : "",
                healthIssues: healthIssues?.length ? healthIssues.map((o) => o.value).join(", ") : "",
            };
            return sendMessage(message, { ...options, body: { ...contextBody, ...options?.body } });
        },
        [sendMessage, hevyProgram, daysPerWeek, programLength, excludeAreas, excludeEquipment, healthIssues, incrementLlmRequests]
    );

    const prevErrorRef = useRef<Error | null>(null);
    const pageViewSentRef = useRef(false);

    useEffect(() => {
        const userId = user?.id ?? "user_id_unknown";
        if (user && !pageViewSentRef.current) {
            posthog?.capture?.('page_view', { page: '/build-program', user: userId });
            pageViewSentRef.current = true;
        }
        if (activeError && prevErrorRef.current === null) {
            posthog?.capture?.("ai_agent_error", {
                user: userId,
                errorMessage: activeError?.message ?? "unknown",
            });
            prevErrorRef.current = activeError;
        }
        if (activeError === null) {
            prevErrorRef.current = null;
        }
    }, [activeError, user]);

    useEffect(() => {
        const isLongPromptPlaceholder = search === LONG_PROMPT_PLACEHOLDER;
        // Long prompts: URL uses placeholder; real text in sessionStorage to avoid URL length limits
        const messageText = isLongPromptPlaceholder
            ? (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(PENDING_INITIAL_PROMPT_KEY) : null) ?? ""
            : search;
        if (!messageText?.trim() || initialSearchOccurred.current) return;
        if (shared === 'true' && shareId && hevyProgram.length === 0 && !sharedProgramLoadAttemptedRef.current) return;
        if (resume === 'true' && hevyProgram.length === 0) return;
        initialSearchOccurred.current = true;
        if (isLongPromptPlaceholder && typeof sessionStorage !== "undefined") {
            sessionStorage.removeItem(PENDING_INITIAL_PROMPT_KEY);
        }
        let files: FileUIPart[] | undefined;
        try {
            const stored = sessionStorage.getItem(PENDING_ATTACHMENTS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (Array.isArray(parsed)) {
                    files = parsed.filter(
                        (p): p is FileUIPart =>
                            p != null && typeof p === "object" && p.type === "file" && typeof (p as FileUIPart).url === "string"
                    );
                }
                sessionStorage.removeItem(PENDING_ATTACHMENTS_KEY);
            }
        } catch {
            // ignore parse errors or missing key
        }
        // Infer filters from the search prompt once before sending the first message
        if (!daysPerWeek) {
            const inferredDays = inferDaysPerWeek(messageText);
            if (inferredDays) setDaysPerWeek(inferredDays);
        }
        if (!programLength) {
            const inferredLength = inferProgramLength(messageText);
            if (inferredLength) setProgramLength(inferredLength);
        }
        if (excludeAreas.length === 0) {
            const inferred = inferExcludeAreas(messageText, focusAreasOptions);
            if (inferred.length > 0) setExcludeAreas(inferred);
        }
        if (excludeEquipment.length === 0) {
            const inferred = inferExcludeEquipment(messageText, equipmentOptions);
            if (inferred.length > 0) setExcludeEquipment(inferred);
        }
        if (healthIssues.length === 0) {
            const inferred = inferHealthIssues(messageText, healthIssuesOptions);
            if (inferred.length > 0) setHealthIssues(inferred);
        }

        sendMessageWithContext(files?.length ? { text: messageText, files } : { text: messageText });
        posthog?.capture?.('sent_first_prompt_to_ai', { search: messageText.slice(0, 200), user: user?.id ?? "user_id_unknown" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search, user, hevyProgram, shared, shareId, resume, sendMessageWithContext]);

    const handleSubmit = useCallback((text: string, files?: FileUIPart[]) => {
        if (!text.trim() && (!files || files.length === 0)) return;
        sendMessageWithContext({ text, files });
    }, [sendMessageWithContext]);

    const handleStop = useCallback(() => {
        stop();
        setIsBuilding(false);
    }, [stop]);

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

    const handleIsEditExercise = useCallback((isEditExercise: boolean) => {
        setIsEditExercise(isEditExercise);
    }, []);

    // // Duplicates the selected week to other selected weeks
    const handleDuplicateWeek = useCallback((fromWeekIndex: number, toWeekIndexes: number[]) => {
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
    }, [setHevyProgram]);

    // Duplicates the selected day to other days in the program on the selected week
    const handleDuplicateDay = useCallback((fromWeekOrder: number, fromDayOrder: number, toWeekOrder: number, toDayOrderArray: IOption[]) => {
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
    }, [setHevyProgram]);

    // State for opening the Add Exercise Dialog with the correct week and day
    const handleOpenAddExerciseDialog = useCallback((addExerciseDialog: THevyDialog) => {
        if (addExerciseDialog.isOpen === false) {
            setIsEditExercise(false);
        }
        setAddExerciseDialog(addExerciseDialog);
    }, []);

    // State for opening the Add Note Dialog with the correct week and day
    const handleOpenAddNoteDialog = useCallback((addNoteDialog: THevyDialog) => {
        setAddNoteDialog(addNoteDialog);
    }, []);

    // State for opening the Add Exercise Note Dialog with the correct week and day
    const handleOpenAddExerciseNoteDialog = useCallback((addExerciseNoteDialog: THevyDialog) => {
        setAddExerciseNoteDialog(addExerciseNoteDialog);
    }, []);

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
    const handleAddDay = useCallback((folder_id: number) => {
        setHevyProgram((prev) => {
            const daysInFolder = prev.filter((day) => day.folder_id === folder_id);
            if (daysInFolder.length >= 7) {
                toast.error("Maximum 7 days per week");
                return prev;
            }
            const nthDayOrder = daysInFolder.length + 1;
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
    }, [setHevyProgram]);

    const handleDeleteDay = useCallback((id: string) => {
        setHevyProgram((prev) => {
            let newDays = prev.filter((day) => day.id !== id);
            newDays = reorderHevy(newDays);
            return newDays;
        });
    }, [setHevyProgram]);

    const handleEditTitle = useCallback((id: string, title: string) => {
        setHevyProgram((prev) =>
            prev.map((day) => (day.id === id ? { ...day, title } : day))
        );
    }, [setHevyProgram]);

    const handleDeleteExercise = useCallback((folder_id: number, dayOrder: number, exerciseIndex: number) => {
        setHevyProgram((prev) =>
            prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: day.exercises.filter((_, index) => index !== exerciseIndex),
                    };
                }
                return day;
            })
        );
    }, [setHevyProgram]);

    const handleAddExercise = useCallback(async (folder_id: number, dayOrder: number, exercise: THevyAddExercise) => {
        const sets = hevyAddExerciseToHevySetsConverter(exercise);
        setHevyProgram((prev) =>
            prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: [
                            ...day.exercises,
                            {
                                index: day.exercises.length + 1,
                                title: exercise?.selectedExercise?.title ?? "",
                                notes: "",
                                exercise_template_id: exercise?.selectedExercise?.id ?? "",
                                supersets_id: null,
                                sets,
                                rest_seconds: exercise?.restSeconds ?? null,
                            },
                        ],
                    };
                }
                return day;
            })
        );
    }, [setHevyProgram]);

    const handleAddRoutineAsDay = useCallback((routine: THevyRoutine, folder_id: number) => {
        setHevyProgram((prev) => {
            const daysInFolder = prev.filter((day) => day.folder_id === folder_id);
            if (daysInFolder.length >= 7) {
                toast.error("Maximum 7 days per week");
                return prev;
            }
            const nthDayOrder = daysInFolder.length + 1;
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
    }, [setHevyProgram]);

    const handleAddRoutineNote = useCallback((folder_id: number, dayOrder: number, prompt: string) => {
        setHevyProgram((prev) =>
            prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return { ...day, notes: prompt };
                }
                return day;
            })
        );
    }, [setHevyProgram]);

    const handleAddExerciseNote = useCallback((folder_id: number, dayOrder: number, exerciseIndex: number, prompt: string) => {
        setHevyProgram((prev) =>
            prev.map((day) => {
                if (Number(day.folder_id) === folder_id && Number(day.order) === dayOrder) {
                    return {
                        ...day,
                        exercises: day.exercises.map((exercise, index) =>
                            index === exerciseIndex ? { ...exercise, notes: prompt } : exercise
                        ),
                    };
                }
                return day;
            })
        );
    }, [setHevyProgram]);

    const getNextSupersetId = useCallback((day: THevyRoutine) => {
        const currentSupersetIds = Array.from(new Set(
            day.exercises
                .filter((e) => e.supersets_id !== null)
                .map((e) => e.supersets_id)
        )).sort((a, b) => (a || 0) - (b || 0));
        let nextId = 0;
        for (const currentId of currentSupersetIds) {
            if (currentId !== nextId) return nextId;
            nextId++;
        }
        return nextId;
    }, []);

    const handleCreateSuperset = useCallback((dayId: string, selectedExercises: number[]) => {
        if (selectedExercises.length < 2) return;
        setHevyProgram((prev) =>
            prev.map((routine) => {
                if (routine.id !== dayId) return routine;
                const nextSupersetId = getNextSupersetId(routine);
                return {
                    ...routine,
                    exercises: routine.exercises.map((exercise, index) =>
                        selectedExercises.includes(index) ? { ...exercise, supersets_id: nextSupersetId } : exercise
                    ),
                };
            })
        );
    }, [getNextSupersetId, setHevyProgram]);

    const handleRemoveFromSuperset = useCallback((dayId: string, exerciseIndex: number) => {
        setHevyProgram((prev) =>
            prev.map((routine) => {
                if (routine.id !== dayId) return routine;
                return {
                    ...routine,
                    exercises: routine.exercises.map((exercise, index) =>
                        index === exerciseIndex ? { ...exercise, supersets_id: null } : exercise
                    ),
                };
            })
        );
    }, [setHevyProgram]);

    const handleEditExercise = useCallback((editExercise: THevyDialog) => {
        if (editExercise.editExercise) {
            const sets = hevyAddExerciseToHevySetsConverter(editExercise.editExercise);
            setHevyProgram((prev) =>
                prev.map((day) => {
                    if (Number(day.folder_id) !== editExercise.folder_id || Number(day.order) !== editExercise.dayOrder) {
                        return day;
                    }
                    return {
                        ...day,
                        exercises: day.exercises.map((exercise, index) =>
                            index === editExercise.exerciseIndex
                                ? {
                                      ...exercise,
                                      index: day.exercises.length + 1,
                                      title: editExercise?.editExercise?.selectedExercise?.title ?? "",
                                      notes: exercise?.notes ?? "",
                                      reason: exercise?.reason ?? "",
                                      exercise_template_id: editExercise?.editExercise?.selectedExercise?.id ?? "",
                                      supersets_id: exercise?.supersets_id ?? null,
                                      sets,
                                      rest_seconds: editExercise?.editExercise?.restSeconds ?? null,
                                  }
                                : exercise
                        ),
                    };
                })
            );
        }
        setIsEditExercise(false);
    }, [setHevyProgram]);

    const [focusedCardId, setFocusedCardId] = useState<string>("");
    const isMobile = useIsMobile();
    const numberOfWeeks = useMemo(() => getNumberRoutineFolders(hevyProgram), [hevyProgram]);
    const numberOfWeeksArr = useMemo(() => Array.from({ length: numberOfWeeks }, (_, i) => i), [numberOfWeeks]);

    const onBuildComplete = useCallback(() => {
        if (isMobile) setMobileTab("program");
    }, [isMobile]);

    const handleUndo = useCallback(() => {
        dispatchEditor({ type: "UNDO" });
    }, []);

    const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

    useEffect(() => {
        setPortalTarget(document.getElementById("toolbar-undo-portal"));
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

    useEffect(() => {
        const fetchSharedProgram = async () => {
            try {
                const sharedProgram = await getSharedProgram(Number(shareId));
                if (sharedProgram) {
                    setHevyProgram(appendOrderToHevyRoutines(sharedProgram));
                }
            } finally {
                sharedProgramLoadAttemptedRef.current = true;
            }
        };

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
            resumeLoadAttemptedRef.current = true;
        }

        if (shared === 'true') {
            fetchSharedProgram();
        }

        if (empty === 'true') {
            setHevyProgram(appendOrderToHevyRoutines(emptyHevyRoutineProgram));
        }


    }, [edit, setIsPreview, resume, isHevy, shared, shareId, empty, setHevyProgram]);


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

    const localStorageDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const DEBOUNCE_MS = 500;

    useEffect(() => {
        if (typeof window === "undefined") return;

        if (localStorageDebounceRef.current) {
            clearTimeout(localStorageDebounceRef.current);
            localStorageDebounceRef.current = null;
        }

        localStorageDebounceRef.current = setTimeout(() => {
            localStorageDebounceRef.current = null;
            // Don't overwrite localStorage with empty program when resuming
            if (!(hevyProgram.length === 0 && resume === "true")) {
                localStorage.setItem("hevy-program-in-progress", JSON.stringify(hevyProgram));
                localStorage.setItem("hevy-request", JSON.stringify(request));
            }
            localStorage.setItem("prompt", JSON.stringify(search));
        }, DEBOUNCE_MS);

        return () => {
            if (localStorageDebounceRef.current) {
                clearTimeout(localStorageDebounceRef.current);
                localStorageDebounceRef.current = null;
            }
        };
    }, [hevyProgram, request, resume, search]);

    const toggleSidebarPosition = useCallback(() => {
        setSidebarPosition((prev) => {
            const newPosition = prev === "left" ? "right" : "left";
            localStorage.setItem(SIDEBAR_POSITION_KEY, newPosition);
            return newPosition;
        });
    }, []);

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

    const handleToggleHide = useCallback(() => {
        sidebarPanelRef.current?.collapse();
        setIsChatHidden(true);
    }, []);

    const handleOpenChat = useCallback(() => {
        const panel = sidebarPanelRef.current;
        if (panel) {
            panel.expand();
            panel.resize(lastSidebarSizeRef.current || 28);
        }
        setIsChatHidden(false);
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

    // Single props objects for Agent and HevyRoutine to avoid 3x duplication (plan item 4)
    const agentPropsCommon = useMemo(() => ({
        search,
        setHevyProgram,
        hevyProgram,
        applyPatchWithUndo,
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
        handleSex,
        handleAge,
        handleDaysPerWeek,
        handleSpecificDays,
        handleProgramLength,
        handleWorkoutDuration,
        handleActivityLevel,
        handleGoals,
        handleSpecialization,
        handleEquipment,
        handleFocusAreas,
        handleDifficultyLevel,
        handleExcludeAreas,
        handleExcludeEquipment,
        handleExcludeSpecializations,
        handleHealthIssues,
        handleProgramTitle,
        handleExplore,
        messages,
        setMessages,
        sendMessageWithContext,
        isBuilding,
        handleIsBuilding,
        isLoading,
        error: activeError,
        onRetry: handleRetry,
        onClearError: handleClearError,
        retryCount,
        maxRetries: MAX_RETRIES,
        onTimeoutError: handleTimeoutError,
        status,
        handleSubmit,
        handleStop,
        onBuildComplete,
    }), [
        search,
        setHevyProgram,
        hevyProgram,
        applyPatchWithUndo,
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
        handleSex,
        handleAge,
        handleDaysPerWeek,
        handleSpecificDays,
        handleProgramLength,
        handleWorkoutDuration,
        handleActivityLevel,
        handleGoals,
        handleSpecialization,
        handleEquipment,
        handleFocusAreas,
        handleDifficultyLevel,
        handleExcludeAreas,
        handleExcludeEquipment,
        handleExcludeSpecializations,
        handleHealthIssues,
        handleProgramTitle,
        handleExplore,
        messages,
        setMessages,
        sendMessageWithContext,
        isBuilding,
        handleIsBuilding,
        isLoading,
        activeError,
        handleRetry,
        handleClearError,
        retryCount,
        handleTimeoutError,
        status,
        handleSubmit,
        handleStop,
        onBuildComplete,
    ]);

    const routineProps = useMemo(() => ({
        hevyProgram: orderedProgram,
        setHevyProgram,
        isMobile,
        addExerciseDialog,
        addNoteDialog,
        addExerciseNoteDialog,
        isEditExercise,
        handleIsEditExercise,
        handleDuplicateWeek,
        handleDuplicateDay,
        handleOpenAddExerciseDialog,
        handleOpenAddNoteDialog,
        handleOpenAddExerciseNoteDialog,
        handleAddDay,
        handleDeleteDay,
        handleEditTitle,
        handleDeleteExercise,
        handleAddExercise,
        handleAddRoutineAsDay,
        handleAddRoutineNote,
        handleAddExerciseNote,
        getNextSupersetId,
        handleCreateSuperset,
        handleRemoveFromSuperset,
        handleEditExercise,
        focusedCardId,
        setFocusedCardId,
        numberOfWeeks,
        numberOfWeeksArr,
    }), [
        orderedProgram,
        setHevyProgram,
        isMobile,
        addExerciseDialog,
        addNoteDialog,
        addExerciseNoteDialog,
        isEditExercise,
        handleIsEditExercise,
        handleDuplicateWeek,
        handleDuplicateDay,
        handleOpenAddExerciseDialog,
        handleOpenAddNoteDialog,
        handleOpenAddExerciseNoteDialog,
        handleAddDay,
        handleDeleteDay,
        handleEditTitle,
        handleDeleteExercise,
        handleAddExercise,
        handleAddRoutineAsDay,
        handleAddRoutineNote,
        handleAddExerciseNote,
        getNextSupersetId,
        handleCreateSuperset,
        handleRemoveFromSuperset,
        handleEditExercise,
        focusedCardId,
        numberOfWeeks,
        numberOfWeeksArr,
    ]);

    const routineContent = hevyProgram.length > 0 ? (
        <HevyRoutine {...routineProps} />
    ) : (
        <BuildProgramSkeleton />
    );

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
            {isChatHidden && (
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleOpenChat}
                                className="fixed top-31 z-40 max-sm:hidden gap-2 shadow-md bg-white dark:bg-extraDarkGray border-gray-300 dark:border-gray-600 rounded-none rounded-tr-md rounded-br-md"
                                aria-label="Open chat"
                            >
                                <MessageSquare className="h-4 w-4" />

                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900">
                            Open chat
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            <div className="max-sm:hidden sm:block flex-1 min-h-0">
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
                                setIsChatHidden(size < 1);
                                if (size >= 1) lastSidebarSizeRef.current = size;
                            }}
                            minSize={0}
                            maxSize={EXPANDED_SIZE}
                            collapsible
                            className="border-extraLightGray bg-white sm:bg-extraLightGray dark:bg-extraDarkGray dark:text-white overflow-hidden"
                        >
                            <Agent
                                {...agentPropsCommon}
                                sidebarPosition={sidebarPosition}
                                onTogglePosition={toggleSidebarPosition}
                                onToggleExpand={onToggleExpand}
                                onToggleHide={handleToggleHide}
                                isExpanded={isExpanded}
                            />
                        </ResizablePanel>
                        {!isChatHidden && <ResizableHandle withHandle className="" />}
                        <ResizablePanel
                            id="main-content"
                            order={2}
                            minSize={30}
                            className="bg-white dark:bg-darkGray"
                        >
                            <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden h-full flex flex-col">
                                {routineContent}
                            </div>
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
                            <div className="sm:pl-8 w-full max-w-full max-sm:overflow-x-hidden h-full flex flex-col">
                                {routineContent}
                            </div>
                        </ResizablePanel>
                        {!isChatHidden && <ResizableHandle withHandle className="" />}
                        <ResizablePanel
                            ref={sidebarPanelRef}
                            id="sidebar"
                            order={2}
                            defaultSize={sidebarSize}
                            onResize={(size) => {
                                setSidebarSize(size);
                                localStorage.setItem(SIDEBAR_SIZE_KEY, size.toString());
                                setIsChatHidden(size < 1);
                                if (size >= 1) lastSidebarSizeRef.current = size;
                            }}
                            minSize={0}
                            maxSize={EXPANDED_SIZE}
                            collapsible
                            className="border-extraLightGray bg-white sm:bg-extraLightGray dark:bg-extraDarkGray dark:text-white overflow-hidden"
                        >
                            <Agent
                                {...agentPropsCommon}
                                sidebarPosition={sidebarPosition}
                                onTogglePosition={toggleSidebarPosition}
                                onToggleExpand={onToggleExpand}
                                onToggleHide={handleToggleHide}
                                isExpanded={isExpanded}
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
                    <TabsContent value="chat" className="flex-1 min-h-0 m-0 mt-0 px-4 ">
                        <Agent
                            {...agentPropsCommon}
                            sidebarPosition="left"
                            onTogglePosition={() => {}}
                            onToggleExpand={() => {}}
                            onToggleHide={handleToggleHide}
                            isExpanded={false}
                        />
                    </TabsContent>
                    <TabsContent value="program" className="flex-1 overflow-y-auto m-0 mt-0 px-4 pb-20 bg-white dark:bg-darkGray">
                        <div className="w-full max-w-full overflow-x-hidden">
                            {routineContent}
                        </div>
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
