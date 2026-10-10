// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Recipe-tap **Proposal jump** runs in the click, not a HevyRoutine effect.
 */
import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
    ProgramMutationProvider,
    useBuilderWeek,
    useProposalJump,
} from "@/contexts/ProgramMutationContext";

const program: THevyRoutine[] = [
    {
        id: "1",
        folder_id: 2,
        order: "1",
        title: "Push",
        notes: "",
        created_at: "",
        updated_at: "",
        exercises: [
            {
                index: 0,
                title: "Bench Press",
                notes: "",
                rest_seconds: "90",
                exercise_template_id: "ex-1",
                supersets_id: null,
                builder_exercise_key: 7,
                sets: [],
            },
        ],
    },
];

function JumpHarness() {
    const { requestProposalJump } = useProposalJump();
    const { weekIndex } = useBuilderWeek();
    return (
        <div>
            <div data-testid="week">{weekIndex}</div>
            <div data-builder-exercise-key="7">row</div>
            <button
                type="button"
                onClick={ () => {
                    requestProposalJump({
                        folderId: 2,
                        dayOrder: 1,
                        exerciseIndex: 0,
                        builderExerciseKey: 7,
                    });
                } }
            >
                jump
            </button>
        </div>
    );
}

describe("requestProposalJump", () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("switches the week and scrolls the marked row from the tap", () => {
        const scrollIntoView = vi.fn();
        HTMLElement.prototype.scrollIntoView = scrollIntoView;

        render(
            <ProgramMutationProvider
                program={ program }
                commitWithUndo={ vi.fn() }
                setProgramFromHydrate={ vi.fn() }
            >
                <JumpHarness />
            </ProgramMutationProvider>,
        );

        expect(screen.getByTestId("week").textContent).toBe("0");
        fireEvent.click(screen.getByRole("button", { name: "jump" }));
        expect(screen.getByTestId("week").textContent).toBe("2");
        expect(scrollIntoView).toHaveBeenCalled();
    });
});
