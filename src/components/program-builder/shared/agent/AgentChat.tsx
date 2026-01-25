"use client"

import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/ui/message"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/ui/prompt-input"
import { Button } from "@/components/ui/button"
import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from "@/components/ui/chat-container"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Copy,
  Mic,
  MoreHorizontal,
  PanelLeft,
  PanelRight,
  Pencil,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { ScrollButton } from "@/components/ui/scroll-button"
import { useSearchParams } from "next/navigation"
import MultiSelect, { IOption } from "@/components/ui/multi-select"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { activityLevelOptions, ageOptions, dayPerWeekOptions, difficultyOptions, equipmentOptions, focusAreasOptions, goalsOptions, healthIssuesOptions, programLengthOptions, sexOptions, specializationOptions, specificDaysOptions, workoutDurationOptions } from "@/assets/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";
import { decode } from '@toon-format/toon';
import { IQuestion, Questions } from "@/components/ui/questions"


const sampleQuestions: IQuestion[] = [
  {
    id: "program-length",
    question: "Program length?",
    options: programLengthOptions.map(opt => ({
      id: opt.value,
      label: opt.label === "8 Weeks" ? "8 Weeks (Recommended)" : opt.label
    })),
    allowOther: true,
  },
  {
    id: "days-per-week",
    question: "Days per week?",
    options: dayPerWeekOptions.map(opt => ({
      id: opt.value,
      label: opt.label
    })),
    allowOther: true,
  },
  {
    id: "exclude-equipment",
    question: "Exclude equipment?",
    type: "multi-select",
    options: [
        { id: "barbell", label: "Barbell" },
        { id: "dumbbell", label: "Dumbbell" },
        { id: "kettlebell", label: "Kettlebell" },
        { id: "machine", label: "Machine" },
        { id: "bodyweight", label: "Bodyweight" },
        { id: "smith machine", label: "Smith Machine" },
        { id: "cable", label: "Cable" },
        { id: "cardio", label: "Cardio" },
        { id: "band", label: "Band" },
        { id: "suspension", label: "Suspension" },
        { id: "resistance_band", label: "Resistance band" },
        { id: "plate", label: "Plate" },
        { id: "other", label: "Other" },
        { id: "none", label: "None" },
    ],
    allowOther: true,
  },
  {
    id: "health-issues",
    question: "Health issues to consider?",
    type: "multi-select",
    options: healthIssuesOptions.map(opt => ({
      id: opt.value,
      label: opt.label
    })),
    allowOther: true,
  },
  {
    id: "split-type",
    question: "Preferred split?",
    options: [
      { id: "default", label: "Based on your goals (Recommended)" },
      { id: "ppl", label: "PPL (Push, Pull, Legs)" },
      { id: "pplul", label: "PPLUL (Push, Pull, Legs, Upper, Lower)" },
      { id: "ul", label: "UL (Upper, Lower)" },
      { id: "fb", label: "FB (Full Body)" },
      { id: "other", label: "Other" },
    ],
    allowOther: true,
  },
  {
    id: "exercise-variability",
    question: "Exercise variability?",
    options: [
      { id: "little", label: "Don't vary the exercises (Recommended for strength and hypertrophy programs)" },
      { id: "lots", label: "Vary the exercises (Recommended if you get bored easily)" },
    ],
    allowOther: true,
  },
  {
    id: "progression-system",
    question: "Add progressive overload system?",
    options: [
      { id: "default", label: "Based on your goals (Recommended)" },
      { id: "linear", label: "Linear" },
      { id: "double", label: "Double " },
      { id: "rpe-based", label: "RPE-based" },
      { id: "wave-loading", label: "Wave-loading" },
      { id: "density", label: "Density" },
      { id: "other", label: "Other" },
    ],
    allowOther: true,
  },
  {
    id: "deload-week",
    question: "Would you like me to add a deload week at the end of your program?",
    options: [
      { id: "yes", label: "Yes ( Add an easier week at the end of the program)" },
      { id: "no", label: "No ( No deload week at the end of the program)" },
    ],
    allowOther: false,
  },
]
interface IRePromptProps {
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

function AgentChat({
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
}: IRePromptProps) {

    const searchParams = useSearchParams();

    const [input, setInput] = useState("");
    const { messages, sendMessage, status, stop } = useChat({
      transport: new DefaultChatTransport({
        api: '/api/chat',
        fetch: async (url, options) => {
          const body = options?.body ? JSON.parse(options.body as string) : {};
          body.hevyProgram = hevyProgram;
          // Pass daysPerWeek and other relevant params to the API
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
    const isLoading = status === 'submitted' || status === 'streaming';
    const search = searchParams.get('search') ?? '';

    const [isFilters, setIsFilters] = useState(false)
    const lastSentSearch = useRef<string | null>(
        typeof window !== 'undefined' ? sessionStorage.getItem('lastSentSearch') : null
    );
    const processedMessageIds = useRef<Set<string>>(new Set());

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


    // Parse program from AI responses - expect TOON format
    useEffect(() => {
        if (!setHevyProgram) return;

        // Don't parse during streaming to avoid incomplete TOON content errors
        if (isLoading) return;

        // Helper function to process THevyRoutine[] from LLM and add client-side fields
        const processHevyRoutines = (routines: Partial<THevyRoutine>[]): THevyRoutine[] => {
            const now = new Date().toISOString();
            return routines.map((routine, index) => {
                // Generate unique ID if not provided
                const id = routine.id || `routine-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;

                return {
                    id,
                    title: routine.title || `Day ${index + 1}`,
                    folder_id: typeof routine.folder_id === 'number' ? routine.folder_id : 0,
                    order: routine.order || String((index % (daysPerWeek ? Number(daysPerWeek) : 7)) + 1),
                    notes: routine.notes || '',
                    exercises: routine.exercises || [],
                    created_at: routine.created_at || now,
                    updated_at: routine.updated_at || now,
                };
            });
        };

        // Look through all assistant messages for TOON format blocks
        messages.forEach((message, messageIndex) => {
            if (message.role === 'assistant' && !processedMessageIds.current.has(message.id)) {
                // Skip parsing if this is the last message and we're still loading
                // This prevents parsing incomplete TOON content during streaming
                const isLastMessage = messageIndex === messages.length - 1;
                if (isLastMessage && isLoading) {
                    return;
                }

                message.parts.forEach((part) => {
                    if (part.type === 'text' && part.text) {
                        const text = part.text;

                        // Look for TOON code blocks (```toon ... ```)
                        // Use non-greedy match to find complete blocks
                        const toonCodeBlockMatch = text.match(/```toon\s*([\s\S]*?)\s*```/);
                        if (toonCodeBlockMatch) {
                            // Extract content directly from match result (index 1 is the captured group)
                            const toonContent = toonCodeBlockMatch[1]?.trim();

                            // Validate that we have content and the block appears complete
                            if (!toonContent || toonContent.length === 0) {
                                return;
                            }

                            // Check if the TOON block looks structurally complete
                            // A complete TOON block should have at least a header line with brackets
                            if (!toonContent.includes('[') || !toonContent.includes(']')) {
                                return;
                            }

                            // Additional validation: Check if TOON structure appears complete
                            // Look for the routines header pattern: routines[N]{...}:
                            const routinesHeaderMatch = toonContent.match(/routines\[(\d+)\]/);
                            if (routinesHeaderMatch) {
                                const expectedRoutineCount = parseInt(routinesHeaderMatch[1], 10);
                                // Count how many routine entries we can see (look for routine- prefix followed by comma or newline)
                                const routineEntryMatches = toonContent.match(/routine-\w+/g);
                                const actualRoutineCount = routineEntryMatches ? routineEntryMatches.length : 0;

                                // If we're still loading and don't have all expected routines, skip parsing
                                if (isLastMessage && isLoading && actualRoutineCount < expectedRoutineCount) {
                                    return;
                                }
                            }

                            try {
                                console.log('Parsing TOON content, length:', toonContent.length);
                                const decoded = decode(toonContent) as Partial<THevyRoutine>[];

                                // Improved validation: check if decoded is a valid array with routines
                                if (!Array.isArray(decoded)) {
                                    console.warn('Decoded TOON is not an array:', typeof decoded);
                                    return;
                                }

                                if (decoded.length === 0) {
                                    console.warn('Decoded TOON array is empty');
                                    return;
                                }

                                // Check if the first routine has required fields
                                const firstRoutine = decoded[0];
                                if (!firstRoutine || typeof firstRoutine !== 'object') {
                                    console.warn('First decoded routine is invalid:', firstRoutine);
                                    return;
                                }

                                // folder_id can be 0, so check if it's a number (including 0)
                                const hasValidFolderId = typeof firstRoutine.folder_id === 'number';

                                if (!hasValidFolderId) {
                                    console.warn('First routine missing valid folder_id:', firstRoutine);
                                    return;
                                }

                                // Mark message as processed
                                processedMessageIds.current.add(message.id);

                                // Process routines and set program
                                const processedRoutines = processHevyRoutines(decoded);
                                console.log('Successfully parsed TOON, setting hevyProgram with', processedRoutines.length, 'routines');
                                setHevyProgram(processedRoutines);
                            } catch (e) {
                                // Only log errors if not streaming (to avoid spam during streaming)
                                if (!isLoading) {
                                    console.error('Failed to parse TOON format:', e);
                                    if (e instanceof Error) {
                                        console.error('Error details:', e.message, e.stack);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
    }, [messages, setHevyProgram, daysPerWeek, isLoading]);


    const handleSubmit = () => {
        if (!input.trim()) return

        sendMessage({ text: input });
        setInput('');
    }



    return (
        <div className="flex flex-col h-[85vh] max-sm:h-full">
            <div className="min-h-12  px-2 flex flex-row justify-between items-center gap-2 flex-shrink-0 border-b">
                <div className="flex flex-row gap-2 max-sm:hidden">
                    <Button variant="ghost" className={`w-24 text-white hover:bg-gray-800 hover:text-white ${!isFilters ? "bg-black dark:bg-white dark:text-black" : "bg-white dark:bg-black dark:text-white text-black"}`} onClick={() => setIsFilters(false)}>Chat</Button>
                    <Button variant="ghost" className={`w-24 text-white hover:bg-gray-800 hover:text-white ${isFilters ? "bg-black dark:bg-white dark:text-black" : "bg-white dark:bg-black dark:text-white text-black"}`} onClick={() => setIsFilters(true)}>Filters</Button>
                </div>
                <div className="max-sm:hidden">
                    <TooltipProvider delayDuration={0}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-black dark:text-white bg-white dark:bg-black hover:bg-gray-200 dark:hover:bg-gray-800 border border-gray-300 dark:border-gray-600"
                                    onClick={onTogglePosition}
                                >
                                    {sidebarPosition === "left" ? (
                                        <PanelRight className="h-5 w-5" />
                                    ) : (
                                        <PanelLeft className="h-5 w-5" />
                                    )}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900">
                                {sidebarPosition === "left" ? "Move sidebar to right" : "Move sidebar to left"}
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>
            </div>
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
                {!isFilters && isLoading && (
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
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            </div>
                        </div>
                    </Message>
                )}
            {isFilters &&
                <div className="mx-auto bg-white dark:bg-extraDarkGray rounded-xl p-4 max-w-3xl overflow-y-auto overflow-x-hidden h-full w-full ">

                <div className="flex flex-row justify-between py-4 items-start">

                    <Input
                        type="text"
                        id="title"
                        placeholder="Program Title"
                        className="w-full h-10"
                        value={ programTitle }
                        onChange={ (event) => handleProgramTitle(event.target.value) }
                    />

                    {/* <span className="flex flex-row max-sm:flex-col max-sm:items-end gap-2">
                        <Link
                            ref={ submitRef }
                            target="_self"
                            rel="noopener noreferrer"
                            className="max-sm:w-full w-full h-10"
                            href={ `/program-builder/build-program?${handleDefineQueryParams()}&edit=true` }
                        >
                            <Button className="w-32 bg-black hover:bg-black/80 max-sm:w-full h-10 font-bold text-white">
                               <SparklesIcon className="size-4" />
                               Build
                            </Button>
                        </Link>
                    </span> */}
                </div>
                <span className="font-bold py-2 flex justify-center">
                    Advanced Filters
                </span>
                <span className="flex flex-col justify-between gap-5 max-sm:gap-2">
                    <span className="grid grid-cols-2 max-sm:grid-cols-1 max-sm:basis-1/2 max-sm:gap-2 max-sm:pr-2 gap-5 sm:flex-grow-[2] basis-2/3 pr-4">
                        <Select value={ sex } onValueChange={ (value) => handleSex(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="Sex" />
                            </SelectTrigger>
                            <SelectContent>
                                { sexOptions.map((sx) => (
                                    <SelectItem key={ sx.value } value={ sx.value }>{ sx.label }</SelectItem>

                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ age } onValueChange={ (value) => handleAge(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="Age" />
                            </SelectTrigger>
                            <SelectContent>
                                { ageOptions.map((age) => (
                                    <SelectItem key={ age.value } value={ age.value }>{ age.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ programLength } onValueChange={ (value) => handleProgramLength(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="Program length" />
                            </SelectTrigger>
                            <SelectContent>
                                { programLengthOptions.map((length) => (
                                    <SelectItem key={ length.value } value={ length.value }>{ length.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ daysPerWeek } onValueChange={ (value) => handleDaysPerWeek(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="How many days per week?" />
                            </SelectTrigger>
                            <SelectContent>
                                { dayPerWeekOptions.map((days) => (
                                    <SelectItem key={ days.value } value={ days.value }>{ days.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <MultiSelect
                            value={ specificDays }
                            onChange={ (value) => handleSpecificDays(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ specificDaysOptions }
                            placeholder="Specific days"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                        <Select value={ workoutDuration } onValueChange={ (value) => handleWorkoutDuration(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="Workout duration" />
                            </SelectTrigger>
                            <SelectContent>
                                { workoutDurationOptions.map((duration) => (
                                    <SelectItem key={ duration.value } value={ duration.value }>{ duration.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ activityLevel } onValueChange={ (value) => handleActivityLevel(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="Activity level" />
                            </SelectTrigger>
                            <SelectContent>
                                { activityLevelOptions.map((act) => (
                                    <SelectItem key={ act.value } value={ act.value }>{ act.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <MultiSelect
                            value={ goals }
                            onChange={ (value) => handleGoals(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ goalsOptions }
                            placeholder="Goals"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                        <MultiSelect
                            value={ specialization }
                            onChange={ (value) => handleSpecialization(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ specializationOptions }
                            placeholder="Specialization"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                        <MultiSelect
                            value = { equipment }
                            onChange={ (value) => handleEquipment(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ equipmentOptions }
                            placeholder="Equipment"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                        <MultiSelect
                            value = { focusAreas }
                            onChange={ (value) => handleFocusAreas(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ focusAreasOptions }
                            placeholder="Focus areas"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                        <MultiSelect
                            value = { difficultyLevel }
                            onChange={ (value) => handleDifficultyLevel(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ difficultyOptions }
                            placeholder="Difficulty"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                    </span>
                    <span className="font-bold py-2 flex justify-center">
                            Exclude
                    </span>
                    <span className="grid grid-cols-1 flex-grow basis-1/3 gap-4">
                        <MultiSelect
                            value = { excludeAreas }
                            onChange={ (value) => handleExcludeAreas(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ focusAreasOptions }
                            placeholder="Exclude focus areas"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                        <MultiSelect
                            value = { excludeEquipment }
                            onChange={ (value) => handleExcludeEquipment(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ equipmentOptions }
                            placeholder="Exclude equipment"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                        <MultiSelect
                            value = { excludeSpecializations }
                            onChange={ (value) => handleExcludeSpecializations(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ specializationOptions }
                            placeholder="Exclude specializations"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                        <MultiSelect
                            value = { healthIssues }
                            onChange={ (value) => handleHealthIssues(value) }
                            badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                            className="bg-white dark:bg-darkGray"
                            defaultOptions={ healthIssuesOptions }
                            placeholder="Health issues"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                    </span>
                </span>
                <span className="flex flex-row justify-between items-center py-4">
                    <span className="flex flex-col gap-2 grow basis-0 w-0">
                        <span className="w-full flex flex-row items-end justify-start gap-2">
                        <Checkbox checked={ explore } onCheckedChange={ handleExplore } className="w-4 h-4 data-[state=checked]:bg-[#33bbcf] bg-offWhite data-[state=checked]:text-white" id="explore" />
                        <Label className="text-xs text-gray-600">Share program with community</Label>
                        </span>
                    </span>
                </span>

               </div>
            }
            <div className="absolute bottom-4 right-5 z-50">
                <ScrollButton className="shadow-sm" />
            </div>
            <ChatContainerScrollAnchor />
            </ChatContainerContent>
        </ChatContainerRoot>
        <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl flex-shrink-0 px-3 pb-3 md:px-5 md:pb-5 max-sm:fixed max-sm:bottom-[70px] max-sm:left-0 max-sm:right-0 max-sm:px-4 max-sm:bg-background border-t pt-4">
            <PromptInput
                isLoading={isLoading}
                value={input}
                onValueChange={value => setInput(value)}
                onSubmit={handleSubmit}
                className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
            >
            <div className="flex flex-col">
                <PromptInputTextarea
                    placeholder="Ask Andy anything..."
                    className="dark:text-white min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                    />

                <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                    <PromptInputAction tooltip="More actions">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                    >
                        <MoreHorizontal size={18} />
                    </Button>
                    </PromptInputAction>
                </div>
                <div className="flex items-center gap-2">
                    <PromptInputAction tooltip="Voice input">
                    <Button
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                    >
                        <Mic size={18} />
                    </Button>
                    </PromptInputAction>

                    {!isLoading ? (
                        <Button
                        size="icon"
                        disabled={!input.trim()}
                        onClick={handleSubmit}
                        className="size-9 rounded-full bg-lightSecondary"
                        >
                            <ArrowUp className="text-white" size={18} />
                        </Button>
                    ) : (
                        <Button
                        size="icon"
                        onClick={stop}
                        className="size-9 rounded-full bg-lightSecondary"
                        >
                            <Square className="text-white" size={18} />
                        </Button>
                    )}
                </div>
                </PromptInputActions>
            </div>
            </PromptInput>
        </div>
        </div>
    )
}

export { AgentChat }
