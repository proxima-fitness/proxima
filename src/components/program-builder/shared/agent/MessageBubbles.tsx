import { useEffect, useRef, useMemo } from "react";
import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
  } from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Copy, ThumbsUp, ThumbsDown, Pencil, Trash } from "lucide-react"
import { FileUIPart, ChatRequestOptions, UIDataTypes, UIMessage, UITools } from "ai";
import { Questions, IQuestion } from "@/components/ui/questions";
import { IOption } from "@/components/ui/multi-select";
import { inferDaysPerWeek, inferProgramLength } from "@/components/program-builder/utils/helpers";
import { equipmentOptions, healthIssuesOptions } from "@/assets/constants";

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

    handleProgramLength: (value: string) => void;
    handleDaysPerWeek: (value: string) => void;
    handleExcludeEquipment: (value: IOption[]) => void;
    handleHealthIssues: (value: IOption[]) => void;
    isBuilding: boolean;
    handleIsBuilding: (isBuilding: boolean) => void;
}

export const MessageBubbles: React.FC<IProps> = (props) => {

    const { messages, setHevyProgram, handleIsBuilding, sendMessage, handleProgramLength, handleDaysPerWeek, handleExcludeEquipment, handleHealthIssues, isBuilding, programLength, daysPerWeek } = props;

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

    // Helper function to convert string[] to IOption[]
    const convertStringArrayToOptions = (
        values: string[],
        options: IOption[]
    ): IOption[] => {
        return values
            .map((value) => options.find(opt => opt.value === value))
            .filter((opt): opt is IOption => opt !== undefined);
    };

    const handleComplete = (answers: Record<string, string | string[]>) => {


        let programLengthValue = "";
        let daysPerWeekValue = "";
        let excludeEquipmentValue: IOption[] = [];
        let healthIssuesValue: IOption[] = [];

        handleIsBuilding(true);


        if (answers['days-per-week'] && answers['days-per-week'].length > 0) {
            daysPerWeekValue = answers['days-per-week'] as string;
            handleDaysPerWeek(daysPerWeekValue);
        } else {
            const inferredDays = inferDaysPerWeek(answers['userRequest'] as string);
            daysPerWeekValue = inferredDays;
            handleDaysPerWeek(daysPerWeekValue);
        }

        if (answers['deload-week']) {
            // TODO: Implement deload week
            // handleDeloadWeek(answers['deload-week'] as string);
        }
        if (answers['exclude-equipment'] && Array.isArray(answers['exclude-equipment'])) {
            const options = convertStringArrayToOptions(
                answers['exclude-equipment'],
                equipmentOptions
            );
            excludeEquipmentValue = options;
            handleExcludeEquipment(options);
        }

        if (answers['exercise-variability']) {
            // TODO: Implement exercise variability
            //handleExerciseVariability(answers['exercise-variability'] as string);
        }

        if (answers['health-issues'] && Array.isArray(answers['health-issues'])) {
            const options = convertStringArrayToOptions(
                answers['health-issues'],
                healthIssuesOptions
            );
            healthIssuesValue = options;
            handleHealthIssues(options);
        }


        if (answers['program-length'] && answers['program-length'].length > 0) {
            programLengthValue = answers['program-length'] as string;
            handleProgramLength(programLengthValue);
        } else {
            const inferredLength = inferProgramLength(answers['userRequest'] as string);
            programLengthValue = inferredLength;
            handleProgramLength(programLengthValue);
        }



        if (answers['progression-system']) {
            // TODO: Implement progression system
            //handleProgressionSystem(answers['progression-system'] as string);
        }

        const emptyProgram = generateEmptyHevyProgram(programLengthValue, daysPerWeekValue);
        setHevyProgram(emptyProgram);

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
};

const handleSkip = () => {
    // Extract programLength and daysPerWeek from userRequest or messages before skipping
    // let programLengthValue = programLength;
    // let daysPerWeekValue = daysPerWeek;

    // // Try to extract from userRequest first
    // if (toolOutput.userRequest) {
    //     if (!programLengthValue) {
    //         const inferredLength = inferProgramLength(toolOutput.userRequest);
    //         if (inferredLength) {
    //             programLengthValue = inferredLength;
    //             handleProgramLength(inferredLength);
    //         }
    //     }
    //     if (!daysPerWeekValue) {
    //         const inferredDays = inferDaysPerWeek(toolOutput.userRequest);
    //         if (inferredDays) {
    //             daysPerWeekValue = inferredDays;
    //             handleDaysPerWeek(inferredDays);
    //         }
    //     }
    // }

    // // Try to extract from user messages if still empty
    // if ((!programLengthValue || !daysPerWeekValue) && messages.length > 0) {
    //     const userMessages = messages
    //         .filter(msg => msg.role === 'user')
    //         .map(msg => {
    //             const textPart = msg.parts.find(p => p.type === 'text');
    //             return textPart && 'text' in textPart ? textPart.text : '';
    //         })
    //         .join(' ');

    //     if (userMessages) {
    //         if (!programLengthValue) {
    //             const inferredLength = inferProgramLength(userMessages);
    //             if (inferredLength) {
    //                 programLengthValue = inferredLength;
    //                 handleProgramLength(inferredLength);
    //             }
    //         }
    //         if (!daysPerWeekValue) {
    //             const inferredDays = inferDaysPerWeek(userMessages);
    //             if (inferredDays) {
    //                 daysPerWeekValue = inferredDays;
    //                 handleDaysPerWeek(inferredDays);
    //             }
    //         }
    //     }
    // }

    // // Final fallback: Use defaults if still empty
    // if (!programLengthValue) {
    //     programLengthValue = "12";
    //     handleProgramLength("12");
    // }
    // if (!daysPerWeekValue) {
    //     daysPerWeekValue = "6";
    //     handleDaysPerWeek("6");
    // }

    sendMessage({ text: "Build my program" });
    handleIsBuilding(true);
};



    return (

        // <div className="p-2">
        //             <Questions questions={sampleQuestions} onComplete={handleComplete} onSkip={handleSkip} />
        //             </div>
        <>
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
                                        default: {
                                            return null;
                                        }
                                    }
                                })}
                            </div>
                        ))

            }

        </>
    )
}
