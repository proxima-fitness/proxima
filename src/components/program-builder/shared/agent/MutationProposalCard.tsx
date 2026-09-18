/**
 * @module MutationProposalCard
 *
 * Always-expanded review card for a **Mutation proposal** (ADR 0024 / 02).
 * Day file-headers, value-level was/now, batch Accept / Reject. No line-diff
 * counts. Reject sits far left; Accept far right.
 *
 * Depends on: mutation-proposal-copy, mutation-proposal-view, Button.
 * Used by: MessageBubbles.
 */
"use client";

import { Button } from "@/components/ui/button";
import type {
    TMutationProposalAction,
    TMutationProposalExercise,
    TMutationProposalRecipe,
    TMutationProposalSetRow,
} from "@/components/program-builder/utils/mutation-proposal-copy";
import {
    parseProposalAction,
    splitProposalHeading,
} from "@/components/program-builder/utils/mutation-proposal-view";

/** Props for the **Mutation proposal** recipe card. */
export interface IMutationProposalCardProps {
    onAccept?: () => void;
    onReject?: () => void;
    recipe: TMutationProposalRecipe;
    showActions: boolean;
}

interface IProposalActionStepProps {
    action: TMutationProposalAction;
    dayTitle: string;
}

interface IProposalExerciseStepProps {
    step: TMutationProposalExercise;
}

/**
 * Focus the visible program-builder chat textarea (Reject, C4).
 */
export function focusProgramBuilderChatInput(): void {
    const nodes = document.querySelectorAll<HTMLTextAreaElement>("[data-proxima-chat-input]");
    for (const node of nodes) {
        if (node.offsetParent !== null) {
            node.focus();
            return;
        }
    }
    nodes[0]?.focus();
}

const VALUE_FROM_CLASS =
    "text-red-700 line-through dark:text-red-400";
const VALUE_TO_CLASS =
    "font-medium text-green-700 dark:text-green-400";

/** Recipe card: Proposed changes, day files, Accept / Reject while open. */
export const MutationProposalCard: React.FC<IMutationProposalCardProps> = ({
    onAccept,
    onReject,
    recipe,
    showActions,
}) => {
    return (
        <div className="w-full pb-4">
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="px-4 py-3">
                    <p className="text-[13px] font-medium text-foreground">
                        Proposed changes
                    </p>
                </div>
                { recipe.days.map((day) => {
                    const heading = splitProposalHeading(day.heading);
                    return (
                        <section
                            key={ day.heading }
                            className="border-t border-border"
                        >
                            <div className="flex bg-muted/40">
                                <div
                                    aria-hidden
                                    className="w-[3px] shrink-0 bg-border"
                                />
                                <div className="min-w-0 px-4 py-2">
                                    { heading.weekPath ? (
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                            { heading.weekPath }
                                        </p>
                                    ) : null }
                                    { heading.dayTitle ? (
                                        <p className="text-[13px] font-semibold text-foreground">
                                            { heading.dayTitle }
                                        </p>
                                    ) : null }
                                </div>
                            </div>
                            <div className="flex flex-col gap-3 px-4 py-3">
                                { day.steps.map((step, stepIndex) => (
                                    step.kind === "action" ? (
                                        <ProposalActionStep
                                            key={ `${day.heading}-action-${stepIndex}` }
                                            action={ step }
                                            dayTitle={ heading.dayTitle }
                                        />
                                    ) : (
                                        <ProposalExerciseStep
                                            key={ `${day.heading}-exercise-${step.title}-${stepIndex}` }
                                            step={ step }
                                        />
                                    )
                                )) }
                            </div>
                        </section>
                    );
                }) }
                { showActions ? (
                    <div className="flex items-center justify-between border-t border-border px-4 py-3">
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="border-red-600 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                            onClick={ onReject }
                        >
                            Reject
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            className="bg-green-600 text-white hover:bg-green-700"
                            onClick={ onAccept }
                        >
                            Accept
                        </Button>
                    </div>
                ) : null }
            </div>
        </div>
    );
};

function ProposalActionStep({ action, dayTitle }: IProposalActionStepProps) {
    const view = parseProposalAction(action.text);
    if (view.kind === "plain") {
        return (
            <p className="text-[13px] text-foreground">
                { view.text }
            </p>
        );
    }

    const hideFrom = view.verb === "Notes" && view.from === dayTitle;

    return (
        <div className="flex flex-col gap-0.5">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                { view.verb }
            </p>
            { view.from && !hideFrom ? (
                <p className={ `text-[13px] ${VALUE_FROM_CLASS}` }>
                    { view.from }
                </p>
            ) : null }
            { view.to ? (
                <p className={ `text-[13px] ${VALUE_TO_CLASS}` }>
                    { view.to }
                </p>
            ) : null }
        </div>
    );
}

function ProposalExerciseStep({ step }: IProposalExerciseStepProps) {
    return (
        <div className="flex flex-col gap-1">
            <p className="text-[13px] font-semibold text-foreground">
                { step.title }
            </p>
            <ProposalSetTable rows={ step.setRows } />
        </div>
    );
}

function ProposalSetTable({ rows }: { rows: TMutationProposalSetRow[] }) {
    if (rows.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Set
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Was
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Now
            </p>
            { rows.map((row) => (
                <ProposalSetRow
                    key={ `${row.setLabel}-${row.from}-${row.to}` }
                    row={ row }
                />
            )) }
        </div>
    );
}

function ProposalSetRow({ row }: { row: TMutationProposalSetRow }) {
    return (
        <>
            <p className="text-xs text-muted-foreground">
                { row.setLabel }
            </p>
            <p className={ `text-xs tabular-nums ${VALUE_FROM_CLASS}` }>
                { row.from }
            </p>
            <p className={ `text-xs tabular-nums ${VALUE_TO_CLASS}` }>
                { row.to }
            </p>
        </>
    );
}
