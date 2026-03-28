"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import type { ChatStatus, UIDataTypes, UIMessage, UITools } from "ai";
import posthog from "posthog-js";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useChatHistory } from "@/api/hooks";
import { recordLlmRequest } from "@/api/feature-limits";
import {
    CHAT_MESSAGES_KEY,
    LONG_PROMPT_PLACEHOLDER,
    PENDING_ATTACHMENTS_KEY,
    PENDING_INITIAL_PROMPT_KEY,
} from "@/assets/constants/ui-constants";
import {
    focusAreasOptions,
    equipmentOptions,
    healthIssuesOptions,
} from "@/assets/constants/form-options";
import {
    inferDaysPerWeek,
    inferProgramLength,
    inferExcludeAreas,
    inferExcludeEquipment,
    inferHealthIssues,
    getTextFromChatMessage,
    isMessageAboutProgram,
} from "@/components/program-builder/utils/helpers";
import type { useProgramRequestState } from "./use-program-request-state";
import type { User } from "@supabase/supabase-js";
import type { SendMessageWithContext } from "@/components/program-builder/shared/agent/Agent";

const chatTransport = new DefaultChatTransport({ api: "/api/chat" });

/** Mirrors `isBuildProgramShareIdParam` in BuildProgram.tsx (avoid importing BuildProgram → circular deps). */
function matchesBuildProgramShareIdParam(shareId: string): boolean {
    if (!shareId.trim()) return false;
    const n = Number(shareId);
    return Number.isFinite(n) && n > 0;
}

const MAX_RETRIES = 2;

export interface IUseBuildProgramChatOptions {
    user: User | null;
    hevyProgram: THevyRoutine[];
    programRequest: ReturnType<typeof useProgramRequestState>;
    isMobile: boolean;
    setMobileTab: (tab: string) => void;
}

export interface IProps {
    messages: UIMessage<unknown, UIDataTypes, UITools>[];
    setMessages: (
        messages:
            | UIMessage<unknown, UIDataTypes, UITools>[]
            | ((msgs: UIMessage<unknown, UIDataTypes, UITools>[]) => UIMessage<unknown, UIDataTypes, UITools>[]),
    ) => void;
    sendMessageWithContext: SendMessageWithContext;
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
    lastAtomicBuildCommitKeyRef: React.RefObject<string | null>;
    appliedModifyProgramKeysRef: React.RefObject<Set<string>>;
    sharedProgramLoadAttemptedRef: React.RefObject<boolean>;
    resumeLoadAttemptedRef: React.RefObject<boolean>;
}

export function useBuildProgramChat(options: IUseBuildProgramChatOptions): IProps {
    const { user, hevyProgram, programRequest, isMobile, setMobileTab } = options;
    const queryClient = useQueryClient();
    const searchParams = useSearchParams();
    const router = useRouter();

    const search = searchParams.get("search") ?? "";
    const shareId = searchParams.get("shareId") ?? "";
    const chatId = searchParams.get("chat") ?? "";
    const newChat = searchParams.get("new") ?? "";

    const { mutate: incrementLlmRequests } = useMutation({
        mutationFn: () => recordLlmRequest(user),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["feature-limits"] });
        },
    });

    const [generationError, setGenerationError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isBuilding, setIsBuilding] = useState(false);

    const initialSearchOccurred = useRef<boolean>(false);
    const sharedProgramLoadAttemptedRef = useRef<boolean>(false);
    const resumeLoadAttemptedRef = useRef<boolean>(false);
    const prevErrorRef = useRef<Error | null>(null);
    const pageViewSentRef = useRef(false);

    /** Survives MessageBubbles unmount when switching mobile tabs (Radix Tabs). */
    const lastAtomicBuildCommitKeyRef = useRef<string | null>(null);
    const appliedModifyProgramKeysRef = useRef<Set<string>>(new Set());
    const hasAutoSwitchedToProgramAfterFirstBuildRef = useRef(false);

    const { messages, sendMessage, setMessages, status, stop, error } = useChat({
        transport: chatTransport,
        onError: (err) => {
            console.error("Chat error:", err);
            setGenerationError(err);
            setIsBuilding(false);
        },
    });
    const { data: chatHistoryData } = useChatHistory(user, chatId);

    const activeError = generationError || error || null;
    const isSubmitted = status === "submitted";
    const isStreaming = status === "streaming";
    const isLoading = isSubmitted || isStreaming;

    const sendMessageWithContext = useCallback<SendMessageWithContext>(
        (message, sendOptions) => {
            if (message == null) return Promise.resolve();
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
            return sendMessage(message, { ...sendOptions, body: { ...contextBody, ...sendOptions?.body } });
        },
        [
            sendMessage,
            hevyProgram,
            programRequest.daysPerWeek,
            programRequest.programLength,
            programRequest.excludeAreas,
            programRequest.excludeEquipment,
            programRequest.healthIssues,
            incrementLlmRequests,
        ]
    );

    useEffect(() => {
        const userId = user?.id ?? "user_id_unknown";
        if (user && !pageViewSentRef.current) {
            posthog?.capture?.("page_view", { page: "/build-program", user: userId });
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
        if (messages.length > 0) return;
        lastAtomicBuildCommitKeyRef.current = null;
        appliedModifyProgramKeysRef.current.clear();
        hasAutoSwitchedToProgramAfterFirstBuildRef.current = false;
    }, [messages.length]);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (user) {
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

    useEffect(() => {
        if (newChat !== "true") return;
        setMessages([]);
        router.replace("/build-program");
    }, [newChat, setMessages, router]);

    useEffect(() => {
        if (!chatId || chatHistoryData == null) return;
        const conversation = Array.isArray(chatHistoryData?.[0]) ? chatHistoryData[0] : [];
        setMessages(conversation);
    }, [chatId, chatHistoryData, setMessages]);

    useEffect(() => {
        if (chatId) return;
        const isLongPromptPlaceholder = search === LONG_PROMPT_PLACEHOLDER;
        const messageText = isLongPromptPlaceholder
            ? (typeof sessionStorage !== "undefined" ? sessionStorage.getItem(PENDING_INITIAL_PROMPT_KEY) : null) ?? ""
            : search;
        if (!messageText?.trim() || initialSearchOccurred.current) return;
        if (matchesBuildProgramShareIdParam(shareId) && hevyProgram.length === 0 && !sharedProgramLoadAttemptedRef.current) return;
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
            // ignore
        }
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
        posthog?.capture?.("sent_first_prompt_to_ai", { search: messageText.slice(0, 200), user: user?.id ?? "user_id_unknown" });
    }, [chatId, search, user, hevyProgram, shareId, sendMessageWithContext, programRequest]);

    const handleSubmit = useCallback(
        (text: string, files?: FileUIPart[]) => {
            if (!text.trim() && (!files || files.length === 0)) return;
            sendMessageWithContext({ text, files });
        },
        [sendMessageWithContext]
    );

    const handleStop = useCallback(() => {
        stop();
        setIsBuilding(false);
    }, [stop]);

    const handleIsBuilding = useCallback((building: boolean) => {
        setIsBuilding(building);
    }, []);

    const handleRetry = useCallback(() => {
        if (retryCount < MAX_RETRIES) {
            setGenerationError(null);
            setRetryCount((prev) => prev + 1);
            setIsBuilding(true);
            sendMessageWithContext({ text: "Build my program" });
        }
    }, [retryCount, sendMessageWithContext]);

    const handleClearError = useCallback(() => {
        setGenerationError(null);
        setRetryCount(0);
        setIsBuilding(false);
    }, []);

    const handleTimeoutError = useCallback(() => {
        console.error("Workout generation timed out - no progress for 45 seconds");
        setGenerationError(new Error("Generation timed out. The AI took too long to respond."));
        setIsBuilding(false);
        stop();
    }, [stop]);

    const onBuildComplete = useCallback(() => {
        if (!isMobile || hasAutoSwitchedToProgramAfterFirstBuildRef.current) return;
        hasAutoSwitchedToProgramAfterFirstBuildRef.current = true;
        setMobileTab("program");
    }, [isMobile, setMobileTab]);

    return {
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
    };
}
