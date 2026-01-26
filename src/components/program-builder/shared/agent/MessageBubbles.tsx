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

interface IProps {
    messages: UIMessage<unknown, UIDataTypes, UITools>[];
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    daysPerWeek: string;
}

export const MessageBubbles: React.FC<IProps> = (props) => {



    // const handleComplete = (answers: Record<string, string | string[]>) => {
    //     console.log("Completed with answers:", answers)
    // }

    // const handleSkip = () => {
    //     console.log("Questions skipped")
    // }


    const { messages, setHevyProgram, daysPerWeek } = props;
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

                                        // If message contains program JSON, show compact view
                                        if (isAssistant) {
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

                                        // Normal message rendering for non-program JSON
                                        return (
                                            <Message
                                                key={`${message.id}-${index}`}
                                                className={cn(
                                                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6 pt-2",
                                                    isAssistant ? "items-start" : "items-end")}
                                                >
                                                    {isAssistant ? (
                                                <div className="group flex w-full flex-col gap-0">

                                                    <MessageContent
                                                        className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0"
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
                                                ) : (
                                                <div className="group flex flex-col items-end gap-1">
                                                    <MessageContent className="bg-muted text-black dark:text-white max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                                                    {part.text}
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
                                                )}
                                            </Message>
                                        );
                                    }
                                    case "tool-displayBuildWorkoutProgram": {
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
