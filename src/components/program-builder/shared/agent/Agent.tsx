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
import { useMemo, useCallback, useState, useRef, useLayoutEffect } from "react"
import type { RefObject } from "react"
import type { ChatStatus, FileUIPart } from "ai"
import { useIsMobile } from "@/hooks/use-mobile"
import {
    equipmentOptions,
    excludedAreasOptions,
    healthIssuesOptions,
} from "@/assets/constants/form-options"
import { TRAINING_PROFILE_UNSET_VALUE } from "@/components/account/training-profile-options"
import { quickModifyProgramSuggestionChips } from "@/assets/constants/suggestions"
import { inferDaysPerWeek, inferProgramLength } from "@/components/program-builder/utils/helpers"

import { toast } from "sonner"
import { useUserContext } from "@/contexts/UserContext"
import { useHevySecret } from "@/api/hooks"
import type { TStalematePreferenceKey } from "@/app/api/chat/sanity/types"
import {
    onChatThreadPointerCancel,
    onChatThreadPointerDown,
    onChatThreadPointerUp,
} from "@/components/program-builder/utils/chat-keyboard"
import { Chat } from "./Chat"
import { Navbar } from "./Navbar"
import { MessageBubbles } from "./MessageBubbles"
import { LiveAgentProgress } from "./LiveAgentProgress"
import { findHevyExportGateMessageId } from "./hevy-export-gate"
import { hevyExportGateCompleteToast } from "./HevyExportGate"

/** Props for the agent container (navbar, messages, chat input, and all filter/program/send state). */
interface IProps {
    search: string;
    sidebarPosition: "left" | "right";
    onTogglePosition: () => void;
    onToggleExpand: () => void;
    onToggleHide?: () => void;
    isExpanded: boolean;
    hevyProgram: THevyRoutine[];
    commitWithUndo: (
        next: THevyRoutine[],
        options?: import("@/components/program-builder/mutations/types").TCommitWithUndoOptions,
    ) => void;
    sex: string;
    age: string;
    daysPerWeek: string;
    specificDays: TSelectOption[];
    programLength: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12";
    workoutDuration: string;
    activityLevel: string;
    goals: TSelectOption[];
    specialization: TSelectOption[];
    equipment: TSelectOption[];
    focusAreas: TSelectOption[];
    difficultyLevel: TSelectOption[];
    excludeAreas: TSelectOption[];
    excludeEquipment: TSelectOption[];
    excludeSpecializations: TSelectOption[];
    healthIssues: TSelectOption[];
    splitType: string;
    exerciseVariability: string;
    progressionSystem: string;
    deloadWeek: string;
    peakWeek: string;
    warmupExercises: string;
    programTitle: string;
    explore: boolean;
    handleSex: (value: string) => void;
    handleAge: (value: string) => void;
    handleDaysPerWeek: (value: string) => void;
    handleSpecificDays: (value: TSelectOption[]) => void;
    handleProgramLength: (value: ""|"1"|"2"|"3"|"4"|"5"|"6"|"7"|"8"|"9"|"10"|"11"|"12") => void;
    handleWorkoutDuration: (value: string) => void;
    handleActivityLevel: (value: string) => void;
    handleGoals: (value: TSelectOption[]) => void;
    handleSpecialization: (value: TSelectOption[]) => void;
    handleEquipment: (value: TSelectOption[]) => void;
    handleFocusAreas: (value: TSelectOption[]) => void;
    handleDifficultyLevel: (value: TSelectOption[]) => void;
    handleExcludeAreas: (value: TSelectOption[]) => void;
    handleExcludeEquipment: (value: TSelectOption[]) => void;
    handleExcludeSpecializations: (value: TSelectOption[]) => void;
    handleHealthIssues: (value: TSelectOption[]) => void;
    handleSplitType: (value: string) => void;
    handleExerciseVariability: (value: string) => void;
    handleProgressionSystem: (value: string) => void;
    handleDeloadWeek: (value: string) => void;
    handlePeakWeek: (value: string) => void;
    handleWarmupExercises: (value: string) => void;
    handleProgramTitle: (value: string) => void;
    handleExplore: () => void;
    // AI agent state (lifted from Agent into parent)
    messages: TChatMessage[];
    setMessages: (messages: TChatMessage[] | ((messages: TChatMessage[]) => TChatMessage[])) => void;
    sendMessageWithContext: TSendMessageWithContext;
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
    lastAtomicBuildCommitKeyRef: RefObject<string | null>;
    appliedMutateProgramKeysRef: RefObject<Set<string>>;
    lastHevyShareImportKeyRef: RefObject<string | null>;
    /**
     * Persist slot is **Start** (this-session **Save**, clean, zero
     * **Program–Hevy links**). Gate copy follows that slot.
     */
    showStart?: boolean;
}

/** Renders Navbar, conversation area (empty state or MessageBubbles), loading status, and Chat. */
export const Agent: React.FC<IProps> = (props) => {

    const {
        sidebarPosition,
        onTogglePosition,
        onToggleExpand,
        onToggleHide,
        isExpanded,
        hevyProgram,
        commitWithUndo,
        daysPerWeek,
        programLength,
        excludeAreas,
        excludeEquipment,
        healthIssues,
        splitType,
        exerciseVariability,
        progressionSystem,
        deloadWeek,
        peakWeek,
        warmupExercises,
        sex,
        age,
        workoutDuration,
        activityLevel,
        difficultyLevel,
        handleSex,
        handleAge,
        handleDaysPerWeek,
        handleProgramLength,
        handleWorkoutDuration,
        handleActivityLevel,
        handleDifficultyLevel,
        handleExcludeAreas,
        handleExcludeEquipment,
        handleHealthIssues,
        handleSplitType,
        handleExerciseVariability,
        handleProgressionSystem,
        handleDeloadWeek,
        handlePeakWeek,
        handleWarmupExercises,
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
        lastAtomicBuildCommitKeyRef,
        appliedMutateProgramKeysRef,
        lastHevyShareImportKeyRef,
        showStart = false,
    } = props;

    const onPreferenceChange = useCallback((key: TStalematePreferenceKey, value: string) => {
        switch (key) {
            case "splitType":
                handleSplitType(value);
                return;
            case "exerciseVariability":
                handleExerciseVariability(value);
                return;
            case "deloadWeek":
                handleDeloadWeek(value);
                return;
            case "peakWeek":
                handlePeakWeek(value);
                return;
            case "warmupExercises":
                handleWarmupExercises(value);
                return;
        }
    }, [
        handleDeloadWeek,
        handleExerciseVariability,
        handlePeakWeek,
        handleSplitType,
        handleWarmupExercises,
    ]);

    const chatFooterRef = useRef<HTMLDivElement>(null);
    const [measuredFooterHeight, setMeasuredFooterHeight] = useState<number | null>(null);
    const isMobile = useIsMobile();
    const { user } = useUserContext();
    const { data: hevyApiKey } = useHevySecret(user);
    /** Both gate steps already satisfied - hide footer (no effect / no toast; toast is gate-complete). */
    const hevyExportPrerequisitesMet =
        user != null && Boolean(hevyApiKey && hevyApiKey.length > 0);

    useLayoutEffect(() => {
        if (!isMobile) return;
        const el = chatFooterRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            const height = entries[0]?.borderBoxSize?.[0]?.blockSize ?? entries[0]?.contentRect.height;
            if (height != null) setMeasuredFooterHeight(Math.max(220, height));
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, [isMobile]);

    const footerPad = isMobile && measuredFooterHeight != null ? measuredFooterHeight : undefined;

    // const [isFilters, setIsFilters] = useState(false)


    /** When the last message is assistant with getMoreInfoQuestions tool output, show questions in footer instead of input. */
    const activeQuestionsPayload = useMemo(() => {
        const lastAssistant = messages[messages.length - 1]
        if (!lastAssistant || lastAssistant.role !== "assistant" || !lastAssistant.parts?.length) return null
        const part = lastAssistant.parts.find(
            (p) =>
                typeof p === "object" && p !== null && "type" in p && (p as { type: string }).type === "tool-getMoreInfoQuestions",
        )
        const toolOutput = part && "output" in part
            ? (part as {
                output?: TQuestionsPayload & { questions?: TQuestion[] }
            }).output
            : undefined
        if (!toolOutput?.questions || !Array.isArray(toolOutput.questions) || toolOutput.questions.length === 0) {
            return null
        }
        const sessionAnswers: Record<string, string | string[]> = {}
        if (programLength) sessionAnswers["program-length"] = programLength
        if (daysPerWeek) sessionAnswers["days-per-week"] = daysPerWeek
        if (excludeEquipment?.length) sessionAnswers["exclude-equipment"] = excludeEquipment.map((o) => o.value)
        if (excludeAreas?.length) sessionAnswers["exclude-areas"] = excludeAreas.map((o) => o.value)
        if (healthIssues?.length) sessionAnswers["health-issues"] = healthIssues.map((o) => o.label).join(", ")
        if (splitType) sessionAnswers["split-type"] = splitType
        if (exerciseVariability) sessionAnswers["exercise-variability"] = exerciseVariability
        if (progressionSystem) sessionAnswers["progression-system"] = progressionSystem
        if (deloadWeek) sessionAnswers["deload-week"] = deloadWeek
        if (peakWeek) sessionAnswers["peak-week"] = peakWeek
        if (warmupExercises) sessionAnswers["warmup-exercises"] = warmupExercises
        if (age) sessionAnswers.age = age
        if (sex) sessionAnswers.sex = sex
        if (workoutDuration) sessionAnswers["session-duration"] = workoutDuration
        if (activityLevel) sessionAnswers["activity-level"] = activityLevel
        if (difficultyLevel[0]?.value) sessionAnswers["experience-level"] = difficultyLevel[0].value
        const initialAnswers = {
            ...(toolOutput.initialAnswers ?? {}),
            ...sessionAnswers,
        }
        return {
            questions: toolOutput.questions,
            userRequest: toolOutput.userRequest ?? "",
            reason: toolOutput.reason,
            allowSkip: toolOutput.allowSkip,
            completeAction: toolOutput.completeAction,
            initialAnswers: Object.keys(initialAnswers).length > 0 ? initialAnswers : undefined,
        }
    }, [
        messages,
        programLength,
        daysPerWeek,
        excludeAreas,
        excludeEquipment,
        healthIssues,
        splitType,
        exerciseVariability,
        progressionSystem,
        deloadWeek,
        peakWeek,
        warmupExercises,
        age,
        sex,
        workoutDuration,
        activityLevel,
        difficultyLevel,
    ])

    const [dismissedForMessageId, setDismissedForMessageId] = useState<string | null>(null)
    const [hevyGateDismissedForMessageId, setHevyGateDismissedForMessageId] = useState<string | null>(null)
    const [firstTimeGateSuppressed, setFirstTimeGateSuppressed] = useState(false)
    if (messages.length === 0 && firstTimeGateSuppressed) {
        setFirstTimeGateSuppressed(false)
    }
    const lastMessage = messages[messages.length - 1]
    /** Wait for stream end so agent text finishes before questionnaire covers the footer. */
    const showQuestionsPayload =
        activeQuestionsPayload &&
        !isLoading &&
        dismissedForMessageId !== lastMessage?.id &&
        !(activeQuestionsPayload.reason === "first-time" && firstTimeGateSuppressed)
            ? activeQuestionsPayload
            : null

    /** Questionnaire wins the footer - never swap Hevy gate over an active survey. */
    const hevyExportGateMessageId = useMemo(
        () => (showQuestionsPayload ? null : findHevyExportGateMessageId(messages)),
        [messages, showQuestionsPayload],
    )
    const showHevyExportGate =
        hevyExportGateMessageId != null &&
        hevyGateDismissedForMessageId !== hevyExportGateMessageId &&
        !hevyExportPrerequisitesMet

    const handleHevyExportGateDismiss = useCallback(() => {
        if (hevyExportGateMessageId) setHevyGateDismissedForMessageId(hevyExportGateMessageId)
    }, [hevyExportGateMessageId])

    const handleHevyExportGateComplete = useCallback(() => {
        if (!hevyExportGateMessageId) return
        toast.success(hevyExportGateCompleteToast(showStart))
        setHevyGateDismissedForMessageId(hevyExportGateMessageId)
    }, [hevyExportGateMessageId, showStart])

    const convertStringArrayToOptions = useCallback((values: string[], options: TSelectOption[]): TSelectOption[] => {
        return values
            .map((value) => options.find((opt) => opt.value === value))
            .filter((opt): opt is TSelectOption => opt !== undefined)
    }, [])

    const handleQuestionsComplete = useCallback(
        (answers: Record<string, string | string[]>) => {
            const completeAction = activeQuestionsPayload?.completeAction ?? "build"
            const userRequest = (activeQuestionsPayload?.userRequest ?? answers["userRequest"] ?? "") as string
            const readStr = (key: string) => {
                const v = answers[key]
                return typeof v === "string" ? v.trim() : ""
            }
            const ageAns = readStr("age")
            const sexRaw = readStr("sex")
            const sexAns = sexRaw === TRAINING_PROFILE_UNSET_VALUE ? "" : sexRaw
            const heightCmAns = readStr("height")
            const experienceLevelAns = readStr("experience-level")
            const physiquePhaseAns = readStr("physique-phase")
            const trainingFocusAns = readStr("training-focus")
            const activityLevelAns = readStr("activity-level")
            const sessionDurationAns = readStr("session-duration")

            if (ageAns) handleAge(ageAns)
            if (sexRaw) handleSex(sexAns)
            if (experienceLevelAns) {
                handleDifficultyLevel([{ label: experienceLevelAns, value: experienceLevelAns }])
            }
            if (activityLevelAns) handleActivityLevel(activityLevelAns)
            if (sessionDurationAns) handleWorkoutDuration(sessionDurationAns)

            if (completeAction === "save") {
                sendMessageWithContext(
                    { text: "I submitted my training profile." },
                    {
                        body: {
                            age: ageAns || undefined,
                            sex: sexAns || undefined,
                            heightCm: heightCmAns ? Number(heightCmAns) : undefined,
                            experienceLevel: experienceLevelAns || undefined,
                            physiquePhase: physiquePhaseAns || undefined,
                            trainingFocus: trainingFocusAns || undefined,
                            activityLevel: activityLevelAns || undefined,
                            sessionDurationMin: sessionDurationAns ? Number(sessionDurationAns) : undefined,
                        },
                    },
                )
                return
            }

            let programLengthValue: "" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12" = ""
            let daysPerWeekValue = ""
            let excludeEquipmentValue: TSelectOption[] = []
            let excludeAreasValue: TSelectOption[] = []
            let healthIssuesValue: TSelectOption[] = []

            if (answers["days-per-week"] && (answers["days-per-week"] as string).length > 0) {
                daysPerWeekValue = answers["days-per-week"] as string
            } else {
                daysPerWeekValue = daysPerWeek || inferDaysPerWeek(userRequest) || "6"
            }
            if (answers["exclude-equipment"] && Array.isArray(answers["exclude-equipment"])) {
                excludeEquipmentValue = convertStringArrayToOptions(answers["exclude-equipment"], equipmentOptions)
            }
            if (answers["exclude-areas"] && Array.isArray(answers["exclude-areas"])) {
                excludeAreasValue = convertStringArrayToOptions(answers["exclude-areas"], excludedAreasOptions)
            }
            const healthIssuesAnswer = answers["health-issues"]
            if (typeof healthIssuesAnswer === "string") {
                const trimmed = (healthIssuesAnswer as string).trim()
                if (trimmed) healthIssuesValue = [{ value: trimmed, label: trimmed }]
            } else if (healthIssuesAnswer && Array.isArray(healthIssuesAnswer)) {
                healthIssuesValue = convertStringArrayToOptions(healthIssuesAnswer, healthIssuesOptions)
            }
            if (answers["program-length"] && (answers["program-length"] as string).length > 0) {
                programLengthValue = answers["program-length"] as "" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "11" | "12"
            } else {
                programLengthValue = programLength || inferProgramLength(userRequest) || "12"
            }

            const splitTypeAns = readStr("split-type")
            if (splitTypeAns) handleSplitType(splitTypeAns)
            const exerciseVariabilityAns = readStr("exercise-variability")
            if (exerciseVariabilityAns) handleExerciseVariability(exerciseVariabilityAns)
            const progressionSystemAns = readStr("progression-system")
            if (progressionSystemAns) handleProgressionSystem(progressionSystemAns)
            const deloadWeekAns = readStr("deload-week")
            if (deloadWeekAns) handleDeloadWeek(deloadWeekAns)
            const peakWeekAns = readStr("peak-week")
            if (peakWeekAns) handlePeakWeek(peakWeekAns)
            const warmupExercisesAns = readStr("warmup-exercises")
            if (warmupExercisesAns) handleWarmupExercises(warmupExercisesAns)

            sendMessageWithContext(
                { text: "Build my program" },
                {
                    body: {
                        daysPerWeek: daysPerWeekValue ? Number(daysPerWeekValue) : undefined,
                        programLength: programLengthValue ? Number(programLengthValue) : undefined,
                        excludeAreas:
                            (excludeAreasValue.length
                                ? excludeAreasValue.map((area) => area.value).join(", ")
                                : excludeAreas?.map((area) => area.value).join(", ")) || undefined,
                        excludeEquipment:
                            (excludeEquipmentValue?.length
                                ? excludeEquipmentValue.map((eq) => eq.value).join(", ")
                                : excludeEquipment?.map((eq) => eq.value).join(", ")) || undefined,
                        healthIssues: healthIssuesValue?.length ? healthIssuesValue.map((issue) => issue.value).join(", ") : undefined,
                        splitType: (splitTypeAns || splitType.trim()) || undefined,
                        exerciseVariability: (exerciseVariabilityAns || exerciseVariability.trim()) || undefined,
                        progressionSystem: (progressionSystemAns || progressionSystem.trim()) || undefined,
                        deloadWeek: (deloadWeekAns || deloadWeek.trim()) || undefined,
                        peakWeek: (peakWeekAns || peakWeek.trim()) || undefined,
                        warmupExercises: (warmupExercisesAns || warmupExercises.trim()) || undefined,
                        age: ageAns || undefined,
                        sex: sexAns || undefined,
                        heightCm: heightCmAns ? Number(heightCmAns) : undefined,
                        experienceLevel: experienceLevelAns || undefined,
                        physiquePhase: physiquePhaseAns || undefined,
                        trainingFocus: trainingFocusAns || undefined,
                        activityLevel: activityLevelAns || undefined,
                        sessionDurationMin: sessionDurationAns ? Number(sessionDurationAns) : undefined,
                    },
                }
            )
            handleIsBuilding(true)
            handleDaysPerWeek(daysPerWeekValue)
            handleProgramLength(programLengthValue)
            if (excludeEquipmentValue.length > 0) handleExcludeEquipment(excludeEquipmentValue)
            if (excludeAreasValue.length > 0) handleExcludeAreas(excludeAreasValue)
            if (healthIssuesValue.length > 0) handleHealthIssues(healthIssuesValue)
        },
        [
            activeQuestionsPayload?.userRequest,
            activeQuestionsPayload?.completeAction,
            sendMessageWithContext,
            handleIsBuilding,
            handleSex,
            handleAge,
            handleDaysPerWeek,
            handleProgramLength,
            handleWorkoutDuration,
            handleActivityLevel,
            handleDifficultyLevel,
            handleExcludeAreas,
            handleExcludeEquipment,
            handleHealthIssues,
            handleSplitType,
            handleExerciseVariability,
            handleProgressionSystem,
            handleDeloadWeek,
            handlePeakWeek,
            handleWarmupExercises,
            convertStringArrayToOptions,
            daysPerWeek,
            programLength,
            excludeAreas,
            excludeEquipment,
            splitType,
            exerciseVariability,
            progressionSystem,
            deloadWeek,
            peakWeek,
            warmupExercises,
        ]
    )

    const handleQuestionsSkip = useCallback(() => {
        if (activeQuestionsPayload?.reason === "first-time") {
            setFirstTimeGateSuppressed(true)
        }
        sendMessageWithContext({ text: "Build my program" })
        handleIsBuilding(true)
    }, [activeQuestionsPayload?.reason, sendMessageWithContext, handleIsBuilding])

    const handleQuestionsDismiss = useCallback(() => {
        if (activeQuestionsPayload?.reason === "first-time") {
            setFirstTimeGateSuppressed(true)
        }
        if (lastMessage?.id) setDismissedForMessageId(lastMessage.id)
    }, [activeQuestionsPayload?.reason, lastMessage])

    return (
        <div className="flex flex-col h-full min-h-0">
            { /* The agent's navbar for toggling between chat and filters view */ }
            <Navbar
                onTogglePosition={onTogglePosition}
                onToggleExpand={onToggleExpand}
                onToggleHide={onToggleHide}
                isExpanded={isExpanded}
                sidebarPosition={sidebarPosition}
            />
            <div
                className="flex min-h-0 flex-1 flex-col max-sm:h-full"
                onPointerCancel={onChatThreadPointerCancel}
                onPointerDown={onChatThreadPointerDown}
                onPointerUp={onChatThreadPointerUp}
            >
            <Conversation className="flex-1 min-h-0 max-sm:h-full sm:overflow-hidden">
                <ConversationContent
                    data-proxima-conversation-pad=""
                    className="min-h-full max-sm:pb-55"
                    style={{ paddingBottom: footerPad }}
                >
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
                            hevyProgram={hevyProgram}
                            commitWithUndo={commitWithUndo}
                            daysPerWeek={daysPerWeek}
                            programLength={programLength}
                            excludeEquipment={excludeEquipment}
                            healthIssues={healthIssues}
                            sendMessage={sendMessageWithContext}
                            handleProgramLength={handleProgramLength}
                            handleDaysPerWeek={handleDaysPerWeek}
                            handleExcludeEquipment={handleExcludeEquipment}
                            handleHealthIssues={handleHealthIssues}
                            onPreferenceChange={onPreferenceChange}
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
                            lastAtomicBuildCommitKeyRef={lastAtomicBuildCommitKeyRef}
                            appliedMutateProgramKeysRef={appliedMutateProgramKeysRef}
                            lastHevyShareImportKeyRef={lastHevyShareImportKeyRef}
                            />
                        )}
                        <LiveAgentProgress
                            messages={messages}
                            status={chatStatus}
                            isLoading={isLoading}
                            className="mx-auto w-full max-w-3xl px-4 pt-2 md:px-6"
                        />
                    </>
                <div data-proxima-chat-keyboard-hide="">
                    <ConversationScrollButton className="absolute bottom-4 right-5 z-50 shadow-xs" />
                </div>
                </ConversationContent>
            </Conversation>
            </div>
            { /* The chat input is here */ }
            <Chat
                ref={chatFooterRef}
                isLoading={isLoading}
                handleSubmit={handleSubmit}
                handleStop={handleStop}
                showSuggestions={
                    messages.length === 0 && !showQuestionsPayload && !showHevyExportGate && !isLoading
                }
                suggestionChips={hevyProgram.length > 0 ? quickModifyProgramSuggestionChips : undefined}
                questionsPayload={showQuestionsPayload}
                onQuestionsComplete={handleQuestionsComplete}
                onQuestionsSkip={handleQuestionsSkip}
                onQuestionsDismiss={handleQuestionsDismiss}
                showHevyExportGate={showHevyExportGate}
                showStart={showStart}
                onHevyExportGateDismiss={handleHevyExportGateDismiss}
                onHevyExportGateComplete={handleHevyExportGateComplete}
                isBuilding={isBuilding}
            />
        </div>
    )
};
