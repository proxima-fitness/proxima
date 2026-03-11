"use client";

/**
 * @module (app)/(with-toolbar)/build-program/BuildProgramClient
 *
 * Full AI program-builder UI: chat + program editor (Hevy-style routines), filters,
 * share/resume/empty/search URL handling, undo, dialogs. Sits under build-program
 * layout; drives useChat, program state, and tool calls.
 *
 * Depends on: useChat, UserContext, PreviewContext, HevyContext, resizable panels,
 * Agent, ProgramRoutineView, program-builder utils, API (getSharedProgram, recordLlmRequest).
 * Used by: build-program/page.tsx.
 */

import { useState, useEffect, useMemo, useReducer, useCallback, useRef } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ImperativePanelHandle } from "react-resizable-panels";

import { BuildProgramDesktopLayout } from "./BuildProgramDesktopLayout";
import { BuildProgramMobileLayout } from "./BuildProgramMobileLayout";
import { BuildProgramChatPanel } from "./BuildProgramChatPanel";
import { MessageSquare } from "lucide-react";

import { useSearchParams, useRouter } from "next/navigation";
import { usePreview } from "@/contexts/PreviewContext";
import { appendOrderToHevyRoutines } from "@/components/program-builder/utils/format-responses";
import { ProgramEditor } from "./ProgramEditor";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSharedProgram } from "@/api/programs";
import { emptyHevyRoutineProgram, focusAreasOptions, equipmentOptions, healthIssuesOptions, CHAT_MESSAGES_KEY, COLLAPSED_SIZE, EXPANDED_SIZE, LONG_PROMPT_PLACEHOLDER, PENDING_ATTACHMENTS_KEY, PENDING_INITIAL_PROMPT_KEY, SIDEBAR_POSITION_KEY, SIDEBAR_SIZE_KEY } from "@/assets/constants";
import { inferDaysPerWeek, inferProgramLength, inferExcludeAreas, inferExcludeEquipment, inferHealthIssues } from "@/components/program-builder/utils/helpers";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";


import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import { getMessageText, getTextFromChatMessage, isMessageAboutProgram } from "@/components/program-builder/utils/helpers"
import posthog from "posthog-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatHistory } from "@/api/hooks";
import { useUserContext } from "@/contexts/UserContext";
import { recordLlmRequest } from "@/api/feature-limits";
import { postHevyRoutineProgram, type PostHevyRoutineProgramSuccess } from "@/components/program-builder/api/hevy";
import { postChatHistory } from "@/api/chat-history";
import { ToolbarPortalButtons } from "@/components/program-builder/shared/ToolbarPortalButtons";
import { editorReducer } from "./editor-reducer";
import { useProgramRequestState } from "./use-program-request-state";
import { Operation } from "fast-json-patch";

const chatTransport = new DefaultChatTransport({ api: "/api/chat" });

function isPostHevyRoutineProgramSuccess(r: unknown): r is PostHevyRoutineProgramSuccess {
    return (
        typeof r === "object" &&
        r !== null &&
        "status" in r &&
        (r as { status: string }).status === "success" &&
        "id" in r &&
        typeof (r as { id: unknown }).id === "number"
    );
}

/**
 * Program builder client: chat sidebar, program state (hevyProgram), filters,
 * URL params (shareId, edit, resume, shared, empty, search). No props; reads
 * searchParams and context. No props; reads searchParams and context.
 */
export function BuildProgram() {


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
    const router = useRouter();

    const shareId = searchParams.get('shareId') ?? '';
    const edit = searchParams.get('edit') ?? '';
    const resume = searchParams.get('resume') ?? '';
    const shared = searchParams.get('shared') ?? '';
    const chatId = searchParams.get('chat') ?? '';

    const [sidebarPosition, setSidebarPosition] = useState<"left" | "right">("left");
    const [sidebarSize, setSidebarSize] = useState(28);
    const sidebarPanelRef = useRef<ImperativePanelHandle>(null);
    const lastSidebarSizeRef = useRef(28);
    const saveSidebarSize = useDebouncedCallback((size: number) => {
        localStorage.setItem(SIDEBAR_SIZE_KEY, size.toString());
    }, 200);
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
    const newChat = searchParams.get('new') ?? '';

    const programRequest = useProgramRequestState({ empty, search });

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
    const { data: chatHistoryData } = useChatHistory(user, chatId);

    useEffect(() => {
        console.log("Chat message history:", messages);
    }, [messages]);

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
                daysPerWeek: programRequest.daysPerWeek ? Number(programRequest.daysPerWeek) : undefined,
                programLength: programRequest.programLength ? Number(programRequest.programLength) : undefined,
                excludeAreas: programRequest.excludeAreas?.length ? programRequest.excludeAreas.map((o) => o.value).join(", ") : "",
                excludeEquipment: programRequest.excludeEquipment?.length ? programRequest.excludeEquipment.map((o) => o.value).join(", ") : "",
                healthIssues: programRequest.healthIssues?.length ? programRequest.healthIssues.map((o) => o.value).join(", ") : "",
            };
            return sendMessage(message, { ...options, body: { ...contextBody, ...options?.body } });
        },
        [sendMessage, hevyProgram, programRequest.daysPerWeek, programRequest.programLength, programRequest.excludeAreas, programRequest.excludeEquipment, programRequest.healthIssues, incrementLlmRequests]
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

    // Restore anonymous chat messages from localStorage when not logged in.
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (user) {
            // Clear any anonymous chat history once the user is logged in.
            localStorage.removeItem(CHAT_MESSAGES_KEY);
            return;
        }

        try {
            const stored = localStorage.getItem(CHAT_MESSAGES_KEY);
            if (!stored) return;
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
                setMessages(parsed);
            }
        } catch {
            // ignore parse errors
        }
    }, [user, setMessages]);

    // When sidebar navigates with ?new=true (Continue on new-chat confirm), clear messages and clean URL.
    useEffect(() => {
        if (newChat !== 'true') return;
        setMessages([]);
        router.replace('/build-program');
    }, [newChat, setMessages, router]);

    // When opening a chat from the sidebar (?chat=id), load that chat's conversation into messages.
    useEffect(() => {
        if (!chatId || chatHistoryData == null) return;
        const conversation = Array.isArray(chatHistoryData?.[0]) ? chatHistoryData[0] : [];
        setMessages(conversation);
    }, [chatId, chatHistoryData, setMessages]);

    useEffect(() => {
        if (chatId) return;
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
        if (!programRequest.daysPerWeek) {
            const inferredDays = inferDaysPerWeek(messageText);
            if (inferredDays) programRequest.setDaysPerWeek(inferredDays);
        }
        if (!programRequest.programLength) {
            const inferredLength = inferProgramLength(messageText);
            if (inferredLength) programRequest.setProgramLength(inferredLength);
        }
        if (programRequest.excludeAreas.length === 0) {
            const inferred = inferExcludeAreas(messageText, focusAreasOptions);
            if (inferred.length > 0) programRequest.setExcludeAreas(inferred);
        }
        if (programRequest.excludeEquipment.length === 0) {
            const inferred = inferExcludeEquipment(messageText, equipmentOptions);
            if (inferred.length > 0) programRequest.setExcludeEquipment(inferred);
        }
        if (programRequest.healthIssues.length === 0) {
            const inferred = inferHealthIssues(messageText, healthIssuesOptions);
            if (inferred.length > 0) programRequest.setHealthIssues(inferred);
        }

        sendMessageWithContext(files?.length ? { text: messageText, files } : { text: messageText });
        posthog?.capture?.('sent_first_prompt_to_ai', { search: messageText.slice(0, 200), user: user?.id ?? "user_id_unknown" });
    }, [chatId, search, user, hevyProgram, shared, shareId, resume, sendMessageWithContext, programRequest]);

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

    const isMobile = useIsMobile();

    const onBuildComplete = useCallback(() => {
        if (isMobile) setMobileTab("program");
    }, [isMobile]);

    const handleUndo = useCallback(() => {
        dispatchEditor({ type: "UNDO" });
    }, []);

    const deriveChatTitle = useCallback(() => {
        if (typeof window === "undefined") return "Untitled";
        try {
            const promptRaw = localStorage.getItem("prompt");
            const parsed = promptRaw ? (JSON.parse(promptRaw) as string) : "";
            if (parsed && parsed !== LONG_PROMPT_PLACEHOLDER) {
                return parsed.trim().slice(0, 200);
            }
        } catch {
            // ignore
        }
        return "Untitled";
    }, []);

    const [isSaving, setIsSaving] = useState(false);

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

    useEffect(() => {
        setHevyProgram([]);

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


    }, [edit, setIsPreview, resume, shared, shareId, empty, setHevyProgram]);


    const handleSave = useCallback(async () => {
        if (!user) {
            toast.error("Sign in to save.");
            return;
        }
        if (hevyProgram.length === 0) {
            toast.error("Add a program first.");
            return;
        }
        if (messages.length === 0) {
            toast.error("Add a chat first.");
            return;
        }

        const title = deriveChatTitle();
        setIsSaving(true);

        try {
            const prompt = title !== "Untitled" ? title : search || "";
            const supabaseResult = await postHevyRoutineProgram(orderedProgram, prompt, programRequest.request);

            if (!isPostHevyRoutineProgramSuccess(supabaseResult)) {
                toast.error("Failed to save program.");
                console.error("Failed to save program.", supabaseResult);
                return;
            }

            const programId = supabaseResult.id;
            if (supabaseResult.skippedExercises?.length) {
                for (const skipped of supabaseResult.skippedExercises) {
                    toast.warning(`${skipped.exerciseName}: ${skipped.reason}`);
                }
            }

            const chatResult = await postChatHistory(user, messages, title, String(programId));
            if (chatResult.success !== true) {
                toast.error("Program saved but chat history could not be saved.");
                console.error("Chat history save failed.", chatResult.error);
            } else {
                toast.success("Program and chat saved.");
                queryClient.invalidateQueries({ queryKey: ["chat-ids", user.id] });
            }
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Save failed.");
            console.error("Save error:", err);
        } finally {
            setIsSaving(false);
        }
    }, [
        user,
        hevyProgram.length,
        messages,
        orderedProgram,
        programRequest.request,
        search,
        deriveChatTitle,
        queryClient,
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
            if (hevyProgram.length === 0 && resume === "true") {
                // Don't overwrite on resume
            } else if (hevyProgram.length === 0) {
                localStorage.removeItem("hevy-program-in-progress");
            } else {
                localStorage.setItem("hevy-program-in-progress", JSON.stringify(hevyProgram));
                localStorage.setItem("hevy-request", JSON.stringify(programRequest.request));
            }
            const firstUser = messages.find((m) => m.role === "user");
            const promptToStore = (search && search.trim()) || (firstUser ? getMessageText(firstUser) : "");
            localStorage.setItem("prompt", JSON.stringify(promptToStore));

            // Persist anonymous chat history so non-logged-in users don't lose it on refresh.
            if (!user && messages.length > 0) {
                localStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(messages));
            }
        }, DEBOUNCE_MS);

        return () => {
            if (localStorageDebounceRef.current) {
                clearTimeout(localStorageDebounceRef.current);
                localStorageDebounceRef.current = null;
            }
        };
    }, [hevyProgram, programRequest.request, resume, search, user, messages]);

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

    const onSidebarResize = useCallback(
        (size: number) => {
            setSidebarSize(size);
            saveSidebarSize(size);
            setIsChatHidden(size < 1);
            if (size >= 1) lastSidebarSizeRef.current = size;
        },
        [saveSidebarSize]
    );

    const isExpanded = sidebarSize >= EXPANDED_SIZE - 5;

    const chatPanelStateProps = {
        search,
        hevyProgram,
        setHevyProgram,
        applyPatchWithUndo,
        programRequest,
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
    } as const;

    const desktopChatPanel = (
        <BuildProgramChatPanel
            {...chatPanelStateProps}
            sidebarPosition={sidebarPosition}
            onTogglePosition={toggleSidebarPosition}
            onToggleExpand={onToggleExpand}
            onToggleHide={handleToggleHide}
            isExpanded={isExpanded}
        />
    );

    const mobileChatPanel = (
        <BuildProgramChatPanel
            {...chatPanelStateProps}
            sidebarPosition="left"
            onTogglePosition={() => {}}
            onToggleExpand={() => {}}
            onToggleHide={handleToggleHide}
            isExpanded={false}
        />
    );

    const routineContent = (
        <ProgramEditor
            orderedProgram={orderedProgram}
            setHevyProgram={setHevyProgram}
            isMobile={isMobile}
        />
    );

    const hasProgramContent = hevyProgram.some((r) => r.exercises.length > 0);

    return (
        <>
            <ToolbarPortalButtons
                canUndo={undoStack.length > 0}
                onUndo={handleUndo}
                onSave={handleSave}
                saveDisabled={!user || hevyProgram.length === 0 || messages.length === 0}
                isSaving={isSaving}
            />
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
            <BuildProgramDesktopLayout
                sidebarPosition={sidebarPosition}
                sidebarPanelRef={sidebarPanelRef}
                sidebarSize={sidebarSize}
                onSidebarResize={onSidebarResize}
                isChatHidden={isChatHidden}
                chatPanel={desktopChatPanel}
                routineContent={routineContent}
                maxSidebarSize={EXPANDED_SIZE}
            />
            <BuildProgramMobileLayout
                mobileTab={mobileTab}
                onMobileTabChange={setMobileTab}
                hasProgramContent={hasProgramContent}
                chatPanel={mobileChatPanel}
                routineContent={routineContent}
            />
        </>
    );
}
