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
import { ChatContainerRoot, ChatContainerContent } from "@/components/ui/chat-container"
import { cn } from "@/lib/utils"
import {
  ArrowUp,
  Copy,
  Mic,
  MoreHorizontal,
  Pencil,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { useState, useEffect, useReducer } from "react"
import { ScrollButton } from "@/components/ui/scroll-button"
import { useSearchParams } from "next/navigation"
import MultiSelect, { IOption } from "@/components/ui/multi-select"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { activityLevelOptions, ageOptions, dayPerWeekOptions, difficultyOptions, equipmentOptions, focusAreasOptions, goalsOptions, healthIssuesOptions, programLengthOptions, sexOptions, specializationOptions, specificDaysOptions, workoutDurationOptions } from "@/assets/constants"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { useIsHevy } from "@/contexts/HevyContext"

function RePrompt() {

    // const submitRef = useRef<HTMLAnchorElement>(null);
    const searchParams = useSearchParams();
    const {isHevy} = useIsHevy();

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

    const [prompt, setPrompt] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [chatMessages, setChatMessages] = useState<Array<{id: number; role: string; content: string}>>([])
    const [isFilters, setIsFilters] = useState(false)

    // Initialize with search parameter if present
    useEffect(() => {
        if (search) {
            setChatMessages([{
                id: 1,
                role: "user",
                content: search,
            }]);
        }
    }, [search]);

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
        if (!prompt.trim()) return

        setPrompt("")
        setIsLoading(true)

        // Add user message immediately
        const newUserMessage = {
        id: chatMessages.length + 1,
        role: "user",
        content: prompt.trim(),
        }

        setChatMessages([...chatMessages, newUserMessage])

        // Simulate API response
        setTimeout(() => {
        const assistantResponse = {
            id: chatMessages.length + 2,
            role: "assistant",
            content: `This is a response to: "${prompt.trim()}"`,
        }

        setChatMessages((prev) => [...prev, assistantResponse])
        setIsLoading(false)
        }, 1500)
    }

    return (
        <div className="flex flex-col h-[85vh]">
            <div className="min-h-12 border-b px-2 flex flex-row justify-start items-center gap-2 flex-shrink-0">
                <Button variant="ghost" className={`w-24 text-black hover:bg-lightGray ${!isFilters ? "bg-lightGray" : "bg-white"}`} onClick={() => setIsFilters(false)}>Chat</Button>
                <Button variant="ghost" className={`w-24 text-black hover:bg-lightGray ${isFilters ? "bg-lightGray" : "bg-white"}`} onClick={() => setIsFilters(true)}>Filters</Button>
            </div>
        <ChatContainerRoot className={`flex-1 relative ${isFilters ? "overflow-hidden" : "overflow-y-auto"}`}>
            <ChatContainerContent className="h-full">
            {!isFilters && chatMessages.map((message, index) => {
                const isAssistant = message.role === "assistant"
                const isLastMessage = index === chatMessages.length - 1

                return (
                <Message
                    key={message.id}
                    className={cn(
                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-0 md:px-6",
                    isAssistant ? "items-start" : "items-end"
                    )}
                >
                    {isAssistant ? (
                    <div className="group flex w-full flex-col gap-0">
                        <MessageContent
                        className="text-foreground prose w-full flex-1 rounded-lg bg-transparent p-0"
                        markdown
                        >
                        {message.content}
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
                        <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                        {message.content}
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
                )
            })}
            {isFilters &&
                <div className="mx-auto bg-white rounded-xl p-4 max-w-3xl overflow-y-auto overflow-x-hidden h-full w-full ">

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
                            <SelectTrigger className="h-10 bg-white">
                                <SelectValue placeholder="Sex" />
                            </SelectTrigger>
                            <SelectContent>
                                { sexOptions.map((sx) => (
                                    <SelectItem key={ sx.value } value={ sx.value }>{ sx.label }</SelectItem>

                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ age } onValueChange={ (value) => setAge(value) }>
                            <SelectTrigger className="h-10 bg-white">
                                <SelectValue placeholder="Age" />
                            </SelectTrigger>
                            <SelectContent>
                                { ageOptions.map((age) => (
                                    <SelectItem key={ age.value } value={ age.value }>{ age.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ programLength } onValueChange={ (value) => setProgramLength(value) }>
                            <SelectTrigger className="h-10 bg-white">
                                <SelectValue placeholder="Program length" />
                            </SelectTrigger>
                            <SelectContent>
                                { programLengthOptions.map((length) => (
                                    <SelectItem key={ length.value } value={ length.value }>{ length.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ daysPerWeek } onValueChange={ (value) => setDaysPerWeek(value) }>
                            <SelectTrigger className="h-10 bg-white">
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
                            className="bg-white"
                            defaultOptions={ specificDaysOptions }
                            placeholder="Specific days"
                            emptyIndicator={ (
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                        ) }
                        />
                        <Select value={ workoutDuration } onValueChange={ (value) => setWorkoutDuration(value) }>
                            <SelectTrigger className="h-10 bg-white">
                                <SelectValue placeholder="Workout duration" />
                            </SelectTrigger>
                            <SelectContent>
                                { workoutDurationOptions.map((duration) => (
                                    <SelectItem key={ duration.value } value={ duration.value }>{ duration.label }</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={ activityLevel } onValueChange={ (value) => setActivityLevel(value) }>
                            <SelectTrigger className="h-10 bg-white">
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
                            className="bg-white"
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
                            className="bg-white"
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
                            className="bg-white"
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
                            className="bg-white"
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
                            className="bg-white"
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
                            className="bg-white"
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
                            className="bg-white"
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
                            className="bg-white"
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
                            className="bg-white"
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
                        <Checkbox checked={ explore } onCheckedChange={ toggleExplore } className="w-4 h-4 data-[state=checked]:bg-[#33bbcf] data-[state=checked]:text-white" id="explore" />
                        <Label className="text-xs text-gray-600">Share program with community</Label>
                        </span>
                    </span>
                    <Select onValueChange={(value) => setWorkoutSchema(value)} value={workoutSchema}>
                        <SelectTrigger className="h-10 w-[180px] bg-white">
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
        <div className="inset-x-0 bottom-0 mx-auto w-full max-w-3xl flex-shrink-0 px-3 pb-3 md:px-5 md:pb-5">
            <PromptInput
            isLoading={isLoading}
            value={prompt}
            onValueChange={setPrompt}
            onSubmit={handleSubmit}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
            >
            <div className="flex flex-col">
                <PromptInputTextarea
                placeholder="Ask anything"
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
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

                    <Button
                    size="icon"
                    disabled={!prompt.trim() || isLoading}
                    onClick={handleSubmit}
                    className="size-9 rounded-full bg-lightSecondary"
                    >
                    {!isLoading ? (
                        <ArrowUp className="text-white" size={18} />
                    ) : (
                        <span className="size-3 rounded-xs bg-white" />
                    )}
                    </Button>
                </div>
                </PromptInputActions>
            </div>
            </PromptInput>
        </div>
        </div>
    )
}

export { RePrompt }
