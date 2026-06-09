"use client";

import { useCallback, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useChat } from "@ai-sdk/react";
import {
    DefaultChatTransport,
    type ChatStatus,
    type FileUIPart,
} from "ai";
import posthog from "posthog-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { ensureChatSessionOnSend, migrateAnonymousThreadToChat, persistChatHistoryAfterTurn } from "@/api/chat-history";
import {
    applyBuildProgramMintUrlUpdate,
    stripSearchFromBuildProgramUrl,
} from "@/lib/build-program-url";
import { recordLlmRequest } from "@/api/feature-limits";
import {
    CHAT_MESSAGES_KEY,
    LONG_PROMPT_PLACEHOLDER,
} from "@/assets/constants/ui-constants";
import {
    getMessageText,
    getTextFromChatMessage,
    isMessageAboutProgram,
} from "@/components/program-builder/utils/helpers";
import type { TSendMessageWithContext } from "@/components/program-builder/shared/agent/Agent";
import {
    clearLongPromptFromSessionStorage,
    inferProgramRequestFromPrompt,
    readPendingAttachmentFileParts,
    resolveInitialPromptText,
} from "./initial-prompt";
import type { IChatEntryPlan } from "./resolve-chat-entry";
import { resolvePersistChatId, shouldRunAutoSend } from "./resolve-chat-entry";
import type { useProgramRequestState } from "./use-program-request-state";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type TProgramRequestState = ReturnType<typeof useProgramRequestState>;

const chatTransport = new DefaultChatTransport({ api: "/api/chat" });
const MAX_RETRIES = 2;

export interface IUseBuildProgramChatOptions {
    user: User | null;
    hevyProgram: THevyRoutine[];
    programRequest: TProgramRequestState;
    isMobile: boolean;
    setMobileTab: (tab: string) => void;
    /** Snapshot for keyed remount (chat history or anonymous restore). */
    initialMessages: TChatMessage[];
    /** True once shared-program fetch finished or was not needed (no valid `shareId`). */
    sharedProgramLoadAttempted: boolean;
    /** Effective chat id from URL (`?chat=`). */
    chatId: string;
    /** Arrival bootstrap plan from `resolveChatEntryPlan`. */
    chatEntryPlan: IChatEntryPlan;
}

export interface IProps {
    messages: TChatMessage[];
    setMessages: (
        messages:
            | TChatMessage[]
            | ((msgs: TChatMessage[]) => TChatMessage[]),
    ) => void;
    sendMessageWithContext: TSendMessageWithContext;
    clearMessages: () => void;
    /** URL `?chat=` or mint ref until URL propagates (persist/connect paths). */
    getPersistChatId: () => string;
    handleSubmit: (text: string, files?: FileUIPart[]) => void;
    handleStop: () => void;
    isBuilding: boolean;
    handleIsBuilding: (isBuilding: boolean) => void;
    isLoading: boolean;
    status: ChatStatus;
    activeError: Error | null;
    onRetry: () => void;
    onClearError: () => void;
    retryCount: number;
    maxRetries: number;
    onTimeoutError: () => void;
    onBuildComplete: () => void;
    trySendInitialPrompt: () => void;
    tryRunSignInMigration: () => Promise<void>;
    lastAtomicBuildCommitKeyRef: React.RefObject<string | null>;
    appliedMutateProgramKeysRef: React.RefObject<Set<string>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Anonymous session restore — read once at `useChat` init when `!chatId && !user`. */
export function readAnonymousChatMessages(): TChatMessage[] {
    if (typeof window === "undefined") return [];

    try {
        const stored = localStorage.getItem(CHAT_MESSAGES_KEY);
        if (!stored) return [];

        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length > 0 ? (parsed as TChatMessage[]) : [];
    } catch {
        return [];
    }
}

function logAgentError(error: unknown, userId: string | undefined): void {
    const normalized = error instanceof Error ? error : new Error(String(error));
    posthog?.capture?.("ai_agent_error", {
        user: userId ?? "user_id_unknown",
        errorMessage: normalized.message || "unknown",
    });
}

function joinOptionValues(options: { value: string }[] | undefined): string {
    return options?.length ? options.map((option) => option.value).join(", ") : "";
}

function optionalNumericField(value: string | undefined): number | undefined {
    return value ? Number(value) : undefined;
}

function trimOrEmpty(value: string | undefined): string {
    return value?.trim() ?? "";
}

interface IMessageContextBodyInput {
    messageText: string;
    hevyProgram: THevyRoutine[];
    chatId: string;
    daysPerWeek: string;
    programLength: string;
    excludeAreas: { value: string }[];
    excludeEquipment: { value: string }[];
    healthIssues: { value: string }[];
    splitType: string;
    exerciseVariability: string;
    progressionSystem: string;
    deloadWeek: string;
    peakWeek: string;
}

function buildMessageContextBody(input: IMessageContextBodyInput) {
    const includeProgram = isMessageAboutProgram(input.messageText);

    return {
        hevyProgram: includeProgram ? input.hevyProgram : [],
        daysPerWeek: optionalNumericField(input.daysPerWeek),
        programLength: optionalNumericField(input.programLength),
        excludeAreas: joinOptionValues(input.excludeAreas),
        excludeEquipment: joinOptionValues(input.excludeEquipment),
        healthIssues: joinOptionValues(input.healthIssues),
        splitType: trimOrEmpty(input.splitType),
        exerciseVariability: trimOrEmpty(input.exerciseVariability),
        progressionSystem: trimOrEmpty(input.progressionSystem),
        deloadWeek: trimOrEmpty(input.deloadWeek),
        peakWeek: trimOrEmpty(input.peakWeek),
        chatSessionId: input.chatId || undefined,
    };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useBuildProgramChat(options: IUseBuildProgramChatOptions): IProps {
    const {
        user,
        hevyProgram,
        programRequest,
        isMobile,
        setMobileTab,
        initialMessages,
        sharedProgramLoadAttempted,
        chatId,
        chatEntryPlan,
    } = options;

    const router = useRouter();
    const pathname = usePathname();
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();

    const search = searchParams.get("search") ?? "";
    const shareId = searchParams.get("shareId") ?? "";

    /** Minted id until URL `?chat=` propagates (send handler only — not render). */
    const pendingMintChatIdRef = useRef("");

    const {
        daysPerWeek,
        programLength,
        excludeAreas,
        excludeEquipment,
        healthIssues,
        setDaysPerWeek,
        setProgramLength,
        setExcludeAreas,
        setExcludeEquipment,
        setHealthIssues,
    } = programRequest;

    const { mutate: incrementLlmRequests } = useMutation({
        mutationFn: () => recordLlmRequest(user),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feature-limits"] });
        },
    });

    const signInMigrationMutation = useMutation({
        mutationFn: (thread: TChatMessage[]) =>
            migrateAnonymousThreadToChat({
                user: user!,
                messages: thread,
                router,
                pathname,
                searchParams,
            }),
        onSuccess: (result) => {
            if (result.confirmed && user) {
                void queryClient.invalidateQueries({ queryKey: ["chat-ids", user.id] });
            } else if (!result.confirmed && !migrationFailToastShownRef.current) {
                migrationFailToastShownRef.current = true;
                toast.error("Couldn't save your chat yet. Messages are still here.");
            }
        },
    });

    const [generationError, setGenerationError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isBuilding, setIsBuilding] = useState(false);

    const lastHandledSearchRef = useRef("");
    const migrationAttemptedRef = useRef(false);
    const migrationFailToastShownRef = useRef(false);
    /** Survives MessageBubbles unmount when switching mobile tabs (Radix Tabs). */
    const lastAtomicBuildCommitKeyRef = useRef<string | null>(null);
    const appliedMutateProgramKeysRef = useRef<Set<string>>(new Set());
    const hasAutoSwitchedToProgramAfterFirstBuildRef = useRef(false);
    const insertFailToastShownForChatIds = useRef(new Set<string>());

    const resetChatSessionRefs = useCallback(() => {
        lastAtomicBuildCommitKeyRef.current = null;
        appliedMutateProgramKeysRef.current.clear();
        hasAutoSwitchedToProgramAfterFirstBuildRef.current = false;
    }, []);

    const { messages, sendMessage, setMessages, status, stop, error } = useChat<TChatMessage>({
        transport: chatTransport,
        messages: initialMessages,
        onFinish: ({ messages: finishedMessages, isAbort, isError }) => {
            const persistChatId = resolvePersistChatId(chatId, pendingMintChatIdRef.current);
            void persistChatHistoryAfterTurn({
                user,
                chatId: persistChatId,
                messages: finishedMessages,
                isAbort,
                isError,
            }).then((result) => {
                if (result === "success" && user && persistChatId) {
                    void queryClient.invalidateQueries({
                        queryKey: ["chat-history", user.id, persistChatId],
                    });
                }
            });
        },
        onError: (err) => {
            console.error("Chat error:", err);
            setGenerationError(err);
            setIsBuilding(false);
            logAgentError(err, user?.id);
        },
    });

    const clearMessages = useCallback(() => {
        resetChatSessionRefs();
        pendingMintChatIdRef.current = "";
        setMessages([]);
    }, [resetChatSessionRefs, setMessages]);

    const activeError = generationError || error || null;
    const isLoading = status === "submitted" || status === "streaming";

    const sendMessageWithContext = useCallback<TSendMessageWithContext>(
        async (message, sendOptions) => {
            if (message == null) return;

            incrementLlmRequests(undefined, {
                onError: (err) => console.error("Failed to record LLM usage", err),
            });

            const hadChatIdAtSend = Boolean(chatId);
            let sessionChatId = chatId;

            if (user) {
                const firstUserText = getMessageText(message);
                if (firstUserText.trim()) {
                    const session = await ensureChatSessionOnSend({
                        user,
                        chatId,
                        firstUserText,
                    });
                    sessionChatId = session.chatId;
                    pendingMintChatIdRef.current = session.chatId;

                    if (session.confirmed) {
                        void queryClient.invalidateQueries({ queryKey: ["chat-ids", user.id] });
                    } else if (!insertFailToastShownForChatIds.current.has(session.chatId)) {
                        insertFailToastShownForChatIds.current.add(session.chatId);
                        toast.error("Couldn't save this chat yet. Your message will still send.");
                    }
                }
            }

            const messageText = getTextFromChatMessage(message);
            const contextBody = buildMessageContextBody({
                messageText,
                hevyProgram,
                chatId: sessionChatId,
                daysPerWeek: programRequest.daysPerWeek,
                programLength: programRequest.programLength,
                excludeAreas: programRequest.excludeAreas,
                excludeEquipment: programRequest.excludeEquipment,
                healthIssues: programRequest.healthIssues,
                splitType: programRequest.splitType,
                exerciseVariability: programRequest.exerciseVariability,
                progressionSystem: programRequest.progressionSystem,
                deloadWeek: programRequest.deloadWeek,
                peakWeek: programRequest.peakWeek,
            });

            const sendPromise = sendMessage(message, {
                ...sendOptions,
                body: { ...contextBody, ...sendOptions?.body },
            });

            if (sessionChatId && !hadChatIdAtSend) {
                applyBuildProgramMintUrlUpdate(router, pathname, searchParams, sessionChatId, {
                    stripSearch: Boolean(search.trim()),
                });
            }

            return sendPromise;
        },
        [
            sendMessage,
            user,
            search,
            router,
            pathname,
            searchParams,
            chatId,
            hevyProgram,
            queryClient,
            programRequest.daysPerWeek,
            programRequest.programLength,
            programRequest.excludeAreas,
            programRequest.excludeEquipment,
            programRequest.healthIssues,
            programRequest.splitType,
            programRequest.exerciseVariability,
            programRequest.progressionSystem,
            programRequest.deloadWeek,
            programRequest.peakWeek,
            incrementLlmRequests,
        ],
    );

    const tryRunSignInMigration = useCallback(async () => {
        if (!user || chatId || migrationAttemptedRef.current) return;

        const isExplicitNewChat =
            searchParams.get("empty") === "true" && !searchParams.get("chat");
        if (isExplicitNewChat) return;

        const thread =
            messages.length > 0 ? messages : readAnonymousChatMessages();
        if (thread.length === 0) return;

        migrationAttemptedRef.current = true;
        const trimmedSearch = search.trim();
        if (trimmedSearch) {
            lastHandledSearchRef.current = trimmedSearch;
        }

        await signInMigrationMutation.mutateAsync(thread);
    }, [user, chatId, messages, search, searchParams, signInMigrationMutation]);

    const trySendInitialPrompt = useCallback(() => {
        if (
            !shouldRunAutoSend(chatEntryPlan, {
                search,
                shareId,
                hevyProgramLength: hevyProgram.length,
                sharedProgramLoadAttempted,
                lastHandledSearch: lastHandledSearchRef.current,
                signInMigrationPending: signInMigrationMutation.isPending,
            })
        ) {
            return;
        }

        const isLongPromptPlaceholder = search === LONG_PROMPT_PLACEHOLDER;
        const messageText = resolveInitialPromptText(search);

        if (!messageText.trim()) return;

        lastHandledSearchRef.current = search.trim();
        clearLongPromptFromSessionStorage(isLongPromptPlaceholder);

        const files = readPendingAttachmentFileParts();

        inferProgramRequestFromPrompt(messageText, {
            daysPerWeek,
            programLength,
            excludeAreas,
            excludeEquipment,
            healthIssues,
            setDaysPerWeek,
            setProgramLength,
            setExcludeAreas,
            setExcludeEquipment,
            setHealthIssues,
        });

        const payload = files?.length
            ? { text: messageText, files }
            : { text: messageText };

        void sendMessageWithContext(payload);

        const trimmedSearch = search.trim();
        if (trimmedSearch) {
            if (chatId) {
                applyBuildProgramMintUrlUpdate(router, pathname, searchParams, chatId, {
                    stripSearch: true,
                });
            } else if (!user) {
                stripSearchFromBuildProgramUrl(router, pathname, searchParams);
            }
        }

        posthog?.capture?.("sent_first_prompt_to_ai", {
            search: messageText.slice(0, 200),
            user: user?.id ?? "user_id_unknown",
        });
    }, [
        chatEntryPlan,
        search,
        shareId,
        chatId,
        user,
        hevyProgram.length,
        sharedProgramLoadAttempted,
        sendMessageWithContext,
        router,
        pathname,
        searchParams,
        daysPerWeek,
        programLength,
        excludeAreas,
        excludeEquipment,
        healthIssues,
        setDaysPerWeek,
        setProgramLength,
        setExcludeAreas,
        setExcludeEquipment,
        setHealthIssues,
        signInMigrationMutation.isPending,
    ]);

    const handleSubmit = useCallback(
        (text: string, files?: FileUIPart[]) => {
            if (!text.trim() && (!files || files.length === 0)) return;
            sendMessageWithContext({ text, files });
        },
        [sendMessageWithContext],
    );

    const handleStop = useCallback(() => {
        stop();
        setIsBuilding(false);
    }, [stop]);

    const handleIsBuilding = useCallback((building: boolean) => {
        setIsBuilding(building);
    }, []);

    const handleRetry = useCallback(() => {
        if (retryCount >= MAX_RETRIES) return;

        setGenerationError(null);
        setRetryCount((prev) => prev + 1);
        setIsBuilding(true);
        sendMessageWithContext({ text: "Build my program" });
    }, [retryCount, sendMessageWithContext]);

    const handleClearError = useCallback(() => {
        setGenerationError(null);
        setRetryCount(0);
        setIsBuilding(false);
    }, []);

    const handleTimeoutError = useCallback(() => {
        console.error("Workout generation timed out - no progress for 45 seconds");

        const timeoutError = new Error("Generation timed out. The AI took too long to respond.");
        setGenerationError(timeoutError);
        setIsBuilding(false);
        stop();
        logAgentError(timeoutError, user?.id);
    }, [stop, user?.id]);

    const onBuildComplete = useCallback(() => {
        if (!isMobile || hasAutoSwitchedToProgramAfterFirstBuildRef.current) return;

        hasAutoSwitchedToProgramAfterFirstBuildRef.current = true;
        setMobileTab("program");
    }, [isMobile, setMobileTab]);

    const getPersistChatId = useCallback(
        () => resolvePersistChatId(chatId, pendingMintChatIdRef.current),
        [chatId],
    );

    return {
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
    };
}
