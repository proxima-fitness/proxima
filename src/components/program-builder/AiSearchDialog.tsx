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
import { Option } from "@/components/ui/multi-select";

export const AiSearchDialog: React.FC = () => {

    const { setIsHevy } = useIsHevy();


    const [search, setSearch] = useState<string>("");
    const [sex, setSex] = useState<string>("");
    const [age, setAge] = useState<string>("");
    const [daysPerWeek, setDaysPerWeek] = useState<string>("");
    const [specificDays, setSpecificDays] = useState<Option[]>([]);
    const [programLength, setProgramLength] = useState<string>("");
    const [workoutDuration, setWorkoutDuration] = useState<string>("");
    const [activityLevel, setActivityLevel] = useState<string>("");
    const [goals, setGoals] = useState<Option[]>([]);
    const [specialization, setSpecialization] = useState<Option[]>([]);
    const [equipment, setEquipment] = useState<Option[]>([]);
    const [focusAreas, setFocusAreas] = useState<Option[]>([]);
    const [difficultyLevel, setDifficultyLevel] = useState<Option[]>([]);
    const [excludeAreas, setExcludeAreas] = useState<Option[]>([]);
    const [excludeEquipment, setExcludeEquipment] = useState<Option[]>([]);
    const [excludeSpecializations, setExcludeSpecializations] = useState<Option[]>([]);
    const [healthIssues, setHealthIssues] = useState<Option[]>([]);

    const [workoutSchema, setWorkoutSchema] = useState("hevy");
    const [advancedSettingsOpen, toggleAdvancedSettingsOpen] = useReducer(prev => !prev, false);

    useEffect(() => {
        setIsHevy(workoutSchema === "hevy" ? true : false);
    }, [workoutSchema, setIsHevy]);


    const handleUpdateAiQueryBuilder = () => {
        const sexSentence = sex.length > 0 ? `I am a ${sex}.` : "";
        const ageSentence = age.length > 0 ? `I am ${age} years old.` : "";
        const daysPerWeekSentence = daysPerWeek.length > 0 ? `I want to go to the gym ${daysPerWeek} days per week.` : "";
        const specificDaysSentence = specificDays.length > 0 ? `The days I will go are ${specificDays.map(option => option.value).join(', ')}.` : "";
        const programLengthSentence = programLength.length > 0 ? `The program will be ${programLength} weeks long.` : "";
        const workoutDurationSentence = workoutDuration.length > 0 ? `A typical session should last ${workoutDuration} minutes.` : "";
        const activityLevelSentence = activityLevel.length > 0 ? `I am a ${activityLevel} person.` : "";
        const goalsSentence = goals.length > 0 ? `My goals are to ${goals.map(option => option.value).join(', ')}.` : "";
        const specializationSentence = specialization.length > 0 ? `My specializations are ${specialization.map(option => option.value).join(', ')}.` : "";
        const equipmentSentence = equipment.length > 0 ? `My available equipment is ${equipment.map(option => option.value).join(', ')}.` : "";
        const focusAreasSentence = focusAreas.length > 0 ? `My focus areas are ${focusAreas.map(option => option.value).join(', ')}.` : "";
        const difficultyLevelSentence = difficultyLevel.length > 0 ? `My desired difficulty level is ${difficultyLevel.map(option => option.value).join(', ')}.` : "";
        const excludeAreasSentence = excludeAreas.length > 0 ? `I want to exclude these areas: ${excludeAreas.map(option => option.value).join(', ')}.` : "";
        const excludeEquipmentSentence = excludeEquipment.length > 0 ? `I want to exclude these equipment: ${excludeEquipment.map(option => option.value).join(', ')}.` : "";
        const excludeSpecializationsSentence = excludeSpecializations.length > 0 ? `I want to exclude these specializations: ${excludeSpecializations.map(option => option.value).join(', ')}.` : "";
        const healthIssuesSentence = healthIssues.length > 0 ? `I have these health issues: ${healthIssues.map(option => option.value).join(', ')}` : "";

        const queryData = (search + "." + sexSentence + ageSentence + daysPerWeekSentence + specificDaysSentence +
        programLengthSentence + workoutDurationSentence + activityLevelSentence + goalsSentence +
        specializationSentence + equipmentSentence + focusAreasSentence + difficultyLevelSentence +
        excludeAreasSentence + excludeEquipmentSentence + excludeSpecializationsSentence + healthIssuesSentence);
        const queryString = encodeURIComponent(JSON.stringify(queryData));
        return queryString;
    };

    return (
        <Dialog>
            <span className="flex items-center justify-center">
                <DialogTrigger className="xl:my-[450px] max-sm:my-[50px] lg:my-[250px] h-[60px] text-white rounded-xl w-[200px] bg-lightSecondary font-main uppercase flex items-center justify-center gap-4"><PlayIcon />Start</DialogTrigger>
            </span>
            <DialogContent hideClose className="max-w-5xl w-full">
                <DialogTitle>
                    <span className="flex flex-row gap-2">
                        <Input value={ search } onChange={ (event) => setSearch(event.target.value) } startIcon={ SearchIcon } placeholder="Tell me about your ideal program..." />
                        <Link
                            target="_self"
                            rel="noopener noreferrer"
                            href={ `/program-builder/build-program?aiQueryBuilder=${handleUpdateAiQueryBuilder()}` }
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
                        <span className="grid grid-cols-2 gap-5 flex-grow-[2] basis-2/3 pr-4 border-r-2">
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
