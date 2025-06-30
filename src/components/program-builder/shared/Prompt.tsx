"use client";

import { ArrowUpIcon, BicepsFlexedIcon, BookOpenIcon, Calculator, ChevronDownIcon, ChevronUpIcon, FootprintsIcon, InfoIcon, MicIcon, Paperclip, PlayIcon, SearchIcon, SparklesIcon, SquarePowerIcon, X } from "lucide-react";
import { useEffect, useReducer, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import MultiSelect, { IOption } from "@/components/ui/multi-select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { activityLevelOptions, ageOptions, dayPerWeekOptions, difficultyOptions, equipmentOptions, focusAreasOptions, goalsOptions, healthIssuesOptions, programLengthOptions, sexOptions, specializationOptions, specificDaysOptions, workoutDurationOptions } from "@/assets/constants";
import { useIsHevy } from "@/contexts/HevyContext";
import { inferDaysPerWeek } from "../utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useUserContext } from "@/contexts/UserContext";
import { User } from "@supabase/supabase-js";
import { PromptInput, PromptInputTextarea } from "@/components/ui/prompt-input";
import { PromptInputActions } from "@/components/ui/prompt-input";
import { PromptSuggestion } from "@/components/ui/prompt-suggestion";
import { jack, people02, people03, people04, people05 } from "public";
import { AvatarStack } from "@/components/avatar-stack";
import {
    FileUpload,
    FileUploadContent,
    FileUploadTrigger,
  } from "@/components/ui/file-upload"

const suggestionGroups = [
    {
        label: "Empty Template",
        highlight: "Empty Template",
        items: [
            "Empty Template",
        ],
        icon: <BookOpenIcon />,
    },
    {
      label: "Bodybuilding",
      highlight: "Bodybuilding",
      items: [
        "Make a program like GZCL (GZCLP)",
        "Make a program like nSuns",
        "Make a program like PHUL (Power Hypertrophy Upper/Lower)",
        "Make a program like Reddit's r/Fitness Basic Beginner Routine",
      ],
      icon: <BicepsFlexedIcon />,
    },
    {
      label: "Powerlifting",
      highlight: "Powerlifting",
      items: [
        "Make a program like Candito 6‑Week Program",
        "Make a program like Calgary Barbell",
        "Make a program like Bryce Lewis Greatest Hits",
        "Make a program like Conjugate / Westside Barbell Method",
      ],
      icon: <SquarePowerIcon />,
    },
    {
        label: "Weight Loss",
        highlight: "Weight Loss",
        items: [
            "Make a program like Couch to 5K (C25K)",
            "Make a program like r/Fitness Basic Beginner Routine (FBR)",
            "Make a HIIT training program",

        ],
        icon: <Calculator />,
      },
    {
      label: "Athletic Training",
      highlight: "Athletic Training",
      items: [
        "Make a program like Westside for Athletes / Conjugate Training",
        "Make a program like JuggernautAI Sport Performance / Juggernaut Field Athlete",
        "Make a program like The Vertical Jump Bible",
        "Make a program like DeFranco's Westside for Skinny Bastards (WS4SB)",

      ],
      icon: <FootprintsIcon />,
    },

];

interface IProps {
    userData: User | null;
}

export const Prompt: React.FC<IProps> = ({ userData }) => {

    const { setUser } = useUserContext();

    useEffect(() => {
        if (userData) {
            setUser(userData);
        }
    }, [userData, setUser]);

    const { setIsHevy } = useIsHevy();
    const [search, setSearch] = useState<string>("");

    const [activeCategory, setActiveCategory] = useState("")

    const [files, setFiles] = useState<File[]>([])

    const handleFilesAdded = (newFiles: File[]) => {
      setFiles((prev) => [...prev, ...newFiles])
    }

    const removeFile = (index: number) => {
        setFiles((prev) => prev.filter((_, i) => i !== index))
    };

    const handleSend = () => {
        if (search.trim()) {
            setActiveCategory("")
        }

        const inferred = inferDaysPerWeek(search);
            if (inferred) {
                setDaysPerWeek(inferred);
            }
        setDialogOpen(true)
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault()
        handleSend()
      }
    };

    const handlePromptInputValueChange = (value: string) => {
      setSearch(value)
      // Clear active category when typing something different
      if (value.trim() === "") {
        setActiveCategory("")
      }
    };

    // Get suggestions based on active category
    const activeCategoryData = suggestionGroups.find(
      (group) => group.label === activeCategory
    );

    // Determine which suggestions to show
    const showCategorySuggestions = activeCategory !== "";

    const [sex, setSex] = useState<string>("");
    const [age, setAge] = useState<string>("");
    const [daysPerWeek, setDaysPerWeek] = useState<string>("");
    const [specificDays, setSpecificDays] = useState<IOption[]>([]);
    const [programLength, setProgramLength] = useState<string>("");
    const [workoutDuration, setWorkoutDuration] = useState<string>("");
    const [activityLevel, setActivityLevel] = useState<string>("");
    const [goals, setGoals] = useState<IOption[]>([]);
    const [specialization, setSpecialization] = useState<IOption[]>([]);
    const [equipment, setEquipment] = useState<IOption[]>([]);
    const [focusAreas, setFocusAreas] = useState<IOption[]>([]);
    const [difficultyLevel, setDifficultyLevel] = useState<IOption[]>([]);
    const [excludeAreas, setExcludeAreas] = useState<IOption[]>([]);
    const [excludeEquipment, setExcludeEquipment] = useState<IOption[]>(
        [
            { label: "Bodyweight", value: "bodyweight" },
            { label: "Band", value: "band" },
            { label: "Suspension", value: "suspension" },
            { label: "Resistance band", value: "resistance_band" },
            { label: "Plate", value: "plate" },
            { label: "Other", value: "other" },
            { label: "None", value: "none" },
        ]
    );
    const [excludeSpecializations, setExcludeSpecializations] = useState<IOption[]>([]);
    const [healthIssues, setHealthIssues] = useState<IOption[]>([]);

    const [workoutSchema, setWorkoutSchema] = useState("hevy");
    const [advancedSettingsOpen, toggleAdvancedSettingsOpen] = useReducer(prev => !prev, true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [explore, toggleExplore] = useReducer(prev => !prev, true);
    const [programTitle, setProgramTitle] = useState("My AI Program");

    useEffect(() => {
        setIsHevy(workoutSchema === "hevy" ? true : false);
    }, [workoutSchema, setIsHevy]);

    const handleDefineQueryParams = () => {
            const params = new URLSearchParams();
            if (search) params.append("search", search);
            if (sex) params.append("sex", sex);
            if (age) params.append("age", age);
            if (daysPerWeek) params.append("daysPerWeek", daysPerWeek);
            if (specificDays.length > 0) params.append("specificDays", (specificDays.map(option => option.value).join(', ')));
            if (programLength) params.append("programLength", programLength);
            if (workoutDuration) params.append("workoutDuration", workoutDuration);
            if (activityLevel) params.append("activityLevel", activityLevel);
            if (goals.length > 0) params.append("goals", JSON.stringify(goals));
            if (specialization.length > 0) params.append("specialization", (specialization.map(option => option.value).join(', ')));
            if (equipment.length > 0) params.append("equipment", (equipment.map(option => option.value).join(', ')));
            if (focusAreas.length > 0) params.append("focusAreas", (focusAreas.map(option => option.value).join(', ')));
            if (difficultyLevel.length > 0) params.append("difficultyLevel", (difficultyLevel.map(option => option.value).join(', ')));
            if (excludeAreas.length > 0) params.append("excludeAreas", (excludeAreas.map(option => option.value).join(', ')));
            if (excludeEquipment.length > 0) params.append("excludeEquipment", (excludeEquipment.map(option => option.value).join(', ')));
            if (excludeSpecializations.length > 0) params.append("excludeSpecializations", (excludeSpecializations.map(option => option.value).join(', ')));
            if (healthIssues.length > 0) params.append("healthIssues", (healthIssues.map(option => option.value).join(', ')));
            if (programTitle) params.append("programTitle", programTitle);
            if (explore) params.append("explore", "true");

            return params.toString();
    };

    const submitRef = useRef<HTMLAnchorElement>(null);

    return (
        <div className="flex flex-col gap-2 w-full items-center">
            <Dialog open={ dialogOpen } onOpenChange={ () => setDialogOpen(false) }>
                <span className="flex items-center justify-center">
                    <Button onClick={ () => setDialogOpen(true) } className="my-12 sm:hidden h-[60px] text-white rounded-xl w-[200px] bg-lightSecondary hover:bg-lightSecondary font-main uppercase flex items-center justify-center gap-4"><PlayIcon />Start</Button>
                </span>
                <div className="max-sm:hidden mx-auto flex w-full max-w-3xl flex-col items-center justify-center gap-4 px-3 pb-3 md:px-5 md:pb-5">
                <FileUpload
                    onFilesAdded={ handleFilesAdded }
                    accept=".jpg,.jpeg,.png,.pdf,.docx"
                >

                    <PromptInput
                        className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
                        value={search}
                        onValueChange={handlePromptInputValueChange}
                        onSubmit={handleSend}
                    >
                        { files.length > 0 && (
                            <div className="grid grid-cols-2 gap-2 pb-2 px-4">
                                {files.map((file, index) => (
                                <div
                                    key={index}
                                    className="bg-lightGray flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm"
                                >
                                    <div className="flex items-center gap-2">
                                    <Paperclip className="size-4" />
                                    <span className="max-w-[80px] truncate text-sm">
                                        {file.name}
                                    </span>
                                    </div>
                                    <button
                                    onClick={() => removeFile(index)}
                                    className="hover:bg-white rounded-full p-1"
                                    >
                                    <X className="size-4" />
                                    </button>
                                </div>
                                ))}
                            </div>
                        )}
                        <PromptInputTextarea
                            placeholder="Ask Proxima to build..."
                            className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                            onKeyDown={handleKeyDown}
                        />
                        <PromptInputActions className="mt-5 flex w-full items-end justify-between gap-2 px-3 pb-3">
                        <FileUploadTrigger asChild>
                            <div className="hover:bg-secondary-foreground/10 flex h-8 w-8 cursor-pointer items-center justify-start rounded-2xl">
                                <Paperclip className="size-5" />
                            </div>
                        </FileUploadTrigger>
                        <div className="flex flex-row gap-2">
                            <TooltipProvider delayDuration={ 0 }>
                                <Tooltip>
                                    <TooltipTrigger className="">
                                        <div className="">
                                            <SparklesIcon className="size-5" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                        <p>Enhance Prompt (coming soon...)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <TooltipProvider delayDuration={ 0 }>
                                <Tooltip>
                                    <TooltipTrigger className="">
                                        <div className="p-2">
                                            <MicIcon className="size-5" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                        <p>Dictate (coming soon...)</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Button
                                size="sm"
                                className="h-9 w-9 bg-lightSecondary text-white rounded-full"
                                onClick={handleSend}
                                disabled={!search.trim()}
                            >
                                <ArrowUpIcon className="h-4 w-4" />
                            </Button>
                        </div>
                        </PromptInputActions>
                    </PromptInput>

                    <FileUploadContent>
                        <div className="flex min-h-[200px] w-full items-center justify-center backdrop-blur-sm">
                        <div className="bg-background/90 m-4 w-full max-w-md rounded-lg border p-8 shadow-lg">
                            <div className="mb-4 flex justify-center">
                            <svg
                                className="text-muted size-8"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10"
                                />
                            </svg>
                            </div>
                            <h3 className="mb-2 text-center text-base font-medium">
                            Drop files to upload
                            </h3>
                            <p className="text-muted-foreground text-center text-sm">
                            Release to add files to your message
                            </p>
                        </div>
                        </div>
                    </FileUploadContent>
                </FileUpload>
                    <div className="flex w-full flex-col items-center justify-center space-y-2">
                        <div className="h-[70px] w-full">
                        {showCategorySuggestions ? (
                            <div className="flex w-full flex-col space-y-1">
                                {activeCategoryData?.items.map((suggestion) => (
                                    <PromptSuggestion
                                        key={suggestion}
                                        highlight={activeCategoryData.highlight}
                                        onClick={() => {
                                            setSearch(suggestion)
                                            // Optional: auto-send
                                            // handleSend()
                                        }}
                                    >
                                    {suggestion}
                                    </PromptSuggestion>
                                ))}
                            </div>
                        ) : (
                            <div className="flex w-full flex-wrap items-stretch justify-start gap-2">
                            {suggestionGroups.map((suggestion) => {
                                if (suggestion.label === "Empty Template") {
                                    return (
                                        <Link
                                            key={suggestion.label}
                                            target="_self"
                                            rel="noopener noreferrer"
                                            href={ `/program-builder/build-program?empty=true&edit=true` }
                                        >
                                            <PromptSuggestion className="capitalize h-8 p-4 text-xs">
                                                {suggestion.icon}
                                                {suggestion.label}
                                            </PromptSuggestion>
                                        </Link>
                                    );
                                }

                                return (
                                    <PromptSuggestion
                                        key={suggestion.label}
                                        onClick={() => {
                                            setActiveCategory(suggestion.label)
                                            setSearch("") // Clear input when selecting a category
                                        }}
                                        className="capitalize h-8 p-4 text-xs"
                                    >
                                        {suggestion.icon}
                                        {suggestion.label}
                                    </PromptSuggestion>
                                );
                            })}
                            </div>
                        )}
                        </div>
                        </div>
                    </div>
                    <div className="pt-12 flex flex-col justify-center items-center">
                        <AvatarStack
                            avatars={[
                                {name: "jack.hanlon", image:  jack.src},
                                {name: "scottlhanlon", image: people03.src},
                                {name: "jordan.vandesande", image: people04.src},
                                {name: "marcola", image: people05.src},
                                {name: "sina", image: people02.src},
                                {name: "john.gardiner", image: people02.src},
                                {name: "josh.rubis", image: people02.src},
                                {name: "calvin.sytsma", image: people02.src},
                                {name: "mark.shaio", image: people02.src},
                                {name: "sigilai", image: people02.src},
                                {name: "thomas.genet", image: people02.src},
                                {name: "lukcamp", image: people02.src},
                                {name: "alexabcj", image: people02.src},
                                {name: "kalamataspartan", image: people02.src},
                                {name: "alexalydiarose", image: people02.src},
                            ] }
                        />
                        6,000+ lifters are building with Proxima
                    </div>
                <DialogContent hideClose className="max-w-5xl overflow-y-auto overflow-x-hidden w-full max-sm:max-h-[90%]">
                    <DialogTitle>
                        <span className="flex flex-row max-sm:flex-col max-sm:items-end gap-2">
                            <Input
                                value={ search }
                                onChange={ (event) => setSearch(event.target.value) }
                                startIcon={ SearchIcon }
                                placeholder="Tell me about your ideal program..."
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && submitRef.current !== null) {
                                        submitRef.current.click();
                                    }
                                }}
                            />
                            <Link
                                ref={ submitRef }
                                target="_self"
                                rel="noopener noreferrer"
                                className="max-sm:w-full h-10"
                                href={ `/program-builder/build-program?${handleDefineQueryParams()}&edit=true` }
                            >
                                <Button className="w-[auto] max-sm:w-full h-10 font-bold bg-[#33bbcf] text-white">
                                    <SparklesIcon /> Build
                                </Button>
                            </Link>
                        </span>
                        <span className="text-lightSecondary text-sm flex flex-row gap-2 items-center justify-start pt-2">
                            <InfoIcon />
                            Recommended: Use advanced settings for best experience
                        </span>
                    </DialogTitle>
                    <DialogDescription className="flex flex-row justify-between items-center">
                        <span className="w-[66%]">
                            <Button onClick={ () => toggleAdvancedSettingsOpen() } variant="ghost" className="w-[auto] h-[auto]">
                                Advanced settings { advancedSettingsOpen ? <ChevronUpIcon /> : <ChevronDownIcon /> }
                            </Button>
                        </span>
                        { advancedSettingsOpen &&
                            <span className="font-bold w-[33%] flex justify-center">
                                Exclude
                            </span>
                        }
                    </DialogDescription>
                    { advancedSettingsOpen &&
                        <span className="flex flex-row justify-between gap-5 max-sm:gap-2">
                            <span className="grid grid-cols-2 max-sm:grid-cols-1 max-sm:basis-1/2 max-sm:gap-2 max-sm:pr-2 gap-5 sm:flex-grow-[2] basis-2/3 pr-4 border-r-2">
                                <Select value={ sex } onValueChange={ (value) => setSex(value) }>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Sex" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        { sexOptions.map((sx) => (
                                            <SelectItem key={ sx.value } value={ sx.value }>{ sx.label }</SelectItem>

                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={ age } onValueChange={ (value) => setAge(value) }>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Age" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        { ageOptions.map((age) => (
                                            <SelectItem key={ age.value } value={ age.value }>{ age.label }</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={ programLength } onValueChange={ (value) => setProgramLength(value) }>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Program length" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        { programLengthOptions.map((length) => (
                                            <SelectItem key={ length.value } value={ length.value }>{ length.label }</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={ daysPerWeek } onValueChange={ (value) => setDaysPerWeek(value) }>
                                    <SelectTrigger className="h-10">
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
                                    defaultOptions={ specificDaysOptions }
                                    placeholder="Select specific days"
                                    emptyIndicator={ (
                                        <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                            no results found.
                                        </p>
                                ) }
                                />
                                <Select value={ workoutDuration } onValueChange={ (value) => setWorkoutDuration(value) }>
                                    <SelectTrigger className="h-10">
                                        <SelectValue placeholder="Workout duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        { workoutDurationOptions.map((duration) => (
                                            <SelectItem key={ duration.value } value={ duration.value }>{ duration.label }</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={ activityLevel } onValueChange={ (value) => setActivityLevel(value) }>
                                    <SelectTrigger className="h-10">
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
                                    defaultOptions={ difficultyOptions }
                                    placeholder="Difficulty"
                                    emptyIndicator={ (
                                        <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                            no results found.
                                        </p>
                                ) }
                                />
                            </span>
                            <span className="grid grid-cols-1 flex-grow basis-1/3 ">
                                <MultiSelect
                                    value = { excludeAreas }
                                    onChange={ (value) => setExcludeAreas(value) }
                                    badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
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
                    }
                    <span className="flex flex-row justify-between items-center">
                        <span className="flex flex-col gap-2 grow basis-0 w-0">
                            <span className="grid w-full max-w-sm items-center gap-1.5">
                            <Label htmlFor="title">Program Title</Label>
                            <Input
                                type="text"
                                id="title"
                                placeholder="Program Title"
                                className="w-full"
                                value={ programTitle }
                                onChange={ (event) => setProgramTitle(event.target.value) }
                            />
                            </span>
                            <span className="w-full flex flex-row items-end justify-start gap-2">
                            <Checkbox checked={ explore } onCheckedChange={ toggleExplore } className="w-4 h-4 data-[state=checked]:bg-[#33bbcf] data-[state=checked]:text-white" id="explore" />
                            <Label htmlFor="explore" className="text-xs text-gray-600">Share program with community</Label>
                            </span>
                        </span>
                        <Select onValueChange={(value) => setWorkoutSchema(value)} value={workoutSchema}>
                            <SelectTrigger className="h-10 w-[180px]">
                            <SelectValue placeholder="Workout Schema" />
                            </SelectTrigger>
                            <SelectContent>
                            <SelectItem value="hevy">Hevy Routines</SelectItem>
                            <SelectItem value="proxima">Proxima Program</SelectItem>
                            </SelectContent>
                        </Select>
                    </span>

                </DialogContent>
            </Dialog>

        </div>
    );
};
