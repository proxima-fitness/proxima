"use client";

/*
 * @module ProgramFilterGroup
 * @description Reusable filter section for the program search UI: comboboxes or multi-select chip toggles.
 * @dependsOn ComboBox, ToggleGroup, higher-level program filter state from the parent search component.
 * @usedBy `ProgramSearch` to present grouped filters for program length, workout duration, equipment, specialization, and difficulty.
 */

/**
 * Props for `ProgramFilterGroup`.
 * @property filter Filter configuration describing title, type, component style, and option values.
 * @property appliedProgramLengthFilter Currently selected program length filter value.
 * @property appliedWorkoutDurationFilter Currently selected workout duration filter value.
 * @property appliedEquipmentFilter List of selected equipment filters.
 * @property appliedDifficultyFilter List of selected difficulty filters.
 * @property appliedSpecializationFilter List of selected specialization filters.
 * @property handleAppliedProgramLengthFilter Setter for the program length filter.
 * @property handleAppliedWorkoutDurationFilter Setter for the workout duration filter.
 * @property handleAppliedEquipmentFilter Setter for the equipment filter list.
 * @property handleAppliedSpecializationFilter Setter for the specialization filter list.
 * @property handleAppliedDifficultyFilter Setter for the difficulty filter list.
 * @property headingAlign Optional alignment for section title and chip row (row 1 uses center).
 */
import { ComboBox } from "../generic/ComboBox";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

interface IProps {
    filter: TFilterGroupOption;
    headingAlign?: "center" | "start";
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
        headingAlign = "start",
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

    const handleSelectedFilters = (filterType: string) => {
        if (filter.type === "program_length") {
            handleAppliedProgramLengthFilter(filterType);
        } else if (filter.type === "workout_duration") {
            handleAppliedWorkoutDurationFilter(filterType);
        }
    };

    const multiValue =
        filter.type === "equipment"
            ? appliedEquipmentFilter
            : filter.type === "specialization"
              ? appliedSpecializationFilter
              : filter.type === "difficulty"
                ? appliedDifficultyFilter
                : [];

    return (
        <div className={ cn("min-w-0", headingAlign === "center" && "flex flex-col items-center") }>
            <div
                className={ cn(
                    "w-full text-xs font-medium uppercase tracking-wide text-muted-foreground",
                    headingAlign === "center" && "text-center",
                ) }
            >
                { filter.title }
            </div>
            { filter.component === "badge" ? (
                <ToggleGroup
                    type="multiple"
                    value={ multiValue }
                    onValueChange={ (next) => {
                        if (filter.type === "equipment") {
                            handleAppliedEquipmentFilter(next);
                        } else if (filter.type === "specialization") {
                            handleAppliedSpecializationFilter(next);
                        } else if (filter.type === "difficulty") {
                            handleAppliedDifficultyFilter(next);
                        }
                    } }
                    className={ cn(
                        "mt-3 flex flex-wrap gap-2",
                        headingAlign === "center" ? "justify-center" : "justify-start",
                    ) }
                >
                    { filter.values.map((opt) => (
                        <ToggleGroupItem
                            key={ opt }
                            value={ opt }
                            aria-label={ opt }
                            className={ cn(
                                "h-auto min-h-9 rounded-full border-0 px-3 py-1.5 text-sm font-medium text-foreground shadow-none transition-colors",
                                "data-[state=off]:bg-muted/40 data-[state=off]:ring-1 data-[state=off]:ring-black/[0.05] data-[state=off]:hover:bg-muted/60",
                                "data-[state=off]:dark:bg-muted/25 data-[state=off]:dark:ring-white/10 data-[state=off]:dark:hover:bg-muted/40",
                                "data-[state=on]:bg-lightSecondary data-[state=on]:text-white data-[state=on]:ring-0",
                                "data-[state=on]:hover:bg-lightSecondary/90 data-[state=on]:hover:text-white",
                            ) }
                        >
                            { opt }
                        </ToggleGroupItem>
                    )) }
                </ToggleGroup>
            ) : (
                <div className={ cn("mt-3 w-full", headingAlign === "center" && "flex justify-center") }>
                    <ComboBox
                        value={
                            filter.type === "program_length"
                                ? appliedProgramLengthFilter
                                : filter.type === "workout_duration"
                                  ? appliedWorkoutDurationFilter
                                  : ""
                        }
                        handleSelectedFilters={ handleSelectedFilters }
                        options={ filter.values }
                        title={ filter.title }
                    />
                </div>
            ) }
        </div>
    );
};
