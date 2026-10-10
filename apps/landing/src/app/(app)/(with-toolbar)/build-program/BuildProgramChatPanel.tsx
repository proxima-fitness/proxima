// SPDX-License-Identifier: AGPL-3.0-only

"use client";

import { memo } from "react";
import type { RefObject } from "react";
import type { ChatStatus, FileUIPart } from "ai";
import { Agent } from "@/components/program-builder/shared/agent/Agent";
import { Spinner } from "@/components/ui/spinner";
import type { useProgramRequestState } from "./use-program-request-state";
import type { TCommitWithUndoOptions } from "@/components/program-builder/mutations/types";

type TProgramRequest = ReturnType<typeof useProgramRequestState>;

export interface IProps {
    search: string;
    hevyProgram: THevyRoutine[];
    commitWithUndo: (next: THevyRoutine[], options?: TCommitWithUndoOptions) => void;
    programRequest: TProgramRequest;
    messages: TChatMessage[];
    setMessages: (
        messages:
            | TChatMessage[]
            | ((msgs: TChatMessage[]) => TChatMessage[]),
    ) => void;
    sendMessageWithContext: Parameters<typeof Agent>[0]["sendMessageWithContext"];
    isBuilding: boolean;
    handleIsBuilding: (isBuilding: boolean) => void;
    isLoading: boolean;
    error: Error | null;
    onRetry: () => void;
    onClearError: () => void;
    retryCount: number;
    maxRetries: number;
    onTimeoutError: () => void;
    status?: ChatStatus;
    handleSubmit: (text: string, files?: FileUIPart[]) => void;
    handleStop: () => void;
    onBuildComplete?: () => void;
    lastAtomicBuildCommitKeyRef: RefObject<string | null>;
    appliedMutateProgramKeysRef: RefObject<Set<string>>;
    lastHevyShareImportKeyRef: RefObject<string | null>;
    /** Toolbar **Start** is visible — gate-complete toast says **Start**. */
    showStart?: boolean;

    sidebarPosition: "left" | "right";
    onTogglePosition: () => void;
    onToggleExpand: () => void;
    onToggleHide?: () => void;
    isExpanded: boolean;
    /** True while `?chat=` history is loading (avoids empty transcript flash). */
    chatHistoryLoading?: boolean;
}

function BuildProgramChatPanelInner({
    search,
    hevyProgram,
    commitWithUndo,
    programRequest,
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
    status,
    handleSubmit,
    handleStop,
    onBuildComplete,
    lastAtomicBuildCommitKeyRef,
    appliedMutateProgramKeysRef,
    lastHevyShareImportKeyRef,
    showStart = false,
    sidebarPosition,
    onTogglePosition,
    onToggleExpand,
    onToggleHide,
    isExpanded,
    chatHistoryLoading = false,
}: IProps) {
    return (
        <div className="relative flex h-full min-h-0 flex-col">
            {chatHistoryLoading && (
                <div
                    className="absolute inset-0 z-10 flex items-center justify-center bg-background/80"
                    aria-busy="true"
                    aria-label="Loading chat history"
                >
                    <Spinner size="large" />
                </div>
            )}
        <Agent
            search={search}
            hevyProgram={hevyProgram}
            commitWithUndo={commitWithUndo}
            sex={programRequest.sex}
            age={programRequest.age}
            daysPerWeek={programRequest.daysPerWeek}
            specificDays={programRequest.specificDays}
            programLength={programRequest.programLength}
            workoutDuration={programRequest.workoutDuration}
            activityLevel={programRequest.activityLevel}
            goals={programRequest.goals}
            specialization={programRequest.specialization}
            equipment={programRequest.equipment}
            focusAreas={programRequest.focusAreas}
            difficultyLevel={programRequest.difficultyLevel}
            excludeAreas={programRequest.excludeAreas}
            excludeEquipment={programRequest.excludeEquipment}
            excludeSpecializations={programRequest.excludeSpecializations}
            healthIssues={programRequest.healthIssues}
            splitType={programRequest.splitType}
            exerciseVariability={programRequest.exerciseVariability}
            progressionSystem={programRequest.progressionSystem}
            deloadWeek={programRequest.deloadWeek}
            peakWeek={programRequest.peakWeek}
            warmupExercises={programRequest.warmupExercises}
            programTitle={programRequest.programTitle}
            explore={programRequest.explore}
            handleSex={programRequest.handleSex}
            handleAge={programRequest.handleAge}
            handleDaysPerWeek={programRequest.handleDaysPerWeek}
            handleSpecificDays={programRequest.handleSpecificDays}
            handleProgramLength={programRequest.handleProgramLength}
            handleWorkoutDuration={programRequest.handleWorkoutDuration}
            handleActivityLevel={programRequest.handleActivityLevel}
            handleGoals={programRequest.handleGoals}
            handleSpecialization={programRequest.handleSpecialization}
            handleEquipment={programRequest.handleEquipment}
            handleFocusAreas={programRequest.handleFocusAreas}
            handleDifficultyLevel={programRequest.handleDifficultyLevel}
            handleExcludeAreas={programRequest.handleExcludeAreas}
            handleExcludeEquipment={programRequest.handleExcludeEquipment}
            handleExcludeSpecializations={programRequest.handleExcludeSpecializations}
            handleHealthIssues={programRequest.handleHealthIssues}
            handleSplitType={programRequest.handleSplitType}
            handleExerciseVariability={programRequest.handleExerciseVariability}
            handleProgressionSystem={programRequest.handleProgressionSystem}
            handleDeloadWeek={programRequest.handleDeloadWeek}
            handlePeakWeek={programRequest.handlePeakWeek}
            handleWarmupExercises={programRequest.handleWarmupExercises}
            handleProgramTitle={programRequest.handleProgramTitle}
            handleExplore={programRequest.handleExplore}
            messages={messages}
            setMessages={setMessages}
            sendMessageWithContext={sendMessageWithContext}
            isBuilding={isBuilding}
            handleIsBuilding={handleIsBuilding}
            isLoading={isLoading}
            error={error}
            onRetry={onRetry}
            onClearError={onClearError}
            retryCount={retryCount}
            maxRetries={maxRetries}
            onTimeoutError={onTimeoutError}
            status={status}
            handleSubmit={handleSubmit}
            handleStop={handleStop}
            onBuildComplete={onBuildComplete}
            lastAtomicBuildCommitKeyRef={lastAtomicBuildCommitKeyRef}
            appliedMutateProgramKeysRef={appliedMutateProgramKeysRef}
            lastHevyShareImportKeyRef={lastHevyShareImportKeyRef}
            showStart={showStart}
            sidebarPosition={sidebarPosition}
            onTogglePosition={onTogglePosition}
            onToggleExpand={onToggleExpand}
            onToggleHide={onToggleHide}
            isExpanded={isExpanded}
        />
        </div>
    );
}

export const BuildProgramChatPanel = memo(BuildProgramChatPanelInner);
