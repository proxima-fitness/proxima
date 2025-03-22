"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import  { Button } from "@/components/ui/button";
import { SearchIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon, PlayIcon } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select";
import { useEffect, useReducer, useState } from "react";
import MultiSelect from '@/components/ui/multi-select';
import { activityLevelOptions, ageOptions, dayPerWeekOptions, difficultyOptions, equipmentOptions, focusAreasOptions, goalsOptions, healthIssuesOptions, programLengthOptions, sexOptions, specializationOptions, specificDaysOptions, workoutDurationOptions } from "@/assets/constants";
import Link from "next/link";
import { useIsHevy } from "@/contexts/HevyContext";
import { IOption } from "@/components/ui/multi-select";

export const AiSearchDialog: React.FC = () => {

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
    const [advancedSettingsOpen, toggleAdvancedSettingsOpen] = useReducer(prev => !prev, false);

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

    return (
        <Dialog>
            <span className="flex items-center justify-center">
                <DialogTrigger className="xl:my-[450px] max-sm:my-24 lg:my-[250px] h-[60px] text-white rounded-xl w-[200px] bg-lightSecondary font-main uppercase flex items-center justify-center gap-4"><PlayIcon />Start With AI</DialogTrigger>
            </span>
            <DialogContent hideClose className="max-w-5xl overflow-y-auto w-full max-sm:max-h-[90%]">
                <DialogTitle>
                    <span className="flex flex-row max-sm:flex-col max-sm:items-end gap-2">
                        <Input autoFocus value={ search } onChange={ (event) => setSearch(event.target.value) } startIcon={ SearchIcon } placeholder="Tell me about your ideal program..." />
                        <Link
                            target="_self"
                            rel="noopener noreferrer"
                            href={ `/program-builder/build-program?${handleDefineQueryParams()}` }
                        >
                            <Button className="w-[auto] h-[auto] bg-[#33bbcf] text-white">
                                <SparklesIcon /> Build
                            </Button>
                        </Link>
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
                    <span className="flex flex-row justify-between gap-5">
                        <span className="grid grid-cols-2 max-sm:grid-cols-1 max-sm:basis-3/3 gap-5 flex-grow-[2] basis-2/3 pr-4 border-r-2">
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
                                placeholder="Focus areas"
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
                                placeholder="Equipment"
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
                                placeholder="Specialization"
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
                                placeholder="Health Issues"
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
                            <SelectItem value="hevy">Hevy Routine</SelectItem>
                            <SelectItem value="proxima">Proxima Program</SelectItem>
                        </SelectContent>
                    </Select>
                </span>
            </DialogContent>
        </Dialog>
    );
};
