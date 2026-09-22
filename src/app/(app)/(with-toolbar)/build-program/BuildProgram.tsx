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
import { getMessageText, isAgentMutationLockActive, normalizeProgramState, programHasExerciseRows } from "@/components/program-builder/utils/helpers";
import { ProgramEditor } from "./ProgramEditor";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getSharedProgram, postNewProgramSubscriber } from "@/api/programs";
import { CHAT_MESSAGES_KEY, COLLAPSED_SIZE, EXPANDED_SIZE, LONG_PROMPT_PLACEHOLDER, SIDEBAR_POSITION_KEY, SIDEBAR_SIZE_KEY } from "@/assets/constants/ui-constants";
import { emptyHevyProgram } from "@/assets/constants";
import { toast } from "sonner";
import { useDebouncedCallback } from "use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import { useUserContext } from "@/contexts/UserContext";
import { buildAuthLoginHref } from "@/lib/sign-in-return";
import { BUILD_PROGRAM_PATH } from "@/lib/build-program-url";
import { ProgramMutationProvider } from "@/contexts/ProgramMutationContext";
import { useBuildProgramActions } from "@/contexts/BuildProgramActionsContext";
import {
    getSaveProgramToSupabaseFailureDetail,
    isSaveProgramToSupabaseSuccess,
    saveProgramToSupabase,
    getRoutinesInFolder,
} from "@/components/program-builder/api/hevy";
import {
    buildRollbackPlan,
    executeHevySyncPlan,
    syncProgramToHevy,
    type TSyncResult,
} from "@/components/program-builder/api/hevy_sync";
import { connectChatToSavedProgram, isChatSessionInsertConfirmed } from "@/api/chat-history";
import { readLandedMesocycleBlocks } from "@/api/mesocycle-blocks";
import { ToolbarPortalButtons } from "@/components/program-builder/shared/ToolbarPortalButtons";
import { BuildProgramToolbarTitle } from "@/components/program-builder/shared/BuildProgramToolbarTitle";
import { SyncProgressDialog, type TSyncDialogPhase, type TSyncProgress } from "@/components/program-builder/shared/SyncProgressDialog";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { newPathLeaveGuard } from "@/hooks/create-leave-guard";
import {
    editLeaveGuard,
    isEditLeaveDirty,
    resolveSyncLeaveHref,
    useEditLeaveGuard,
} from "@/hooks/useEditLeaveGuard";
import {
    canWriteBuilderDraft,
    clearBuilderDraft,
    enableBuilderDraftWrites,
    NEW_PATH_SAVE_SUCCESS_TOAST,
} from "@/lib/builder-draft";
import { useEditSession } from "@/contexts/EditSessionContext";
import { isHevyEditArrival, persistModeForBuilder, completedHevyRoutineIdsForWeek } from "@/hooks/edit-persist";
import {
    builderStartHref,
    coerceProgramId,
    prescriptionProgramIdForStart,
    shouldShowBuilderStart,
} from "@/hooks/builder-start";
import {
    PROGRAM_HEVY_LINKS_QUERY_KEY,
    useHevySecret,
    useProgramHevyWeekLinks,
    useWorkoutRoutineIds,
} from "@/api/hooks";
import { editorReducer, isNewPathDirty, isNewPathSaveDirty, isNewPathToolbarSaveDisabled } from "./editor-reducer";
import { isProposalMarksLive } from "@/components/program-builder/utils/proposal-marks";
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
    shouldApplyEmptyProgramTemplate,
    shouldRedirectBareBuildProgramToEmpty,
    resolveChatEntryPlan,
    resolveInitialMessages,
    resolveChatHistoryFetchEnabled,
    resolveSendPathConfirmed,
    resolveSidebarRowKnown,
    type IChatEntryPlan,
    type IChatNavigationLatch,
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

function readSidebarPosition(): "left" | "right" {
    if (typeof window === "undefined") return "left";
    const saved = localStorage.getItem(SIDEBAR_POSITION_KEY);
    return saved === "left" || saved === "right" ? saved : "left";
}

function readSidebarSize(): number {
    if (typeof window === "undefined") return 28;
    const saved = localStorage.getItem(SIDEBAR_SIZE_KEY);
    if (!saved) return 28;
    const size = parseFloat(saved);
    return size >= 20 && size <= EXPANDED_SIZE ? size : 28;
}

function chatNavigationLatchEquals(a: IChatNavigationLatch, b: IChatNavigationLatch): boolean {
    return (
        a.latched === b.latched
        && a.prevChatId === b.prevChatId
        && (a.pendingSidebarPick ?? false) === (b.pendingSidebarPick ?? false)
    );
}

/**
 * Program builder client: chat sidebar, program state (hevyProgram), filters,
 * URL params (shareId, resume, empty, search). No props; reads searchParams and context.
 */
export function BuildProgram() {
    const { user, isLoading: isAuthLoading } = useUserContext();
    const router = useRouter();
    logPageView(user?.id);
    const searchParams = useSearchParams();
    const persistSignInHref = !isAuthLoading && !user
        ? buildAuthLoginHref(BUILD_PROGRAM_PATH, searchParams)
        : null;

    const arrival = parseBuildProgramArrival(searchParams);
    const { urlChatId, search, shareId, empty, resume } = arrival;
    const chatId = urlChatId;

    /** Edit path router state (`edit=true&hevy=true`). */
    const hevyEditArrival = isHevyEditArrival(searchParams);
    const { session: editSession, clearEditSession } = useEditSession();
    const editHydratedRef = useRef(false);

    const isBareArrival = isBareBuildProgramArrival({ urlChatId, search, shareId, empty, resume });
    const explicitNewChat = isExplicitNewChatArrival({ empty, urlChatId, resume });

    const [sawNonBareArrival, setSawNonBareArrival] = useState(!isBareArrival);
    if (!isBareArrival && !sawNonBareArrival) {
        setSawNonBareArrival(true);
    }
    const shouldBareRedirectToEmpty = shouldRedirectBareBuildProgramToEmpty(
        isBareArrival,
        sawNonBareArrival,
    );

    const { data: chatIds } = useChatIds(user);
    const [savedPrescription, setSavedPrescription] = useState<{
        chatId: string;
        programId: number;
    } | null>(null);
    // New Chat wipes this session's Save id (render reset, not an effect).
    if (explicitNewChat && savedPrescription != null) {
        setSavedPrescription(null);
    }
    const chatProgramId = coerceProgramId(
        chatIds?.find((row) => row.id === chatId)?.program_id,
    );
    const savedProgramIdForChat =
        savedPrescription == null
            ? null
            : chatId === savedPrescription.chatId || chatId === ""
                ? savedPrescription.programId
                : null;
    const sidebarRowKnown = resolveSidebarRowKnown(chatId, chatIds);
    const sendPathConfirmed = resolveSendPathConfirmed(chatId, isChatSessionInsertConfirmed(chatId));

    const [chatNavLatch, setChatNavLatch] = useState(() => createChatNavigationLatch(urlChatId));
    const resetLatch = resetChatNavigationLatchForArrival(
        { empty, urlChatId, resume },
        chatNavLatch,
    );
    const { chatNavigationArrival, next: chatNavLatchNext } = advanceChatNavigationLatch(
        chatId,
        resetLatch,
        { sidebarRowKnown, sendPathConfirmed, hasEmptyParam: empty === "true" },
    );
    if (!chatNavigationLatchEquals(chatNavLatch, chatNavLatchNext)) {
        setChatNavLatch(chatNavLatchNext);
    }
    const programHydrateChatId = chatNavigationArrival ? chatId : "";

    const [sharedProgramLoadAttempted, setSharedProgramLoadAttempted] = useState(
        () => !isValidShareId(shareId),
    );

    const [{ hevyProgram, undoStack, proposalMarks }, dispatchEditor] = useReducer(editorReducer, {
        hevyProgram: [],
        undoStack: [],
        proposalMarks: null,
    });
    const liveProposalMarkKeys = isProposalMarksLive(proposalMarks, undoStack.length)
        ? proposalMarks?.keys ?? []
        : [];
    /** True after a successful New-path Save this session (undo baseline established). */
    const [hasSaveBaseline, setHasSaveBaseline] = useState(false);
    const editMode = searchParams.get("edit") === "true";
    const hasProgramContent = programHasExerciseRows(hevyProgram);
    const newPathDirty = isNewPathSaveDirty(
        undoStack.length,
        hasSaveBaseline,
        hasProgramContent,
    );
    /** Mirror only — SoT is save baseline + undo stack. Silent assign for beforeunload / link capture. */
    newPathLeaveGuard.setDirty(!editMode && newPathDirty);

    const setProgramFromHydrate = useCallback((program: THevyRoutine[]) => {
        dispatchEditor({ type: "REPLACE_PROGRAM", program: normalizeProgramState(program) });
    }, [dispatchEditor]);

    const commitWithUndo = useCallback((next: THevyRoutine[], options?: TCommitWithUndoOptions) => {
        enableBuilderDraftWrites();
        dispatchEditor({
            type: "COMMIT_PROGRAM",
            program: normalizeProgramState(next),
            recordUndo: options?.recordUndo ?? true,
            proposalMarkKeys: options?.proposalMarkKeys,
        });
    }, [dispatchEditor]);

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
        [commitWithUndo, dispatchEditor],
    );
    const programResetKey = `${programHydrateChatId}|${shareId}|${resume}|${empty}|${hevyEditArrival ? "edit" : "new"}`;
    const [appliedProgramResetKey, setAppliedProgramResetKey] = useState(programResetKey);
    if (appliedProgramResetKey !== programResetKey) {
        setAppliedProgramResetKey(programResetKey);
        if (!hevyEditArrival) {
            setProgramFromHydrate([]);
            setSharedProgramLoadAttempted(!isValidShareId(shareId));
        }
    }
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

    const [sidebarPosition, setSidebarPosition] = useState(readSidebarPosition);
    const [sidebarSize, setSidebarSize] = useState(readSidebarSize);
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
    }, [dispatchEditor]);

    const clearUndoBaseline = useCallback(() => {
        dispatchEditor({ type: "CLEAR_UNDO_BASELINE" });
        setHasSaveBaseline(true);
    }, [dispatchEditor, setHasSaveBaseline]);

    const {
        leaveDialogOpen,
        pendingHref,
        onLeaveDialogOpenChange,
        onDiscardLeave,
    } = newPathLeaveGuard.useLeaveGuard();

    useEffect(() => {
        if (shouldBareRedirectToEmpty) {
            router.replace("/build-program?empty=true");
            return;
        }

        // Edit path arrives through the in-memory Edit session, not the
        // New-path draft key (ADR 0013 / 02, / 04). No session (hard refresh,
        // hand-typed URL) → back to the overview. After a successful Sync we
        // may clear the session while this effect is still mounted — skip
        // the wipe/redirect if we already hydrated.
        if (hevyEditArrival) {
            if (editSession?.routines.length) {
                setProgramFromHydrate(appendOrderToHevyRoutines(editSession.routines));
                editHydratedRef.current = true;
            } else if (!editHydratedRef.current) {
                toast.error("That edit session has expired. Open the week again from your program.");
                router.replace("/profile");
            }
            return;
        }

        // Edit session lives on the layout provider and survives client
        // navigation. New path / Edit program must drop it or persist stays Sync.
        if (editSession) {
            clearEditSession();
        }
        editHydratedRef.current = false;

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

        if (shouldApplyEmptyProgramTemplate({ empty, resume })) {
            setProgramFromHydrate(appendOrderToHevyRoutines(emptyHevyProgram));
        }
    }, [shouldBareRedirectToEmpty, resume, shareId, empty, programHydrateChatId, router, setProgramFromHydrate, hevyEditArrival, editSession, clearEditSession]);

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
                isAuthLoading={isAuthLoading}
                persistSignInHref={persistSignInHref}
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
                hasSaveBaseline={hasSaveBaseline}
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
                isHevyEditArrival={hevyEditArrival}
                clearEditSession={clearEditSession}
                chatProgramId={chatProgramId}
                savedProgramId={savedProgramIdForChat}
                onPrescriptionSaved={setSavedPrescription}
                proposalMarkKeys={liveProposalMarkKeys}
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
    isAuthLoading: boolean;
    persistSignInHref: string | null;
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
    hasSaveBaseline: boolean;
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
    isHevyEditArrival: boolean;
    clearEditSession: () => void;
    chatProgramId: number | null;
    savedProgramId: number | null;
    onPrescriptionSaved: (saved: { chatId: string; programId: number }) => void;
    proposalMarkKeys: readonly number[];
}

function BuildProgramShell({
    chatHistoryLoading,
    initialMessages,
    user,
    isAuthLoading,
    persistSignInHref,
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
    hasSaveBaseline,
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
    isHevyEditArrival,
    clearEditSession,
    chatProgramId,
    savedProgramId,
    onPrescriptionSaved,
    proposalMarkKeys,
}: IBuildProgramShellProps) {
    const { clearChatRef, getPersistChatIdRef } = useBuildProgramActions();
    const queryClient = useQueryClient();
    const router = useRouter();
    const { session: editSession } = useEditSession();
    const { data: hevyApiKey } = useHevySecret(user);
    const { data: workoutRoutineIds } = useWorkoutRoutineIds(user?.id);
    const completedHevyRoutineIds = useMemo(
        () =>
            completedHevyRoutineIdsForWeek({
                nthWeek: editSession?.nthWeek,
                initialRoutineIds: editSession?.initialRoutineIds ?? [],
                workoutRoutineIds: workoutRoutineIds ?? [],
            }),
        [editSession?.nthWeek, editSession?.initialRoutineIds, workoutRoutineIds],
    );
    const persistMode = persistModeForBuilder({
        isHevyEditArrival,
    });
    const prescriptionProgramId = prescriptionProgramIdForStart({
        persistMode,
        savedProgramId,
        chatProgramId,
    });
    const { data: programHevyLinks, isSuccess: programHevyLinksSuccess } =
        useProgramHevyWeekLinks(
            persistMode === "save" ? prescriptionProgramId ?? undefined : undefined,
        );
    const hevyLinkCount =
        persistMode === "save" && prescriptionProgramId != null && programHevyLinksSuccess
            ? (programHevyLinks?.length ?? 0)
            : null;
    const hasProgramContent = programHasExerciseRows(hevyProgram);
    const newPathDirty = isNewPathSaveDirty(
        undoStackLength,
        hasSaveBaseline,
        hasProgramContent,
    );
    const showStart = shouldShowBuilderStart({
        persistMode,
        programId: prescriptionProgramId,
        hevyLinkCount,
        hasSaveBaseline,
        isDirty: newPathDirty,
    });
    const startHref =
        showStart && prescriptionProgramId != null
            ? builderStartHref(prescriptionProgramId)
            : null;
    const [isSaving, setIsSaving] = useState(false);
    const [syncDialogOpen, setSyncDialogOpen] = useState(false);
    const [syncPhase, setSyncPhase] = useState<TSyncDialogPhase>("uploading");
    const [syncProgress, setSyncProgress] = useState<TSyncProgress | null>(null);
    const [syncResult, setSyncResult] = useState<TSyncResult | null>(null);
    const syncAfterHrefRef = useRef("/profile");
    /** Mirror only — SoT is undo stack after Edit hydrate. */
    editLeaveGuard.setDirty(isEditLeaveDirty(isHevyEditArrival, undoStackLength));
    const {
        leaveDialogOpen: editLeaveDialogOpen,
        pendingHref: editLeavePendingHref,
        onLeaveDialogOpenChange: onEditLeaveDialogOpenChange,
        onDiscardLeave: onDiscardEditLeave,
    } = useEditLeaveGuard();

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
        lastHevyShareImportKeyRef,
    } = chat;

    // Sidebar/export mailbox lives on a context ref; those callers run on click, not during render.
    useEffect(() => {
        clearChatRef.current = clearMessages;
        getPersistChatIdRef.current = getPersistChatId;
    }, [clearChatRef, getPersistChatIdRef, clearMessages, getPersistChatId]);

    const agentMutationLock = isAgentMutationLockActive(
        messages,
        status,
        hevyProgram,
        appliedMutateProgramKeysRef,
    );

    const onUndo = useCallback(() => {
        if (agentMutationLock) return;
        handleUndo();
    }, [agentMutationLock, handleUndo]);

    useEffect(() => {
        void (async () => {
            await tryRunSignInMigration();
            trySendInitialPrompt();
        })();
    }, [tryRunSignInMigration, trySendInitialPrompt, sharedProgramLoadAttempted]);

    const handleSave = useCallback(async () => {
        if (persistMode === "sync") return;
        if (isLoading) return;
        if (!user) {
            if (persistSignInHref != null) {
                router.push(persistSignInHref);
            }
            return;
        }
        if (!hasProgramContent) {
            toast.error("Add a program first.");
            return;
        }
        const title = deriveChatTitle();
        setIsSaving(true);

        try {
            const prompt = title !== "Untitled" ? title : search || "";
            // ADR 0032 / 04: blocks from the landed First build; null when none landed this chat.
            const supabaseResult = await saveProgramToSupabase(
                orderedProgram,
                prompt,
                programRequest.request,
                user.id,
                readLandedMesocycleBlocks(messages),
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

            const subscriberError = await postNewProgramSubscriber(user, String(programId));
            if (subscriberError) {
                toast.error("Program saved but failed to add to My Programs.");
                console.error("Failed to add program to My Programs.", subscriberError);
                return;
            }
            queryClient.invalidateQueries({ queryKey: ["subscribed-programs", user.id] });

            const connectResult = await connectChatToSavedProgram({
                user,
                persistChatId: getPersistChatId(),
                programId: String(programId),
                queryClient,
            });
            onPrescriptionSaved({
                chatId: getPersistChatId() || chatId,
                programId,
            });
            queryClient.setQueryData([...PROGRAM_HEVY_LINKS_QUERY_KEY, programId], []);
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
        isLoading,
        persistSignInHref,
        router,
        user,
        hasProgramContent,
        orderedProgram,
        messages,
        programRequest.request,
        search,
        queryClient,
        getPersistChatId,
        clearUndoBaseline,
        persistMode,
        onPrescriptionSaved,
        chatId,
    ]);

    const handleSync = useCallback(async (afterHref?: string) => {
        if (afterHref != null) {
            syncAfterHrefRef.current = afterHref;
        }
        if (persistMode !== "sync") return;
        if (isLoading || isSaving) return;
        if (!user) {
            toast.error("Sign in to sync.");
            return;
        }
        if (!editSession) {
            toast.error("That edit session has expired. Open the week again from your program.");
            return;
        }
        if (!hevyApiKey) {
            toast.error("Add your Hevy API key in profile.");
            return;
        }

        setIsSaving(true);
        setSyncDialogOpen(true);
        setSyncPhase("uploading");
        setSyncProgress({ uploaded: 0, total: 0, status: "uploading" });

        try {
            const result = await syncProgramToHevy({
                apiKey: hevyApiKey,
                user,
                session: {
                    initialFolderId: editSession.initialFolderId,
                    initialHevyProgram: editSession.initialHevyProgram,
                    initialRoutineIds: editSession.initialRoutineIds,
                    programId: editSession.programId,
                    nthWeek: editSession.nthWeek,
                },
                workingRoutines: orderedProgram,
                completedHevyRoutineIds,
                onProgress: (uploaded, total, status, rateLimitSecondsLeft) => {
                    setSyncProgress({ uploaded, total, status, rateLimitSecondsLeft });
                },
            });

            if (!result.success) {
                setSyncResult(result);
                setSyncPhase("failed");
                return;
            }

            setSyncDialogOpen(false);
            toast.success("Synced to Hevy.");
            await queryClient.invalidateQueries({ queryKey: ["hevy-programs"] });
            if (editSession.programId != null) {
                await queryClient.invalidateQueries({
                    queryKey: [...PROGRAM_HEVY_LINKS_QUERY_KEY, editSession.programId],
                });
            }
            router.push(syncAfterHrefRef.current);
            clearEditSession();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Sync failed.");
            console.error("Sync error:", err);
            setSyncPhase("failed");
        } finally {
            setIsSaving(false);
        }
    }, [
        persistMode,
        isLoading,
        isSaving,
        user,
        editSession,
        hevyApiKey,
        orderedProgram,
        completedHevyRoutineIds,
        queryClient,
        router,
        clearEditSession,
    ]);

    const handleSyncAndContinue = useCallback(() => {
        const href = resolveSyncLeaveHref(editLeavePendingHref);
        void handleSync(href);
    }, [editLeavePendingHref, handleSync]);

    const handleDiscardEditLeave = useCallback(() => {
        onDiscardEditLeave();
        clearEditSession();
    }, [clearEditSession, onDiscardEditLeave]);

    const handleRollback = useCallback(async () => {
        if (!editSession || !hevyApiKey || !syncResult) return;
        setSyncPhase("rolling_back");
        setIsSaving(true);
        try {
            const folderRoutines =
                editSession.initialFolderId != null
                    ? await getRoutinesInFolder(hevyApiKey, editSession.initialFolderId)
                    : [];
            const plan = buildRollbackPlan({
                currentFolderRoutineIds: folderRoutines.map((routine) => routine.id),
                initialHevyProgram: editSession.initialHevyProgram,
                postedDuringSyncIds: syncResult.postedRoutineIds,
            });
            const rolled = await executeHevySyncPlan({
                apiKey: hevyApiKey,
                user,
                session: {
                    initialFolderId: editSession.initialFolderId,
                    initialHevyProgram: editSession.initialHevyProgram,
                    initialRoutineIds: editSession.initialRoutineIds,
                    programId: editSession.programId,
                    nthWeek: editSession.nthWeek,
                },
                plan,
                onProgress: (uploaded, total, status, rateLimitSecondsLeft) => {
                    setSyncProgress({ uploaded, total, status, rateLimitSecondsLeft });
                },
            });
            if (!rolled.success) {
                setSyncResult(rolled);
                setSyncPhase("failed");
                toast.error("Rollback failed.");
                return;
            }
            toast.success("Rolled back to the previous version.");
            setSyncDialogOpen(false);
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Rollback failed.");
            setSyncPhase("failed");
        } finally {
            setIsSaving(false);
        }
    }, [editSession, hevyApiKey, syncResult, user]);

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
            if (isHevyEditArrival) return;
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
    }, [hevyProgram, programRequest.request, resume, search, user, messages, isHevyEditArrival]);

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
        lastHevyShareImportKeyRef,
        chatHistoryLoading,
        showStart,
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

    return (
        <ProgramMutationProvider
            program={hevyProgram}
            commitWithUndo={commitWithUndo}
            setProgramFromHydrate={setProgramFromHydrate}
            isAgentStreaming={agentMutationLock}
            completedHevyRoutineIds={completedHevyRoutineIds}
            proposalMarkKeys={proposalMarkKeys}
        >
            <BuildProgramToolbarTitle
                value={programRequest.programTitle}
                onChange={programRequest.handleProgramTitle}
            />
            <ToolbarPortalButtons
                canUndo={isNewPathDirty(undoStackLength)}
                undoDisabled={agentMutationLock}
                onUndo={onUndo}
                onSave={persistMode === "sync" ? () => { void handleSync("/profile"); } : handleSave}
                saveDisabled={
                    persistMode === "sync"
                        ? !user || isSaving || isLoading
                        : isNewPathToolbarSaveDisabled({
                            hasProgramContent,
                            hasSaveBaseline,
                            isLoading,
                            isSaving,
                            undoStackLength,
                            userPresent: Boolean(user),
                        })
                }
                isSaving={isSaving}
                persistMode={persistMode}
                signInHref={persistSignInHref}
                isAuthLoading={isAuthLoading}
                startHref={startHref}
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
            <SyncProgressDialog
                open={syncDialogOpen}
                phase={syncPhase}
                progress={syncProgress}
                failures={syncResult?.failures ?? []}
                onRetry={() => { void handleSync(); }}
                onRollback={() => { void handleRollback(); }}
                onOpenChange={setSyncDialogOpen}
            />
            <ConfirmDialog
                open={editLeaveDialogOpen}
                onOpenChange={onEditLeaveDialogOpenChange}
                title={editLeaveGuard.title}
                description={editLeaveGuard.description}
                hideCancel
                confirmLabel="Discard"
                confirmHref={editLeavePendingHref ?? undefined}
                onConfirm={handleDiscardEditLeave}
                secondaryLabel="Sync and Continue"
                secondaryClassName="bg-lightSecondary text-white hover:bg-lightSecondary/90"
                onSecondary={handleSyncAndContinue}
            />
        </ProgramMutationProvider>
    );
}
