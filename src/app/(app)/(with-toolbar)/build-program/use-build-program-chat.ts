"use client";

import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import {
    DefaultChatTransport,
    type ChatStatus,
    type FileUIPart,
    type UIDataTypes,
    type UIMessage,
    type UITools,
} from "ai";
import posthog from "posthog-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";
import { recordLlmRequest } from "@/api/feature-limits";
import {
    CHAT_MESSAGES_KEY,
    LONG_PROMPT_PLACEHOLDER,
} from "@/assets/constants/ui-constants";
import {
    getTextFromChatMessage,
    isMessageAboutProgram,
} from "@/components/program-builder/utils/helpers";
import type { SendMessageWithContext } from "@/components/program-builder/shared/agent/Agent";
import {
    clearLongPromptFromSessionStorage,
    inferProgramRequestFromPrompt,
    readPendingAttachmentFileParts,
    resolveInitialPromptText,
    shouldDeferInitialSend,
} from "./initial-prompt";
import type { useProgramRequestState } from "./use-program-request-state";

// ---------------------------------------------------------------------------
// Types & constants
// ---------------------------------------------------------------------------

type BuildProgramChatMessage = UIMessage<unknown, UIDataTypes, UITools>;
type ProgramRequestState = ReturnType<typeof useProgramRequestState>;

const chatTransport = new DefaultChatTransport({ api: "/api/chat" });
const MAX_RETRIES = 2;

export interface IUseBuildProgramChatOptions {
    user: User | null;
    hevyProgram: THevyRoutine[];
    programRequest: ProgramRequestState;
    isMobile: boolean;
    setMobileTab: (tab: string) => void;
    /** Snapshot for keyed remount (chat history or anonymous restore). */
    initialMessages: BuildProgramChatMessage[];
    /** True once shared-program fetch finished or was not needed (no valid `shareId`). */
    sharedProgramLoadAttempted: boolean;
}

export interface IProps {
    messages: BuildProgramChatMessage[];
    setMessages: (
        messages:
            | BuildProgramChatMessage[]
            | ((msgs: BuildProgramChatMessage[]) => BuildProgramChatMessage[]),
    ) => void;
    sendMessageWithContext: SendMessageWithContext;
    clearMessages: () => void;
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
    lastAtomicBuildCommitKeyRef: React.RefObject<string | null>;
    appliedModifyProgramKeysRef: React.RefObject<Set<string>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Anonymous session restore — read once at `useChat` init when `!chatId && !user`. */
export function readAnonymousChatMessages(): UIMessage[] {
    if (typeof window === "undefined") return [];

    try {
        const stored = localStorage.getItem(CHAT_MESSAGES_KEY);
        if (!stored) return [];

        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) && parsed.length > 0 ? (parsed as UIMessage[]) : [];
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
    } = options;

    const queryClient = useQueryClient();
    const searchParams = useSearchParams();

    const search = searchParams.get("search") ?? "";
    const shareId = searchParams.get("shareId") ?? "";
    const chatId = searchParams.get("chat") ?? "";

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

    const [generationError, setGenerationError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isBuilding, setIsBuilding] = useState(false);

    const initialSearchOccurred = useRef(false);
    /** Survives MessageBubbles unmount when switching mobile tabs (Radix Tabs). */
    const lastAtomicBuildCommitKeyRef = useRef<string | null>(null);
    const appliedModifyProgramKeysRef = useRef<Set<string>>(new Set());
    const hasAutoSwitchedToProgramAfterFirstBuildRef = useRef(false);

    const resetChatSessionRefs = useCallback(() => {
        lastAtomicBuildCommitKeyRef.current = null;
        appliedModifyProgramKeysRef.current.clear();
        hasAutoSwitchedToProgramAfterFirstBuildRef.current = false;
    }, []);

    const { messages, sendMessage, setMessages, status, stop, error } = useChat({
        transport: chatTransport,
        messages: initialMessages,
        onError: (err) => {
            console.error("Chat error:", err);
            setGenerationError(err);
            setIsBuilding(false);
            logAgentError(err, user?.id);
        },
    });

    const clearMessages = useCallback(() => {
        resetChatSessionRefs();
        setMessages([]);
    }, [resetChatSessionRefs, setMessages]);

    const activeError = generationError || error || null;
    const isLoading = status === "submitted" || status === "streaming";

    const sendMessageWithContext = useCallback<SendMessageWithContext>(
        (message, sendOptions) => {
            if (message == null) return Promise.resolve();

            incrementLlmRequests(undefined, {
                onError: (err) => console.error("Failed to record LLM usage", err),
            });

            const messageText = getTextFromChatMessage(message);
            const contextBody = buildMessageContextBody({
                messageText,
                hevyProgram,
                chatId,
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

            return sendMessage(message, {
                ...sendOptions,
                body: { ...contextBody, ...sendOptions?.body },
            });
        },
        [
            sendMessage,
            hevyProgram,
            chatId,
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

    const trySendInitialPrompt = useCallback(() => {
        if (chatId) return;

        const isLongPromptPlaceholder = search === LONG_PROMPT_PLACEHOLDER;
        const messageText = resolveInitialPromptText(search);

        if (!messageText.trim() || initialSearchOccurred.current) return;

        if (
            shouldDeferInitialSend({
                shareId,
                hevyProgramLength: hevyProgram.length,
                sharedProgramLoadAttempted,
            })
        ) {
            return;
        }

        initialSearchOccurred.current = true;
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

        sendMessageWithContext(payload);

        posthog?.capture?.("sent_first_prompt_to_ai", {
            search: messageText.slice(0, 200),
            user: user?.id ?? "user_id_unknown",
        });
    }, [
        chatId,
        search,
        shareId,
        hevyProgram.length,
        sharedProgramLoadAttempted,
        sendMessageWithContext,
        user?.id,
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

    return {
        messages,
        setMessages,
        clearMessages,
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
        lastAtomicBuildCommitKeyRef,
        appliedModifyProgramKeysRef,
    };
}
