"use client";

import { useState, useReducer, useCallback, useMemo } from "react";
const DEFAULT_EXCLUDE_EQUIPMENT: TSelectOption[] = [
    { label: "Bodyweight", value: "bodyweight" },
    { label: "Band", value: "band" },
    { label: "Suspension", value: "suspension" },
    { label: "Resistance band", value: "resistance_band" },
    { label: "Plate", value: "plate" },
    { label: "Other", value: "other" },
    { label: "None", value: "none" },
];

export type TProgramLengthOption = "" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12";

export interface IUseProgramRequestStateOptions {
    empty?: string;
    search?: string;
}

/**
 * Holds all filter / program-request state and derives TTextToJsonRequest during render.
 * Used by BuildProgram to avoid a large inline state block and to shrink agentPropsCommon.
 */
export function useProgramRequestState(options: IUseProgramRequestStateOptions = {}) {
    const { empty = "", search = "" } = options;

    const [sex, setSex] = useState<string>("");
    const [age, setAge] = useState<string>("");
    const [daysPerWeek, setDaysPerWeek] = useState<string>("");
    const [specificDays, setSpecificDays] = useState<TSelectOption[]>([]);
    const [programLength, setProgramLength] = useState<TProgramLengthOption>("");
    const [workoutDuration, setWorkoutDuration] = useState<string>("");
    const [activityLevel, setActivityLevel] = useState<string>("");
    const [goals, setGoals] = useState<TSelectOption[]>([]);
    const [specialization, setSpecialization] = useState<TSelectOption[]>([]);
    const [equipment, setEquipment] = useState<TSelectOption[]>([]);
    const [focusAreas, setFocusAreas] = useState<TSelectOption[]>([]);
    const [difficultyLevel, setDifficultyLevel] = useState<TSelectOption[]>([]);
    const [excludeAreas, setExcludeAreas] = useState<TSelectOption[]>([]);
    const [excludeEquipment, setExcludeEquipment] = useState<TSelectOption[]>(() => DEFAULT_EXCLUDE_EQUIPMENT);
    const [excludeSpecializations, setExcludeSpecializations] = useState<TSelectOption[]>([]);
    const [healthIssues, setHealthIssues] = useState<TSelectOption[]>([]);
    const [splitType, setSplitType] = useState<string>("");
    const [exerciseVariability, setExerciseVariability] = useState<string>("");
    const [progressionSystem, setProgressionSystem] = useState<string>("");
    const [deloadWeek, setDeloadWeek] = useState<string>("");
    const [peakWeek, setPeakWeek] = useState<string>("");
    const [warmupExercises, setWarmupExercises] = useState<string>("");
    const [explore, toggleExplore] = useReducer((prev: boolean) => !prev, true);
    const [programTitle, setProgramTitle] = useState("My Proxima Program");

    const request = useMemo(
        () =>
            ({
                empty,
                search,
                sex,
                age,
                daysPerWeek,
                specificDays: specificDays.map((opt) => opt.value).join(", "),
                programLength,
                workoutDuration,
                activityLevel,
                goals: goals.map((opt) => opt.value).join(", "),
                specialization: specialization.map((opt) => opt.value).join(", "),
                equipment: equipment.map((opt) => opt.value).join(", "),
                focusAreas: focusAreas.map((opt) => opt.value).join(", "),
                difficultyLevel: difficultyLevel.map((opt) => opt.value).join(", "),
                excludeAreas: excludeAreas.map((opt) => opt.value).join(", "),
                excludeEquipment: excludeEquipment.map((opt) => opt.value).join(", "),
                excludeSpecializations: excludeSpecializations.map((opt) => opt.value).join(", "),
                healthIssues: healthIssues.map((opt) => opt.value).join(", "),
                splitType,
                exerciseVariability,
                progressionSystem,
                deloadWeek,
                peakWeek,
                warmupExercises,
                programTitle,
                explore: explore ? "true" : "false",
            }) as TTextToJsonRequest,
        [
            empty,
            search,
            sex,
            age,
            daysPerWeek,
            specificDays,
            programLength,
            workoutDuration,
            activityLevel,
            goals,
            specialization,
            equipment,
            focusAreas,
            difficultyLevel,
            excludeAreas,
            excludeEquipment,
            excludeSpecializations,
            healthIssues,
            splitType,
            exerciseVariability,
            progressionSystem,
            deloadWeek,
            peakWeek,
            warmupExercises,
            programTitle,
            explore,
        ]
    );

    const handleSex = useCallback((value: string) => setSex(value), []);
    const handleAge = useCallback((value: string) => setAge(value), []);
    const handleDaysPerWeek = useCallback((value: string) => setDaysPerWeek(value), []);
    const handleSpecificDays = useCallback((value: TSelectOption[]) => setSpecificDays(value), []);
    const handleProgramLength = useCallback((value: TProgramLengthOption) => setProgramLength(value), []);
    const handleWorkoutDuration = useCallback((value: string) => setWorkoutDuration(value), []);
    const handleActivityLevel = useCallback((value: string) => setActivityLevel(value), []);
    const handleGoals = useCallback((value: TSelectOption[]) => setGoals(value), []);
    const handleSpecialization = useCallback((value: TSelectOption[]) => setSpecialization(value), []);
    const handleEquipment = useCallback((value: TSelectOption[]) => setEquipment(value), []);
    const handleFocusAreas = useCallback((value: TSelectOption[]) => setFocusAreas(value), []);
    const handleDifficultyLevel = useCallback((value: TSelectOption[]) => setDifficultyLevel(value), []);
    const handleExcludeAreas = useCallback((value: TSelectOption[]) => setExcludeAreas(value), []);
    const handleExcludeEquipment = useCallback((value: TSelectOption[]) => setExcludeEquipment(value), []);
    const handleExcludeSpecializations = useCallback((value: TSelectOption[]) => setExcludeSpecializations(value), []);
    const handleHealthIssues = useCallback((value: TSelectOption[]) => setHealthIssues(value), []);
    const handleSplitType = useCallback((value: string) => setSplitType(value), []);
    const handleExerciseVariability = useCallback((value: string) => setExerciseVariability(value), []);
    const handleProgressionSystem = useCallback((value: string) => setProgressionSystem(value), []);
    const handleDeloadWeek = useCallback((value: string) => setDeloadWeek(value), []);
    const handlePeakWeek = useCallback((value: string) => setPeakWeek(value), []);
    const handleWarmupExercises = useCallback((value: string) => setWarmupExercises(value), []);
    const handleProgramTitle = useCallback((value: string) => setProgramTitle(value), []);
    const handleExplore = useCallback(() => toggleExplore(), []);

    return {
        // State
        sex,
        age,
        daysPerWeek,
        specificDays,
        programLength,
        workoutDuration,
        activityLevel,
        goals,
        specialization,
        equipment,
        focusAreas,
        difficultyLevel,
        excludeAreas,
        excludeEquipment,
        excludeSpecializations,
        healthIssues,
        splitType,
        exerciseVariability,
        progressionSystem,
        deloadWeek,
        peakWeek,
        warmupExercises,
        programTitle,
        explore,
        // Derived
        request,
        // Setters (for effects that infer filters, e.g. initial-prompt)
        setDaysPerWeek,
        setProgramLength,
        setExcludeAreas,
        setExcludeEquipment,
        setHealthIssues,
        // Handlers (stable callbacks for Agent / forms)
        handleSex,
        handleAge,
        handleDaysPerWeek,
        handleSpecificDays,
        handleProgramLength,
        handleWorkoutDuration,
        handleActivityLevel,
        handleGoals,
        handleSpecialization,
        handleEquipment,
        handleFocusAreas,
        handleDifficultyLevel,
        handleExcludeAreas,
        handleExcludeEquipment,
        handleExcludeSpecializations,
        handleHealthIssues,
        handleSplitType,
        handleExerciseVariability,
        handleProgressionSystem,
        handleDeloadWeek,
        handlePeakWeek,
        handleWarmupExercises,
        handleProgramTitle,
        handleExplore,
    };
}
