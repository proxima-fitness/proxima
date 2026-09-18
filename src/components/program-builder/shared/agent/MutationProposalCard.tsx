/**
 * @module MutationProposalCard
 *
 * Always-expanded recipe card for a **Mutation proposal** (ADR 0024 / 02).
 * Renders the 01 copy tree with Accept / Reject while the batch is open.
 *
 * Depends on: mutation-proposal-copy, Button. Used by: MessageBubbles.
 */
"use client";

import { Button } from "@/components/ui/button";
import type { TMutationProposalRecipe } from "@/components/program-builder/utils/mutation-proposal-copy";

/** Props for the **Mutation proposal** recipe card. */
export interface IMutationProposalCardProps {
    onAccept?: () => void;
    onReject?: () => void;
    recipe: TMutationProposalRecipe;
    showActions: boolean;
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

/** Recipe card: Proposed changes, day groups, Accept / Reject while open. */
export const MutationProposalCard: React.FC<IMutationProposalCardProps> = ({
    onAccept,
    onReject,
    recipe,
    showActions,
}) => {
    return (
        <div className="w-full pb-4">
            <div className="flex flex-col p-4 gap-3 bg-muted/50 rounded-2xl border border-border">
                <p className="font-medium text-sm text-foreground">
                    Proposed changes
                </p>
                <div className="flex flex-col gap-3">
                    { recipe.days.map((day) => (
                        <div key={ day.heading } className="flex flex-col gap-1.5">
                            <p className="text-sm font-medium text-foreground">
                                { day.heading }
                            </p>
                            <div className="flex flex-col gap-1.5 pl-1">
                                { day.steps.map((step, stepIndex) => (
                                    step.kind === "action" ? (
                                        <p
                                            key={ `${day.heading}-action-${stepIndex}` }
                                            className="text-sm text-foreground"
                                        >
                                            { step.text }
                                        </p>
                                    ) : (
                                        <div
                                            key={ `${day.heading}-exercise-${step.title}-${stepIndex}` }
                                            className="flex flex-col gap-0.5"
                                        >
                                            <p className="text-sm text-foreground">
                                                { step.title }
                                            </p>
                                            { step.setRows.map((row) => (
                                                <p
                                                    key={ `${step.title}-${row.setLabel}` }
                                                    className="text-sm text-muted-foreground pl-3"
                                                >
                                                    <span className="text-foreground">{ row.setLabel }</span>
                                                    { " " }
                                                    <span>{ row.from }</span>
                                                    { " → " }
                                                    <span>{ row.to }</span>
                                                </p>
                                            )) }
                                        </div>
                                    )
                                )) }
                            </div>
                        </div>
                    )) }
                </div>
                { showActions ? (
                    <div className="flex items-center gap-2 pt-1">
                        <Button type="button" size="sm" onClick={ onAccept }>
                            Accept
                        </Button>
                        <Button type="button" size="sm" variant="outline" onClick={ onReject }>
                            Reject
                        </Button>
                    </div>
                ) : null }
            </div>
        </div>
    );
};
