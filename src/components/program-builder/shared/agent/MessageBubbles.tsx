import { useEffect, useRef, useMemo, useCallback } from "react";
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
  } from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Copy, ThumbsUp, ThumbsDown, Pencil, Trash, AlertCircle, RefreshCw } from "lucide-react"
import { FileUIPart, ChatRequestOptions, UIDataTypes, UIMessage, UITools } from "ai";
import { Questions, IQuestion } from "@/components/ui/questions";
import { IOption } from "@/components/ui/multi-select";
import { applyModifyProgramPatchesFromMessages, getModifyProgramObjectivesByRoutine, inferDaysPerWeek, inferProgramLength } from "@/components/program-builder/utils/helpers";
import { ModifyProgramProgress } from "./ModifyProgramProgress";
import { equipmentOptions, healthIssuesOptions } from "@/assets/constants";
import { generateFallbackWorkout } from "../../utils/fallback-workouts";
import { toast } from "sonner";
import { type Operation } from "fast-json-patch";

// Type for buildRoutine tool output
interface IBuildRoutineOutput {
    routine?: THevyRoutine;
    dayNumber?: number;
    totalDays?: number;
    exerciseCount?: number;
    setCount?: number;
    error?: string;
    message?: string;
}

// Progress component to show build status for each day
const BuildProgress: React.FC<{
    completedDays: Array<{ dayNumber: number; title: string }>;
    totalDays: number;
    isBuilding: boolean;
}> = ({ completedDays, totalDays, isBuilding }) => {
    if (totalDays <= 0) return null;

    return (
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
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
                                    "w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors duration-300",
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

// Error display component for when generation fails
const GenerationError: React.FC<{
    error: Error | null;
    onRetry: () => void;
    onUseFallback: () => void;
    retryCount: number;
    maxRetries: number;
    completedDays: number;
    totalDays: number;
}> = ({ error, onRetry, onUseFallback, retryCount, maxRetries, completedDays, totalDays }) => {
    if (!error) return null;

    const canRetry = retryCount < maxRetries;
    const hasPartialProgress = completedDays > 0;

    return (
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
            <div className="flex flex-col gap-3 p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border border-red-200 dark:border-red-800">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="flex flex-col gap-1">
                        <p className="font-medium text-sm text-red-700 dark:text-red-300">
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
                <div className="flex gap-2 mt-1">
                    {canRetry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onRetry}
                            className="border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Try Again
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onUseFallback}
                        className="border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50"
                    >
                        Use Template Workout
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Helper function to generate empty hevyProgram structure
export const generateEmptyHevyProgram = (weeksValue: string, daysValue: string): THevyRoutine[] => {
    const weeks = weeksValue ? Number(weeksValue) : 0;
    const days = daysValue ? Number(daysValue) : 0;

    // Handle edge cases - return empty array if invalid values
    if (!weeks || !days || weeks <= 0 || days <= 0) {
        return [];
    }

    const now = new Date().toISOString();
    const routines: THevyRoutine[] = [];
    let routineIndex = 0;

    // For each week (0-indexed folder_id)
    for (let weekIndex = 0; weekIndex < weeks; weekIndex++) {
        // For each day in the week (1-indexed order)
        for (let dayIndex = 1; dayIndex <= days; dayIndex++) {
            routines.push({
                id: String(routineIndex + 1),
                title: "",
                folder_id: weekIndex,
                order: String(dayIndex),
                exercises: [],
                notes: "",
                created_at: now,
                updated_at: now,
            });
            routineIndex++;
        }
    }

    return routines;
};

interface IProps {
    messages: UIMessage<unknown, UIDataTypes, UITools>[];
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    daysPerWeek: string;
    programLength: string;
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
    // Error handling props
    error: Error | null;
    onRetry: () => void;
    onClearError: () => void;
    retryCount: number;
    maxRetries: number;
    onTimeoutError: () => void;
    hevyProgram: THevyRoutine[];
    addToUndoStack: (inversePatch: Operation[]) => void;
}

export const MessageBubbles: React.FC<IProps> = (props) => {

    const {
        messages,
        setHevyProgram,
        handleIsBuilding,
        sendMessage,
        handleProgramLength,
        handleDaysPerWeek,
        handleExcludeEquipment,
        handleHealthIssues,
        isBuilding,
        programLength,
        daysPerWeek,
        isLoading,
        error,
        onRetry,
        onClearError,
        retryCount,
        maxRetries,
        onTimeoutError,
        hevyProgram,
        addToUndoStack
    } = props;

    // Timeout detection - 45 seconds with no progress during building
    const TIMEOUT_MS = 45000;
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

    // Timeout detection - check every 5 seconds if we're building
    useEffect(() => {
        // Clear any existing interval
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

    // Process completed routines - when all days are done, duplicate to all weeks
    useEffect(() => {
        // Only finalize when:
        // 1. We have completed all days
        // 2. The count has changed (avoid re-processing)
        // 3. We have routines to process
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
        }
    }, [completedDays.length, totalDays, allRoutines, programLength, setHevyProgram, handleIsBuilding]);

    // Track which modifyProgram tool results have been applied (avoid re-applying on re-render)
    const appliedModifyProgramKeysRef = useRef<Set<string>>(new Set());

    // Process modifyProgram tool results: validate, apply with immutable update, store inverse for undo
    useEffect(() => {
        applyModifyProgramPatchesFromMessages(
            messages,
            hevyProgram,
            appliedModifyProgramKeysRef,
            setHevyProgram,
            addToUndoStack
        );
    }, [messages, hevyProgram, setHevyProgram, addToUndoStack]);

    // Helper function to convert string[] to IOption[] - memoized to prevent recreation
    const convertStringArrayToOptions = useCallback((
        values: string[],
        options: IOption[]
    ): IOption[] => {
        return values
            .map((value) => options.find(opt => opt.value === value))
            .filter((opt): opt is IOption => opt !== undefined);
    }, []);

    // Memoized handleComplete - separates API call from state updates
    const handleComplete = useCallback((answers: Record<string, string | string[]>) => {
        // 1. COMPUTE all values needed for API call FIRST (no state updates yet)
        let programLengthValue: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12" = "";
        let daysPerWeekValue = "";
        let excludeEquipmentValue: IOption[] = [];
        let healthIssuesValue: IOption[] = [];

        // Compute daysPerWeek value
        if (answers['days-per-week'] && answers['days-per-week'].length > 0) {
            daysPerWeekValue = answers['days-per-week'] as string;
        } else {
            const inferredDays = inferDaysPerWeek(answers['userRequest'] as string);
            daysPerWeekValue = daysPerWeek || inferredDays || "6";
        }

        // Compute excludeEquipment value
        if (answers['exclude-equipment'] && Array.isArray(answers['exclude-equipment'])) {
            excludeEquipmentValue = convertStringArrayToOptions(
                answers['exclude-equipment'],
                equipmentOptions
            );
        }

        // Compute healthIssues value
        if (answers['health-issues'] && Array.isArray(answers['health-issues'])) {
            healthIssuesValue = convertStringArrayToOptions(
                answers['health-issues'],
                healthIssuesOptions
            );
        }

        // Compute programLength value
        if (answers['program-length'] && answers['program-length'].length > 0) {
            programLengthValue = answers['program-length'] as ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12";
        } else {
            const inferredLength = inferProgramLength(answers['userRequest'] as string);
            programLengthValue = programLength || inferredLength || "12";
        }

        // 2. MAKE THE API CALL with computed values (before state updates)
        sendMessage(
            { text: "Build my program" },
            {
                body: {
                    daysPerWeek: daysPerWeekValue ? Number(daysPerWeekValue) : undefined,
                    programLength: programLengthValue ? Number(programLengthValue) : undefined,
                    excludeEquipment: excludeEquipmentValue?.length > 0 ? excludeEquipmentValue?.map(eq => eq.value).join(', ') : undefined,
                    healthIssues: healthIssuesValue?.length > 0 ? healthIssuesValue?.map(issue => issue.value).join(', ') : undefined,
                }
            }
        );

        // 3. UPDATE UI STATE AFTER (these don't affect the API call)
        handleIsBuilding(true);
        handleDaysPerWeek(daysPerWeekValue);
        handleProgramLength(programLengthValue);
        if (excludeEquipmentValue.length > 0) {
            handleExcludeEquipment(excludeEquipmentValue);
        }
        if (healthIssuesValue.length > 0) {
            handleHealthIssues(healthIssuesValue);
        }

        const emptyProgram = generateEmptyHevyProgram(programLengthValue, daysPerWeekValue);
        setHevyProgram(emptyProgram);
    }, [
        sendMessage,
        handleIsBuilding,
        handleDaysPerWeek,
        handleProgramLength,
        handleExcludeEquipment,
        handleHealthIssues,
        setHevyProgram,
        convertStringArrayToOptions,
        daysPerWeek,
        programLength
    ]);

    // Memoized handleSkip - calls API first, then updates state
    const handleSkip = useCallback(() => {
        // 1. Make the API call first
        sendMessage({ text: "Build my program" });

        // 2. Update UI state after
        handleIsBuilding(true);
    }, [sendMessage, handleIsBuilding]);

    // Handle using fallback workouts when AI generation fails
    const handleUseFallback = useCallback(() => {
        onClearError();
        const days = daysPerWeek ? Number(daysPerWeek) : 4;
        const weeks = programLength ? Number(programLength) : 12;
        const fallbackProgram = generateFallbackWorkout(days, weeks);
        setHevyProgram(fallbackProgram);

        // Notify the user that a template workout is being used
        toast.info("Template workout loaded", {
            description: `Andy failed to build a workout so we loaded a ${days}-day template workout for ${weeks} weeks. You can customize it to fit your needs.`,
            duration: 6000,
        });
    }, [onClearError, daysPerWeek, programLength, setHevyProgram]);



    return (

        <>
             {/* Show error UI when generation fails */}
             {error && (
                <GenerationError
                    error={error}
                    onRetry={onRetry}
                    onUseFallback={handleUseFallback}
                    retryCount={retryCount}
                    maxRetries={maxRetries}
                    completedDays={completedDays.length}
                    totalDays={totalDays}
                />
             )}

             { messages.map(message => (
                            <div key={message.id} className="whitespace-pre-wrap">
                                {message.parts.map((part, index) => {
                                    const isAssistant = message.role === "assistant"
                                    const isLastMessage = index === message.parts.length - 1
                                    switch (part.type) {
                                        case 'text': {
                                            const text = part.text;

                                            if (!isAssistant) {
                                                // User message - render RHS bubble only
                                                return (
                                                    <Message
                                                        key={`${message.id}-${index}`}
                                                        className={cn(
                                                            "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6 pt-2",
                                                            "items-end"
                                                        )}
                                                    >
                                                        <div className="group flex flex-col items-end gap-1">
                                                            <MessageContent className="bg-muted text-black dark:text-white max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                                                                {text}
                                                            </MessageContent>
                                                            <MessageActions
                                                                className={cn(
                                                                    "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                                                                )}
                                                            >
                                                                <MessageAction tooltip="Edit" delayDuration={100}>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="rounded-full"
                                                                    >
                                                                        <Pencil />
                                                                    </Button>
                                                                </MessageAction>
                                                                <MessageAction tooltip="Delete" delayDuration={100}>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="rounded-full"
                                                                    >
                                                                        <Trash />
                                                                    </Button>
                                                                </MessageAction>
                                                                <MessageAction tooltip="Copy" delayDuration={100}>
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="icon"
                                                                        className="rounded-full"
                                                                    >
                                                                        <Copy />
                                                                    </Button>
                                                                </MessageAction>
                                                            </MessageActions>
                                                        </div>
                                                    </Message>
                                                );
                                            }

                                            // Assistant message - render LHS message
                                            return (
                                                <Message
                                                    key={`${message.id}-${index}`}
                                                    className={cn(
                                                        "mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 md:px-6 pt-2",
                                                        "items-start"
                                                    )}
                                                >
                                                    <div className="group flex w-full flex-col gap-0">
                                                        <MessageContent
                                                            className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0 mb-2"
                                                            markdown
                                                        >
                                                            {text}
                                                        </MessageContent>
                                                        <MessageActions
                                                            className={cn(
                                                                "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                                                isLastMessage && "opacity-100"
                                                            )}
                                                        >
                                                            <MessageAction tooltip="Edit" delayDuration={100}>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="rounded-full"
                                                                >
                                                                    <Copy />
                                                                </Button>
                                                            </MessageAction>
                                                            <MessageAction tooltip="Upvote" delayDuration={100}>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="rounded-full"
                                                                >
                                                                    <ThumbsUp />
                                                                </Button>
                                                            </MessageAction>
                                                            <MessageAction tooltip="Downvote" delayDuration={100}>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="rounded-full"
                                                                >
                                                                    <ThumbsDown />
                                                                </Button>
                                                            </MessageAction>
                                                        </MessageActions>
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
                                                questions?: IQuestion[],
                                                userRequest?: string,
                                                message?: string
                                            };

                                            if (toolOutput?.questions && Array.isArray(toolOutput.questions)) {



                                                return (
                                                    <div key={`${message.id}-${index}`} className="p-2">
                                                        <Questions
                                                            questions={toolOutput.questions}
                                                            onComplete={handleComplete}
                                                            onSkip={handleSkip}
                                                            isBuilding={isBuilding}
                                                            isLoading={isLoading}
                                                        />
                                                    </div>
                                                );
                                            }

                                            return null;
                                        }
                                        case "tool-buildRoutine": {
                                            // Show progress UI for buildRoutine calls
                                            // Only render the progress component once (on the first buildRoutine tool call)
                                            const toolOutput = (part as { output?: IBuildRoutineOutput }).output;

                                            // Only render progress on day 1 to avoid duplicates
                                            if (toolOutput?.dayNumber === 1 && totalDays > 0) {
                                                return (
                                                    <BuildProgress
                                                        key={`${message.id}-${index}-progress`}
                                                        completedDays={completedDays}
                                                        totalDays={totalDays}
                                                        isBuilding={isBuilding}
                                                    />
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

                                            if (isError) {
                                                return (
                                                    <div
                                                        key={`${message.id}-${index}-modify-error`}
                                                        className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2"
                                                    >
                                                        <div className="flex items-center gap-2 p-4 bg-muted/50 rounded-lg border border-border">
                                                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-red-500" />
                                                            <span className="text-sm text-muted-foreground">
                                                                {errorText || "Program modification failed"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <ModifyProgramProgress
                                                    key={`${message.id}-${index}-modify`}
                                                    objectivesByRoutine={objectivesByRoutine}
                                                    status={isComplete ? "complete" : "processing"}
                                                />
                                            );
                                        }
                                        default: {
                                            return null;
                                        }
                                    }
                                })}
                            </div>
                        ))}

        </>
    )
}
