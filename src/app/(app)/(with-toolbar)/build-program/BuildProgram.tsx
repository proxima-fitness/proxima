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

import { useSearchParams } from "next/navigation";
import { usePreview } from "@/contexts/PreviewContext";
import { appendOrderToHevyRoutines } from "@/components/program-builder/utils/format-responses";
import { ProgramEditor } from "./ProgramEditor";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSharedProgram } from "@/api/programs";
import { CHAT_MESSAGES_KEY, COLLAPSED_SIZE, EXPANDED_SIZE, LONG_PROMPT_PLACEHOLDER, SIDEBAR_POSITION_KEY, SIDEBAR_SIZE_KEY } from "@/assets/constants/ui-constants";
import { emptyHevyRoutineProgram } from "@/assets/constants";
import { getMessageText } from "@/components/program-builder/utils/helpers";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import { useUserContext } from "@/contexts/UserContext";
import { postHevyRoutineProgram, type PostHevyRoutineProgramSuccess } from "@/components/program-builder/api/hevy";
import { postChatHistory } from "@/api/chat-history";
import { ToolbarPortalButtons } from "@/components/program-builder/shared/ToolbarPortalButtons";
import { editorReducer } from "./editor-reducer";
import { useProgramRequestState } from "./use-program-request-state";
import { useBuildProgramChat } from "./use-build-program-chat";
import { Operation } from "fast-json-patch";

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
    const { setIsPreview } = usePreview();
    const searchParams = useSearchParams();

    const shareId = searchParams.get('shareId') ?? '';
    const edit = searchParams.get('edit') ?? '';
    const resume = searchParams.get('resume') ?? '';
    const shared = searchParams.get('shared') ?? '';
    const empty = searchParams.get('empty') ?? '';
    const search = searchParams.get('search') ?? '';

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
        (newDocument: THevyRoutine[], inversePatch: Operation[], recordUndo = true) => {
            if (!recordUndo) {
                dispatchEditor({ type: "REPLACE_PROGRAM", program: newDocument });
                return;
            }
            if (inversePatch.length === 0) {
                dispatchEditor({ type: "REPLACE_PROGRAM", program: newDocument });
                return;
            }
            dispatchEditor({ type: "APPLY_PATCH", newDocument, inversePatch });
        },
        []
    );
    const orderedProgram = useMemo(
        () => appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[],
        [hevyProgram]
    );
    /*************************************************************************************/

    const programRequest = useProgramRequestState({ empty, search });
    const isMobile = useIsMobile();

    const chat = useBuildProgramChat({
        user,
        hevyProgram,
        programRequest,
        isMobile,
        setMobileTab,
    });
    const {
        messages,
        setMessages,
        sendMessageWithContext,
        handleSubmit,
        handleStop,
        isBuilding,
        handleIsBuilding,
        isLoading,
        status,
        activeError,
        onRetry: handleRetry,
        onClearError: handleClearError,
        retryCount,
        maxRetries: MAX_RETRIES,
        onTimeoutError: handleTimeoutError,
        onBuildComplete,
        lastAtomicBuildCommitKeyRef,
        appliedModifyProgramKeysRef,
        sharedProgramLoadAttemptedRef,
        resumeLoadAttemptedRef,
    } = chat;

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

        if (edit === "true") {
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


    }, [edit, setIsPreview, resume, shared, shareId, empty, setHevyProgram, sharedProgramLoadAttemptedRef, resumeLoadAttemptedRef]);


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
        lastAtomicBuildCommitKeyRef,
        appliedModifyProgramKeysRef,
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
