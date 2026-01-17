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
import { useState, useEffect, useReducer, useRef } from "react"
import { ScrollButton } from "@/components/ui/scroll-button"
import { useSearchParams } from "next/navigation"
import MultiSelect, { IOption } from "@/components/ui/multi-select"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { activityLevelOptions, ageOptions, dayPerWeekOptions, difficultyOptions, equipmentOptions, focusAreasOptions, goalsOptions, healthIssuesOptions, programLengthOptions, sexOptions, specializationOptions, specificDaysOptions, workoutDurationOptions } from "@/assets/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useIsHevy } from "@/contexts/HevyContext"
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ProgramAccordion } from "./ProgramAccordion";
import { Loader2 } from "lucide-react";

interface IRePromptProps {
    sidebarPosition: "left" | "right";
    onTogglePosition: () => void;
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    hevyProgram: THevyRoutine[];
}

function AgentChat({ sidebarPosition, onTogglePosition, setHevyProgram, hevyProgram }: IRePromptProps) {

    // const submitRef = useRef<HTMLAnchorElement>(null);
    const searchParams = useSearchParams();
    const {isHevy} = useIsHevy();

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
    const [sex, setSex] = useState<string>(searchParams.get('sex') ?? "");
    const [age, setAge] = useState<string>(searchParams.get('age') ?? "");
    const [daysPerWeek, setDaysPerWeek] = useState<string>(searchParams.get('daysPerWeek') ?? "");
    const [specificDays, setSpecificDays] = useState<IOption[]>(searchParams.get('specificDays') ? searchParams.get('specificDays')!.split(', ').map(day => ({ value: day, label: day })) : []);
    const [programLength, setProgramLength] = useState<string>(searchParams.get('programLength') ?? "");
    const [workoutDuration, setWorkoutDuration] = useState<string>(searchParams.get('workoutDuration') ?? "");
    const [activityLevel, setActivityLevel] = useState<string>(searchParams.get('activityLevel') ?? "");
    const [goals, setGoals] = useState<IOption[]>(searchParams.get('goals') ? JSON.parse(searchParams.get('goals')!) : []);
    const [specialization, setSpecialization] = useState<IOption[]>(searchParams.get('specialization') ? searchParams.get('specialization')!.split(', ').map(spec => ({ value: spec, label: spec })) : []);
    const [equipment, setEquipment] = useState<IOption[]>(searchParams.get('equipment') ? searchParams.get('equipment')!.split(', ').map(eq => ({ value: eq, label: eq })) : []);
    const [focusAreas, setFocusAreas] = useState<IOption[]>(searchParams.get('focusAreas') ? searchParams.get('focusAreas')!.split(', ').map(area => ({ value: area, label: area })) : []);
    const [difficultyLevel, setDifficultyLevel] = useState<IOption[]>(searchParams.get('difficultyLevel') ? searchParams.get('difficultyLevel')!.split(', ').map(level => ({ value: level, label: level })) : []);
    const [excludeAreas, setExcludeAreas] = useState<IOption[]>(searchParams.get('excludeAreas') ? searchParams.get('excludeAreas')!.split(', ').map(area => ({ value: area, label: area })) : []);
    const [excludeEquipment, setExcludeEquipment] = useState<IOption[]>(searchParams.get('excludeEquipment') ? searchParams.get('excludeEquipment')!.split(', ').map(eq => ({ value: eq, label: eq })) : []);
    const [excludeSpecializations, setExcludeSpecializations] = useState<IOption[]>(searchParams.get('excludeSpecializations') ? searchParams.get('excludeSpecializations')!.split(', ').map(spec => ({ value: spec, label: spec })) : []);
    const [healthIssues, setHealthIssues] = useState<IOption[]>(searchParams.get('healthIssues') ? searchParams.get('healthIssues')!.split(', ').map(issue => ({ value: issue, label: issue })) : []);
    const [programTitle, setProgramTitle] = useState<string>(searchParams.get('programTitle') ?? "");
    const [workoutSchema, setWorkoutSchema] = useState<string>(isHevy ? "hevy" : "proxima");
    const [explore, toggleExplore] = useReducer(prev => !prev, searchParams.get('explore') === 'true');

    const [isFilters, setIsFilters] = useState(false)
    const lastSentSearch = useRef<string | null>(
        typeof window !== 'undefined' ? sessionStorage.getItem('lastSentSearch') : null
    );
    const processedMessageIds = useRef<Set<string>>(new Set());

    // Thinking state for gaps in token streaming
    const [isThinking, setIsThinking] = useState(false);
    const lastMessageTextRef = useRef<string>("");
    const thinkingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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


    // Parse program from AI responses and convert to THevyRoutine[]
    useEffect(() => {
        if (!setHevyProgram) return;

        // Helper function to convert TTextToJsonResponse to THevyRoutine[]
        const convertTextToJsonToHevyRoutine = async (textToJsonResponse: TTextToJsonResponse) => {
            try {
                const daysPerWeekValue = daysPerWeek ? Number(daysPerWeek) : (searchParams.get('daysPerWeek') ? Number(searchParams.get('daysPerWeek')) : undefined);
                const programLengthValue = programLength ? Number(programLength) : (searchParams.get('programLength') ? Number(searchParams.get('programLength')) : undefined);
                const excludeAreasValue = excludeAreas.length > 0 ? excludeAreas.map(area => area.value).join(', ') : (searchParams.get('excludeAreas') || '');
                const excludeEquipmentValue = excludeEquipment.length > 0 ? excludeEquipment.map(eq => eq.value).join(', ') : (searchParams.get('excludeEquipment') || '');
                const healthIssuesValue = healthIssues.length > 0 ? healthIssues.map(issue => issue.value).join(', ') : (searchParams.get('healthIssues') || '');

                // Import buildHevyProgram dynamically to avoid circular dependencies
                const { buildHevyProgram } = await import('@/components/program-builder/utils/build-hevy-program');

                // Extract daysPerWeek from the program response if not provided
                // The AI should have included the correct number of workout_days
                const inferredDaysPerWeek = daysPerWeekValue || textToJsonResponse?.workout_days?.length || undefined;
                const inferredProgramLength = programLengthValue || undefined;

                // Only build if we have daysPerWeek (either provided or inferred from workout_days)
                if (inferredDaysPerWeek) {
                    const hevyRoutines = await buildHevyProgram(
                        textToJsonResponse,
                        inferredProgramLength ?? 0, // buildHevyProgram will handle 0 with its own logic
                        inferredDaysPerWeek,
                        excludeAreasValue,
                        excludeEquipmentValue,
                        healthIssuesValue
                    );

                    if (hevyRoutines && Array.isArray(hevyRoutines)) {
                        setHevyProgram(hevyRoutines);
                    }
                }
            } catch (error) {
                console.error('Error converting program to HevyRoutine:', error);
            }
        };

        // Look through all assistant messages for program JSON
        messages.forEach((message) => {
            if (message.role === 'assistant' && !processedMessageIds.current.has(message.id)) {
                message.parts.forEach((part) => {
                    if (part.type === 'text' && part.text) {
                        // Try to extract JSON from the text
                        const text = part.text;

                        // Look for JSON object with "program" key (TTextToJsonResponse format)
                        const jsonMatch = text.match(/\{[\s\S]*"program"[\s\S]*\}/);
                        if (jsonMatch) {
                            try {
                                const parsed = JSON.parse(jsonMatch[0]);
                                if (parsed.program && parsed.program.workout_days) {
                                    // Mark message as processed
                                    processedMessageIds.current.add(message.id);
                                    // Convert TTextToJsonResponse to THevyRoutine[]
                                    convertTextToJsonToHevyRoutine(parsed.program as TTextToJsonResponse);
                                }
                            } catch {
                                // Try to find JSON code blocks
                                const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*"program"[\s\S]*\})\s*```/);
                                if (codeBlockMatch) {
                                    try {
                                        const parsed = JSON.parse(codeBlockMatch[1]);
                                        if (parsed.program && parsed.program.workout_days) {
                                            // Mark message as processed
                                            processedMessageIds.current.add(message.id);
                                            // Convert TTextToJsonResponse to THevyRoutine[]
                                            convertTextToJsonToHevyRoutine(parsed.program as TTextToJsonResponse);
                                        }
                                    } catch (e2) {
                                        console.error('Failed to parse program JSON:', e2);
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
    }, [messages, setHevyProgram, searchParams, daysPerWeek, programLength, excludeAreas, excludeEquipment, healthIssues]);

    // Monitor message changes to detect gaps in token streaming
    useEffect(() => {
        // Clear any existing timeout
        if (thinkingTimeoutRef.current) {
            clearTimeout(thinkingTimeoutRef.current);
            thinkingTimeoutRef.current = null;
        }

        // If not loading, reset thinking state
        if (!isLoading) {
            setIsThinking(false);
            lastMessageTextRef.current = "";
            return;
        }

        // Find the last assistant message
        const lastAssistantMessage = [...messages].reverse().find(
            (msg) => msg.role === 'assistant'
        );

        if (!lastAssistantMessage) {
            lastMessageTextRef.current = "";
            return;
        }

        // Get the text content from the last assistant message
        const textParts = lastAssistantMessage.parts
            .filter((part): part is { type: 'text'; text: string } => part.type === 'text' && typeof part.text === 'string')
            .map((part) => part.text);
        const currentText = textParts.join('');

        // Compare with previous text
        if (currentText !== lastMessageTextRef.current) {
            // New tokens arrived - hide thinking and update ref
            setIsThinking(false);
            lastMessageTextRef.current = currentText;
        } else {
            // No change in text - set timeout to show thinking after delay
            // Only show thinking if we have some text already (not at the very start)
            if (currentText.length > 0) {
                thinkingTimeoutRef.current = setTimeout(() => {
                    setIsThinking(true);
                }, 10);
            }
        }

        // Cleanup function
        return () => {
            if (thinkingTimeoutRef.current) {
                clearTimeout(thinkingTimeoutRef.current);
                thinkingTimeoutRef.current = null;
            }
        };
    }, [messages, isLoading]);

    // TODO: add this back in with a reeprompt request to the AI

    // const handleDefineQueryParams = () => {
    //     const params = new URLSearchParams();
    //     if (search) params.append("search", search);
    //     if (sex) params.append("sex", sex);
    //     if (age) params.append("age", age);
    //     if (daysPerWeek) params.append("daysPerWeek", daysPerWeek);
    //     if (specificDays.length > 0) params.append("specificDays", (specificDays.map(option => option.value).join(', ')));
    //     if (programLength) params.append("programLength", programLength);
    //     if (workoutDuration) params.append("workoutDuration", workoutDuration);
    //     if (activityLevel) params.append("activityLevel", activityLevel);
    //     if (goals.length > 0) params.append("goals", JSON.stringify(goals));
    //     if (specialization.length > 0) params.append("specialization", (specialization.map(option => option.value).join(', ')));
    //     if (equipment.length > 0) params.append("equipment", (equipment.map(option => option.value).join(', ')));
    //     if (focusAreas.length > 0) params.append("focusAreas", (focusAreas.map(option => option.value).join(', ')));
    //     if (difficultyLevel.length > 0) params.append("difficultyLevel", (difficultyLevel.map(option => option.value).join(', ')));
    //     if (excludeAreas.length > 0) params.append("excludeAreas", (excludeAreas.map(option => option.value).join(', ')));
    //     if (excludeEquipment.length > 0) params.append("excludeEquipment", (excludeEquipment.map(option => option.value).join(', ')));
    //     if (excludeSpecializations.length > 0) params.append("excludeSpecializations", (excludeSpecializations.map(option => option.value).join(', ')));
    //     if (healthIssues.length > 0) params.append("healthIssues", (healthIssues.map(option => option.value).join(', ')));
    //     if (programTitle) params.append("programTitle", programTitle);
    //     if (explore) params.append("explore", "true");

    //     return params.toString();
    // };

    const handleSubmit = () => {
        if (!input.trim()) return

        sendMessage({ text: input });
        setInput('');
    }

    // Helper function to detect if text contains program JSON
    const containsProgramJson = (text: string): boolean => {
        return /"program"\s*:\s*\{[\s\S]*"workout_days"/.test(text) ||
               /"workout_days"\s*:\s*\[/.test(text);
    };

    // Helper function to extract non-JSON text (conversational parts)
    const extractConversationalText = (text: string): string => {
        // Try to find text before JSON code blocks
        const beforeJson = text.split(/```(?:json)?/)[0].trim();
        if (beforeJson && beforeJson.length > 0 && !containsProgramJson(beforeJson)) {
            return beforeJson;
        }
        // Try to find text before JSON object
        const jsonMatch = text.match(/(.*?)(?:\{[\s\S]*"program"|"workout_days")/);
        if (jsonMatch && jsonMatch[1] && jsonMatch[1].trim().length > 0) {
            return jsonMatch[1].trim();
        }
        return '';
    };

    // Helper function to get program generation status message
    const getProgramGenerationStatus = (text: string): { message: string; isComplete: boolean; stepId?: string; completedStepMessage?: string } => {
        if (!containsProgramJson(text)) {
            return { message: '', isComplete: false };
        }

        // Check if JSON is complete
        try {
            const jsonMatch = text.match(/\{[\s\S]*"program"[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]) as { program?: { workout_days?: Array<{ exercises?: unknown[] }> } };
                if (parsed.program && parsed.program.workout_days && Array.isArray(parsed.program.workout_days)) {
                    // Check if all workout days are complete
                    const allDaysComplete = parsed.program.workout_days.every((day) =>
                        day.exercises && Array.isArray(day.exercises) && day.exercises.length > 0
                    );
                    if (allDaysComplete && parsed.program.workout_days.length > 0) {
                        return { message: 'Workout program generated', isComplete: true, stepId: 'final' };
                    }
                }
            }
        } catch {
            // JSON not complete yet, continue checking progress
        }

        // Analyze streaming progress
        const hasProgramKey = /"program"\s*:/.test(text);
        const hasWorkoutDays = /"workout_days"\s*:/.test(text);
        const hasWorkoutDaysArray = /"workout_days"\s*:\s*\[/.test(text);

        // Count workout days by finding day_title occurrences
        const workoutDaysMatches = text.match(/"day_title"/g);
        const workoutDaysCount = workoutDaysMatches ? workoutDaysMatches.length : 0;

        // Try to count exercises per day by analyzing structure
        const daySections = text.split(/"day_title"/);
        const exercisesPerDay: number[] = [];
        daySections.slice(1).forEach((section) => {
            const exercisesInSection = (section.match(/"title"\s*:\s*"[^"]*"/g) || []).length;
            exercisesPerDay.push(exercisesInSection);
        });

        // Determine progress stage
        if (!hasProgramKey && !hasWorkoutDays) {
            return { message: 'Analyzing your fitness goals and preferences...', isComplete: false, stepId: 'analyzing' };
        }

        if (hasProgramKey && !hasWorkoutDays) {
            return { message: 'Creating program structure...', isComplete: false, stepId: 'structure' };
        }

        if (hasWorkoutDaysArray && workoutDaysCount === 0) {
            return { message: 'Building workout days...', isComplete: false, stepId: 'building-days' };
        }

        const daysPerWeekValue = daysPerWeek ? Number(daysPerWeek) : (searchParams.get('daysPerWeek') ? Number(searchParams.get('daysPerWeek')) : undefined);

        // If daysPerWeek is not provided, we can't calculate week/day status accurately
        if (daysPerWeekValue === undefined) {
            return { message: 'Generating workout program...', isComplete: false, stepId: 'generating' };
        }

        if (workoutDaysCount === 1) {
            const exercisesInDay1 = exercisesPerDay[0] || 0;
            const currentDay = 1;
            const actualWeek = Math.ceil(currentDay / daysPerWeekValue);
            const dayInWeek = ((currentDay - 1) % daysPerWeekValue) + 1;
            if (exercisesInDay1 === 0) {
                return { message: `Building Week ${actualWeek}, Day ${dayInWeek}...`, isComplete: false, stepId: `week-${actualWeek}-day-${dayInWeek}` };
            } else if (exercisesInDay1 < 4) {
                return { message: `Adding exercises to Week ${actualWeek}, Day ${dayInWeek}... (${exercisesInDay1} exercises)`, isComplete: false, stepId: `week-${actualWeek}-day-${dayInWeek}` };
            } else {
                const nextDay = 2;
                const nextWeek = Math.ceil(nextDay / daysPerWeekValue);
                const nextDayInWeek = ((nextDay - 1) % daysPerWeekValue) + 1;
                return { message: `Building Week ${nextWeek}, Day ${nextDayInWeek}...`, isComplete: false, stepId: `week-${nextWeek}-day-${nextDayInWeek}`, completedStepMessage: `Week ${actualWeek}, Day ${dayInWeek} complete` };
            }
        }

        if (workoutDaysCount === 2) {
            const exercisesInDay2 = exercisesPerDay[1] || 0;
            const currentDay = 2;
            const actualWeek = Math.ceil(currentDay / daysPerWeekValue);
            const dayInWeek = ((currentDay - 1) % daysPerWeekValue) + 1;
            if (exercisesInDay2 === 0) {
                return { message: `Building Week ${actualWeek}, Day ${dayInWeek}...`, isComplete: false, stepId: `week-${actualWeek}-day-${dayInWeek}` };
            } else if (exercisesInDay2 < 4) {
                return { message: `Adding exercises to Week ${actualWeek}, Day ${dayInWeek}... (${exercisesInDay2} exercises)`, isComplete: false, stepId: `week-${actualWeek}-day-${dayInWeek}` };
            } else {
                const nextDay = 3;
                const nextWeek = Math.ceil(nextDay / daysPerWeekValue);
                const nextDayInWeek = ((nextDay - 1) % daysPerWeekValue) + 1;
                return { message: `Building Week ${nextWeek}, Day ${nextDayInWeek}...`, isComplete: false, stepId: `week-${nextWeek}-day-${nextDayInWeek}`, completedStepMessage: `Week ${actualWeek}, Day ${dayInWeek} complete` };
            }
        }

        if (workoutDaysCount >= 3) {
            const currentDay = workoutDaysCount;
            const exercisesInCurrentDay = exercisesPerDay[currentDay - 1] || 0;
            const actualWeek = Math.ceil(currentDay / daysPerWeekValue);
            const dayInWeek = ((currentDay - 1) % daysPerWeekValue) + 1;

            if (exercisesInCurrentDay === 0) {
                return { message: `Building Week ${actualWeek}, Day ${dayInWeek}...`, isComplete: false, stepId: `week-${actualWeek}-day-${dayInWeek}` };
            } else if (exercisesInCurrentDay < 4) {
                return { message: `Adding exercises to Week ${actualWeek}, Day ${dayInWeek}... (${exercisesInCurrentDay} exercises)`, isComplete: false, stepId: `week-${actualWeek}-day-${dayInWeek}` };
            } else {
                const nextDay = currentDay + 1;
                const nextWeek = Math.ceil(nextDay / daysPerWeekValue);
                const nextDayInWeek = ((nextDay - 1) % daysPerWeekValue) + 1;
                return { message: `Building Week ${nextWeek}, Day ${nextDayInWeek}...`, isComplete: false, stepId: `week-${nextWeek}-day-${nextDayInWeek}`, completedStepMessage: `Week ${actualWeek}, Day ${dayInWeek} complete` };
            }
        }

        return { message: 'Generating workout program...', isComplete: false, stepId: 'generating' };
    };


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
        <ChatContainerRoot className={`flex-1 relative ${isFilters ? "overflow-hidden" : "overflow-y-auto"}`}>
            <ChatContainerContent className="h-full">
                {!isFilters && messages.map(message => (
                            <div key={message.id} className="whitespace-pre-wrap">
                            {message.parts.map((part, index) => {
                                const isAssistant = message.role === "assistant"
                                const isLastMessage = index === message.parts.length - 1
                                switch (part.type) {
                                case 'text': {
                                    const text = part.text;
                                    const hasProgramJson = containsProgramJson(text);
                                    const conversationalText = extractConversationalText(text);
                                    const status = getProgramGenerationStatus(text);

                                    // If message contains program JSON, show compact view
                                    if (hasProgramJson && isAssistant) {
                                        return (
                                            <Message
                                                key={`${message.id}-${index}`}
                                                className={cn(
                                                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-4 md:px-6 pt-2",
                                                    "items-start"
                                                )}
                                            >
                                                <div className="group flex w-full flex-col gap-0">
                                                    {conversationalText && (
                                                        <MessageContent
                                                            className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0 mb-2"
                                                            markdown
                                                        >
                                                            {conversationalText}
                                                        </MessageContent>
                                                    )}
                                                    <ProgramAccordion
                                                        messages={messages}
                                                        isLoading={isLoading}
                                                        currentStatus={status}
                                                        daysPerWeek={daysPerWeek ? Number(daysPerWeek) : (searchParams.get('daysPerWeek') ? Number(searchParams.get('daysPerWeek')) : undefined)}
                                                        getProgramGenerationStatus={getProgramGenerationStatus}
                                                        containsProgramJson={containsProgramJson}
                                                    />
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
                                    // Handle tool result - extract program if present
                                    const toolOutput = part.output as { program?: THevyRoutine[] };
                                    if (toolOutput?.program && Array.isArray(toolOutput.program)) {
                                        setHevyProgram(toolOutput.program);
                                    }
                                    return null;
                                }
                                default: {
                                    // Check if part is a tool result with program data
                                    if (part.type === 'tool-result' && 'output' in part) {
                                        const output = (part as { output?: { program?: THevyRoutine[] } }).output;
                                        if (output?.program && Array.isArray(output.program)) {
                                            setHevyProgram(output.program);
                                        }
                                    }
                                    return null;
                                }
                                }
                            })}
                            </div>
                        ))}
                {!isFilters && isThinking && isLoading && (
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
                <ChatContainerScrollAnchor />
            {isFilters &&
                <div className="mx-auto bg-white dark:bg-extraDarkGray rounded-xl p-4 max-w-3xl overflow-y-auto overflow-x-hidden h-full w-full ">

                <div className="flex flex-row justify-between py-4 items-start">

                    <Input
                        type="text"
                        id="title"
                        placeholder="Program Title"
                        className="w-full h-10"
                        value={ programTitle }
                        onChange={ (event) => setProgramTitle(event.target.value) }
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
                        <Select value={ sex } onValueChange={ (value) => setSex(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="Sex" />
                            </SelectTrigger>
                            <SelectContent>
                                { sexOptions.map((sx) => (
                                    <SelectItem key={ sx.value } value={ sx.value }>{ sx.label }</SelectItem>

                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ age } onValueChange={ (value) => setAge(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="Age" />
                            </SelectTrigger>
                            <SelectContent>
                                { ageOptions.map((age) => (
                                    <SelectItem key={ age.value } value={ age.value }>{ age.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ programLength } onValueChange={ (value) => setProgramLength(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="Program length" />
                            </SelectTrigger>
                            <SelectContent>
                                { programLengthOptions.map((length) => (
                                    <SelectItem key={ length.value } value={ length.value }>{ length.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ daysPerWeek } onValueChange={ (value) => setDaysPerWeek(value) }>
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
                            onChange={ (value) => setSpecificDays(value) }
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
                        <Select value={ workoutDuration } onValueChange={ (value) => setWorkoutDuration(value) }>
                            <SelectTrigger className="h-10 bg-white dark:bg-darkGray">
                                <SelectValue placeholder="Workout duration" />
                            </SelectTrigger>
                            <SelectContent>
                                { workoutDurationOptions.map((duration) => (
                                    <SelectItem key={ duration.value } value={ duration.value }>{ duration.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ activityLevel } onValueChange={ (value) => setActivityLevel(value) }>
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
                            onChange={ (value) => setGoals(value) }
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
                            onChange={ (value) => setSpecialization(value) }
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
                            onChange={ (value) => setEquipment(value) }
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
                            onChange={ (value) => setFocusAreas(value) }
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
                            onChange={ (value) => setDifficultyLevel(value) }
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
                            onChange={ (value) => setExcludeAreas(value) }
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
                            onChange={ (value) => setExcludeEquipment(value) }
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
                            onChange={ (value) => setExcludeSpecializations(value) }
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
                            onChange={ (value) => setHealthIssues(value) }
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
                        <Checkbox checked={ explore } onCheckedChange={ toggleExplore } className="w-4 h-4 data-[state=checked]:bg-[#33bbcf] bg-offWhite data-[state=checked]:text-white" id="explore" />
                        <Label className="text-xs text-gray-600">Share program with community</Label>
                        </span>
                    </span>
                    <Select onValueChange={(value) => setWorkoutSchema(value)} value={workoutSchema}>
                        <SelectTrigger className="h-10 w-[180px] bg-white dark:bg-darkGray">
                        <SelectValue placeholder="Workout Schema" />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="hevy">Hevy Routines</SelectItem>
                        <SelectItem value="proxima">Proxima Program</SelectItem>
                        </SelectContent>
                    </Select>
                </span>

               </div>
            }
            <div className="absolute bottom-4 right-5 z-50">
                <ScrollButton className="shadow-sm" />
            </div>
            </ChatContainerContent>
        </ChatContainerRoot>
        <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl flex-shrink-0 px-3 pb-3 md:px-5 md:pb-5 border-t pt-4">
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
