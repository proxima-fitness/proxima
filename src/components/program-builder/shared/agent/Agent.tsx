"use client"

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import { Button } from "@/components/ui/button"
import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from "@/components/ui/chat-container"
import { cn } from "@/lib/utils"
import {
  Copy,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { ScrollButton } from "@/components/ui/scroll-button"
import { IOption } from "@/components/ui/multi-select"

import { sampleQuestions } from "@/assets/constants"
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Loader2 } from "lucide-react";
import { decode } from '@toon-format/toon';
import { Questions } from "@/components/ui/questions"
import { Filters } from "./Filters"
import { Chat } from "./Chat"
import { Navbar } from "./Navbar"


interface IProps {
    search: string;
    sidebarPosition: "left" | "right";
    onTogglePosition: () => void;
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    hevyProgram: THevyRoutine[];
    sex: string;
    age: string;
    daysPerWeek: string;
    specificDays: IOption[];
    programLength: string;
    workoutDuration: string;
    activityLevel: string;
    goals: IOption[];
    specialization: IOption[];
    equipment: IOption[];
    focusAreas: IOption[];
    difficultyLevel: IOption[];
    excludeAreas: IOption[];
    excludeEquipment: IOption[];
    excludeSpecializations: IOption[];
    healthIssues: IOption[];
    programTitle: string;
    explore: boolean;
    handleSex: (value: string) => void;
    handleAge: (value: string) => void;
    handleDaysPerWeek: (value: string) => void;
    handleSpecificDays: (value: IOption[]) => void;
    handleProgramLength: (value: string) => void;
    handleWorkoutDuration: (value: string) => void;
    handleActivityLevel: (value: string) => void;
    handleGoals: (value: IOption[]) => void;
    handleSpecialization: (value: IOption[]) => void;
    handleEquipment: (value: IOption[]) => void;
    handleFocusAreas: (value: IOption[]) => void;
    handleDifficultyLevel: (value: IOption[]) => void;
    handleExcludeAreas: (value: IOption[]) => void;
    handleExcludeEquipment: (value: IOption[]) => void;
    handleExcludeSpecializations: (value: IOption[]) => void;
    handleHealthIssues: (value: IOption[]) => void;
    handleProgramTitle: (value: string) => void;
    handleExplore: () => void;
}

function Agent({
    search,
    sidebarPosition,
    onTogglePosition,
    setHevyProgram,
    hevyProgram,
    sex,
    age,
    daysPerWeek,
    specificDays,
    programLength,
    workoutDuration,
    activityLevel,
    goals,
    specialization,
    equipment,
    focusAreas,
    difficultyLevel,
    excludeAreas,
    excludeEquipment,
    excludeSpecializations,
    healthIssues,
    programTitle,
    explore,
    handleSex,
    handleAge,
    handleDaysPerWeek,
    handleSpecificDays,
    handleProgramLength,
    handleWorkoutDuration,
    handleActivityLevel,
    handleGoals,
    handleSpecialization,
    handleEquipment,
    handleFocusAreas,
    handleDifficultyLevel,
    handleExcludeAreas,
    handleExcludeEquipment,
    handleExcludeSpecializations,
    handleHealthIssues,
    handleProgramTitle,
    handleExplore,
}: IProps) {


    const [input, setInput] = useState("");
    const { messages, sendMessage, status, stop } = useChat({
      transport: new DefaultChatTransport({
        api: '/api/chat',
        fetch: async (url, options) => {
          const body = options?.body ? JSON.parse(options.body as string) : {};
          // Pass daysPerWeek and other relevant params to the chat API
          body.hevyProgram = hevyProgram;
          body.daysPerWeek = daysPerWeek ? Number(daysPerWeek) : undefined;
          body.programLength = programLength ? Number(programLength) : undefined;
          body.excludeAreas = excludeAreas.length > 0 ? excludeAreas.map(area => area.value).join(', ') : undefined;
          body.excludeEquipment = excludeEquipment.length > 0 ? excludeEquipment.map(eq => eq.value).join(', ') : undefined;
          body.healthIssues = healthIssues.length > 0 ? healthIssues.map(issue => issue.value).join(', ') : undefined;
          return fetch(url, {
            ...options,
            body: JSON.stringify(body),
          });
        },
      }),
    });
    const isSubmitted = status === 'submitted';
    const isStreaming = status === 'streaming';
    const isLoading = isSubmitted || isStreaming; // Keep for Chat component compatibility

    const [isFilters, setIsFilters] = useState(false)
    const lastSentSearch = useRef<string | null>(
        typeof window !== 'undefined' ? sessionStorage.getItem('lastSentSearch') : null
    );

    const handleComplete = (answers: Record<string, string | string[]>) => {
        console.log("Completed with answers:", answers)
      }

      const handleSkip = () => {
        console.log("Questions skipped")
      }


    // Initialize with search parameter if present
    useEffect(() => {
        if (search && search !== lastSentSearch.current) {
            lastSentSearch.current = search;
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('lastSentSearch', search);
            }
            sendMessage({ text: search });
        }
    }, [search, sendMessage]);


    const handleSubmit = () => {
        if (!input.trim()) return

        sendMessage({ text: input });
        setInput('');
    }



    return (
        <div className="flex flex-col h-[85vh] max-sm:h-full">
            { /* The agent's navbar is here for toggling between chat and filters */ }
            <Navbar
                isFilters={isFilters}
                setIsFilters={setIsFilters}
                onTogglePosition={onTogglePosition}
                sidebarPosition={sidebarPosition}
            />
        <ChatContainerRoot className={`flex-1 relative max-sm:h-full ${isFilters ? "overflow-hidden" : "overflow-y-auto"}`}>
            <ChatContainerContent className="h-full max-sm:pb-[220px]">
                <div className="p-2">
                <Questions questions={sampleQuestions} onComplete={handleComplete} onSkip={handleSkip} />
                </div>
                {!isFilters && messages.map(message => (
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
                        ))}
                {!isFilters && isSubmitted && (
                    <Message
                        className={cn(
                            "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6 pt-2",
                            "items-start"
                        )}
                    >
                        <div className="group flex w-full flex-col gap-0">
                            <div className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Analyzing...</span>
                                </div>
                            </div>
                        </div>
                    </Message>
                )}
            {isFilters &&
                <Filters
                    sex={sex}
                    age={age}
                    excludeAreas={excludeAreas}
                    excludeEquipment={excludeEquipment}
                    healthIssues={healthIssues}
                    programLength={programLength}
                    daysPerWeek={daysPerWeek}
                    specificDays={specificDays}
                    workoutDuration={workoutDuration}
                    activityLevel={activityLevel}
                    goals={goals}
                    specialization={specialization}
                    equipment={equipment}
                    focusAreas={focusAreas}
                    difficultyLevel={difficultyLevel}
                    excludeSpecializations={excludeSpecializations}
                    programTitle={programTitle}
                    explore={explore}
                    handleSex={handleSex}
                    handleAge={handleAge}
                    handleDaysPerWeek={handleDaysPerWeek}
                    handleSpecificDays={handleSpecificDays}
                    handleProgramLength={handleProgramLength}
                    handleWorkoutDuration={handleWorkoutDuration}
                    handleActivityLevel={handleActivityLevel}
                    handleGoals={handleGoals}
                    handleSpecialization={handleSpecialization}
                    handleEquipment={handleEquipment}
                    handleFocusAreas={handleFocusAreas}
                    handleDifficultyLevel={handleDifficultyLevel}
                    handleExcludeAreas={handleExcludeAreas}
                    handleExcludeEquipment={handleExcludeEquipment}
                    handleExcludeSpecializations={handleExcludeSpecializations}
                    handleHealthIssues={handleHealthIssues}
                    handleProgramTitle={handleProgramTitle}
                    handleExplore={handleExplore}
                />
            }
            <div className="absolute bottom-4 right-5 z-50">
                <ScrollButton className="shadow-sm" />
            </div>
            <ChatContainerScrollAnchor />
            </ChatContainerContent>
        </ChatContainerRoot>
        { /* The chat input is here */ }
        <Chat
            isLoading={isLoading}
            input={input}
            setInput={setInput}
            handleSubmit={handleSubmit}
            stop={stop}
        />
        </div>
    )
}

export { Agent }
