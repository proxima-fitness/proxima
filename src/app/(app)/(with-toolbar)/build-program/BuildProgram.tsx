"use client";

/**
 * @module (app)/(with-toolbar)/build-program/BuildProgramClient
 *
 * Full AI program-builder UI: chat + program editor (Hevy-style routines), filters,
 * share/resume/empty/search URL handling, undo, dialogs. Sits under build-program
 * layout; drives useChat, program state, and tool calls.
 *
 * Depends on: useChat, UserContext, HevyContext, resizable panels,
 * Agent, ProgramRoutineView, program-builder utils, API (getSharedProgram).
 * Used by: build-program/page.tsx.
 */

import { useState, useEffect, useMemo, useReducer, useCallback, useRef, type RefObject } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { ImperativePanelHandle } from "react-resizable-panels";

import { BuildProgramDesktopLayout } from "./BuildProgramDesktopLayout";
import { BuildProgramMobileLayout } from "./BuildProgramMobileLayout";
import { BuildProgramChatPanel } from "./BuildProgramChatPanel";
import { MessageSquare } from "lucide-react";

import { useSearchParams, useRouter } from "next/navigation";
import { appendOrderToHevyRoutines } from "@/components/program-builder/utils/format-responses";
import { normalizeProgramState } from "@/components/program-builder/utils/helpers";
import { ProgramEditor } from "./ProgramEditor";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSharedProgram } from "@/api/programs";
import { CHAT_MESSAGES_KEY, COLLAPSED_SIZE, EXPANDED_SIZE, LONG_PROMPT_PLACEHOLDER, SIDEBAR_POSITION_KEY, SIDEBAR_SIZE_KEY } from "@/assets/constants/ui-constants";
import { emptyHevyProgram } from "@/assets/constants";
import { getMessageText } from "@/components/program-builder/utils/helpers";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import { useUserContext } from "@/contexts/UserContext";
import { ProgramMutationProvider } from "@/contexts/ProgramMutationContext";
import { useBuildProgramActions } from "@/contexts/BuildProgramActionsContext";
import {
    getSaveProgramToSupabaseFailureDetail,
    isSaveProgramToSupabaseSuccess,
    saveProgramToSupabase,
} from "@/components/program-builder/api/hevy";
import { connectChatToSavedProgram, isChatSessionInsertConfirmed } from "@/api/chat-history";
import { ToolbarPortalButtons } from "@/components/program-builder/shared/ToolbarPortalButtons";
import { BuildProgramToolbarTitle } from "@/components/program-builder/shared/BuildProgramToolbarTitle";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { newPathLeaveGuard } from "@/hooks/create-leave-guard";
import {
    canWriteBuilderDraft,
    clearBuilderDraft,
    enableBuilderDraftWrites,
    NEW_PATH_SAVE_SUCCESS_TOAST,
} from "@/lib/builder-draft";
import { editorReducer, isNewPathDirty } from "./editor-reducer";
import type { TCommitWithUndoOptions } from "@/components/program-builder/mutations/types";
import { useProgramRequestState } from "./use-program-request-state";
import { readAnonymousChatMessages, useBuildProgramChat } from "./use-build-program-chat";
import { isValidShareId } from "./initial-prompt";
import {
    advanceChatNavigationLatch,
    buildShellKey,
    createChatNavigationLatch,
    resetChatNavigationLatchForArrival,
    isBareBuildProgramArrival,
    isExplicitNewChatArrival,
    parseBuildProgramArrival,
    shouldRedirectBareBuildProgramToEmpty,
    resolveChatEntryPlan,
    resolveInitialMessages,
    resolveChatHistoryFetchEnabled,
    resolveSendPathConfirmed,
    resolveSidebarRowKnown,
    type IChatEntryPlan,
} from "./resolve-chat-entry";
import type { User } from "@supabase/supabase-js";
import { useChatHistory, useChatIds } from "@/api/hooks";
import posthog from "posthog-js";

/** Logged-in only; module guard avoids duplicate capture under Strict Mode remount. */
let buildProgramPageViewSent = false;

function logPageView(userId: string | undefined): void {
    if (!userId || buildProgramPageViewSent) return;
    buildProgramPageViewSent = true;
    posthog?.capture?.("page_view", { page: "/build-program", user: userId });
}

function deriveChatTitle(): string {
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
}

/**
 * Program builder client: chat sidebar, program state (hevyProgram), filters,
 * URL params (shareId, resume, empty, search). No props; reads searchParams and context.
 */
export function BuildProgram() {
    const { user } = useUserContext();
    const router = useRouter();
    const { getPersistChatIdRef } = useBuildProgramActions();
    logPageView(user?.id);
    const searchParams = useSearchParams();

    const arrival = parseBuildProgramArrival(searchParams);
    const { urlChatId, search, shareId, empty, resume } = arrival;
    const chatId = urlChatId;

    /** URL-only fallback until shell registers getter with mint ref (export reads this ref). */
    const getPersistChatIdFromUrl = useCallback(() => chatId, [chatId]);
    getPersistChatIdRef.current = getPersistChatIdFromUrl;
    const isBareArrival = isBareBuildProgramArrival({ urlChatId, search, shareId, empty, resume });
    const explicitNewChat = isExplicitNewChatArrival({ empty, urlChatId });

    const sawNonBareArrivalRef = useRef(!isBareArrival);
    if (!isBareArrival) {
        sawNonBareArrivalRef.current = true;
    }
    const shouldBareRedirectToEmpty = shouldRedirectBareBuildProgramToEmpty(
        isBareArrival,
        sawNonBareArrivalRef.current,
    );

    const { data: chatIds } = useChatIds(user);
    const sidebarRowKnown = resolveSidebarRowKnown(chatId, chatIds);
    const sendPathConfirmed = resolveSendPathConfirmed(chatId, isChatSessionInsertConfirmed(chatId));

    const chatNavLatchRef = useRef(createChatNavigationLatch(urlChatId));
    chatNavLatchRef.current = resetChatNavigationLatchForArrival(
        { empty, urlChatId },
        chatNavLatchRef.current,
    );
    const { chatNavigationArrival, next: chatNavLatchNext } = advanceChatNavigationLatch(
        chatId,
        chatNavLatchRef.current,
        { sidebarRowKnown, sendPathConfirmed, hasEmptyParam: empty === "true" },
    );
    chatNavLatchRef.current = chatNavLatchNext;
    const programHydrateChatId = chatNavigationArrival ? chatId : "";

    const [sharedProgramLoadAttempted, setSharedProgramLoadAttempted] = useState(
        () => !isValidShareId(shareId),
    );

    const [{ hevyProgram, undoStack }, dispatchEditor] = useReducer(editorReducer, {
        hevyProgram: [],
        undoStack: [],
    });
    const editMode = searchParams.get("edit") === "true";
    /** Mirror only — SoT is undo stack. Silent assign for beforeunload / link capture. */
    newPathLeaveGuard.setDirty(!editMode && isNewPathDirty(undoStack.length));

    const setProgramFromHydrate = useCallback((program: THevyRoutine[]) => {
        dispatchEditor({ type: "REPLACE_PROGRAM", program: normalizeProgramState(program) });
    }, []);

    const commitWithUndo = useCallback((next: THevyRoutine[], options?: TCommitWithUndoOptions) => {
        enableBuilderDraftWrites();
        dispatchEditor({
            type: "COMMIT_PROGRAM",
            program: normalizeProgramState(next),
            recordUndo: options?.recordUndo ?? true,
        });
    }, []);

    const setHevyProgram = useCallback(
        (value: THevyRoutine[] | ((prev: THevyRoutine[]) => THevyRoutine[])) => {
            enableBuilderDraftWrites();
            if (typeof value === "function") {
                dispatchEditor({
                    type: "COMMIT_PROGRAM",
                    updater: (prev) => {
                        const next = value(prev);
                        return next === prev ? prev : normalizeProgramState(next);
                    },
                    recordUndo: true,
                });
            } else {
                commitWithUndo(value);
            }
        },
        [commitWithUndo],
    );
    const chatHistoryFetchEnabled = resolveChatHistoryFetchEnabled({
        user,
        chatId,
        sidebarRowKnown,
        sendPathConfirmed,
        chatNavigationArrival,
    });

    const {
        data: chatHistoryData,
        isPending: chatHistoryPending,
        isSuccess: chatHistorySuccess,
    } = useChatHistory(user, chatId, { enabled: chatHistoryFetchEnabled });

    const chatEntryPlan = useMemo(
        () =>
            resolveChatEntryPlan({
                user,
                chatId,
                search,
                shareId,
                sidebarRowKnown,
                sendPathConfirmed,
                chatNavigationArrival,
                sharedProgramLoadAttempted,
                hevyProgramLength: hevyProgram.length,
                chatHistorySuccess,
                anonLocalMessageCount: readAnonymousChatMessages().length,
                explicitNewChat,
            }),
        [
            user,
            chatId,
            search,
            shareId,
            sidebarRowKnown,
            sendPathConfirmed,
            chatNavigationArrival,
            sharedProgramLoadAttempted,
            hevyProgram.length,
            chatHistorySuccess,
            explicitNewChat,
        ],
    );

    const chatHistoryLoading = Boolean(chatId && user && chatEntryPlan.enableHistoryFetch && chatHistoryPending);

    const shellKey = buildShellKey(chatEntryPlan, {
        chatId,
        user,
        chatHistorySuccess,
        chatNavigationArrival,
    });

    const chatInitialMessages = useMemo(
        () =>
            resolveInitialMessages(chatEntryPlan, {
                chatHistoryData,
                anonymousMessages: readAnonymousChatMessages(),
            }),
        [chatEntryPlan, chatHistoryData],
    );

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
    const orderedProgram = useMemo(
        () => appendOrderToHevyRoutines(hevyProgram) as THevyRoutine[],
        [hevyProgram],
    );

    const programRequest = useProgramRequestState({ empty, search });
    const isMobile = useIsMobile();

    const handleUndo = useCallback(() => {
        enableBuilderDraftWrites();
        dispatchEditor({ type: "UNDO" });
    }, []);

    const clearUndoBaseline = useCallback(() => {
        dispatchEditor({ type: "CLEAR_UNDO_BASELINE" });
    }, []);

    const {
        leaveDialogOpen,
        pendingHref,
        onLeaveDialogOpenChange,
        onDiscardLeave,
    } = newPathLeaveGuard.useLeaveGuard();

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
        if (shouldBareRedirectToEmpty) {
            router.replace("/build-program?empty=true");
            return;
        }

        setProgramFromHydrate([]);
        setSharedProgramLoadAttempted(!isValidShareId(shareId));

        const fetchSharedProgram = async () => {
            try {
                const sharedProgram = await getSharedProgram(Number(shareId));
                if (sharedProgram) {
                    setProgramFromHydrate(appendOrderToHevyRoutines(sharedProgram));
                }
            } finally {
                setSharedProgramLoadAttempted(true);
            }
        };

        if (resume === "true") {
            const program = localStorage.getItem("hevy-program-in-progress");
            if (program) {
                setProgramFromHydrate(appendOrderToHevyRoutines(JSON.parse(program)));
            }
        }

        if (isValidShareId(shareId)) {
            fetchSharedProgram();
        }

        if (empty === "true") {
            setProgramFromHydrate(appendOrderToHevyRoutines(emptyHevyProgram));
        }
    }, [shouldBareRedirectToEmpty, resume, shareId, empty, programHydrateChatId, router, setProgramFromHydrate]);

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
        [saveSidebarSize],
    );

    const isExpanded = sidebarSize >= EXPANDED_SIZE - 5;

    return (
        <>
            <BuildProgramShell
                key={shellKey}
                chatHistoryLoading={chatHistoryLoading}
                initialMessages={chatInitialMessages}
                user={user}
                chatId={chatId}
                search={search}
                resume={resume}
                hevyProgram={hevyProgram}
                setHevyProgram={setHevyProgram}
                commitWithUndo={commitWithUndo}
                setProgramFromHydrate={setProgramFromHydrate}
                orderedProgram={orderedProgram}
                programRequest={programRequest}
                isMobile={isMobile}
                sharedProgramLoadAttempted={sharedProgramLoadAttempted}
                undoStackLength={undoStack.length}
                handleUndo={handleUndo}
                clearUndoBaseline={clearUndoBaseline}
                sidebarPosition={sidebarPosition}
                toggleSidebarPosition={toggleSidebarPosition}
                onToggleExpand={onToggleExpand}
                handleToggleHide={handleToggleHide}
                handleOpenChat={handleOpenChat}
                isExpanded={isExpanded}
                sidebarPanelRef={sidebarPanelRef}
                sidebarSize={sidebarSize}
                onSidebarResize={onSidebarResize}
                isChatHidden={isChatHidden}
                mobileTab={mobileTab}
                setMobileTab={setMobileTab}
                chatEntryPlan={chatEntryPlan}
            />
            <ConfirmDialog
                open={leaveDialogOpen}
                onOpenChange={onLeaveDialogOpenChange}
                title={newPathLeaveGuard.title}
                description={newPathLeaveGuard.description}
                cancelLabel="Cancel"
                confirmLabel="Discard"
                confirmHref={pendingHref ?? undefined}
                onConfirm={onDiscardLeave}
            />
        </>
    );
}

interface IBuildProgramShellProps {
    chatHistoryLoading: boolean;
    initialMessages: TChatMessage[];
    user: User | null;
    chatId: string;
    search: string;
    resume: string;
    hevyProgram: THevyRoutine[];
    setHevyProgram: (value: THevyRoutine[] | ((prev: THevyRoutine[]) => THevyRoutine[])) => void;
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void;
    setProgramFromHydrate: (program: THevyRoutine[]) => void;
    orderedProgram: THevyRoutine[];
    programRequest: ReturnType<typeof useProgramRequestState>;
    isMobile: boolean;
    sharedProgramLoadAttempted: boolean;
    undoStackLength: number;
    handleUndo: () => void;
    clearUndoBaseline: () => void;
    sidebarPosition: "left" | "right";
    toggleSidebarPosition: () => void;
    onToggleExpand: () => void;
    handleToggleHide: () => void;
    handleOpenChat: () => void;
    isExpanded: boolean;
    sidebarPanelRef: RefObject<ImperativePanelHandle | null>;
    sidebarSize: number;
    onSidebarResize: (size: number) => void;
    isChatHidden: boolean;
    mobileTab: string;
    setMobileTab: (tab: string) => void;
    chatEntryPlan: IChatEntryPlan;
}

function BuildProgramShell({
    chatHistoryLoading,
    initialMessages,
    user,
    chatId,
    search,
    resume,
    hevyProgram,
    setHevyProgram,
    commitWithUndo,
    setProgramFromHydrate,
    orderedProgram,
    programRequest,
    isMobile,
    sharedProgramLoadAttempted,
    undoStackLength,
    handleUndo,
    clearUndoBaseline,
    sidebarPosition,
    toggleSidebarPosition,
    onToggleExpand,
    handleToggleHide,
    handleOpenChat,
    isExpanded,
    sidebarPanelRef,
    sidebarSize,
    onSidebarResize,
    isChatHidden,
    mobileTab,
    setMobileTab,
    chatEntryPlan,
}: IBuildProgramShellProps) {
    const { clearChatRef, getPersistChatIdRef } = useBuildProgramActions();
    const queryClient = useQueryClient();
    const [isSaving, setIsSaving] = useState(false);

    const chat = useBuildProgramChat({
        user,
        hevyProgram,
        programRequest,
        isMobile,
        setMobileTab,
        initialMessages,
        sharedProgramLoadAttempted,
        chatId,
        chatEntryPlan,
    });

    const {
        messages,
        setMessages,
        clearMessages,
        getPersistChatId,
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
        trySendInitialPrompt,
        tryRunSignInMigration,
        lastAtomicBuildCommitKeyRef,
        appliedMutateProgramKeysRef,
    } = chat;

    clearChatRef.current = clearMessages;
    getPersistChatIdRef.current = getPersistChatId;

    const onUndo = useCallback(() => {
        if (status === "streaming") return;
        handleUndo();
    }, [status, handleUndo]);

    useEffect(() => {
        void (async () => {
            await tryRunSignInMigration();
            trySendInitialPrompt();
        })();
    }, [tryRunSignInMigration, trySendInitialPrompt, sharedProgramLoadAttempted]);

    const handleSave = useCallback(async () => {
        if (!user) {
            toast.error("Sign in to save.");
            return;
        }
        if (hevyProgram.length === 0) {
            toast.error("Add a program first.");
            return;
        }
        const title = deriveChatTitle();
        setIsSaving(true);

        try {
            const prompt = title !== "Untitled" ? title : search || "";
            const supabaseResult = await saveProgramToSupabase(
                orderedProgram,
                prompt,
                programRequest.request,
                user.id,
            );

            if (!isSaveProgramToSupabaseSuccess(supabaseResult)) {
                const detail = getSaveProgramToSupabaseFailureDetail(supabaseResult);
                toast.error(`Failed to save program: ${detail}`);
                console.error("Failed to save program.", supabaseResult);
                return;
            }

            const programId = supabaseResult.id;
            if (supabaseResult.skippedExercises?.length) {
                for (const skipped of supabaseResult.skippedExercises) {
                    toast.warning(`${skipped.exerciseName}: ${skipped.reason}`);
                }
            }

            const connectResult = await connectChatToSavedProgram({
                user,
                persistChatId: getPersistChatId(),
                programId: String(programId),
                queryClient,
            });
            clearBuilderDraft();
            clearUndoBaseline();
            toast.success(NEW_PATH_SAVE_SUCCESS_TOAST);
            if (connectResult === "failed") {
                toast.warning("Chat connection failed.");
                console.error("Chat link failed.");
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
        orderedProgram,
        programRequest.request,
        search,
        queryClient,
        getPersistChatId,
        clearUndoBaseline,
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
            if (!canWriteBuilderDraft()) return;
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

    const chatPanelStateProps = {
        search,
        hevyProgram,
        setHevyProgram,
        commitWithUndo,
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
        appliedMutateProgramKeysRef,
        chatHistoryLoading,
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
        <ProgramEditor orderedProgram={orderedProgram} isMobile={isMobile} />
    );

    const hasProgramContent = hevyProgram.some((r) => (r.exercises ?? []).length > 0);

    return (
        <ProgramMutationProvider
            program={hevyProgram}
            commitWithUndo={commitWithUndo}
            setProgramFromHydrate={setProgramFromHydrate}
            isAgentStreaming={status === "streaming"}
        >
            <BuildProgramToolbarTitle
                value={programRequest.programTitle}
                onChange={programRequest.handleProgramTitle}
            />
            <ToolbarPortalButtons
                canUndo={isNewPathDirty(undoStackLength)}
                undoDisabled={status === "streaming"}
                onUndo={onUndo}
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
                                className="fixed top-31 z-40 max-sm:hidden gap-2 rounded-l-none rounded-r-full px-4 py-2 shadow-md bg-white dark:bg-extraDarkGray border-gray-300 dark:border-gray-600"
                                aria-label="Open chat"
                            >
                                <MessageSquare className="h-4 w-4" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent className="bg-lightSecondary text-white">Open chat</TooltipContent>
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
        </ProgramMutationProvider>
    );
}
