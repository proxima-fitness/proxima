import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { TMutationProposalRecipe } from "@/components/program-builder/utils/mutation-proposal-copy";
import { MutationProposalCard } from "@/components/program-builder/shared/agent/MutationProposalCard";

const week2Recipe: TMutationProposalRecipe = {
    days: [
        {
            heading: "Week 2, Upper Pull",
            steps: [
                {
                    kind: "action",
                    text: "Swap Romanian Deadlift for Seated Leg Curl",
                },
                {
                    kind: "exercise",
                    title: "Romanian Deadlift",
                    setRows: [
                        {
                            setLabel: "Sets 1-3",
                            from: "8 reps @ RPE 7",
                            to: "6 reps @ RPE 8",
                        },
                    ],
                },
            ],
        },
    ],
};

describe("MutationProposalCard", () => {
    afterEach(() => {
        cleanup();
    });

    it("renders the 01 recipe tree under Proposed changes, always expanded", () => {
        render(
            <MutationProposalCard
                recipe={ week2Recipe }
                showActions
                onAccept={ vi.fn() }
                onReject={ vi.fn() }
            />,
        );

        expect(screen.getByText("Proposed changes")).toBeTruthy();
        expect(screen.queryByText("Program modified")).toBeNull();
        expect(screen.getByText("Week 2")).toBeTruthy();
        expect(screen.getByText("Upper Pull")).toBeTruthy();
        expect(screen.getByText("Swap")).toBeTruthy();
        expect(screen.getByText("Seated Leg Curl")).toBeTruthy();
        expect(screen.getAllByText("Romanian Deadlift").length).toBeGreaterThan(0);
        expect(screen.getByText("Sets 1-3")).toBeTruthy();
        expect(screen.getByText("8 reps @ RPE 7")).toBeTruthy();
        expect(screen.getByText("6 reps @ RPE 8")).toBeTruthy();
        expect(screen.queryByLabelText(/expand/i)).toBeNull();
        expect(screen.queryByLabelText(/collapse/i)).toBeNull();
        expect(screen.queryByText("+1")).toBeNull();
        expect(screen.queryByText("−1")).toBeNull();
        expect(screen.queryByText("+15")).toBeNull();
    });

    it("shows Reject on the left and Accept on the right only while open", () => {
        const onAccept = vi.fn();
        const onReject = vi.fn();

        const { rerender } = render(
            <MutationProposalCard
                recipe={ week2Recipe }
                showActions
                onAccept={ onAccept }
                onReject={ onReject }
            />,
        );

        const reject = screen.getByRole("button", { name: "Reject" });
        const accept = screen.getByRole("button", { name: "Accept" });
        expect(reject.compareDocumentPosition(accept) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(reject.parentElement?.className).toContain("justify-between");

        fireEvent.click(accept);
        fireEvent.click(reject);
        expect(onAccept).toHaveBeenCalledOnce();
        expect(onReject).toHaveBeenCalledOnce();

        rerender(
            <MutationProposalCard
                recipe={ week2Recipe }
                showActions={ false }
            />,
        );

        expect(screen.getByText("Proposed changes")).toBeTruthy();
        expect(screen.getByText("Seated Leg Curl")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
    });

    it("does not render a replace onto the same exercise name", () => {
        render(
            <MutationProposalCard
                recipe={ {
                    days: [
                        {
                            heading: "Weeks 1-4, 4 - Push Day 2",
                            steps: [
                                {
                                    kind: "action",
                                    text: "Replace Incline Bench Press (Dumbbell) with Incline Bench Press (Dumbbell)",
                                },
                            ],
                        },
                    ],
                } }
                showActions={ false }
            />,
        );

        expect(screen.getByText("Proposed changes")).toBeTruthy();
        expect(screen.queryByText("Replace")).toBeNull();
        expect(screen.queryByText("Incline Bench Press (Dumbbell)")).toBeNull();
    });
});
