"use client"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { MessageSquare } from "lucide-react"
import { useState } from "react"
import { IOption } from "@/components/ui/multi-select"
import { FileUIPart, ChatRequestOptions, UIDataTypes, UIMessage, UITools } from "ai"

import { Filters } from "./Filters"
import { Chat } from "./Chat"
import { Navbar } from "./Navbar"
import { Thinking } from "./Thinking"
import { MessageBubbles } from "./MessageBubbles"

type SendMessageWithContext = (message?: (Omit<UIMessage<unknown, UIDataTypes, UITools>, "id" | "role"> & {
    id?: string;
    role?: "system" | "user" | "assistant";
} & {
    text?: never;
    files?: never;
    messageId?: string;
}) | {
    text: string;
    files?: FileList | FileUIPart[];
    metadata?: unknown;
    parts?: never;
    messageId?: string;
} | {
    files: FileList | FileUIPart[];
    metadata?: unknown;
    parts?: never;
    messageId?: string;
}, options?: ChatRequestOptions) => Promise<void>;

interface IProps {
    search: string;
    sidebarPosition: "left" | "right";
    onTogglePosition: () => void;
    onToggleExpand: () => void;
    isExpanded: boolean;
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    hevyProgram: THevyRoutine[];
    hevyProgramRef?: React.MutableRefObject<THevyRoutine[]>;
    addToUndoStack: (inversePatch: import("fast-json-patch").Operation[]) => void;
    sex: string;
    age: string;
    daysPerWeek: string;
    specificDays: IOption[];
    programLength: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12";
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
    handleProgramLength: (value: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12") => void;
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
    // AI agent state (lifted from Agent into parent)
    messages: UIMessage<unknown, UIDataTypes, UITools>[];
    setMessages: (messages: UIMessage<unknown, UIDataTypes, UITools>[] | ((messages: UIMessage<unknown, UIDataTypes, UITools>[]) => UIMessage<unknown, UIDataTypes, UITools>[])) => void;
    sendMessageWithContext: SendMessageWithContext;
    isBuilding: boolean;
    handleIsBuilding: (isBuilding: boolean) => void;
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
    onClearError: () => void;
    retryCount: number;
    maxRetries: number;
    onTimeoutError: () => void;
    isSubmitted: boolean;
    input: string;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    handleSubmit: () => void;
    handleStop: () => void;
}

export const Agent: React.FC<IProps> = (props) => {

    const {
        sidebarPosition,
        onTogglePosition,
        onToggleExpand,
        isExpanded,
        setHevyProgram,
        hevyProgram,
        addToUndoStack,
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
        messages,
        setMessages,
        sendMessageWithContext,
        isBuilding,
        handleIsBuilding,
        isLoading,
        error,
        onRetry,
        onClearError,
        retryCount,
        maxRetries,
        onTimeoutError,
        isSubmitted,
        input,
        setInput,
        handleSubmit,
        handleStop,
    } = props;


    const [isFilters, setIsFilters] = useState(false)

    return (
        <div className="flex flex-col h-[85vh] max-sm:pb-[100px]">
            { /* The agent's navbar for toggling between chat and filters view */ }
            <Navbar
                isFilters={isFilters}
                setIsFilters={setIsFilters}
                onTogglePosition={onTogglePosition}
                onToggleExpand={onToggleExpand}
                isExpanded={isExpanded}
                sidebarPosition={sidebarPosition}
            />
            <Conversation className={`flex-1 relative max-sm:h-full ${isFilters ? "overflow-hidden" : "overflow-y-auto"}`}>
                <ConversationContent className="min-h-full max-sm:pb-[220px]">
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
                        {messages.length === 0 ? (
                            <ConversationEmptyState
                                icon={<MessageSquare className="size-12" />}
                                title="Start a conversation"
                                description="Type a message below to begin chatting"
                            />
                        ) : (
                        <MessageBubbles
                            messages={messages}
                            setMessages={setMessages}
                            setHevyProgram={setHevyProgram}
                            hevyProgram={hevyProgram}
                            addToUndoStack={addToUndoStack}
                            daysPerWeek={daysPerWeek}
                            programLength={programLength}
                            sendMessage={sendMessageWithContext}
                            handleProgramLength={handleProgramLength}
                            handleDaysPerWeek={handleDaysPerWeek}
                            handleExcludeEquipment={handleExcludeEquipment}
                            handleHealthIssues={handleHealthIssues}
                            isBuilding={isBuilding}
                            handleIsBuilding={handleIsBuilding}
                            isLoading={isLoading}
                            error={error}
                            onRetry={onRetry}
                            onClearError={onClearError}
                            retryCount={retryCount}
                            maxRetries={maxRetries}
                            onTimeoutError={onTimeoutError}
                            />
                        )}
                        {isSubmitted && <Thinking />}
                    </>
                )
                }
                <ConversationScrollButton className="absolute bottom-4 right-5 z-50 shadow-xs" />
                </ConversationContent>
            </Conversation>
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
