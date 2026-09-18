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
        expect(screen.getByText("Week 2, Upper Pull")).toBeTruthy();
        expect(screen.getByText("Swap Romanian Deadlift for Seated Leg Curl")).toBeTruthy();
        expect(screen.getByText("Romanian Deadlift")).toBeTruthy();
        expect(screen.getByText("Sets 1-3")).toBeTruthy();
        expect(screen.getByText("8 reps @ RPE 7")).toBeTruthy();
        expect(screen.getByText("6 reps @ RPE 8")).toBeTruthy();
        expect(screen.queryByLabelText(/expand/i)).toBeNull();
        expect(screen.queryByLabelText(/collapse/i)).toBeNull();
    });

    it("shows Accept and Reject only while the proposal is open", () => {
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

        fireEvent.click(screen.getByRole("button", { name: "Accept" }));
        fireEvent.click(screen.getByRole("button", { name: "Reject" }));
        expect(onAccept).toHaveBeenCalledOnce();
        expect(onReject).toHaveBeenCalledOnce();

        rerender(
            <MutationProposalCard
                recipe={ week2Recipe }
                showActions={ false }
            />,
        );

        expect(screen.getByText("Proposed changes")).toBeTruthy();
        expect(screen.getByText("Swap Romanian Deadlift for Seated Leg Curl")).toBeTruthy();
        expect(screen.queryByRole("button", { name: "Accept" })).toBeNull();
        expect(screen.queryByRole("button", { name: "Reject" })).toBeNull();
    });
});
