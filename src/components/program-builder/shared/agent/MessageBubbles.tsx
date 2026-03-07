/**
 * @module MessageBubbles
 * Renders chat messages (user + assistant), tool outputs (buildRoutine, modifyProgram), build progress, error/retry UI, and applies program updates from tool results. Drives hevyProgram state and timeout/retry logic.
 * Depends on: message, tool, reasoning, attachments, ModifyProgramProgress, applyModifyProgramPatchesFromMessages, helpers. Used by: Agent.
 */
/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useMemo, useState } from "react";
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
import { Copy, ThumbsUp, ThumbsDown, Pencil, Trash, AlertCircle, RefreshCw, FileText } from "lucide-react"
import { type ChatStatus, FileUIPart, ChatRequestOptions, UIDataTypes, UIMessage, UITools } from "ai";
import type { IQuestion } from "@/components/ui/questions";
import { IOption } from "@/components/ui/multi-select";
import { applyModifyProgramPatchesFromMessages, getModifyProgramObjectivesByRoutine } from "@/components/program-builder/utils/helpers";
import {
    Reasoning,
    ReasoningContent,
    ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { Tool, ToolContent, ToolHeader } from "@/components/ai-elements/tool";
import type { ToolPart } from "@/components/ai-elements/tool";
import { ModifyProgramProgress } from "./ModifyProgramProgress";
import { toast } from "sonner";
import Link from "next/link";
import { type Operation } from "fast-json-patch";
import posthog from "posthog-js";
import { useUserContext } from "@/contexts/UserContext";
import {
    Attachments,
    Attachment,
    AttachmentPreview,
    AttachmentInfo,
} from "@/components/ai-elements/attachments";

/** Parses user message text to extract spreadsheet blocks for display-only rendering. */
function parseUserMessageWithSpreadsheets(text: string): {
    displayText: string;
    spreadsheetLabels: string[];
} {
    const labels: string[] = [];
    const blockRegex = /\[Attached spreadsheet: ([^\]]+)\]\n[\s\S]*?(?=\n\n\[Attached spreadsheet: [^\]]+\]\n|$)/g;
    let match;
    while ((match = blockRegex.exec(text)) !== null) {
        labels.push(match[1].trim());
    }
    const displayText = text
        .replace(/\[Attached spreadsheet: [^\]]+\]\n[\s\S]*?(?=\n\n\[Attached spreadsheet: [^\]]+\]\n|$)/g, "")
        .replace(/\n\n+/g, "\n\n")
        .trim();
    return { displayText, spreadsheetLabels: labels };
}

/** Truncates long filenames with ellipsis while keeping the extension visible. */
function truncateFilename(filename: string, maxBaseLength = 24): string {
    const lastDot = filename.lastIndexOf(".");
    const base = lastDot >= 0 ? filename.slice(0, lastDot) : filename;
    const ext = lastDot >= 0 ? filename.slice(lastDot) : "";
    if (base.length <= maxBaseLength) return filename;
    return base.slice(0, maxBaseLength) + "..." + ext;
}

/** buildRoutine tool result shape: routine, day/total counts, optional error. */
interface IBuildRoutineOutput {
    routine?: THevyRoutine;
    dayNumber?: number;
    totalDays?: number;
    exerciseCount?: number;
    setCount?: number;
    error?: string;
    message?: string;
}

/** Inline progress list for buildRoutine: completed days + "Building..." for current. */
const BuildProgress: React.FC<{
    completedDays: Array<{ dayNumber: number; title: string }>;
    totalDays: number;
    isBuilding: boolean;
}> = ({ completedDays, totalDays, isBuilding }) => {
    if (totalDays <= 0) return null;

    return (
        <div className="w-full pb-4">
            <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-lg border border-border">
                <p className="font-medium text-sm text-foreground">
                    {completedDays.length === totalDays
                        ? "Program built successfully!"
                        : "Building your program..."}
                </p>
                <div className="flex flex-col gap-1.5">
                    {Array.from({ length: totalDays }, (_, i) => {
                        const dayNum = i + 1;
                        const completed = completedDays.find(d => d.dayNumber === dayNum);
                        const isCurrentlyBuilding = isBuilding && !completed &&
                            dayNum === completedDays.length + 1;

                        return (
                            <div key={dayNum} className="flex items-center gap-2">
                                <span className={cn(
                                    "w-2.5 h-2.5 rounded-full shrink-0 transition-colors duration-300",
                                    completed ? "bg-green-500" :
                                    isCurrentlyBuilding ? "bg-yellow-500 animate-pulse" :
                                    "bg-gray-300 dark:bg-gray-600"
                                )} />
                                <span className={cn(
                                    "text-sm transition-colors duration-300",
                                    completed ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {completed
                                        ? `Day ${dayNum}: ${completed.title}`
                                        : isCurrentlyBuilding
                                            ? `Day ${dayNum}: Building...`
                                            : `Day ${dayNum}`}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

/** Error banner with retry and "Explore Programs" link when build fails. */
const GenerationError: React.FC<{
    error: Error | null;
    onRetry: () => void;
    retryCount: number;
    maxRetries: number;
    completedDays: number;
    totalDays: number;
}> = ({ error, onRetry, retryCount, maxRetries, completedDays, totalDays }) => {
    if (!error) return null;

    const canRetry = retryCount < maxRetries;
    const hasPartialProgress = completedDays > 0;

    return (
        <div className="mx-auto w-full max-w-3xl px-2 sm:px-4 md:px-6 pt-2">
            <div className="flex flex-col gap-3 p-3 sm:p-4 bg-muted/40 dark:bg-muted/20 rounded-lg border border-red-200/80 dark:border-red-800/80">
                <div className="flex items-start gap-2 sm:gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1 min-w-0">
                        <p className="font-medium text-base text-red-700 dark:text-red-300">
                            Workout generation failed
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400">
                            {hasPartialProgress
                                ? `Generated ${completedDays} of ${totalDays} days before encountering an error.`
                                : "Something went wrong while building your program."
                            }
                        </p>
                        {retryCount > 0 && (
                            <p className="text-xs text-red-500 dark:text-red-500 mt-1">
                                Retry attempt {retryCount} of {maxRetries} failed
                            </p>
                        )}
                    </div>
                </div>
                <div className="flex flex-col flex-wrap items-center justify-center sm:flex-row gap-2 mt-2 sm:mt-1">
                    {canRetry && (
                        <Button
                            size="sm"
                            onClick={onRetry}
                            className="w-[50%] sm:w-auto bg-red-600 hover:bg-red-700 text-white border-0"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                        </Button>
                    )}
                    <Link href="/programs">
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-[50%] sm:w-auto border-border text-muted-foreground hover:bg-muted/50"
                        >
                            Explore Programs
                        </Button>
                    </Link>
                </div>
            </div>
        </div>
    );
};

/** Props: messages/setMessages, program state (hevyProgram, setHevyProgram, applyPatchWithUndo), filter handlers (programLength, daysPerWeek, exclude, health), sendMessage, isBuilding, loading/error/retry, status. */
interface IProps {
    messages: UIMessage<unknown, UIDataTypes, UITools>[];
    setMessages: (messages: UIMessage<unknown, UIDataTypes, UITools>[] | ((messages: UIMessage<unknown, UIDataTypes, UITools>[]) => UIMessage<unknown, UIDataTypes, UITools>[])) => void;
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    daysPerWeek: string;
    programLength: string;
    excludeEquipment: IOption[];
    healthIssues: IOption[];
    sendMessage: (message?: (Omit<UIMessage<unknown, UIDataTypes, UITools>, "id" | "role"> & {
        id?: string;
        role?: "system" | "user" | "assistant";
    } & {
        text?: never;
        files?: never;
        messageId?: string;
    }) | {
        text: string;
        files?: FileList | FileUIPart[];
        metadata?: unknown;
        parts?: never;
        messageId?: string;
    } | {
        files: FileList | FileUIPart[];
        metadata?: unknown;
        parts?: never;
        messageId?: string;
    }, options?: ChatRequestOptions) => Promise<void>;

    handleProgramLength: (value: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12") => void;
    handleDaysPerWeek: (value: string) => void;
    handleExcludeEquipment: (value: IOption[]) => void;
    handleHealthIssues: (value: IOption[]) => void;
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
    applyPatchWithUndo: (newDocument: THevyRoutine[], inversePatch: Operation[]) => void;
    onBuildComplete?: () => void;
}

/** Renders message list, build/modify progress, applies tool results to hevyProgram, and handles timeout/retry. */
export const MessageBubbles: React.FC<IProps> = (props) => {

    const { user } = useUserContext();
    const {
        messages,
        setMessages,
        setHevyProgram,
        sendMessage,
        handleIsBuilding,
        isBuilding,
        programLength,
        daysPerWeek,
        status,
        error,
        onRetry,
        retryCount,
        maxRetries,
        onTimeoutError,
        hevyProgram,
        applyPatchWithUndo,
        onBuildComplete,
    } = props;

    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editingText, setEditingText] = useState("");

    const TIMEOUT_MS = 45000; // No progress for this long during build triggers onTimeoutError
    const lastProgressTimestampRef = useRef<number>(0);
    const timeoutCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

    // Track the last count of completed routines to know when to finalize
    const lastCompletedCountRef = useRef<number>(0);

    // Collect all completed buildRoutine outputs from messages
    const { completedDays, totalDays, allRoutines } = useMemo(() => {
        const days: Array<{ dayNumber: number; title: string }> = [];
        const routines: THevyRoutine[] = [];
        let maxTotalDays = 0;

        for (const message of messages) {
            for (const part of message.parts) {
                if (part.type === "tool-buildRoutine") {
                    const toolOutput = (part as { output?: IBuildRoutineOutput }).output;

                    if (toolOutput?.routine && toolOutput?.dayNumber && !toolOutput?.error) {
                        // Check if we already have this day (avoid duplicates)
                        if (!days.find(d => d.dayNumber === toolOutput.dayNumber)) {
                            days.push({
                                dayNumber: toolOutput.dayNumber,
                                title: toolOutput.routine.title,
                            });
                            routines.push(toolOutput.routine);
                        }

                        if (toolOutput.totalDays && toolOutput.totalDays > maxTotalDays) {
                            maxTotalDays = toolOutput.totalDays;
                        }
                    }
                }
            }
        }

        // Sort by day number
        days.sort((a, b) => a.dayNumber - b.dayNumber);
        routines.sort((a, b) => Number(a.order) - Number(b.order));

        // Use daysPerWeek as fallback for totalDays if not yet known from tool calls
        const finalTotalDays = maxTotalDays || (daysPerWeek ? Number(daysPerWeek) : 0);

        return {
            completedDays: days,
            totalDays: finalTotalDays,
            allRoutines: routines
        };
    }, [messages, daysPerWeek]);

    // Update progress timestamp when completed days change
    useEffect(() => {
        if (completedDays.length > 0) {
            lastProgressTimestampRef.current = Date.now();
        }
    }, [completedDays.length]);

    useEffect(() => {
        // Timeout: every 5s while building, if no progress for TIMEOUT_MS then onTimeoutError
        if (timeoutCheckIntervalRef.current) {
            clearInterval(timeoutCheckIntervalRef.current);
            timeoutCheckIntervalRef.current = null;
        }

        // Only start timeout checking when building and not already errored
        if (isBuilding && !error && totalDays > 0 && completedDays.length < totalDays) {
            // Initialize the timestamp if not already set
            if (lastProgressTimestampRef.current === 0) {
                lastProgressTimestampRef.current = Date.now();
            }

            timeoutCheckIntervalRef.current = setInterval(() => {
                const elapsed = Date.now() - lastProgressTimestampRef.current;
                if (elapsed >= TIMEOUT_MS) {
                    console.warn(`Workout generation timeout: ${elapsed}ms since last progress`);
                    onTimeoutError();
                    if (timeoutCheckIntervalRef.current) {
                        clearInterval(timeoutCheckIntervalRef.current);
                        timeoutCheckIntervalRef.current = null;
                    }
                }
            }, 5000);
        }

        return () => {
            if (timeoutCheckIntervalRef.current) {
                clearInterval(timeoutCheckIntervalRef.current);
                timeoutCheckIntervalRef.current = null;
            }
        };
    }, [isBuilding, error, totalDays, completedDays.length, onTimeoutError]);

    // Reset timeout timestamp when building starts
    useEffect(() => {
        if (isBuilding) {
            lastProgressTimestampRef.current = Date.now();
        }
    }, [isBuilding]);

    useEffect(() => {
        // When all buildRoutine days are done: duplicate routines across weeks and setHevyProgram
        if (
            totalDays > 0 &&
            completedDays.length === totalDays &&
            completedDays.length !== lastCompletedCountRef.current &&
            allRoutines.length > 0
        ) {
            lastCompletedCountRef.current = completedDays.length;

            const weeks = programLength ? Number(programLength) : 1;
            const fullProgram: THevyRoutine[] = [];
            let routineId = 1;

            for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
                for (const routine of allRoutines) {
                    fullProgram.push({
                        ...routine,
                        id: String(routineId++),
                        folder_id: weekIndex,
                    });
                }
            }

            setHevyProgram(fullProgram);
            handleIsBuilding(false);
            onBuildComplete?.();
            posthog.capture("generated_a_program", {
                user: user?.id ?? "user_id_unknown",
                daysPerWeek: allRoutines.length,
                programLength: weeks,
            });
        }
    }, [completedDays.length, totalDays, allRoutines, programLength, setHevyProgram, handleIsBuilding, onBuildComplete, user]);

    const appliedModifyProgramKeysRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        // Apply modifyProgram patches from messages; skip already-applied; commit via applyPatchWithUndo (atomic)
        const modified = applyModifyProgramPatchesFromMessages(
            messages,
            hevyProgram,
            appliedModifyProgramKeysRef,
            applyPatchWithUndo
        );
        if (modified) {
            posthog.capture("modified_a_program", { user: user?.id ?? "user_id_unknown" });
        }
    }, [messages, hevyProgram, applyPatchWithUndo, user]);

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
                            return (
                            <div key={message.id} className="whitespace-pre-wrap">
                                {isAssistant && reasoningParts.length > 0 && (
                                    <Reasoning
                                        isStreaming={isReasoningStreaming}
                                        className="mx-auto w-full max-w-3xl px-4 pt-2 md:px-6"
                                    >
                                        <ReasoningTrigger />
                                        <ReasoningContent>{reasoningText}</ReasoningContent>
                                    </Reasoning>
                                )}
                                {message.parts.map((part, index) => {
                                    const isAssistantPart = message.role === "assistant";
                                    const isLastMessagePart = index === message.parts.length - 1;
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
                                                                    className="min-h-[80px] bg-muted text-black dark:text-white rounded-3xl px-5 py-2.5 resize-y"
                                                                />
                                                                <div className="flex gap-2 justify-end">
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        onClick={() => setEditingMessageId(null)}
                                                                        aria-label="Cancel edit"
                                                                    >
                                                                        Cancel
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        className="bg-lightSecondary text-white hover:bg-lightSecondary/80"
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
                                                                className="max-w-[200px] max-h-[200px] rounded-xl object-cover border border-border"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2 bg-muted rounded-xl px-3 py-2 border border-border">
                                                                <FileText className="size-4 shrink-0 text-muted-foreground" />
                                                                <span className="text-sm truncate max-w-[180px]">
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
                                                questions?: IQuestion[];
                                                userRequest?: string;
                                                message?: string;
                                            };
                                            const toolState = (part as { state?: ToolPart["state"] }).state ?? "output-available";
                                            if (!toolOutput?.questions || !Array.isArray(toolOutput.questions)) return null;
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
                                        case "tool-buildRoutine": {
                                            // Show progress UI for buildRoutine calls
                                            // Only render the progress component once (on the first buildRoutine tool call)
                                            const buildPart = part as { output?: IBuildRoutineOutput; state?: ToolPart["state"] };
                                            const toolOutput = buildPart.output;
                                            const toolState: ToolPart["state"] =
                                                toolOutput?.routine && !toolOutput?.error
                                                    ? "output-available"
                                                    : isBuilding
                                                        ? "input-available"
                                                        : "input-streaming";

                                            // Only render progress on day 1 to avoid duplicates
                                            if (toolOutput?.dayNumber === 1 && totalDays > 0) {
                                                return (
                                                    <Tool key={`${message.id}-${index}-build`} defaultOpen className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                        <ToolHeader type="tool-buildRoutine" state={toolState} title="Build routine" />
                                                        <ToolContent>
                                                            <BuildProgress
                                                                completedDays={completedDays}
                                                                totalDays={totalDays}
                                                                isBuilding={isBuilding}
                                                            />
                                                        </ToolContent>
                                                    </Tool>
                                                );
                                            }

                                            return null;
                                        }
                                        case "tool-modifyProgram": {
                                            type ModifyProgramPart = {
                                                type: "tool-modifyProgram";
                                                state?: string;
                                                input?: { patch?: Array<{ op: string; path: string; value?: unknown }> };
                                                output?: { patch?: Array<{ op: string; path: string; value?: unknown }>; error?: string };
                                                errorText?: string;
                                            };
                                            const modifyPart = part as unknown as ModifyProgramPart;
                                            const patch = modifyPart.output?.patch ?? modifyPart.input?.patch;
                                            const objectivesByRoutine = getModifyProgramObjectivesByRoutine(patch, hevyProgram);
                                            const isComplete =
                                                modifyPart.state === "output-available" && modifyPart.output?.patch;
                                            const isError = modifyPart.state === "output-error";
                                            const errorText = modifyPart.errorText;
                                            const toolState: ToolPart["state"] = isError
                                                ? "output-error"
                                                : isComplete
                                                    ? "output-available"
                                                    : "input-available";

                                            if (isError) {
                                                return (
                                                    <Tool key={`${message.id}-${index}-modify-error`} defaultOpen className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                        <ToolHeader type="tool-modifyProgram" state={toolState} title="Modify program" />
                                                        <ToolContent>
                                                            <div className="flex items-center gap-2 pb-4 bg-muted/50 rounded-lg border border-border">
                                                                <span className="w-2.5 h-2.5 rounded-full shrink-0 bg-red-500" />
                                                                <span className="text-sm text-muted-foreground">
                                                                    {errorText || "Program modification failed"}
                                                                </span>
                                                            </div>
                                                        </ToolContent>
                                                    </Tool>
                                                );
                                            }

                                            return (
                                                <Tool key={`${message.id}-${index}-modify`} defaultOpen className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
                                                    <ToolHeader type="tool-modifyProgram" state={toolState} title="Modify program" />
                                                    <ToolContent>
                                                        <ModifyProgramProgress
                                                            objectivesByRoutine={objectivesByRoutine}
                                                            status={isComplete ? "complete" : "processing"}
                                                        />
                                                    </ToolContent>
                                                </Tool>
                                            );
                                        }
                                        default: {
                                            return null;
                                        }
                                    }
                                })}
                            </div>
                            );
                        })}

             {/* Show error UI as next assistant message when generation fails */}
             {error && (
                <GenerationError
                    error={error}
                    onRetry={onRetry}
                    retryCount={retryCount}
                    maxRetries={maxRetries}
                    completedDays={completedDays.length}
                    totalDays={totalDays}
                />
             )}

        </>
    )
}
