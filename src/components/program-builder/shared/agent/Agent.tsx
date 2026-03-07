/**
 * @module Agent
 * Program-builder chat container: Navbar, empty state or MessageBubbles, status shimmer, and Chat input. Composes filters/program state and useChat wiring from parent.
 * Depends on: Conversation, Chat, Navbar, MessageBubbles, Shimmer. Used by: BuildProgramClient (or parent that holds messages/sendMessage).
 */
"use client"

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { MessageSquare } from "lucide-react"
import { useMemo } from "react"
import { IOption } from "@/components/ui/multi-select"
import { type ChatStatus, FileUIPart, ChatRequestOptions, UIDataTypes, UIMessage, UITools } from "ai"

import { Shimmer } from "@/components/ai-elements/shimmer"
import { Chat } from "./Chat"
import { Navbar } from "./Navbar"
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

/** Props for the agent container (navbar, messages, chat input, and all filter/program/send state). */
interface IProps {
    search: string;
    sidebarPosition: "left" | "right";
    onTogglePosition: () => void;
    onToggleExpand: () => void;
    onToggleHide?: () => void;
    isExpanded: boolean;
    setHevyProgram: React.Dispatch<React.SetStateAction<THevyRoutine[]>>;
    hevyProgram: THevyRoutine[];
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
    /** Chat status from useChat; used for status label (e.g. "Reading your message…" vs "Responding…"). */
    status?: ChatStatus;
    handleSubmit: (text: string, files?: FileUIPart[]) => void;
    handleStop: () => void;
    onBuildComplete?: () => void;
}

/** Renders Navbar, conversation area (empty state or MessageBubbles), loading status, and Chat. */
export const Agent: React.FC<IProps> = (props) => {

    const {
        sidebarPosition,
        onTogglePosition,
        onToggleExpand,
        onToggleHide,
        isExpanded,
        setHevyProgram,
        hevyProgram,
        addToUndoStack,
        daysPerWeek,
        programLength,
        excludeEquipment,
        healthIssues,
        handleDaysPerWeek,
        handleProgramLength,
        handleExcludeEquipment,
        handleHealthIssues,
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
        status: chatStatus,
        handleSubmit,
        handleStop,
        onBuildComplete,
    } = props;


    // const [isFilters, setIsFilters] = useState(false)

    /** "Running a step…" | "Generating..." | "Thinking…" from last message part and chatStatus. */
    const statusLabel = useMemo(() => {
        if (!isLoading) return null
        const lastMessage = messages[messages.length - 1]
        const lastPart = lastMessage?.parts?.[lastMessage.parts?.length - 1]
        const toolState = lastPart && typeof lastPart === "object" && "state" in lastPart ? (lastPart as { state?: string }).state : undefined
        const isToolInProgress =
            lastMessage?.role === "assistant" &&
            (toolState === "input-available" || toolState === "input-streaming")
        const isStreamingContent =
            lastPart &&
            typeof lastPart === "object" &&
            "type" in lastPart &&
            ((lastPart as { type?: string }).type === "text" ||
                (lastPart as { type?: string }).type === "reasoning")
        if (isToolInProgress) return "Running a step…"
        if (chatStatus === "streaming" && isStreamingContent) return "Generating..."
        return "Thinking…"
    }, [isLoading, messages, chatStatus])

    return (
        <div className="flex flex-col h-[85vh] max-h-full min-h-0">
            { /* The agent's navbar for toggling between chat and filters view */ }
            <Navbar
                onTogglePosition={onTogglePosition}
                onToggleExpand={onToggleExpand}
                onToggleHide={onToggleHide}
                isExpanded={isExpanded}
                sidebarPosition={sidebarPosition}
            />
            <Conversation className={`flex-1 min-h-0 relative max-sm:h-full overflow-hidden`}>
                <ConversationContent className="min-h-full max-sm:pb-[220px]">
                    <>
                        {messages.length === 0 ? (
                            <ConversationEmptyState
                                icon={<MessageSquare className="size-12" />}
                                title="Start building your program"
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
                            excludeEquipment={excludeEquipment}
                            healthIssues={healthIssues}
                            sendMessage={sendMessageWithContext}
                            handleProgramLength={handleProgramLength}
                            handleDaysPerWeek={handleDaysPerWeek}
                            handleExcludeEquipment={handleExcludeEquipment}
                            handleHealthIssues={handleHealthIssues}
                            isBuilding={isBuilding}
                            handleIsBuilding={handleIsBuilding}
                            isLoading={isLoading}
                            status={chatStatus}
                            error={error}
                            onRetry={onRetry}
                            onClearError={onClearError}
                            retryCount={retryCount}
                            maxRetries={maxRetries}
                            onTimeoutError={onTimeoutError}
                            onBuildComplete={onBuildComplete}
                            />
                        )}
                        {isLoading && statusLabel && (
                            <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pt-2 md:px-6">
                                <Shimmer className="text-sm">{statusLabel}</Shimmer>
                            </div>
                        )}
                    </>
                <ConversationScrollButton className="absolute bottom-4 right-5 z-50 shadow-xs" />
                </ConversationContent>
            </Conversation>
            { /* The chat input is here */ }
            <Chat
                isLoading={isLoading}
                handleSubmit={handleSubmit}
                handleStop={handleStop}
                showSuggestions={messages.length === 0}
            />
        </div>
    )
};
