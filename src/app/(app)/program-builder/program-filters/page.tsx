'use client'

import { ConversationPromptInput } from "@/components/program-builder/shared/ConversationPromptInput"
import { inferDaysPerWeek } from "@/components/program-builder/utils";
import { IOption } from "@/components/ui/multi-select";
import { useIsHevy } from "@/contexts/HevyContext";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useReducer, useRef } from "react";
import { useState } from "react";

function ProgramFiltersContent() {
    const search = useSearchParams().get("search") || "";

    const { setIsHevy } = useIsHevy();

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
    const [explore, toggleExplore] = useReducer(prev => !prev, true);
    const [programTitle, setProgramTitle] = useState("My AI Program");

    const messages: TMessage[] = [];
    const [chatMessages, setChatMessages] = useState(messages)
    const [reasoningText, setReasoningText] = useState("")
    const [isStreaming, setIsStreaming] = useState(false)

    const submitRef = useRef<HTMLAnchorElement>(null);
    const searchRef = useRef<string | null>(null);

    useEffect(() => {
        setIsHevy(workoutSchema === "hevy" ? true : false);
    }, [workoutSchema, setIsHevy]);

    // Handle inferring days per week from search
    useEffect(() => {
        const inferred = inferDaysPerWeek(search);
        if (inferred && !daysPerWeek) {
            setDaysPerWeek(inferred);
        }
    }, [search, daysPerWeek]);

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
        if (programTitle) params.append("programTitle", programTitle);
        if (explore) params.append("explore", "true");

        return params.toString();
    };

    // Simulated streaming function
    const simulateReasoningStream = async ( setText: (text: string) => void, setIsStreaming: (streaming: boolean) => void ) => {
        const reasoning = `Thank you for your message. Based on previous interactions, opening the 'Advanced Settings Filters' panel is the correct next step. I will now open it so the user can improve their workout program.`;

        setIsStreaming(true)
        setText("")

        // Simulate character-by-character streaming
        for (let i = 0; i <= reasoning.length; i++) {
        setText(reasoning.slice(0, i))
        await new Promise((resolve) => setTimeout(resolve, 20))
        }

        setIsStreaming(false)
    };

    useEffect(() => {
        // Only run once when search changes and hasn't been submitted yet

            const handleGenerateReasoning = () => {
                simulateReasoningStream(setReasoningText, setIsStreaming)
            };

            const handleSubmit = () => {
                // Add user message immediately
                const newUserMessage: TMessage = {
                    id: chatMessages.length + 1,
                    role: "user",
                    content: search.trim(),
                }

                setChatMessages(prev => [...prev, newUserMessage])

                handleGenerateReasoning();

            }

            if (search && searchRef.current === null) {
                handleSubmit();
                searchRef.current = search;
            }

    }, [search, chatMessages.length]);

    return (
        <div className="bg-white dark:bg-darkGray max-h-screen">
            <Suspense fallback={ null }>
                <ConversationPromptInput
                    sex={sex}
                    setSex={setSex}

                    age={age}
                    setAge={setAge}

                    daysPerWeek={daysPerWeek}
                    setDaysPerWeek={setDaysPerWeek}

                    specificDays={specificDays}
                    setSpecificDays={setSpecificDays}

                    programLength={programLength}
                    setProgramLength={setProgramLength}

                    workoutDuration={workoutDuration}
                    setWorkoutDuration={setWorkoutDuration}

                    activityLevel={activityLevel}
                    setActivityLevel={setActivityLevel}

                    goals={goals}
                    setGoals={setGoals}

                    specialization={specialization}
                    setSpecialization={setSpecialization}

                    equipment={equipment}
                    setEquipment={setEquipment}

                    focusAreas={focusAreas}
                    setFocusAreas={setFocusAreas}

                    difficultyLevel={difficultyLevel}
                    setDifficultyLevel={setDifficultyLevel}

                    excludeAreas={excludeAreas}
                    setExcludeAreas={setExcludeAreas}

                    excludeEquipment={excludeEquipment}
                    setExcludeEquipment={setExcludeEquipment}

                    excludeSpecializations={excludeSpecializations}
                    setExcludeSpecializations={setExcludeSpecializations}

                    healthIssues={healthIssues}
                    setHealthIssues={setHealthIssues}

                    workoutSchema={workoutSchema}
                    setWorkoutSchema={setWorkoutSchema}

                    submitRef={ submitRef }
                    search={search}
                    chatMessages={chatMessages}
                    isStreaming={isStreaming}
                    reasoningText={reasoningText}

                    toggleAdvancedSettingsOpen={toggleAdvancedSettingsOpen}
                    advancedSettingsOpen={advancedSettingsOpen}

                    explore={explore}
                    toggleExplore={toggleExplore}
                    programTitle={programTitle}
                    setProgramTitle={setProgramTitle}
                    handleDefineQueryParams={handleDefineQueryParams}
                    />
            </Suspense>
        </div>
    )
}

export default function ProgramFilters() {
    return (
        <Suspense fallback={<div className="bg-white max-h-screen flex items-center justify-center">Loading...</div>}>
            <ProgramFiltersContent />
        </Suspense>
    )
}
