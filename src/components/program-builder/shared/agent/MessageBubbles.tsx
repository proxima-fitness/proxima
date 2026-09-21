/**
 * @module MessageBubbles
 * Renders chat messages (user + assistant), tool outputs (buildProgram, mutateProgram), build progress, error/retry UI, and applies program updates from tool results. After the stream finishes, duplicates week 1 across all weeks and merges post-buildProgram mutateProgram ops into one atomic commit, and hydrates a confirmed Hevy share import as a week-1 seed. Standalone mutateProgram is a **Mutation proposal** until Accept. A stale fail-all expires like Reject. A **Program stalemate** card replaces the empty-grid timeout banner.
 * Depends on: message, tool, reasoning, attachments, ModifyProgramProgress, MutationProposalCard, ProgramStalemateCard, helpers. Used by: Agent.
 */
/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useMemo, useState, type RefObject } from "react";
import { useSearchParams } from "next/navigation";
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
    MessageResponse,
} from "@/components/ai-elements/message"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { Copy, ThumbsUp, ThumbsDown, Pencil, Trash, FileText } from "lucide-react"
import { type ChatStatus, FileUIPart } from "ai";
import { upsertChatHistoryTurn } from "@/api/chat-history";
import { useHevyExercises } from "@/api/hooks";
import type { TAgentProgramOperation } from "@/components/program-builder/mutations/agentSchema";
import {
    acceptMutationProposal,
    collectMutationProposal,
    getMutateProgramObjectives,
    isMutateProgramPartAfterBuildProgram,
    mutationProposalApplies,
    readStoredMutationProposalRecipe,
    resolveMutationProposalDecision,
    tryApplyHevyShareImport,
    tryCommitAtomicBuildProgramAndMutations,
    withMutationProposalDecision,
    type IMutationProposal,
} from "@/components/program-builder/utils/helpers";
import {
    buildMutationProposalRecipe,
    type TMutationProposalRecipe,
} from "@/components/program-builder/utils/mutation-proposal-copy";
import { attachAcceptedInsertLocators } from "@/components/program-builder/utils/proposal-marks";
import { useProposalMarkKeys } from "@/contexts/ProgramMutationContext";
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import type { TToolPart } from "@/components/ai-elements/tool";
import { getMutateProgramFailureSeverity } from "./tool-error";
import { SoftToolFailure } from "./soft-tool-failure-ui";
import { ModifyProgramProgress } from "./ModifyProgramProgress";
import { focusProgramBuilderChatInput, MutationProposalCard } from "./MutationProposalCard";
import { ProgramStalemateCard } from "./ProgramStalemateCard";
import { readStalematePayload } from "@/app/api/chat/sanity/stalemate";
import type { TStalematePreferenceKey } from "@/app/api/chat/sanity/types";
import { isTestUser } from "@/api/feature-limits";
import { WorkoutHistoryToolContent } from "./WorkoutHistoryToolContent";
import type { TWorkoutHistoryToolOutput } from "@/app/api/chat/tools/workout-history";
import {
    SHARE_KIND_LABELS,
    isHevyShareImportRefusal,
    isHevyShareImportSuccess,
    isHevyShareToolError,
    type THevyShareToolSuccess,
    type TFetchHevyShareFolderToolOutput,
    type TImportHevyShareFolderToolOutput,
} from "@/app/api/chat/tools/hevy-share";
import { convertSupabaseDateToReadable } from "@/utils/general/helpers";
import { RateProgramResults } from "@/components/program-builder/shared/RateProgramResults";
import type { IProgramScore } from "@/components/program-builder/utils/score-program";
import { toast } from "sonner";
import type { TCommitWithUndoOptions } from "@/components/program-builder/mutations/types";
import posthog from "posthog-js";
import { useBuildProgramActions } from "@/contexts/BuildProgramActionsContext";
import { useAgentDebugMode } from "@/contexts/AgentDebugModeContext";
import { useUserContext } from "@/contexts/UserContext";
import {
    Attachments,
    Attachment,
    AttachmentPreview,
    AttachmentInfo,
} from "@/components/ai-elements/attachments";
import { AgentGenerationError } from "./AgentGenerationError";
import { HEVY_EXPORT_GATE_TITLE } from "./HevyExportGate";
import { parseUserMessageWithSpreadsheets, truncateFilename } from "./helpers";

interface IProps {
    messages: TChatMessage[];
    setMessages: (messages: TChatMessage[] | ((messages: TChatMessage[]) => TChatMessage[])) => void;
    daysPerWeek: string;
    programLength: string;
    excludeEquipment: TSelectOption[];
    healthIssues: TSelectOption[];
    sendMessage: TSendMessageWithContext;
    handleProgramLength: (value: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12") => void;
    handleDaysPerWeek: (value: string) => void;
    handleExcludeEquipment: (value: TSelectOption[]) => void;
    handleHealthIssues: (value: TSelectOption[]) => void;
    /** Session preference write for preference-honor **User-stated change**. */
    onPreferenceChange?: (key: TStalematePreferenceKey, value: string) => void;
    isBuilding: boolean;
    handleIsBuilding: (isBuilding: boolean) => void;
    isLoading: boolean;
    status?: ChatStatus;
    // Error handling props
    error: Error | null;
    onRetry: () => void;
    onClearError: () => void;
    retryCount: number;
    maxRetries: number;
    onTimeoutError: () => void;
    hevyProgram: THevyRoutine[];
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void;
    onBuildComplete?: () => void;
    lastAtomicBuildCommitKeyRef: RefObject<string | null>;
    appliedMutateProgramKeysRef: RefObject<Set<string>>;
    /** Last hydrated **Hevy share import** seed, so the week-0 load runs exactly once. */
    lastHevyShareImportKeyRef: RefObject<string | null>;
}

/**
 * Second line of the read-Hevy-share chip.
 *
 * A folder or routine is described by its shape (days and exercises); a completed workout is
 * described by when it happened, since "1 day" says nothing about a session someone logged.
 */
function describeHevyShareRead(share: THevyShareToolSuccess): string {
    const exercises = `${share.exerciseCount} exercise${share.exerciseCount === 1 ? "" : "s"}`;

    if (share.kind === "workout") {
        const loggedOn = convertSupabaseDateToReadable(share.workout?.startedAt ?? undefined);
        return [exercises, loggedOn && `logged ${loggedOn}`].filter(Boolean).join(" · ");
    }

    return `${share.dayCount} day${share.dayCount === 1 ? "" : "s"} · ${exercises}`;
}

interface IStandaloneProposalCard {
    jumpEnabled: boolean;
    recipe: TMutationProposalRecipe;
    showActions: boolean;
}

/**
 * Recipe + Accept/Reject for a standalone **Mutation proposal** once the turn
 * is ready. Returns null while streaming (progress stays in-flow) and when
 * this message has no standalone mutateProgram.
 */
function resolveStandaloneProposalCard(input: {
    catalog?: ReadonlyMap<string, string>;
    hevyProgram: THevyRoutine[];
    message: TChatMessage;
    messageIndex: number;
    messages: TChatMessage[];
    pendingProposal: IMutationProposal | null;
    pendingProposalIsOpen: boolean;
    proposalMarksLive: boolean;
    status: ChatStatus | undefined;
}): IStandaloneProposalCard | null {
    const isLastMessage = input.messageIndex === input.messages.length - 1;
    if (isLastMessage && input.status === "streaming") {
        return null;
    }

    const storedRecipe = readStoredMutationProposalRecipe(input.message);
    const standaloneOperations: TAgentProgramOperation[] = [];
    input.message.parts.forEach((candidate, candidateIndex) => {
        if (candidate.type !== "tool-mutateProgram") {
            return;
        }
        if (isMutateProgramPartAfterBuildProgram(
            input.messages,
            input.message.id ?? "",
            candidateIndex,
        )) {
            return;
        }
        const output = (candidate as { output?: { operations?: TAgentProgramOperation[]; error?: string } }).output;
        if (!output?.operations?.length || output.error) {
            return;
        }
        standaloneOperations.push(...output.operations);
    });
    if (!storedRecipe && standaloneOperations.length === 0) {
        return null;
    }

    const laterMessages = input.messages.slice(input.messageIndex + 1);
    const decision = resolveMutationProposalDecision(input.message, laterMessages);
    const showActions =
            input.pendingProposalIsOpen &&
            (input.pendingProposal?.messageIds.includes(input.message.id) ?? false) &&
            decision !== "accepted" &&
            decision !== "rejected";
    return {
        jumpEnabled:
            showActions
            || (
                decision === "accepted"
                && input.proposalMarksLive
                && isLatestAcceptedProposal(input.message, input.messages)
            ),
        recipe: storedRecipe ?? buildMutationProposalRecipe(
            standaloneOperations,
            input.hevyProgram,
            input.catalog,
        ),
        showActions,
    };
}

function isLatestAcceptedProposal(message: TChatMessage, messages: TChatMessage[]): boolean {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
        const candidate = messages[index];
        const later = messages.slice(index + 1);
        if (resolveMutationProposalDecision(candidate, later) === "accepted") {
            return candidate.id === message.id;
        }
    }
    return false;
}

/** Renders message list, build/modify progress, applies tool results to hevyProgram, and handles timeout/retry. */
export const MessageBubbles: React.FC<IProps> = (props) => {

    const { user } = useUserContext();
    const { getPersistChatIdRef } = useBuildProgramActions();
    const { debugMode } = useAgentDebugMode();
    const showStalemateDebug = debugMode && isTestUser(user);
    const { data: hevyExercises } = useHevyExercises();
    const proposalMarksLive = useProposalMarkKeys().size > 0;
    const exerciseCatalog = useMemo(() => {
        const catalog = new Map<string, string>();
        for (const exercise of hevyExercises ?? []) {
            if (exercise?.id && exercise.title?.trim()) {
                catalog.set(exercise.id, exercise.title.trim());
            }
        }
        return catalog;
    }, [hevyExercises]);
    const searchParams = useSearchParams();
    const buildProgramReturnQs = searchParams.toString();
    const resolvePersistChatId = () => getPersistChatIdRef.current?.() ?? "";
    const {
        messages,
        setMessages,
        sendMessage,
        handleIsBuilding,
        isBuilding,
        programLength,
        daysPerWeek,
        excludeEquipment,
        healthIssues,
        handleExcludeEquipment,
        handleHealthIssues,
        onPreferenceChange,
        status,
        error,
        onRetry,
        retryCount,
        maxRetries,
        hevyProgram,
        commitWithUndo,
        onBuildComplete,
        lastAtomicBuildCommitKeyRef,
        appliedMutateProgramKeysRef,
        lastHevyShareImportKeyRef,
    } = props;

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");

    // Collect buildProgram output from messages (single call expected)
    const { totalDays, allRoutines } = useMemo(() => {
        let routines: THevyRoutine[] = [];
        let maxTotalDays = 0;

        for (const message of messages) {
            for (const part of message.parts) {
                if (part.type === "tool-buildProgram") {
                    const toolOutput = (part as { output?: IBuildProgramOutput }).output;

                    if (toolOutput?.routines && !toolOutput?.error) {
                        routines = toolOutput.routines;
                        if (toolOutput.totalDays && toolOutput.totalDays > maxTotalDays) {
                            maxTotalDays = toolOutput.totalDays;
                        }
                    }
                }
            }
        }

        // Use daysPerWeek as fallback for totalDays if not yet known from tool calls
        const finalTotalDays = maxTotalDays || (daysPerWeek ? Number(daysPerWeek) : 0);

        // Sort routines by order/day if present
        routines.sort((a, b) => Number(a.order) - Number(b.order));

        return {
            totalDays: finalTotalDays,
            allRoutines: routines
        };
    }, [messages, daysPerWeek]);

    useEffect(() => {
        // After stream finishes: duplicate week 1, merge post-buildProgram mutateProgram ops, one commit
        const programLengthFromUi = programLength ? Number(programLength) : undefined;
        const weeksFallback = programLengthFromUi ?? 1;
        const result = tryCommitAtomicBuildProgramAndMutations(
            messages,
            status,
            programLengthFromUi,
            hevyProgram,
            appliedMutateProgramKeysRef,
            lastAtomicBuildCommitKeyRef,
            commitWithUndo
        );
        if (result.committed) {
            handleIsBuilding(false);
            onBuildComplete?.();
            posthog?.capture?.("generated_a_program", {
                user: user?.id ?? "user_id_unknown",
                daysPerWeek: totalDays || allRoutines.length,
                programLength: result.effectiveWeeks ?? weeksFallback,
            });
            return;
        }
        // Empty-grid wall-clock is not a Hard agent failure. Drop the spinner when the stream ended with no land.
        if (isBuilding && status === "ready" && allRoutines.length === 0) {
            handleIsBuilding(false);
        }
    }, [
        messages,
        status,
        programLength,
        hevyProgram,
        commitWithUndo,
        handleIsBuilding,
        onBuildComplete,
        user,
        totalDays,
        allRoutines.length,
        appliedMutateProgramKeysRef,
        lastAtomicBuildCommitKeyRef,
        isBuilding,
    ]);

    const persistProposalMessages = useCallback((next: TChatMessage[]) => {
        const chatId = getPersistChatIdRef.current?.() ?? "";
        if (!user || !chatId) return;
        void upsertChatHistoryTurn({ user, chatId, messages: next });
    }, [getPersistChatIdRef, user]);

    const handleAcceptProposal = useCallback(() => {
        const proposal = collectMutationProposal(
            messages,
            status,
            hevyProgram,
            appliedMutateProgramKeysRef,
        );
        if (!proposal) return;
        const recipe = buildMutationProposalRecipe(
            proposal.operations,
            hevyProgram,
            exerciseCatalog,
        );
        const committed = acceptMutationProposal(
            hevyProgram,
            proposal,
            appliedMutateProgramKeysRef,
            commitWithUndo,
        );
        if (!committed) {
            const expired = withMutationProposalDecision(
                messages,
                proposal.messageIds,
                "rejected",
                recipe,
            );
            setMessages(expired);
            persistProposalMessages(expired);
            focusProgramBuilderChatInput();
            return;
        }
        const next = withMutationProposalDecision(
            messages,
            proposal.messageIds,
            "accepted",
            attachAcceptedInsertLocators(recipe, hevyProgram, proposal.operations),
        );
        setMessages(next);
        persistProposalMessages(next);
        posthog?.capture?.("modified_a_program", { user: user?.id ?? "user_id_unknown" });
    }, [
        appliedMutateProgramKeysRef,
        commitWithUndo,
        exerciseCatalog,
        hevyProgram,
        messages,
        persistProposalMessages,
        setMessages,
        status,
        user,
    ]);

    const handleRejectProposal = useCallback((messageId: string) => {
        const proposal = collectMutationProposal(
            messages,
            status,
            hevyProgram,
            appliedMutateProgramKeysRef,
        );
        const messageIds = proposal?.messageIds?.length ? proposal.messageIds : [messageId];
        const recipe = proposal
            ? buildMutationProposalRecipe(proposal.operations, hevyProgram, exerciseCatalog)
            : undefined;
        const next = withMutationProposalDecision(messages, messageIds, "rejected", recipe);
        setMessages(next);
        persistProposalMessages(next);
        focusProgramBuilderChatInput();
    }, [
        appliedMutateProgramKeysRef,
        exerciseCatalog,
        hevyProgram,
        messages,
        persistProposalMessages,
        setMessages,
        status,
    ]);

    useEffect(() => {
        // Confirmed Hevy share import: seed the empty grid with the shared week (week 0 only).
        const imported = tryApplyHevyShareImport(
            messages,
            status,
            hevyProgram,
            lastHevyShareImportKeyRef,
            commitWithUndo,
        );
        if (imported) {
            onBuildComplete?.();
            posthog?.capture?.("imported_a_hevy_share", {
                user: user?.id ?? "user_id_unknown",
            });
        }
    }, [
        messages,
        status,
        hevyProgram,
        commitWithUndo,
        onBuildComplete,
        user,
        lastHevyShareImportKeyRef,
    ]);

    const pendingProposal = collectMutationProposal(
        messages,
        status,
        hevyProgram,
        appliedMutateProgramKeysRef,
    );
    const pendingProposalIsOpen =
        pendingProposal != null && mutationProposalApplies(hevyProgram, pendingProposal);

    return (

        <>
             { messages.map((message, messageIndex) => {
                            const isAssistant = message.role === "assistant";
                            const reasoningParts = message.parts.filter(
                                (p): p is { type: "reasoning"; text: string } => p.type === "reasoning"
                            );
                            const reasoningText = reasoningParts.map((p) => p.text).join("\n\n");
                            const isLastMessage = messageIndex === messages.length - 1;
                            const isStreaming = status === "streaming";
                            const lastPart = message.parts[message.parts.length - 1];
                            const isReasoningStreaming =
                                isLastMessage && isStreaming && lastPart?.type === "reasoning";
                            const hideReasoningDuringTextStream =
                                isLastMessage && isStreaming && lastPart?.type === "text";
                            const reasoningOnlyAssistant =
                                isAssistant &&
                                message.parts.length > 0 &&
                                message.parts.every((p) => p.type === "reasoning");
                            const standaloneProposal = resolveStandaloneProposalCard({
                                catalog: exerciseCatalog,
                                hevyProgram,
                                message,
                                messageIndex,
                                messages,
                                pendingProposal,
                                pendingProposalIsOpen,
                                proposalMarksLive,
                                status,
                            });
                            return (
                            <div key={message.id} className="whitespace-pre-wrap">
                                {isAssistant && reasoningParts.length > 0 && !hideReasoningDuringTextStream && (
                                    <Reasoning
                                        isStreaming={isReasoningStreaming}
                                        suppressAutoClose={reasoningOnlyAssistant}
                                        className="mx-auto w-full max-w-3xl px-4 pt-2 md:px-6"
                                    >
                                        <ReasoningTrigger />
                                        <ReasoningContent>{reasoningText}</ReasoningContent>
                                    </Reasoning>
                                )}
                                {message.parts.map((part, index) => {
                                    const isAssistantPart = message.role === "assistant";
                                    const isLastMessagePart = index === message.parts.length - 1;
                                    const toolCallId =
                                        "toolCallId" in part &&
                                        typeof (part as { toolCallId?: unknown }).toolCallId === "string"
                                            ? (part as { toolCallId: string }).toolCallId
                                            : undefined;
                                    switch (part.type) {
                                        case "reasoning":
                                            return null;
                                        case 'text': {
                                            const text = part.text;

                                            if (!isAssistantPart) {
                                                // User message - render RHS bubble or edit mode
                                                const isEditing = editingMessageId === message.id;
                                                if (isEditing) {
                                                    return (
                                                        <div
                                                            key={`${message.id}-${index}`}
                                                            className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6 pt-2 items-end"
                                                        >
                                                            <div className="flex flex-col gap-2 w-full max-w-[85%] sm:max-w-[75%]">
                                                                <Textarea
                                                                    value={editingText}
                                                                    onChange={(e) => setEditingText(e.target.value)}
                                                                    className="min-h-20 bg-muted text-black dark:text-white rounded-3xl px-5 py-2.5 resize-y"
                                                                />
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="rounded-full border-border/80"
                                                                        onClick={() => setEditingMessageId(null)}
                                                                        aria-label="Cancel edit"
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        className="rounded-full bg-lightSecondary px-4 text-white hover:bg-lightSecondary/90"
                                                                        onClick={() => {
                                                                            setMessages((prev) => prev.slice(0, messageIndex));
                                                                            sendMessage({ text: editingText.trim() });
                                                                            setEditingMessageId(null);
                                                                        }}
                                                                        disabled={!editingText.trim()}
                                                                        aria-label="Save and resend"
                                                                    >
                                                                        Save
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                                const { displayText, spreadsheetLabels } = parseUserMessageWithSpreadsheets(text ?? "");
                                                return (
                                                    <Message
                                                        key={`${message.id}-${index}`}
                                                        from={message.role}
                                                        className={cn(
                                                            "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6 pt-2",
                                                            "items-end"
                                                        )}
                                                    >
                                                        {spreadsheetLabels.length > 0 && (
                                                            <div className="group flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%]">
                                                                <Attachments variant="inline" className="flex flex-wrap gap-2 justify-end">
                                                                    {spreadsheetLabels.map((label, i) => (
                                                                        <Attachment
                                                                            key={`${message.id}-spreadsheet-${i}`}
                                                                            data={{
                                                                                type: "file",
                                                                                filename: truncateFilename(label),
                                                                                mediaType: "text/csv",
                                                                                url: "",
                                                                                id: `spreadsheet-${message.id}-${i}`,
                                                                            }}
                                                                            title={label}
                                                                        >
                                                                            <AttachmentPreview />
                                                                            <AttachmentInfo />
                                                                        </Attachment>
                                                                    ))}
                                                                </Attachments>
                                                                {!displayText && (
                                                                    <MessageActions
                                                                        className={cn(
                                                                            "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                                                                        )}
                                                                    >
                                                                        <MessageAction
                                                                            tooltip="Edit"
                                                                            className="rounded-full"
                                                                            onClick={() => {
                                                                                setEditingMessageId(message.id);
                                                                                setEditingText(text ?? "");
                                                                            }}
                                                                        >
                                                                            <Pencil />
                                                                        </MessageAction>
                                                                        <MessageAction
                                                                            tooltip="Delete"
                                                                            className="rounded-full"
                                                                            onClick={() => setMessages((prev) => prev.slice(0, messageIndex))}
                                                                        >
                                                                            <Trash />
                                                                        </MessageAction>
                                                                        <MessageAction
                                                                            tooltip="Copy"
                                                                            className="rounded-full"
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(text ?? "").then(() => {
                                                                                    toast.success("Copied to clipboard");
                                                                                });
                                                                            }}
                                                                        >
                                                                            <Copy />
                                                                        </MessageAction>
                                                                    </MessageActions>
                                                                )}
                                                            </div>
                                                        )}
                                                        {displayText && (
                                                            <div className={cn("group flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%]", spreadsheetLabels.length > 0 && "mt-0.5")}>
                                                                <MessageContent className="bg-muted text-black dark:text-white rounded-3xl px-5 py-2.5 w-full">
                                                                    <MessageResponse>{displayText}</MessageResponse>
                                                                </MessageContent>
                                                                <MessageActions
                                                                    className={cn(
                                                                        "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                                                                    )}
                                                                >
                                                                    <MessageAction
                                                                        tooltip="Edit"
                                                                        className="rounded-full"
                                                                        onClick={() => {
                                                                            setEditingMessageId(message.id);
                                                                            setEditingText(text ?? "");
                                                                        }}
                                                                    >
                                                                        <Pencil />
                                                                    </MessageAction>
                                                                    <MessageAction
                                                                        tooltip="Delete"
                                                                        className="rounded-full"
                                                                        onClick={() => setMessages((prev) => prev.slice(0, messageIndex))}
                                                                    >
                                                                        <Trash />
                                                                    </MessageAction>
                                                                    <MessageAction
                                                                        tooltip="Copy"
                                                                        className="rounded-full"
                                                                        onClick={() => {
                                                                            navigator.clipboard.writeText(text ?? "").then(() => {
                                                                                toast.success("Copied to clipboard");
                                                                            });
                                                                        }}
                                                                    >
                                                                        <Copy />
                                                                    </MessageAction>
                                                                </MessageActions>
                                                            </div>
                                                        )}
                                                    </Message>
                                                );
                                            }

                                            // Assistant message - render LHS message
                                            return (
                                                <Message
                                                    key={`${message.id}-${index}`}
                                                    from={message.role}
                                                    className={cn(
                                                        "mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 md:px-6 pt-2",
                                                        "items-start"
                                                    )}
                                                >
                                                    <div className="group flex w-full flex-col gap-0">
                                                        <MessageContent className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0 mb-2">
                                                            <MessageResponse >{text}</MessageResponse>
                                                        </MessageContent>
                                                        <MessageActions
                                                            className={cn(
                                                                "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                                                isLastMessagePart && "opacity-100"
                                                            )}
                                                        >
                                                            <MessageAction
                                                                tooltip="Copy"
                                                                className="rounded-full"
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(text ?? "").then(() => {
                                                                        toast.success("Copied to clipboard");
                                                                    });
                                                                }}
                                                            >
                                                                <Copy />
                                                            </MessageAction>
                                                            <MessageAction tooltip="Upvote" className="rounded-full">
                                                                <ThumbsUp />
                                                            </MessageAction>
                                                            <MessageAction tooltip="Downvote" className="rounded-full">
                                                                <ThumbsDown />
                                                            </MessageAction>
                                                        </MessageActions>
                                                    </div>
                                                </Message>
                                            );
                                        }
                                        case "file": {
                                            if (isAssistantPart) return null;
                                            const filePart = part as FileUIPart;
                                            const mediaType = filePart.mediaType ?? "";
                                            const isImage = mediaType.startsWith("image/");
                                            return (
                                                <Message
                                                    key={`${message.id}-${index}-file`}
                                                    from={message.role}
                                                    className={cn(
                                                        "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6 pt-2",
                                                        "items-end"
                                                    )}
                                                >
                                                    <div className="group flex flex-col items-end gap-1 max-w-[85%] sm:max-w-[75%]">
                                                        {isImage && filePart.url ? (
                                                            <img
                                                                src={filePart.url}
                                                                alt={filePart.filename ?? "Image"}
                                                                className="max-w-50 max-h-50 rounded-xl object-cover border border-border"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 border border-border">
                                                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                                                <span className="text-sm truncate max-w-45">
                                                                    {filePart.filename ?? "File"}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </Message>
                                            );
                                        }
                                        case "tool-getExerciseList": {
                                            // getExerciseList is used by the AI to look up available exercises.
                                            return null;
                                        }
                                        case "tool-getMoreInfoQuestions": {
                                            const toolOutput = part.output as {
                                                questions?: TQuestion[];
                                                userRequest?: string;
                                                message?: string;
                                            };
                                            const toolState = (part as { state?: TToolPart["state"] }).state ?? "output-available";
                                            const hasQuestions =
                                                toolOutput?.questions != null && Array.isArray(toolOutput.questions);
                                            const isInFlight =
                                                toolState === "input-streaming" || toolState === "input-available";
                                            if (!hasQuestions) {
                                                return (
                                                    <Tool
                                                        key={`${message.id}-${index}-questions-pending`}
                                                        defaultOpen
                                                        className="mx-auto w-full max-w-3xl px-2 md:px-4 pt-2"
                                                    >
                                                        <ToolHeader type="tool-getMoreInfoQuestions" state={toolState} title="Survey" />
                                                        <ToolContent className="w-full">
                                                            <p className="text-sm text-muted-foreground py-2">
                                                                {isInFlight ? "Preparing questionnaire…" : "Loading questions…"}
                                                            </p>
                                                        </ToolContent>
                                                    </Tool>
                                                );
                                            }
                                            const isActiveSurvey = isLastMessage;
                                            return (
                                                <Tool key={`${message.id}-${index}-questions`} defaultOpen className="mx-auto w-full max-w-3xl px-2 md:px-4 pt-2">
                                                    <ToolHeader type="tool-getMoreInfoQuestions" state={toolState} title="Survey" />
                                                    <ToolContent className="w-full">
                                                        <p className="text-sm text-muted-foreground py-2">
                                                            {isActiveSurvey ? "Complete the survey below." : "Survey completed."}
                                                        </p>
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        case "tool-openHevyExportGate": {
                                            const toolState =
                                                (part as { state?: TToolPart["state"] }).state ?? "output-available";
                                            const isActiveGate = isLastMessage;
                                            return (
                                                <Tool
                                                    key={`${message.id}-${index}-hevy-export-gate`}
                                                    defaultOpen
                                                    className="mx-auto w-full max-w-3xl px-2 md:px-4 pt-2"
                                                >
                                                    <ToolHeader
                                                        type="tool-openHevyExportGate"
                                                        state={toolState}
                                                        title={HEVY_EXPORT_GATE_TITLE}
                                                    />
                                                    <ToolContent className="w-full">
                                                        <p className="text-sm text-muted-foreground py-2">
                                                            {isActiveGate
                                                                ? "Finish setup below."
                                                                : "Hevy setup opened."}
                                                        </p>
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        case "tool-buildProgram": {
                                            const buildPart = part as {
                                                input?: { totalDays?: number; routines?: Array<{ title?: string; exercises?: Array<{ title?: string }> }> };
                                                output?: IBuildProgramOutput;
                                                state?: TToolPart["state"];
                                                errorText?: string;
                                            };
                                            const toolOutput = buildPart.output;
                                            const buildHasError = Boolean(toolOutput?.error);
                                            const toolState: TToolPart["state"] = buildHasError
                                                ? "output-error"
                                                : toolOutput?.routines && !toolOutput?.error
                                                    ? "output-available"
                                                    : isBuilding
                                                        ? "input-available"
                                                        : "input-streaming";

                                            if (buildHasError) {
                                                const stalemate = readStalematePayload(toolOutput);
                                                if (stalemate) {
                                                    return (
                                                        <div key={`${message.id}-${index}-build-stalemate`}>
                                                            {showStalemateDebug ? (
                                                                <SoftToolFailure
                                                                    tool="buildProgram"
                                                                    debugMode={debugMode}
                                                                    errorCtx={{
                                                                        errorText: buildPart.errorText,
                                                                        output: toolOutput,
                                                                    }}
                                                                    getChatId={resolvePersistChatId}
                                                                    toolCallId={toolCallId}
                                                                />
                                                            ) : null}
                                                            <ProgramStalemateCard
                                                                payload={stalemate}
                                                                sendMessage={sendMessage}
                                                                healthIssues={healthIssues}
                                                                excludeEquipment={excludeEquipment}
                                                                handleHealthIssues={handleHealthIssues}
                                                                handleExcludeEquipment={handleExcludeEquipment}
                                                                onPreferenceChange={onPreferenceChange}
                                                                getChatId={resolvePersistChatId}
                                                                tool="buildProgram"
                                                                toolCallId={toolCallId}
                                                                toolOutput={toolOutput}
                                                            />
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <SoftToolFailure
                                                        key={`${message.id}-${index}-build-error`}
                                                        tool="buildProgram"
                                                        debugMode={debugMode}
                                                        errorCtx={{
                                                            errorText: buildPart.errorText,
                                                            output: toolOutput,
                                                        }}
                                                        getChatId={resolvePersistChatId}
                                                        toolCallId={toolCallId}
                                                    />
                                                );
                                            }

                                            const buildInput = buildPart.input;
                                            const isInFlight = toolState === "input-available" || toolState === "input-streaming";

                                            return (
                                                <Tool key={`${message.id}-${index}-build`} defaultOpen className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                    <ToolHeader type="tool-buildProgram" state={toolState} title="Build program" />
                                                    <ToolContent>
                                                        {isInFlight && buildInput?.routines?.length ? (
                                                            <div className="space-y-1.5 px-3 pb-3">
                                                                <p className="text-sm text-muted-foreground">
                                                                    Building {buildInput.totalDays ?? buildInput.routines.length} day{(buildInput.totalDays ?? buildInput.routines.length) === 1 ? "" : "s"}:
                                                                </p>
                                                                <ul className="list-none space-y-1 text-sm text-muted-foreground">
                                                                    {buildInput.routines.filter(Boolean).map((r, ri) => (
                                                                        <li key={ri} className="flex items-baseline gap-1.5">
                                                                            <span className="w-2 h-2 rounded-full shrink-0 bg-foreground/30 mt-1.5" />
                                                                            <span>
                                                                                <span className="text-foreground font-medium">{r?.title ?? `Day ${ri + 1}`}</span>
                                                                                {r.exercises?.length ? (
                                                                                    <span className="text-muted-foreground"> - {r.exercises.length} exercise{r.exercises.length === 1 ? "" : "s"}</span>
                                                                                ) : null}
                                                                            </span>
                                                                        </li>
                                                                    ))}
                                                                </ul>
                                                            </div>
                                                        ) : (
                                                            <div className="w-full pb-4">
                                                                <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border border-border">
                                                                    <p className="font-medium text-sm text-foreground">
                                                                        {isBuilding ? "Building your program..." : "Program built successfully!"}
                                                                    </p>
                                                                    <p className="text-sm text-muted-foreground">
                                                                        {`Weeks includes ${totalDays} training day${totalDays === 1 ? "" : "s"}.`}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        case "tool-mutateProgram": {
                                            const mutatePart = part as {
                                                state?: string;
                                                input?: { operations?: Array<{ op: string }> };
                                                output?: {
                                                    operations?: Array<{ op: string }>;
                                                    error?: string;
                                                    failures?: Array<{ index: number; op: string; reason: string }>;
                                                };
                                                errorText?: string;
                                            };
                                            const operations =
                                                mutatePart.output?.operations ?? mutatePart.input?.operations;
                                            const objectivesByRoutine = getMutateProgramObjectives(
                                                operations as Parameters<typeof getMutateProgramObjectives>[0],
                                            );
                                            const isComplete =
                                                mutatePart.state === "output-available" &&
                                                Boolean(mutatePart.output?.operations?.length);
                                            const isError = mutatePart.state === "output-error" || Boolean(mutatePart.output?.error);
                                            const toolState: TToolPart["state"] = isError
                                                ? "output-error"
                                                : isComplete
                                                    ? "output-available"
                                                    : "input-available";

                                            if (isError) {
                                                const errorCtx = {
                                                    errorText: mutatePart.errorText,
                                                    output: mutatePart.output,
                                                };
                                                const stalemate = readStalematePayload(mutatePart.output);
                                                if (stalemate) {
                                                    return (
                                                        <div key={`${message.id}-${index}-mutate-stalemate`}>
                                                            {showStalemateDebug ? (
                                                                <SoftToolFailure
                                                                    tool="mutateProgram"
                                                                    debugMode={debugMode}
                                                                    errorCtx={errorCtx}
                                                                    getChatId={resolvePersistChatId}
                                                                    severity={getMutateProgramFailureSeverity(errorCtx)}
                                                                    toolCallId={toolCallId}
                                                                />
                                                            ) : null}
                                                            <ProgramStalemateCard
                                                                payload={stalemate}
                                                                sendMessage={sendMessage}
                                                                healthIssues={healthIssues}
                                                                excludeEquipment={excludeEquipment}
                                                                handleHealthIssues={handleHealthIssues}
                                                                handleExcludeEquipment={handleExcludeEquipment}
                                                                onPreferenceChange={onPreferenceChange}
                                                                getChatId={resolvePersistChatId}
                                                                tool="mutateProgram"
                                                                toolCallId={toolCallId}
                                                                toolOutput={mutatePart.output}
                                                            />
                                                        </div>
                                                    );
                                                }
                                                return (
                                                    <SoftToolFailure
                                                        key={`${message.id}-${index}-mutate-error`}
                                                        tool="mutateProgram"
                                                        debugMode={debugMode}
                                                        errorCtx={errorCtx}
                                                        getChatId={resolvePersistChatId}
                                                        severity={getMutateProgramFailureSeverity(errorCtx)}
                                                        toolCallId={toolCallId}
                                                    />
                                                );
                                            }

                                            const mutateInFlight = !isComplete;
                                            const afterBuildProgram = isMutateProgramPartAfterBuildProgram(
                                                messages,
                                                message.id ?? "",
                                                index,
                                            );
                                            const thisTurnStreaming = isLastMessage && status === "streaming";
                                            const showStreamProgress = mutateInFlight || thisTurnStreaming;

                                            if (showStreamProgress || afterBuildProgram) {
                                                const progressMode = afterBuildProgram ? "apply" : "proposal";
                                                const operationCount = operations?.length ?? 0;
                                                return (
                                                    <Tool key={`${message.id}-${index}-mutate`} defaultOpen className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                        <ToolHeader type="tool-mutateProgram" state={toolState} title="Mutate program" />
                                                        <ToolContent>
                                                            { mutateInFlight && operationCount > 0 ? (
                                                                <p className="text-sm text-muted-foreground px-3 pb-1">
                                                                    { afterBuildProgram
                                                                        ? `Applying ${operationCount} operation${operationCount === 1 ? "" : "s"}…`
                                                                        : `Preparing ${operationCount} operation${operationCount === 1 ? "" : "s"}…` }
                                                                </p>
                                                            ) : null }
                                                            <ModifyProgramProgress
                                                                objectivesByRoutine={objectivesByRoutine}
                                                                mode={progressMode}
                                                                status={isComplete && !thisTurnStreaming ? "complete" : "processing"}
                                                            />
                                                        </ToolContent>
                                                    </Tool>
                                                );
                                            }

                                            return null;
                                        }
                                        case "tool-getWorkoutHistory": {
                                            const historyPart = part as {
                                                state?: TToolPart["state"];
                                                input?: { limit?: number; since?: string };
                                                output?: TWorkoutHistoryToolOutput;
                                                errorText?: string;
                                            };
                                            const historyOutput = historyPart.output;
                                            const historyHasError =
                                                historyPart.state === "output-error" ||
                                                Boolean(historyOutput && "error" in historyOutput);
                                            const historyComplete =
                                                historyPart.state === "output-available" &&
                                                historyOutput != null &&
                                                !("error" in historyOutput);
                                            const toolState: TToolPart["state"] = historyHasError
                                                ? "output-error"
                                                : historyComplete
                                                    ? "output-available"
                                                    : (historyPart.state ?? "input-available");

                                            if (historyHasError) {
                                                return (
                                                    <SoftToolFailure
                                                        key={`${message.id}-${index}-history-error`}
                                                        tool="getWorkoutHistory"
                                                        debugMode={debugMode}
                                                        errorCtx={{
                                                            errorText: historyPart.errorText,
                                                            output: historyOutput,
                                                        }}
                                                        getChatId={resolvePersistChatId}
                                                        toolCallId={toolCallId}
                                                    />
                                                );
                                            }

                                            const historyInFlight =
                                                toolState === "input-available" || toolState === "input-streaming";

                                            return (
                                                <Tool
                                                    key={`${message.id}-${index}-history`}
                                                    defaultOpen
                                                    className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2"
                                                >
                                                    <ToolHeader
                                                        type="tool-getWorkoutHistory"
                                                        state={toolState}
                                                        title="Workout history"
                                                    />
                                                    <ToolContent className="max-w-full overflow-x-auto">
                                                        <WorkoutHistoryToolContent
                                                            input={historyPart.input}
                                                            output={historyOutput}
                                                            isInFlight={historyInFlight}
                                                            returnQs={buildProgramReturnQs}
                                                        />
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        case "tool-rateProgram": {
                                            const ratePart = part as {
                                                state?: TToolPart["state"];
                                                output?: { score?: IProgramScore; error?: string; message?: string };
                                                errorText?: string;
                                            };
                                            const out = ratePart.output;
                                            const hasScore = Boolean(out?.score && !out?.error);
                                            const rateHasError = Boolean(out?.error) || ratePart.state === "output-error";
                                            const toolState: TToolPart["state"] = rateHasError
                                                ? "output-error"
                                                : hasScore
                                                    ? "output-available"
                                                    : (ratePart.state ?? "input-available");

                                            if (rateHasError) {
                                                return (
                                                    <SoftToolFailure
                                                        key={`${message.id}-${index}-rate-error`}
                                                        tool="rateProgram"
                                                        debugMode={debugMode}
                                                        errorCtx={{
                                                            errorText: ratePart.errorText,
                                                            output: out,
                                                        }}
                                                        getChatId={resolvePersistChatId}
                                                        toolCallId={toolCallId}
                                                    />
                                                );
                                            }

                                            if (!hasScore || !out?.score) {
                                                return (
                                                    <Tool key={`${message.id}-${index}-rate-pending`} defaultOpen className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                        <ToolHeader type="tool-rateProgram" state={toolState} title="Rate program" />
                                                        <ToolContent>
                                                            <p className="text-muted-foreground text-sm px-3 pb-3">
                                                                Scoring your program…
                                                            </p>
                                                        </ToolContent>
                                                    </Tool>
                                                );
                                            }

                                            return (
                                                <Tool key={`${message.id}-${index}-rate`} defaultOpen className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                    <ToolHeader type="tool-rateProgram" state={toolState} title="Rate program" />
                                                    <ToolContent className="max-w-full overflow-x-auto">
                                                        <div className="px-1 pb-2">
                                                            <RateProgramResults score={out.score} />
                                                        </div>
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        case "tool-fetchHevyShareFolder": {
                                            const sharePart = part as {
                                                state?: TToolPart["state"];
                                                input?: { url?: string };
                                                output?: TFetchHevyShareFolderToolOutput;
                                                errorText?: string;
                                            };
                                            const shareOutput = sharePart.output;
                                            // Hevy's share endpoints are undocumented - a failure is an error panel, not a silent chip.
                                            const shareFailed =
                                                sharePart.state === "output-error" ||
                                                Boolean(shareOutput && "error" in shareOutput);
                                            const shareRead =
                                                shareOutput && !("error" in shareOutput) ? shareOutput : null;
                                            const toolState: TToolPart["state"] = shareFailed
                                                ? "output-error"
                                                : shareRead
                                                    ? "output-available"
                                                    : (sharePart.state ?? "input-available");

                                            if (shareFailed) {
                                                return (
                                                    <SoftToolFailure
                                                        key={`${message.id}-${index}-hevy-share-error`}
                                                        tool="fetchHevyShareFolder"
                                                        debugMode={debugMode}
                                                        errorCtx={{
                                                            errorText: sharePart.errorText,
                                                            output: shareOutput,
                                                        }}
                                                        getChatId={resolvePersistChatId}
                                                        toolCallId={toolCallId}
                                                    />
                                                );
                                            }

                                            return (
                                                <Tool key={`${message.id}-${index}-hevy-share`} defaultOpen={false} className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                    <ToolHeader type="tool-fetchHevyShareFolder" state={toolState} title="Read Hevy share" />
                                                    <ToolContent>
                                                        {shareRead ? (
                                                            <div className="space-y-1 px-3 pb-3">
                                                                <p className="text-sm text-foreground">
                                                                    {shareRead.title ?? SHARE_KIND_LABELS[shareRead.kind]}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {describeHevyShareRead(shareRead)} · read only, nothing was added to your program
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground px-3 pb-3">
                                                                Reading Hevy share link…
                                                            </p>
                                                        )}
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        case "tool-importHevyShareFolder": {
                                            const importPart = part as {
                                                state?: TToolPart["state"];
                                                input?: { url?: string; confirmed?: boolean };
                                                output?: TImportHevyShareFolderToolOutput;
                                                errorText?: string;
                                            };
                                            const importOutput = importPart.output;
                                            // A refusal is the tool working as designed - a note, not an error panel.
                                            const importRefusal =
                                                importOutput && isHevyShareImportRefusal(importOutput)
                                                    ? importOutput
                                                    : null;
                                            const importFailed =
                                                importPart.state === "output-error" ||
                                                Boolean(importOutput && isHevyShareToolError(importOutput));
                                            const importedShare =
                                                importOutput && isHevyShareImportSuccess(importOutput)
                                                    ? importOutput
                                                    : null;
                                            const toolState: TToolPart["state"] = importFailed
                                                ? "output-error"
                                                : importedShare || importRefusal
                                                    ? "output-available"
                                                    : (importPart.state ?? "input-available");

                                            if (importFailed) {
                                                return (
                                                    <SoftToolFailure
                                                        key={`${message.id}-${index}-hevy-import-error`}
                                                        tool="importHevyShareFolder"
                                                        debugMode={debugMode}
                                                        errorCtx={{
                                                            errorText: importPart.errorText,
                                                            output: importOutput,
                                                        }}
                                                        getChatId={resolvePersistChatId}
                                                        toolCallId={toolCallId}
                                                    />
                                                );
                                            }

                                            return (
                                                <Tool key={`${message.id}-${index}-hevy-import`} defaultOpen={false} className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                    <ToolHeader type="tool-importHevyShareFolder" state={toolState} title="Load Hevy share" />
                                                    <ToolContent>
                                                        {importedShare ? (
                                                            <div className="space-y-1 px-3 pb-3">
                                                                <p className="text-sm text-foreground">
                                                                    {importedShare.title ?? SHARE_KIND_LABELS[importedShare.kind]}
                                                                </p>
                                                                <p className="text-sm text-muted-foreground">
                                                                    {describeHevyShareRead(importedShare)} · loaded into week 1 of your program
                                                                </p>
                                                            </div>
                                                        ) : (
                                                            <p className="text-sm text-muted-foreground px-3 pb-3">
                                                                {importRefusal
                                                                    ? importRefusal.message
                                                                    : "Loading Hevy share…"}
                                                            </p>
                                                        )}
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        case "tool-updateConstraintProfile": {
                                            const constraintPart = part as {
                                                state?: TToolPart["state"];
                                                output?: { updatedProfile?: unknown; error?: string; skipped?: boolean };
                                            };
                                            const toolState: TToolPart["state"] = constraintPart.state ?? "output-available";
                                            // Empty no-op (skipped questionnaire / nothing to persist) - hide chip
                                            if (toolState === "output-available" && constraintPart.output?.skipped) {
                                                return null;
                                            }
                                            const isDone = toolState === "output-available" && constraintPart.output?.updatedProfile;
                                            return (
                                                <Tool key={`${message.id}-${index}-constraint`} defaultOpen={false} className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                    <ToolHeader type="tool-updateConstraintProfile" state={toolState} title="Update constraints" />
                                                    <ToolContent>
                                                        <p className="text-sm text-muted-foreground px-3 pb-2">
                                                            {isDone ? "Preferences updated and saved." : "Updating preferences…"}
                                                        </p>
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        case "tool-updateTrainingProfile": {
                                            const trainingPart = part as {
                                                state?: TToolPart["state"];
                                                output?: { updatedProfile?: unknown; error?: string; skipped?: boolean };
                                            };
                                            const toolState: TToolPart["state"] = trainingPart.state ?? "output-available";
                                            // Empty no-op (skipped questionnaire / nothing to persist) - hide chip
                                            if (toolState === "output-available" && trainingPart.output?.skipped) {
                                                return null;
                                            }
                                            const isDone = toolState === "output-available" && trainingPart.output?.updatedProfile;
                                            return (
                                                <Tool key={`${message.id}-${index}-training`} defaultOpen={false} className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                    <ToolHeader type="tool-updateTrainingProfile" state={toolState} title="Update training profile" />
                                                    <ToolContent>
                                                        <p className="text-sm text-muted-foreground px-3 pb-2">
                                                            {isDone ? "Training profile updated and saved." : "Updating training profile…"}
                                                        </p>
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        default: {
                                            return null;
                                        }
                                    }
                                })}
                                { standaloneProposal ? (
                                    <div
                                        key={ `${message.id}-mutate-proposal` }
                                        className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2"
                                    >
                                        <MutationProposalCard
                                            recipe={ standaloneProposal.recipe }
                                            showActions={ standaloneProposal.showActions }
                                            jumpEnabled={ standaloneProposal.jumpEnabled }
                                            onAccept={ handleAcceptProposal }
                                            onReject={ () => handleRejectProposal(message.id) }
                                        />
                                    </div>
                                ) : null }
                            </div>
                            );
                        })}

             {/* Show error UI as next assistant message when generation fails */}
             {error && (
                <AgentGenerationError
                    error={error}
                    onRetry={onRetry}
                    retryCount={retryCount}
                    maxRetries={maxRetries}
                    completedDays={allRoutines.length}
                    totalDays={totalDays}
                />
             )}

        </>
    )
}
