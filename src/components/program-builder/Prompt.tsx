"use client";

import { ArrowUpIcon, MicIcon, SettingsIcon, XIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
// import { Dropzone, DropzoneContent, DropzoneEmptyState } from "../dropzone";
import { Card } from "../ui/card";
import { useEffect, useReducer, useRef, useState } from "react";
// import { useSupabaseUpload } from "@/hooks/use-supabase-upload";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import MultiSelect, { IOption } from "../ui/multi-select";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { activityLevelOptions, ageOptions, dayPerWeekOptions, difficultyOptions, equipmentOptions, focusAreasOptions, goalsOptions, healthIssuesOptions, programLengthOptions, sexOptions, specializationOptions, specificDaysOptions, workoutDurationOptions } from "@/assets/constants";
import { useIsHevy } from "@/contexts/HevyContext";
import Link from "next/link";

export const Prompt: React.FC = () => {

    const { setIsHevy } = useIsHevy();

    const [search, setSearch] = useState<string>("");
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
    const [excludeEquipment, setExcludeEquipment] = useState<IOption[]>([]);
    const [excludeSpecializations, setExcludeSpecializations] = useState<IOption[]>([]);
    const [healthIssues, setHealthIssues] = useState<IOption[]>([]);
    const [workoutSchema, setWorkoutSchema] = useState("hevy");

    // const [dropzoneOpen, toggleDropzone] = useReducer(prev => !prev, false);
    const [advancedSettingsOpen, toggleAdvancedSettingsOpen] = useReducer(prev => !prev, false);

    useEffect(() => {
        setIsHevy(workoutSchema === "hevy" ? true : false);
    }, [workoutSchema, setIsHevy]);

    // const props = useSupabaseUpload({
    //     bucketName: 'test',
    //     path: 'test',
    //     allowedMimeTypes: ['image/*'],
    //     maxFiles: 2,
    //     maxFileSize: 1000 * 1000 * 10, // 10MB,
    // });

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
        <div className="flex flex-col gap-4 w-full items-center">
            <Card
                className="flex flex-col justify-between border-[4px] border-gray-100 bg-lightGray my-2 sm:w-[60%] max-sm:w-[90%] h-full"
            >
                <Textarea
                    autoFocus
                    className="flex-grow bg-lightGray border-none border-b-0 focus-visible:ring-0 resize-none focus-visible:ring-offset-0 focus:outline-none shadow-none"
                    value={ search }
                    onChange={ (event) => setSearch(event.target.value) }
                    placeholder="Ask Proxima to build..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && submitRef.current !== null) {
                            submitRef.current.click();
                        }
                    }}
                />
                <div className="flex flex-none flex-row justify-between items-end">
                    <div className="flex flex-row items-center justify-center">
                        <TooltipProvider delayDuration={ 0 }>
                            <Tooltip>
                                <TooltipTrigger className="">
                                    <span className="w-[66%]">
                                        <div onClick={ () => toggleAdvancedSettingsOpen() } className="w-[auto] h-[auto] flex flex-row gap-2 text-xs items-center pl-4">
                                             { advancedSettingsOpen ? <SettingsIcon size="16" /> : <XIcon size="16" /> }
                                        </div>
                                    </span>

                                </TooltipTrigger>
                                <TooltipContent className="bg-gray-600 text-white rounded-lg">
                                    <p>Advanced Settings</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
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
                                <Link
                                    ref={ submitRef }
                                    target="_self"
                                    rel="noopener noreferrer"
                                    className="max-sm:w-full"
                                    href={ `/program-builder/build-program?${handleDefineQueryParams()}` }
                                >
                                    <Button disabled={ search.length === 0 } className={ `p-2 bg-lightSecondary text-white` }>
                                        <ArrowUpIcon size="16" />
                                    </Button>
                                </Link>
                    </div>
                </div>
                {/* { dropzoneOpen &&
                    <Dropzone {...props}>
                        <DropzoneEmptyState />
                        <DropzoneContent />
                    </Dropzone>
                } */}
            </Card>
            { advancedSettingsOpen &&
                <Card className="border-none shadow-none sm:w-[60%] max-sm:w-[90%]">
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
                            <Select onValueChange={ (value) => setWorkoutSchema(value) } value={ workoutSchema }>
                                <SelectTrigger autoFocus className="h-10">
                                    <SelectValue placeholder="Workout Schema" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="hevy">Hevy Routines</SelectItem>
                                    <SelectItem value="proxima">Proxima Program</SelectItem>
                                </SelectContent>
                            </Select>
                        </span>
                    </span>
                </Card>
            }
        </div>
    );
};
