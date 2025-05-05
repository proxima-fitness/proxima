"use client";

import { ArrowUpIcon, BicepsFlexedIcon, BookOpenIcon, Calculator, ChevronDownIcon, ChevronUpIcon, FootprintsIcon, InfoIcon, MicIcon, SearchIcon, SparklesIcon, SquarePowerIcon } from "lucide-react";
// import { Dropzone, DropzoneContent, DropzoneEmptyState } from "../dropzone";
import { Card } from "@/components/ui/card";
import { useEffect, useReducer, useRef, useState } from "react";
// import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { Textarea } from "@/components/ui/textarea";
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

export const Prompt: React.FC = () => {

    const { setIsHevy } = useIsHevy();
    const [search, setSearch] = useState<string>("");
    // const [dropzoneOpen, toggleDropzone] = useReducer(prev => !prev, false);

    // const props = useSupabaseUpload({
    //     bucketName: 'test',
    //     path: 'test',
    //     allowedMimeTypes: ['image/*'],
    //     maxFiles: 2,
    //     maxFileSize: 1000 * 1000 * 10, // 10MB,
    // });

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

            return params.toString();
    };

    const submitRef = useRef<HTMLAnchorElement>(null);

    return (
        <div className="flex flex-col gap-2 w-full items-center">
            <Dialog open={ dialogOpen } onOpenChange={ () => setDialogOpen(false) }>
                <Card
                    className="flex flex-col justify-between border-[4px] border-gray-100 bg-lightGray my-2 sm:w-[65%] max-sm:w-[90%] h-full"
                >
                    <Textarea
                        autoFocus
                        className="flex-grow bg-lightGray border-none border-b-0 focus-visible:ring-0 resize-none focus-visible:ring-offset-0 focus:outline-none shadow-none"
                        value={ search }
                        onChange={ (event) => setSearch(event.target.value) }
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && search.trim().length > 0) {
                              e.preventDefault(); // prevent newline
                              const inferred = inferDaysPerWeek(search);
                              if (inferred) {
                                setDaysPerWeek(inferred);
                              }
                              setDialogOpen(true); // open the dialog programmatically
                            }
                          }}
                        placeholder="Ask Proxima to build..."
                    />
                    <div className="flex flex-none flex-row justify-end items-end">
                        <div className="flex items-end gap-4">
                            <TooltipProvider delayDuration={ 0 }>
                                <Tooltip>
                                    <TooltipTrigger className="">
                                        <div className="p-2">
                                            <MicIcon size="16" />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                        <p>Dictate</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <Button
                                asChild
                                onClick={() => {
                                    const inferred = inferDaysPerWeek(search);
                                    if (inferred) {
                                        setDaysPerWeek(inferred);
                                    }
                                    setDialogOpen(true);
                                }}
                                disabled={ search.length === 0 }
                                className={ `${ search.length === 0 ? "opacity-50" : "" } p-2 bg-lightSecondary text-white rounded-sm w-full cursor-pointer` }
                                >
                                <ArrowUpIcon size="16" />
                            </Button>
                        </div>
                    </div>
                    {/* { dropzoneOpen &&
                        <Dropzone {...props}>
                            <DropzoneEmptyState />
                            <DropzoneContent />
                        </Dropzone>
                    } */}
                </Card>
                <div className="flex flex-wrap justify-center gap-2 md:gap-3">
                    <Link
                        target="_self"
                        rel="noopener noreferrer"
                        href={ `/program-builder/build-program?empty=true&edit=true` }
                    >
                        <Button variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                            <BookOpenIcon  />
                            Empty Template
                        </Button>
                    </Link>
                    <Button onClick={ () => setSearch("Create a Push Pull Legs Program that is 6 days per week")} variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                        <BicepsFlexedIcon />
                        PPL Program
                    </Button>

                    <Button onClick={ () => setSearch("Create a Smolov Jr. workout program following the Smolov Jr. pattern. Smolov Jr is a short, high-frequency, high-volume squat program designed to rapidly increase 1-rep max strength over about 3 weeks. It is based on squatting 4 times per week, typically Monday, Wednesday, Friday, and Saturday, with the lifter performing 6 sets of 6 reps at 70% of their 1RM on Day 1, 7 sets of 5 reps at 75% on Day 2, 8 sets of 4 reps at 80% on Day 3, and 10 sets of 3 reps at 85% on Day 4. Each week, the lifter is supposed to increase all working weights by 5–10 pounds (2.5–5 kg). The program requires good recovery practices, is best suited for experienced lifters, and can be used for squat, bench press, or other major lifts.")} variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                        <SquarePowerIcon />
                        Smolov Jr.
                    </Button>

                    <Button onClick={  () => setSearch("Create 3 day a week functional training program tailored for football or soccer athletes" )} variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                        <FootprintsIcon />
                        Athletic Training
                    </Button>

                    <Button onClick={ () => setSearch("Create a weight loss workout program that emphasizes cardio (4x per week)") } variant="outline" className="rounded-full flex items-center gap-2 h-auto text-xs">
                        <Calculator />
                        Weight loss Program
                    </Button>
                </div>
                <DialogContent hideClose className="max-w-5xl overflow-y-auto overflow-x-hidden w-full max-sm:max-h-[90%]">
                    <DialogTitle>
                        <span className="flex flex-row max-sm:flex-col max-sm:items-end gap-2">
                            <Input
                                autoFocus
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
                                    <SelectTrigger autoFocus className="h-10">
                                        <SelectValue placeholder="Sex" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        { sexOptions.map((sx) => (
                                            <SelectItem key={ sx.value } value={ sx.value }>{ sx.label }</SelectItem>

                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={ age } onValueChange={ (value) => setAge(value) }>
                                    <SelectTrigger autoFocus className="h-10">
                                        <SelectValue placeholder="Age" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        { ageOptions.map((age) => (
                                            <SelectItem key={ age.value } value={ age.value }>{ age.label }</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={ programLength } onValueChange={ (value) => setProgramLength(value) }>
                                    <SelectTrigger autoFocus className="h-10">
                                        <SelectValue placeholder="Program length" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        { programLengthOptions.map((length) => (
                                            <SelectItem key={ length.value } value={ length.value }>{ length.label }</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={ daysPerWeek } onValueChange={ (value) => setDaysPerWeek(value) }>
                                    <SelectTrigger autoFocus className="h-10">
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
                                    <SelectTrigger autoFocus className="h-10">
                                        <SelectValue placeholder="Workout duration" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        { workoutDurationOptions.map((duration) => (
                                            <SelectItem key={ duration.value } value={ duration.value }>{ duration.label }</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Select value={ activityLevel } onValueChange={ (value) => setActivityLevel(value) }>
                                    <SelectTrigger autoFocus className="h-10">
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
                    <span className="flex flex-row justify-end items-center">
                        <Select onValueChange={ (value) => setWorkoutSchema(value) } value={ workoutSchema }>
                            <SelectTrigger autoFocus className="h-10 w-[180px]">
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
