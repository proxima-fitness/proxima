"use client";

import {
    Command,
    CommandInput,
} from "@/components/ui/command";
import { ProgramFilterGroup } from "./ProgramFilterGroup";
import { filterGroupOptions } from "@/assets/constants";
import { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { getProgramsSearchResultsWithThumbnail } from "@/api/search";
import { Card } from "../ui/card";
import Link from "next/link";
import { ProgramCard } from "./ProgramCard";
import { useDebouncedCallback } from "use-debounce";

interface IProps {
    programs: TProgram[];
}

export const ProgramSearch: React.FC<IProps> = (props) => {

    const {
        programs,
    } = props;

    const commandRef = useRef<HTMLInputElement>(null);

    const [filteredPrograms, setFilteredPrograms] = useState<TProgram[]>(programs);

    const [appliedProgramLengthFilter, setAppliedProgramLengthFilter] = useState<string>(""); // casting the number to string
    const [appliedWorkoutDurationFilter, setAppliedWorkoutDurationFilter] = useState<string>(""); // casting the number to string
    const [appliedEquipmentFilter, setAppliedEquipmentFilter] = useState<string[]>([]);
    const [appliedSpecializationFilter, setAppliedSpecializationFilter] = useState<string[]>([]);
    const [appliedDifficultyFilter, setAppliedDifficultyFilter] = useState<string[]>([]);

    const handleAppliedProgramLengthFilter = (appliedProgramLengthFilter: string) => {
        setAppliedProgramLengthFilter(appliedProgramLengthFilter);
    };

    const handleAppliedWorkoutDurationFilter = (appliedWorkoutDurationFilter: string) => {
        setAppliedWorkoutDurationFilter(appliedWorkoutDurationFilter);
    };

    const handleAppliedEquipmentFilter = (appliedEquipmentFilter: string[]) => {
        setAppliedEquipmentFilter(appliedEquipmentFilter);
    };

    const handleAppliedSpecializationFilter = (appliedSpecializationFilter: string[]) => {
        setAppliedSpecializationFilter(appliedSpecializationFilter);
    };

    const handleAppliedDifficultyFilter = (appliedDifficultyFilter: string[]) => {
        setAppliedDifficultyFilter(appliedDifficultyFilter);
    };

    const handleClearFilters = () => {
        setAppliedProgramLengthFilter("");
        setAppliedWorkoutDurationFilter("");
        setAppliedEquipmentFilter([]);
        setAppliedSpecializationFilter([]);
        setAppliedDifficultyFilter([]);
    };

    const handleSearch = useDebouncedCallback(async (value: string) => {

        const target = value;

        if (target.length === 0) {
            setFilteredPrograms(programs);
            return;
        }

        const response = await getProgramsSearchResultsWithThumbnail(target);
        setFilteredPrograms(response);
        return;
    }, 200);


    useEffect(() => {
        let filteredItems = programs;

        if (appliedProgramLengthFilter) {
            filteredItems = filteredItems.filter((item: TProgram) => String(item.program_length) === appliedProgramLengthFilter);
        }
        if (appliedWorkoutDurationFilter) {
            filteredItems = filteredItems.filter((item: TProgram) => String(item.workout_duration) === appliedWorkoutDurationFilter);
        }

        if (appliedEquipmentFilter && appliedEquipmentFilter.length > 0) {
            filteredItems = filteredItems.filter((item: TProgram) =>
                item.equipment && appliedEquipmentFilter.some((filter) => item.equipment.includes(filter)),
            );
        }

        if (appliedSpecializationFilter && appliedSpecializationFilter.length > 0) {
            filteredItems = filteredItems.filter((item: TProgram) =>
                item.specialization && appliedSpecializationFilter.some((filter) => item.specialization.includes(filter)),
            );
        }

        if (appliedDifficultyFilter && appliedDifficultyFilter.length > 0) {
            filteredItems = filteredItems.filter((item: TProgram) =>
                item.difficulty && appliedDifficultyFilter.some((filter) => item.difficulty.includes(filter)),
            );
        }

        setFilteredPrograms(filteredItems);
    }, [appliedProgramLengthFilter, appliedWorkoutDurationFilter, appliedEquipmentFilter, appliedSpecializationFilter, appliedDifficultyFilter, programs]);

    // Filtering Shortcut keybindings
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.ctrlKey && event.key.toLowerCase() === "k") {
                event.preventDefault();
                commandRef.current?.focus();
            } else if (event.ctrlKey && event.key.toLowerCase() === "c") {
                event.preventDefault();
                handleClearFilters();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [filteredPrograms, appliedEquipmentFilter]);

    return (
        <>
            <div className="pt-10">
                <Card className="p-4 bg-gray-100 dark:bg-darkGray">
                    <h1 className="text-center text-3xl pb-4 font-main">Workout Programs</h1>
                    <div className="max-sm:w-full flex flex-col items-center justify-center">
                        <div className="w-full flex flex-row max-sm:flex-col items-center justify-center">
                            <div className="flex-1"></div>
                            <div className="w-[60%] max-sm:w-full">
                                <Command>
                                    <CommandInput onInput={ (e) => handleSearch((e.target as HTMLInputElement).value) } ref={ commandRef } placeholder="Search for a program... [Ctrl + k]" />
                                </Command>
                            </div>
                            { appliedProgramLengthFilter || appliedWorkoutDurationFilter || (appliedEquipmentFilter && appliedEquipmentFilter.length > 0) || (appliedSpecializationFilter && appliedSpecializationFilter.length > 0) || (appliedDifficultyFilter && appliedDifficultyFilter.length > 0) ?
                                <div className="flex-1 flex items-center justify-start">
                                    <Button onClick={ handleClearFilters } className={ "text-[#37BCCF]" } variant="ghost">Reset Filters [Ctrl + c]</Button>
                                </div>
                                :
                                <div className="flex-1 flex items-center justify-start">
                                </div>
                            }
                        </div>
                        <div className="grid grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
                            { filterGroupOptions.map((group) => (
                                <ProgramFilterGroup
                                    key={ group.type }
                                    filter={ group }
                                    appliedProgramLengthFilter={ appliedProgramLengthFilter }
                                    appliedWorkoutDurationFilter={ appliedWorkoutDurationFilter }
                                    appliedEquipmentFilter={ appliedEquipmentFilter }
                                    appliedDifficultyFilter={ appliedDifficultyFilter }
                                    appliedSpecializationFilter={ appliedSpecializationFilter }
                                    handleAppliedProgramLengthFilter={ handleAppliedProgramLengthFilter }
                                    handleAppliedWorkoutDurationFilter={ handleAppliedWorkoutDurationFilter }
                                    handleAppliedEquipmentFilter={ handleAppliedEquipmentFilter }
                                    handleAppliedSpecializationFilter={ handleAppliedSpecializationFilter }
                                    handleAppliedDifficultyFilter={ handleAppliedDifficultyFilter }
                                />
                            ) ) }
                        </div>
                    </div>
                </Card>
            </div>
            <div className="grid grid-cols-3 gap-4 max-sm:grid-cols-1 max-md:grid-cols-2 py-8">
                { filteredPrograms?.map((program) => (
                    <Link
                        key={ program.id }
                        target="_self"
                        rel="noopener noreferrer"
                        href={ `programs/${program.id}/${program.title.trim().replace(/[\s,]+/g, '-').toLowerCase()}` }
                    >
                        <ProgramCard
                            program={ program }
                        />
                    </Link>
            ))}
            </div>
        </>
    );
};
