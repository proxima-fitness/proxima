"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface IStep {
    message: string;
    id: string;
    week?: number;
    day?: number;
}

interface IProgramStatus {
    message: string;
    isComplete: boolean;
    stepId?: string;
    completedStepMessage?: string;
}

interface IProgramAccordionProps {
    messages: Array<{ role: string; id: string; parts: Array<{ type: string; text?: string }> }>;
    isLoading: boolean;
    currentStatus: IProgramStatus;
    daysPerWeek: number;
    getProgramGenerationStatus: (text: string) => IProgramStatus;
    containsProgramJson: (text: string) => boolean;
}

export function ProgramAccordion({
    messages,
    isLoading,
    currentStatus,
    daysPerWeek,
    getProgramGenerationStatus,
    containsProgramJson,
}: IProgramAccordionProps) {
    const [completedSteps, setCompletedSteps] = useState<IStep[]>([]);
    const [expandedWeeks, setExpandedWeeks] = useState<Set<number>>(new Set());
    const lastStatusRef = useRef<string>('');
    const lastStepIdRef = useRef<string>('');
    const lastCompletedStepRef = useRef<string>('');

    // Helper function to group steps by week
    const groupStepsByWeek = useCallback((steps: IStep[]) => {
        const weeks: Record<number, IStep[]> = {};
        const otherSteps: IStep[] = [];

        steps.forEach((step) => {
            if (step.week !== undefined) {
                if (!weeks[step.week]) {
                    weeks[step.week] = [];
                }
                weeks[step.week].push(step);
            } else {
                otherSteps.push(step);
            }
        });

        // Sort days within each week
        Object.keys(weeks).forEach((weekKey) => {
            const weekNum = parseInt(weekKey, 10);
            weeks[weekNum].sort((a, b) => (a.day || 0) - (b.day || 0));
        });

        return { weeks, otherSteps };
    }, []);

    // Check if all days in a week are complete
    const isWeekComplete = useCallback((week: number, daysPerWeek: number): boolean => {
        const weekSteps = completedSteps.filter((step) => step.week === week);
        return weekSteps.length >= daysPerWeek;
    }, [completedSteps]);

    // Track completed steps from status updates
    useEffect(() => {
        if (!isLoading) {
            // Reset completed steps when not loading
            setCompletedSteps([]);
            lastStatusRef.current = '';
            lastStepIdRef.current = '';
            lastCompletedStepRef.current = '';
            return;
        }

        // Find the last assistant message with program JSON
        const lastAssistantMessage = [...messages].reverse().find(
            (msg) => msg.role === 'assistant' && msg.parts.some(
                (part) => part.type === 'text' && part.text && containsProgramJson(part.text)
            )
        );

        if (lastAssistantMessage) {
            const textPart = lastAssistantMessage.parts.find(
                (part) => part.type === 'text' && part.text && containsProgramJson(part.text)
            );

            if (textPart && textPart.type === 'text' && textPart.text) {
                const status = getProgramGenerationStatus(textPart.text);
                const currentStatusMessage = status.message;
                const currentStepId = status.stepId || '';

                // If we have a completed step message and it's different from the last one, add it
                if (status.completedStepMessage && status.completedStepMessage !== lastCompletedStepRef.current) {
                    setCompletedSteps((prev) => {
                        // Check if this step is already completed by message
                        const exists = prev.some((step) => step.message === status.completedStepMessage);
                        if (!exists && status.completedStepMessage) {
                            // Generate a unique ID based on the completed step message
                            const stepId = status.completedStepMessage.replace(/\s+/g, '-').toLowerCase();
                            lastCompletedStepRef.current = status.completedStepMessage;

                            // Parse week and day from message (e.g., "Week 1, Day 1 complete")
                            const weekMatch = status.completedStepMessage.match(/Week (\d+)/i);
                            const dayMatch = status.completedStepMessage.match(/Day (\d+)/i);
                            const week = weekMatch ? parseInt(weekMatch[1], 10) : undefined;
                            const day = dayMatch ? parseInt(dayMatch[1], 10) : undefined;

                            return [...prev, { message: status.completedStepMessage, id: stepId, week, day }];
                        }
                        return prev;
                    });
                }

                // Also check if the program is fully complete
                if (status.isComplete && status.message === 'Workout program generated') {
                    setCompletedSteps((prev) => {
                        const exists = prev.some((step) => step.message === status.message);
                        if (!exists) {
                            return [...prev, { message: status.message, id: 'final' }];
                        }
                        return prev;
                    });
                }

                lastStatusRef.current = currentStatusMessage;
                lastStepIdRef.current = currentStepId;
            }
        }
    }, [messages, isLoading, getProgramGenerationStatus, containsProgramJson]);

    // Auto-expand incomplete weeks and collapse completed weeks
    useEffect(() => {
        const { weeks } = groupStepsByWeek(completedSteps);

        setExpandedWeeks((prev) => {
            const newSet = new Set(prev);
            Object.keys(weeks).forEach((weekKey) => {
                const weekNum = parseInt(weekKey, 10);
                if (isWeekComplete(weekNum, daysPerWeek)) {
                    // Collapse completed weeks
                    newSet.delete(weekNum);
                } else {
                    // Expand incomplete weeks
                    newSet.add(weekNum);
                }
            });
            return newSet;
        });
    }, [completedSteps, daysPerWeek, isWeekComplete, groupStepsByWeek]);

    const { weeks, otherSteps } = groupStepsByWeek(completedSteps);
    const weekNumbers = Object.keys(weeks).map(Number).sort((a, b) => a - b);

    return (
        <div className="flex flex-col gap-2">
            {/* Show steps grouped by week in accordions */}
            {weekNumbers.map((weekNum) => {
                const weekSteps = weeks[weekNum];
                const isComplete = isWeekComplete(weekNum, daysPerWeek);
                const isExpanded = expandedWeeks.has(weekNum);

                return (
                    <div key={`week-${weekNum}`} className="border border-border/50 rounded-lg bg-muted/50">
                        <button
                            onClick={() => {
                                setExpandedWeeks((prev) => {
                                    const newSet = new Set(prev);
                                    if (isExpanded) {
                                        newSet.delete(weekNum);
                                    } else {
                                        newSet.add(weekNum);
                                    }
                                    return newSet;
                                });
                            }}
                            className="w-full flex items-center justify-between px-3 py-2 hover:bg-muted/70 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                {!isExpanded && isComplete && (
                                    <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                                )}
                                <span className="text-sm font-medium text-muted-foreground">
                                    Week {weekNum}
                                </span>
                            </div>
                            {isExpanded ? (
                                <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                        </button>
                        {isExpanded && (
                            <div className="px-3 pb-2 space-y-1">
                                {weekSteps.map((step) => (
                                    <div key={step.id} className="flex items-center gap-2 px-2 py-1.5">
                                        <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                                        <span className="text-sm text-muted-foreground">{step.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
            })}

            {/* Show other steps (non-week/day steps) */}
            {otherSteps.map((step) => (
                <div key={step.id} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border/50">
                    <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{step.message}</span>
                </div>
            ))}

            {/* Show current step - but not if it's already in completedSteps */}
            {currentStatus.message && !completedSteps.some((step) => step.message === currentStatus.message) && (
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {currentStatus.isComplete ? (
                            <>
                                <div className="h-2 w-2 rounded-full bg-green-500 flex-shrink-0" />
                                <span className="text-sm text-muted-foreground truncate">{currentStatus.message}</span>
                            </>
                        ) : (
                            <>
                                <div className="h-2 w-2 rounded-full bg-yellow-500 animate-pulse flex-shrink-0" />
                                <span className="text-sm text-muted-foreground truncate">{currentStatus.message}</span>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
