/**
 * @module ProgramStalemateCard
 *
 * Ordinary-user **Program stalemate** card (ADR 0027 / 01). Why it failed,
 * miss-specific chips or buttons, plus type-in-composer. Chip click persists
 * that exact Constraint profile string then sends a user message. Not a
 * Mutation proposal.
 *
 * Depends on: stalemate helpers, user-constraints, Button.
 * Used by: MessageBubbles.
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import {
    emptyUserConstraintProfileRecord,
    getUserConstraints,
    saveUserConstraintProfile,
} from "@/api/user-constraints";
import { Button } from "@/components/ui/button";
import { captureAiToolError } from "@/lib/capture-ai-tool-error";
import { useUserContext } from "@/contexts/UserContext";
import {
    FIX_IT_MESSAGE,
    MAKE_LATER_WEEKS_DIFFERENT_MESSAGE,
    removeConstraintString,
    SAME_WEEK_SKIP_MESSAGE,
    STALEMATE_ERROR,
    USER_REQUESTED_EXCEPTION_MESSAGE,
} from "@/app/api/chat/sanity/stalemate";
import type {
    IProgramStalematePayload,
    TProgramStalemateChip,
    TStalemateChipField,
} from "@/app/api/chat/sanity/types";
import { focusProgramBuilderChatInput } from "./MutationProposalCard";

const BODY_KEY: Record<TStalemateChipField, string> = {
    injuries: "healthIssues",
    excludedEquipment: "excludeEquipment",
    excludedAreas: "excludeAreas",
};

/** Props for the Program stalemate card. */
export interface IProgramStalemateCardProps {
    excludeEquipment: TSelectOption[];
    getChatId?: () => string;
    handleExcludeEquipment: (value: TSelectOption[]) => void;
    handleHealthIssues: (value: TSelectOption[]) => void;
    healthIssues: TSelectOption[];
    payload: IProgramStalematePayload;
    sendMessage: TSendMessageWithContext;
    tool?: "buildWeek" | "mutateProgram";
    toolCallId?: string;
    toolOutput?: unknown;
}

function sessionValues(options: TSelectOption[]): string[] {
    return options.map((option) => option.value);
}

/**
 * Program stalemate actions: constraint chips, same-week skip, or training
 * user-stated exception. Click is a user message. They can still type.
 */
export const ProgramStalemateCard: React.FC<IProgramStalemateCardProps> = ({
    excludeEquipment,
    getChatId,
    handleExcludeEquipment,
    handleHealthIssues,
    healthIssues,
    payload,
    sendMessage,
    tool = "buildWeek",
    toolCallId,
    toolOutput,
}) => {
    const { user } = useUserContext();
    const queryClient = useQueryClient();
    const [busy, setBusy] = useState(false);

    // PostHog ai_tool_error must fire when the card replaces calm Recalculating copy.
    useEffect(() => {
        captureAiToolError({
            tool,
            output: toolOutput ?? { error: STALEMATE_ERROR, stalemate: payload },
            chatSessionId: getChatId?.(),
            userId: user?.id,
            toolCallId,
        });
    }, [getChatId, payload, tool, toolCallId, toolOutput, user?.id]);

    const sendUserText = useCallback((text: string, body?: Record<string, string>) => {
        focusProgramBuilderChatInput();
        void sendMessage({ text }, body ? { body } : undefined);
    }, [sendMessage]);

    const persistChip = useCallback(async (chip: TProgramStalemateChip) => {
        if (busy) return;
        setBusy(true);
        const injuries = sessionValues(healthIssues);
        const equipment = sessionValues(excludeEquipment);
        const sessionByField: Record<TStalemateChipField, string[]> = {
            injuries,
            excludedEquipment: equipment,
            excludedAreas: [],
        };

        if (user) {
            try {
                const existing = await getUserConstraints(user.id);
                const base = existing ?? {
                    ...emptyUserConstraintProfileRecord(),
                    injuries,
                    excludedEquipment: equipment,
                };
                await saveUserConstraintProfile(user.id, {
                    ...base,
                    [chip.field]: removeConstraintString(base[chip.field], chip.value),
                    rawStatements: existing?.rawStatements ?? [],
                });
                await queryClient.invalidateQueries({ queryKey: ["user-constraints", user.id] });
            } catch {
                // Session body + handlers still carry this User-stated change.
            }
        }

        if (chip.field === "injuries") {
            handleHealthIssues(
                healthIssues.filter((option) => option.value.toLowerCase() !== chip.value.toLowerCase()),
            );
        }
        if (chip.field === "excludedEquipment") {
            handleExcludeEquipment(
                excludeEquipment.filter((option) => option.value.toLowerCase() !== chip.value.toLowerCase()),
            );
        }

        const remaining = removeConstraintString(sessionByField[chip.field], chip.value);
        sendUserText(
            `I no longer have this constraint: ${chip.value}`,
            { [BODY_KEY[chip.field]]: remaining.join(", ") },
        );
        setBusy(false);
    }, [
        busy,
        excludeEquipment,
        handleExcludeEquipment,
        handleHealthIssues,
        healthIssues,
        queryClient,
        sendUserText,
        user,
    ]);

    return (
        <div className="mx-auto w-full max-w-3xl px-4 md:px-6 pt-2">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="px-4 py-3">
                    <p className="text-[13px] font-medium text-foreground">
                        Couldn&apos;t land this program
                    </p>
                    <p className="mt-1 text-[13px] text-muted-foreground">
                        { payload.why }
                    </p>
                </div>
                <div className="flex flex-col gap-2 border-t border-border px-4 py-3">
                    { payload.kind === "constraint" && payload.chips.length > 0 ? (
                        payload.chips.map((chip) => (
                            <Button
                                key={ `${chip.field}:${chip.value}` }
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={ busy }
                                onClick={ () => void persistChip(chip) }
                            >
                                { chip.value }
                            </Button>
                        ))
                    ) : null }
                    { payload.kind === "weekCoverage" ? (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={ () => sendUserText(SAME_WEEK_SKIP_MESSAGE) }
                            >
                                { SAME_WEEK_SKIP_MESSAGE }
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={ () => sendUserText(MAKE_LATER_WEEKS_DIFFERENT_MESSAGE) }
                            >
                                { MAKE_LATER_WEEKS_DIFFERENT_MESSAGE }
                            </Button>
                        </>
                    ) : null }
                    { payload.kind === "training" ? (
                        <>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={ () => sendUserText(USER_REQUESTED_EXCEPTION_MESSAGE) }
                            >
                                { USER_REQUESTED_EXCEPTION_MESSAGE }
                            </Button>
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={ () => sendUserText(FIX_IT_MESSAGE) }
                            >
                                { FIX_IT_MESSAGE }
                            </Button>
                        </>
                    ) : null }
                    <p className="text-[12px] text-muted-foreground">
                        Or type a different ask below.
                    </p>
                </div>
            </div>
        </div>
    );
};
