"use client"


import { ChatContainerRoot, ChatContainerContent, ChatContainerScrollAnchor } from "@/components/ui/chat-container"

import { useState, useEffect, useRef } from "react"
import { ScrollButton } from "@/components/ui/scroll-button"
import { IOption } from "@/components/ui/multi-select"

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Filters } from "./Filters"
import { Chat } from "./Chat"
import { Navbar } from "./Navbar"
import { Analyzing } from "./Analyzing"
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

    const { search, sidebarPosition, onTogglePosition, setHevyProgram, hevyProgram, sex, age, daysPerWeek, specificDays, programLength, workoutDuration, activityLevel, goals, specialization, equipment, focusAreas, difficultyLevel, excludeAreas, excludeEquipment, excludeSpecializations, healthIssues, programTitle, explore, handleSex, handleAge, handleDaysPerWeek, handleSpecificDays, handleProgramLength, handleWorkoutDuration, handleActivityLevel, handleGoals, handleSpecialization, handleEquipment, handleFocusAreas, handleDifficultyLevel, handleExcludeAreas, handleExcludeEquipment, handleExcludeSpecializations, handleHealthIssues, handleProgramTitle, handleExplore } = props;

    const [input, setInput] = useState("");
    const { messages, sendMessage, status, stop } = useChat({
      transport: new DefaultChatTransport({
        api: '/api/chat',
        fetch: async (url, options) => {
          const body = options?.body ? JSON.parse(options.body as string) : {};
          // Pass daysPerWeek and other relevant params to the chat API
          body.hevyProgram = hevyProgram;
          body.daysPerWeek = daysPerWeek ? Number(daysPerWeek) : undefined;
          body.programLength = programLength ? Number(programLength) : undefined;
          body.excludeAreas = excludeAreas.length > 0 ? excludeAreas.map(area => area.value).join(', ') : undefined;
          body.excludeEquipment = excludeEquipment.length > 0 ? excludeEquipment.map(eq => eq.value).join(', ') : undefined;
          body.healthIssues = healthIssues.length > 0 ? healthIssues.map(issue => issue.value).join(', ') : undefined;
          return fetch(url, {
            ...options,
            body: JSON.stringify(body),
          });
        },
      }),
    });
    const isSubmitted = status === 'submitted';
    const isStreaming = status === 'streaming';
    const isLoading = isSubmitted || isStreaming;

    const [isFilters, setIsFilters] = useState(false)
    const hasSentInitialMessage = useRef<boolean>(false);
    const sendMessageRef = useRef(sendMessage);

    // Keep sendMessage ref in sync
    useEffect(() => {
        sendMessageRef.current = sendMessage;
    }, [sendMessage]);

    // Initialize with search parameter if present
    useEffect(() => {
        // Only send if we have a search value, haven't sent it yet in this instance, and sendMessage is available
        if (search && search.trim().length > 0 && !hasSentInitialMessage.current && sendMessageRef.current) {
            // On initial mount with search parameter, always send the message
            // This ensures fresh navigation from home page always triggers sendMessage
            hasSentInitialMessage.current = true;
            if (typeof window !== 'undefined') {
                sessionStorage.setItem('lastSentSearch', search);
            }
            sendMessageRef.current({ text: search });
        }
    }, [search]);


    const handleSubmit = () => {
        if (!input.trim()) return

        sendMessage({ text: input });
        setInput('');
    }



    return (
        <div className="flex flex-col h-[85vh] max-sm:h-full">
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
                            sendMessage={sendMessage}
                            handleProgramLength={handleProgramLength}
                            handleDaysPerWeek={handleDaysPerWeek}
                            handleExcludeEquipment={handleExcludeEquipment}
                            handleHealthIssues={handleHealthIssues} />
                        {isSubmitted && <Analyzing />}
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
                stop={stop}
            />
        </div>
    )
};
