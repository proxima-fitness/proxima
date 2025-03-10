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

export const AiSearchDialog: React.FC = () => {

    const { setIsHevy } = useIsHevy();
    const [workoutSchema, setWorkoutSchema] = useState("hevy");
    const [advancedSettingsOpen, toggleAdvancedSettingsOpen] = useReducer(prev => !prev, false);

    useEffect(() => {
        setIsHevy(workoutSchema === "hevy" ? true : false);
    }, [workoutSchema]);

    return (
        <Dialog>
            <span className="flex items-center justify-center">
                <DialogTrigger className="xl:my-[450px] max-sm:my-[50px] lg:my-[250px] h-[60px] text-white rounded-xl w-[200px] bg-lightSecondary font-main uppercase flex items-center justify-center gap-4"><PlayIcon />Start</DialogTrigger>
            </span>
            <DialogContent hideClose className="max-w-5xl w-full">
                <DialogTitle>
                    <span className="flex flex-row gap-2">
                        <Input startIcon={ SearchIcon } placeholder="Tell me about your ideal program..." />
                        <Link
                            target="_self"
                            rel="noopener noreferrer"
                            href={ "/program-builder/build-program" }
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
                            <Select>
                                <SelectTrigger autoFocus className="h-10">
                                    <SelectValue placeholder="Sex" />
                                </SelectTrigger>
                                <SelectContent>
                                    { sexOptions.map((sex) => (
                                        <SelectItem key={ sex.value } value={ sex.value }>{ sex.label }</SelectItem>

                                    ))}
                                </SelectContent>
                            </Select>
                            <Select>
                                <SelectTrigger autoFocus className="h-10">
                                    <SelectValue placeholder="Age" />
                                </SelectTrigger>
                                <SelectContent>
                                    { ageOptions.map((age) => (
                                        <SelectItem key={ age.value } value={ age.value }>{ age.label }</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select>
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
                                badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                                defaultOptions={ specificDaysOptions }
                                placeholder="Select specific days"
                                emptyIndicator={ (
                                    <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                        no results found.
                                    </p>
                              ) }
                            />
                            <Select>
                                <SelectTrigger autoFocus className="h-10">
                                    <SelectValue placeholder="Program length" />
                                </SelectTrigger>
                                <SelectContent>
                                    { programLengthOptions.map((length) => (
                                        <SelectItem key={ length.value } value={ length.value }>{ length.label }</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select>
                                <SelectTrigger autoFocus className="h-10">
                                    <SelectValue placeholder="Workout duration" />
                                </SelectTrigger>
                                <SelectContent>
                                    { workoutDurationOptions.map((duration) => (
                                        <SelectItem key={ duration.value } value={ duration.value }>{ duration.label }</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select>
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
                            {/* <SelectItem value="pdf">PDF</SelectItem> */}
                        </SelectContent>
                    </Select>
                </span>
            </DialogContent>
        </Dialog>
    );
};
