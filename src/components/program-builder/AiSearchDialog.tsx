"use client";

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import  { Button } from "@/components/ui/button";
import { SearchIcon, SparklesIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
  } from "@/components/ui/select"
import { useReducer, useState } from "react";
import MultiSelect from '@/components/ui/multi-select';
import { activityLevelOptions, ageOptions, dayPerWeekOptions, difficultyOptions, equipmentOptions, focusAreasOptions, goalsOptions, healthIssuesOptions, programLengthOptions, sexOptions, specializationOptions, specificDaysOptions, workoutDurationOptions } from "@/assets/constants";

export const AiSearchDialog: React.FC = () => {

    const [workoutSchema, setWorkoutSchema] = useState("hevy");
    const [advancedSettingsOpen, toggleAdvancedSettingsOpen] = useReducer(prev => !prev, false);

    return (
        <Dialog>
            <DialogTrigger>Open</DialogTrigger>
            <DialogContent hideClose className="max-w-5xl w-full">
                <DialogTitle>
                    <div className="flex flex-row gap-2">
                        <Input startIcon={ SearchIcon } placeholder="Tell me about your ideal program..." />
                        <Button className="w-[auto] h-[auto] bg-[#33bbcf] text-white">
                            <SparklesIcon /> Build
                        </Button>
                    </div>
                </DialogTitle>
                <DialogDescription className="flex flex-row justify-between items-center">
                    <Button onClick={ () => toggleAdvancedSettingsOpen() } variant="ghost" className="w-[auto] h-[auto]">
                        Advanced settings { advancedSettingsOpen ? <ChevronUpIcon /> : <ChevronDownIcon /> }
                    </Button>
                    { advancedSettingsOpen &&
                        <div className="font-bold flex justify-start">
                            Exclude
                        </div>
                    }
                </DialogDescription>
                { advancedSettingsOpen &&
                    <div className="flex flex-row justify-between gap-5">
                        <div className="grid grid-cols-2 gap-5 flex-grow-[2] basis-2/3 pr-4 border-r-2">
                            <Select>
                                <SelectTrigger>
                                    <SelectValue placeholder="Sex" />
                                </SelectTrigger>
                                <SelectContent>
                                    { sexOptions.map((sex) => (
                                        <SelectItem value={ sex.value }>{ sex.label }</SelectItem>

                                    ))}
                                </SelectContent>
                            </Select>
                            <MultiSelect
                                badgeClassName="bg-[#33bbcf] hover:bg-[#33bbcf]"
                                defaultOptions={ageOptions}
                                placeholder="Age"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={dayPerWeekOptions}
                                placeholder="How many days per week?"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={specificDaysOptions}
                                placeholder="Select specific days"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={programLengthOptions}
                                placeholder="Program length"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={workoutDurationOptions}
                                placeholder="Workout duration"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={activityLevelOptions}
                                placeholder="Activity level"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={goalsOptions}
                                placeholder="Goals"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={specializationOptions}
                                placeholder="Specialization"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={equipmentOptions}
                                placeholder="Equipment"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={focusAreasOptions}
                                placeholder="Focus areas"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={difficultyOptions}
                                placeholder="Difficulty"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                        </div>
                        <div className="grid grid-cols-1 flex-grow basis-1/3 ">
                            <MultiSelect
                                defaultOptions={focusAreasOptions}
                                placeholder="Focus areas"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={equipmentOptions}
                                placeholder="Equipment"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={specializationOptions}
                                placeholder="Specialization"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                            <MultiSelect
                                defaultOptions={healthIssuesOptions}
                                placeholder="Health Issues"
                                emptyIndicator={
                                <p className="text-center text-lg leading-10 text-gray-600 dark:text-gray-400">
                                    no results found.
                                </p>
                                }
                            />
                        </div>
                    </div>
                }
                <div className="flex flex-row justify-end items-center">
                    <Select onValueChange={ (value) => setWorkoutSchema(value)} value={ workoutSchema }>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Workout Schema" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hevy">Hevy Routine</SelectItem>
                            <SelectItem value="proxima">Proxima Program</SelectItem>
                            {/* <SelectItem value="pdf">PDF</SelectItem> */}
                        </SelectContent>
                    </Select>
                </div>
            </DialogContent>
        </Dialog>
    );
};
