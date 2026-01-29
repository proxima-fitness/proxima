"use client"


import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from "@/components/ui/chat-container"

import { useState, useEffect, useRef, useCallback } from "react"
import { ScrollButton } from "@/components/ui/scroll-button"
import { IOption } from "@/components/ui/multi-select"

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Filters } from "./Filters"
import { Chat } from "./Chat"
import { Navbar } from "./Navbar"
import { Thinking } from "./Thinking"
import { MessageBubbles } from "./MessageBubbles"

interface IProps {
    search: string;
    sidebarPosition: "left" | "right";
    onTogglePosition: () => void;
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    hevyProgram: THevyRoutine[];
    sex: string;
    age: string;
    daysPerWeek: string;
    specificDays: IOption[];
    programLength: string;
    workoutDuration: string;
    activityLevel: string;
    goals: IOption[];
    specialization: IOption[];
    equipment: IOption[];
    focusAreas: IOption[];
    difficultyLevel: IOption[];
    excludeAreas: IOption[];
    excludeEquipment: IOption[];
    excludeSpecializations: IOption[];
    healthIssues: IOption[];
    programTitle: string;
    explore: boolean;
    handleSex: (value: string) => void;
    handleAge: (value: string) => void;
    handleDaysPerWeek: (value: string) => void;
    handleSpecificDays: (value: IOption[]) => void;
    handleProgramLength: (value: string) => void;
    handleWorkoutDuration: (value: string) => void;
    handleActivityLevel: (value: string) => void;
    handleGoals: (value: IOption[]) => void;
    handleSpecialization: (value: IOption[]) => void;
    handleEquipment: (value: IOption[]) => void;
    handleFocusAreas: (value: IOption[]) => void;
    handleDifficultyLevel: (value: IOption[]) => void;
    handleExcludeAreas: (value: IOption[]) => void;
    handleExcludeEquipment: (value: IOption[]) => void;
    handleExcludeSpecializations: (value: IOption[]) => void;
    handleHealthIssues: (value: IOption[]) => void;
    handleProgramTitle: (value: string) => void;
    handleExplore: () => void;
}

export const Agent: React.FC<IProps> = (props) => {

    const {
        search,
        sidebarPosition,
        onTogglePosition,
        setHevyProgram,
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
        programTitle,
        explore,
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
        handleProgramTitle,
        handleExplore,
    } = props;


    const [input, setInput] = useState("");
    const [generationError, setGenerationError] = useState<Error | null>(null);
    const [retryCount, setRetryCount] = useState(0);
    const [isBuilding, setIsBuilding] = useState(false);
    const MAX_RETRIES = 2;

    const { messages, sendMessage, status, stop, error } = useChat({
      transport: new DefaultChatTransport({
        api: '/api/chat',
      }),
      onError: (err) => {
        console.error('Chat error:', err);
        setGenerationError(err);
        setIsBuilding(false);
      },
    });

    // Derive error state from useChat error - no need for effect, just use the error directly
    // The onError callback already handles setting generationError, but we also
    // check useChat's error for cases where the error comes through the hook
    const activeError = generationError || error || null;

    const isSubmitted = status === 'submitted';
    const isStreaming = status === 'streaming';
    const isLoading = isSubmitted || isStreaming;

    const [isFilters, setIsFilters] = useState(false)
    // Track if initial search has been triggered for this component instance
    const initialSearchOccurred = useRef<boolean>(false);
    const sendMessageRef = useRef(sendMessage);

    // Keep sendMessage ref in sync
    useEffect(() => {
        sendMessageRef.current = sendMessage;
    }, [sendMessage]);

    // Initialize with search parameter if present
    useEffect(() => {
        // Only send if we have a search value, haven't sent it yet in this instance, and sendMessage is available
        if (search && search.trim().length > 0 && !initialSearchOccurred.current && sendMessageRef.current) {
            initialSearchOccurred.current = true;
            sendMessageRef.current({ text: search });
        }
    }, [search]);


    const handleSubmit = () => {
        if (!input.trim()) return

        sendMessage({ text: input });
        setInput('');
    }

    const handleStop = () => {
        stop();
        setIsBuilding(false);
    }

    const handleIsBuilding = useCallback((isBuilding: boolean) => {
        setIsBuilding(isBuilding);
    }, []);

    // Handle retry when generation fails
    const handleRetry = useCallback(() => {
        if (retryCount < MAX_RETRIES) {
            setGenerationError(null);
            setRetryCount(prev => prev + 1);
            setIsBuilding(true);
            sendMessage({ text: "Build my program" });
        }
    }, [retryCount, sendMessage]);

    // Clear error state (used when user wants to start fresh or use fallback)
    const handleClearError = useCallback(() => {
        setGenerationError(null);
        setRetryCount(0);
        setIsBuilding(false);
    }, []);

    // Handle timeout error - called when no progress is made for 45 seconds
    const handleTimeoutError = useCallback(() => {
        console.error('Workout generation timed out - no progress for 45 seconds');
        setGenerationError(new Error('Generation timed out. The AI took too long to respond.'));
        setIsBuilding(false);
        stop(); // Stop the current request
    }, [stop]);


    return (
        <div className="flex flex-col h-[85vh] max-sm:pb-[100px]">
            { /* The agent's navbar for toggling between chat and filters view */ }
            <Navbar
                isFilters={isFilters}
                setIsFilters={setIsFilters}
                onTogglePosition={onTogglePosition}
                sidebarPosition={sidebarPosition}
            />
            <ChatContainerRoot className={`flex-1 relative max-sm:h-full ${isFilters ? "overflow-hidden" : "overflow-y-auto"}`}>
                <ChatContainerContent className="h-full max-sm:pb-[220px]">
                {isFilters ? (
                    <Filters
                        sex={sex}
                        age={age}
                        excludeAreas={excludeAreas}
                        excludeEquipment={excludeEquipment}
                        healthIssues={healthIssues}
                        programLength={programLength}
                        daysPerWeek={daysPerWeek}
                        specificDays={specificDays}
                        workoutDuration={workoutDuration}
                        activityLevel={activityLevel}
                        goals={goals}
                        specialization={specialization}
                        equipment={equipment}
                        focusAreas={focusAreas}
                        difficultyLevel={difficultyLevel}
                        excludeSpecializations={excludeSpecializations}
                        programTitle={programTitle}
                        explore={explore}
                        handleSex={handleSex}
                        handleAge={handleAge}
                        handleDaysPerWeek={handleDaysPerWeek}
                        handleSpecificDays={handleSpecificDays}
                        handleProgramLength={handleProgramLength}
                        handleWorkoutDuration={handleWorkoutDuration}
                        handleActivityLevel={handleActivityLevel}
                        handleGoals={handleGoals}
                        handleSpecialization={handleSpecialization}
                        handleEquipment={handleEquipment}
                        handleFocusAreas={handleFocusAreas}
                        handleDifficultyLevel={handleDifficultyLevel}
                        handleExcludeAreas={handleExcludeAreas}
                        handleExcludeEquipment={handleExcludeEquipment}
                        handleExcludeSpecializations={handleExcludeSpecializations}
                        handleHealthIssues={handleHealthIssues}
                        handleProgramTitle={handleProgramTitle}
                        handleExplore={handleExplore}
                    />
                ) : (
                    <>
                        <MessageBubbles
                            messages={messages}
                            setHevyProgram={setHevyProgram}
                            daysPerWeek={daysPerWeek}
                            programLength={programLength}
                            sendMessage={sendMessage}
                            handleProgramLength={handleProgramLength}
                            handleDaysPerWeek={handleDaysPerWeek}
                            handleExcludeEquipment={handleExcludeEquipment}
                            handleHealthIssues={handleHealthIssues}
                            isBuilding={isBuilding}
                            handleIsBuilding={handleIsBuilding}
                            isLoading={isLoading}
                            error={activeError}
                            onRetry={handleRetry}
                            onClearError={handleClearError}
                            retryCount={retryCount}
                            maxRetries={MAX_RETRIES}
                            onTimeoutError={handleTimeoutError}
                            />
                        {isSubmitted && <Thinking />}
                    </>
                )
                }
                <div className="absolute bottom-4 right-5 z-50">
                    <ScrollButton className="shadow-sm" />
                </div>
                <ChatContainerScrollAnchor />
                </ChatContainerContent>
            </ChatContainerRoot>
            { /* The chat input is here */ }
            <Chat
                isLoading={isLoading}
                input={input}
                setInput={setInput}
                handleSubmit={handleSubmit}
                handleStop={handleStop}
            />
        </div>
    )
};
