"use client";

import { useState } from "react";
import { Badge } from "../ui/badge";
import { Slider } from "@/components/ui/slider";
import { ComboBox } from "../generic/ComboBox";

interface IProps {
    filter: TFilterGroupOption;
    appliedProgramLengthFilter: string;
    appliedWorkoutDurationFilter: string;
    appliedEquipmentFilter: string[];
    appliedDifficultyFilter: string[];
    appliedSpecializationFilter: string[];
    handleAppliedProgramLengthFilter: (appliedProgramLengthFilter: string) => void;
    handleAppliedWorkoutDurationFilter: (appliedWorkoutDurationFilter: string) => void;
    handleAppliedEquipmentFilter: (appliedEquipmentFilter: string[]) => void;
    handleAppliedSpecializationFilter: (appliedSpecializationFilter: string[]) => void;
    handleAppliedDifficultyFilter: (appliedDifficultyFilter: string[]) => void;
}

export const ProgramFilterGroup: React.FC<IProps> = (props) => {

    const {
        filter,
        appliedProgramLengthFilter,
        appliedWorkoutDurationFilter,
        appliedEquipmentFilter,
        appliedDifficultyFilter,
        appliedSpecializationFilter,
        handleAppliedProgramLengthFilter,
        handleAppliedWorkoutDurationFilter,
        handleAppliedEquipmentFilter,
        handleAppliedSpecializationFilter,
        handleAppliedDifficultyFilter,
    } = props;

    const [sliderValue, setSliderValue] = useState([60]);

    const handleSelectedFilters = (filterType: string) => {
        if (filter.type === "program_length") {
            handleAppliedProgramLengthFilter(filterType);
        } else if(filter.type === "workout_duration") {
            handleAppliedWorkoutDurationFilter(filterType);
        } else if (filter.type === "equipment") {
            if (appliedEquipmentFilter.includes(filterType)) {
                // remove filter if already selected
                handleAppliedEquipmentFilter(appliedEquipmentFilter.filter(item => item !== filterType));
            } else {
                handleAppliedEquipmentFilter([...appliedEquipmentFilter, filterType]);
            }
        } else if (filter.type === "specialization") {
            if (appliedSpecializationFilter.includes(filterType)) {
                // remove filter if already selected
                handleAppliedSpecializationFilter(appliedSpecializationFilter.filter(item => item !== filterType));
            } else {
                handleAppliedSpecializationFilter([...appliedSpecializationFilter, filterType]);
            }
        } else if (filter.type === "difficulty") {
            if (appliedDifficultyFilter.includes(filterType)) {
                // remove filter if already selected
                handleAppliedDifficultyFilter(appliedDifficultyFilter.filter(item => item !== filterType));
            } else {
                handleAppliedDifficultyFilter([...appliedDifficultyFilter, filterType]);
            }
        }
    };

    const badgeSelected = (filterType: string): boolean => {
        if (appliedProgramLengthFilter === filterType) {
            return true;
        } else if (appliedWorkoutDurationFilter === filterType) {
            return true;
        } else if (appliedEquipmentFilter.includes(filterType)) {
            return true;
        } else if (appliedSpecializationFilter.includes(filterType)) {
            return true;
        } else if (appliedDifficultyFilter.includes(filterType)) {
            return true;
        } else {
            return false;
        }
    };

    return (
        <div className="px-2 pt-4">
            <div className="text-sm">{filter.title}</div>
            { filter.component === "badge" ? (
                <div className="flex flex-row gap-2 flex-wrap pt-2">
                    { filter.values.map((filter) => {
                    return (
                        <Badge onClick={ () => handleSelectedFilters(filter) } key={ filter } className={ `p-2 cursor-pointer ${ badgeSelected(filter) ? "bg-[#37BCCF] hover:bg-[#37BCCF] text-white hover:text-white" : "bg-white hover:bg-white"}  ` }>{filter}</Badge>
                    );
                } ) }
                </div>
            ) : filter.component === "combobox" ?
            (
                <div className="pt-2">
                    <ComboBox value={ filter.type === "program_length" ? appliedProgramLengthFilter: filter.type === "workout_duration" ? appliedWorkoutDurationFilter : "" } handleSelectedFilters={ handleSelectedFilters } options={ filter.values } title={ filter.title } />
                </div>
            ) : filter.component === "slider" ?
            (
                <div className="py-4">
                    <Slider value={ sliderValue } onValueChange={ setSliderValue } max={ Number(filter.values[filter.values.length - 1]) } step={ 10 } />
                    { filter.title === "Workout Duration" && `${sliderValue} Mins` }
                </div>
            )
            :
            (
                <>
                    <ComboBox value={ filter.type === "program_length" ? appliedProgramLengthFilter: filter.type === "workout_duration" ? appliedWorkoutDurationFilter : "" } handleSelectedFilters={ handleSelectedFilters } options={ filter.values } title={ filter.title } />
                </>
            )
            }
        </div>
    );
};
