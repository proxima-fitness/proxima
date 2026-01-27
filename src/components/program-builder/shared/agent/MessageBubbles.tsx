import {
    Message,
    MessageAction,
    MessageActions,
    MessageContent,
  } from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Copy, ThumbsUp, ThumbsDown, Pencil, Trash } from "lucide-react"
import { UIDataTypes, UIMessage, UITools } from "ai";
import { decode } from "@toon-format/toon";
import { Questions, IQuestion } from "@/components/ui/questions";
import { IOption } from "@/components/ui/multi-select";
import { inferDaysPerWeek, inferProgramLength } from "@/components/program-builder/utils/helpers";

// Helper function to generate empty hevyProgram structure
const generateEmptyHevyProgram = (weeksValue: string, daysValue: string): THevyRoutine[] => {
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
    sendMessage: (message: { text: string }) => void;
    handleProgramLength: (value: string) => void;
    handleDaysPerWeek: (value: string) => void;
    handleExcludeEquipment: (value: IOption[]) => void;
    handleHealthIssues: (value: IOption[]) => void;
}

export const MessageBubbles: React.FC<IProps> = (props) => {



    // const handleComplete = (answers: Record<string, string | string[]>) => {
    //     console.log("Completed with answers:", answers)
    // }

    // const handleSkip = () => {
    //     console.log("Questions skipped")
    // }


    const { messages, setHevyProgram, daysPerWeek, programLength, sendMessage, handleProgramLength, handleDaysPerWeek, handleExcludeEquipment, handleHealthIssues } = props;
    console.log("messages in MessageBubbles", messages);

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
                                        case "tool-buildWorkoutProgram": {
                                            // Handle tool result - extract program if present (could be TOON or JSON)
                                            const toolOutput = part.output as { program?: THevyRoutine[] | string };
                                            if (toolOutput?.program) {
                                                if (Array.isArray(toolOutput.program)) {
                                                    // Already in JSON format
                                                    setHevyProgram(toolOutput.program);
                                                } else if (typeof toolOutput.program === 'string') {
                                                    // TOON format string - decode it
                                                    try {
                                                        const decoded = decode(toolOutput.program) as Partial<THevyRoutine>[];
                                                        if (Array.isArray(decoded) && decoded.length > 0) {
                                                            const now = new Date().toISOString();
                                                            const processedRoutines = decoded.map((routine, index) => ({
                                                                id: routine.id || `routine-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                                                                title: routine.title || `Day ${index + 1}`,
                                                                folder_id: typeof routine.folder_id === 'number' ? routine.folder_id : 0,
                                                                order: routine.order || String((index % (daysPerWeek ? Number(daysPerWeek) : 7)) + 1),
                                                                notes: routine.notes || '',
                                                                exercises: routine.exercises || [],
                                                                created_at: routine.created_at || now,
                                                                updated_at: routine.updated_at || now,
                                                            }));
                                                            setHevyProgram(processedRoutines);
                                                        }
                                                    } catch (e) {
                                                        console.error('Failed to decode TOON program from tool output:', e);
                                                    }
                                                }
                                            }
                                            return null;
                                        }
                                        case "tool-getMoreInfoQuestions": {
                                            // Handle tool result - extract questions from tool output
                                            const toolOutput = part.output as {
                                                questions?: IQuestion[],
                                                userRequest?: string,
                                                message?: string
                                            };

                                            if (toolOutput?.questions && Array.isArray(toolOutput.questions)) {
                                                const handleComplete = (answers: Record<string, string | string[]>) => {
                                                    // #region agent log
                                                    fetch('http://127.0.0.1:7242/ingest/989fa07b-d372-405e-9502-d6aaedd11f0d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubbles.tsx:241',message:'handleComplete called',data:{answers,programLength,daysPerWeek},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                                    // #endregion
                                                    // Map question answers to filter state
                                                        // Process each answer and set the corresponding filter

                                                        let programLengthValue = programLength;
                                                        let daysPerWeekValue = daysPerWeek;

                                                        Object.entries(answers).forEach(([questionId, answerValue]) => {
                                                            const question = toolOutput.questions?.find(q => q.id === questionId);


                                                            if (!question) return;

                                                            switch (questionId) {
                                                                case "program-length": {
                                                                    if (typeof answerValue === 'string') {
                                                                        programLengthValue = answerValue;
                                                                        handleProgramLength(answerValue);
                                                                    }
                                                                    break;
                                                                }
                                                                case "days-per-week": {
                                                                    // #region agent log
                                                                    fetch('http://127.0.0.1:7242/ingest/989fa07b-d372-405e-9502-d6aaedd11f0d',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'MessageBubbles.tsx:264',message:'days-per-week answer found',data:{answerValue,daysPerWeek},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
                                                                    // #endregion
                                                                    if (typeof answerValue === 'string') {
                                                                        daysPerWeekValue = answerValue;
                                                                        handleDaysPerWeek(answerValue);
                                                                    }
                                                                    break;
                                                                }
                                                                case "exclude-equipment": {
                                                                    console.log("exclude-equipment answerValue:", answerValue);
                                                                    if (Array.isArray(answerValue)) {
                                                                        // Convert string[] to IOption[]
                                                                        const options: IOption[] = answerValue
                                                                            .map((value) => {
                                                                                const option = question.options.find(opt => opt.id === value);
                                                                                return option ? { value: option.id, label: option.label } : null;
                                                                            })
                                                                            .filter((opt): opt is IOption => opt !== null);
                                                                        handleExcludeEquipment(options);
                                                                    }
                                                                    break;
                                                                }
                                                                case "health-issues": {
                                                                    if (Array.isArray(answerValue)) {
                                                                        // Convert string[] to IOption[]
                                                                        const options: IOption[] = answerValue
                                                                            .map((value) => {
                                                                                const option = question.options.find(opt => opt.id === value);
                                                                                return option ? { value: option.id, label: option.label } : null;
                                                                            })
                                                                            .filter((opt): opt is IOption => opt !== null);
                                                                        handleHealthIssues(options);
                                                                    }
                                                                    break;
                                                                }
                                                            }
                                                        });


                                                        // Fallback: Extract from userRequest if still empty
                                                    if (!programLengthValue && toolOutput.userRequest) {
                                                        const inferredLength = inferProgramLength(toolOutput.userRequest);
                                                        if (inferredLength) {
                                                            programLengthValue = inferredLength;
                                                            handleProgramLength(inferredLength);
                                                        }
                                                    }
                                                    if (!daysPerWeekValue && toolOutput.userRequest) {
                                                        const inferredDays = inferDaysPerWeek(toolOutput.userRequest);
                                                        if (inferredDays) {
                                                            daysPerWeekValue = inferredDays;
                                                            handleDaysPerWeek(inferredDays);
                                                        }
                                                    }

                                                    // Final fallback: Use defaults if still empty
                                                    if (!programLengthValue) {
                                                        programLengthValue = "12";
                                                        handleProgramLength("12");
                                                    }
                                                    if (!daysPerWeekValue) {
                                                        daysPerWeekValue = "6";
                                                        handleDaysPerWeek("6");
                                                    }

                                                    // Generate empty program using the answer values (or extracted/fallback values)
                                                    const emptyProgram = generateEmptyHevyProgram(programLengthValue, daysPerWeekValue);
                                                    setHevyProgram(emptyProgram);
                                                    sendMessage({ text: "Build my program" });

                                                };

                                                const handleSkip = () => {
                                                    // Extract programLength and daysPerWeek from userRequest or messages before skipping
                                                    let programLengthValue = programLength;
                                                    let daysPerWeekValue = daysPerWeek;

                                                    // Try to extract from userRequest first
                                                    if (toolOutput.userRequest) {
                                                        if (!programLengthValue) {
                                                            const inferredLength = inferProgramLength(toolOutput.userRequest);
                                                            if (inferredLength) {
                                                                programLengthValue = inferredLength;
                                                                handleProgramLength(inferredLength);
                                                            }
                                                        }
                                                        if (!daysPerWeekValue) {
                                                            const inferredDays = inferDaysPerWeek(toolOutput.userRequest);
                                                            if (inferredDays) {
                                                                daysPerWeekValue = inferredDays;
                                                                handleDaysPerWeek(inferredDays);
                                                            }
                                                        }
                                                    }

                                                    // Try to extract from user messages if still empty
                                                    if ((!programLengthValue || !daysPerWeekValue) && messages.length > 0) {
                                                        const userMessages = messages
                                                            .filter(msg => msg.role === 'user')
                                                            .map(msg => {
                                                                const textPart = msg.parts.find(p => p.type === 'text');
                                                                return textPart && 'text' in textPart ? textPart.text : '';
                                                            })
                                                            .join(' ');

                                                        if (userMessages) {
                                                            if (!programLengthValue) {
                                                                const inferredLength = inferProgramLength(userMessages);
                                                                if (inferredLength) {
                                                                    programLengthValue = inferredLength;
                                                                    handleProgramLength(inferredLength);
                                                                }
                                                            }
                                                            if (!daysPerWeekValue) {
                                                                const inferredDays = inferDaysPerWeek(userMessages);
                                                                if (inferredDays) {
                                                                    daysPerWeekValue = inferredDays;
                                                                    handleDaysPerWeek(inferredDays);
                                                                }
                                                            }
                                                        }
                                                    }

                                                    // Final fallback: Use defaults if still empty
                                                    if (!programLengthValue) {
                                                        programLengthValue = "12";
                                                        handleProgramLength("12");
                                                    }
                                                    if (!daysPerWeekValue) {
                                                        daysPerWeekValue = "6";
                                                        handleDaysPerWeek("6");
                                                    }

                                                    sendMessage({ text: "Build my program" });
                                                };

                                                return (
                                                    <div key={`${message.id}-${index}`} className="p-2">
                                                        <Questions
                                                            questions={toolOutput.questions}
                                                            onComplete={handleComplete}
                                                            onSkip={handleSkip}
                                                        />
                                                    </div>
                                                );
                                            }

                                            return null;
                                        }
                                        default: {
                                            // Check if part is a tool result with program data (could be TOON or JSON)
                                            if (part.type === 'tool-result' && 'output' in part) {
                                                const output = (part as { output?: { program?: THevyRoutine[] | string } }).output;
                                                if (output?.program) {
                                                    if (Array.isArray(output.program)) {
                                                        // Already in JSON format
                                                        setHevyProgram(output.program);
                                                    } else if (typeof output.program === 'string') {
                                                        // TOON format string - decode it
                                                        try {
                                                            const decoded = decode(output.program) as Partial<THevyRoutine>[];
                                                            if (Array.isArray(decoded) && decoded.length > 0) {
                                                                const now = new Date().toISOString();
                                                                const processedRoutines = decoded.map((routine, index) => ({
                                                                    id: routine.id || `routine-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
                                                                    title: routine.title || `Day ${index + 1}`,
                                                                    folder_id: typeof routine.folder_id === 'number' ? routine.folder_id : 0,
                                                                    order: routine.order || String((index % (daysPerWeek ? Number(daysPerWeek) : 7)) + 1),
                                                                    notes: routine.notes || '',
                                                                    exercises: routine.exercises || [],
                                                                    created_at: routine.created_at || now,
                                                                    updated_at: routine.updated_at || now,
                                                                }));
                                                                setHevyProgram(processedRoutines);
                                                            }
                                                        } catch (e) {
                                                            console.error('Failed to decode TOON program from tool output:', e);
                                                        }
                                                    }
                                                }
                                            }
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
