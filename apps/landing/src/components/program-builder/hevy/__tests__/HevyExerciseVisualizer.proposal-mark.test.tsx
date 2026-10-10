// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Proposal mark gutter on builder exercise rows (ADR 0024 / 05).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { HevyExerciseVisualizer } from "../HevyExerciseVisualizer";

const proposalMarkKeys = new Set<number>();

vi.mock("@/contexts/PoundsOrKgContext", () => ({
    usePoundsOrKgContext: () => ({ isInLbs: true }),
}));

vi.mock("@/contexts/ProgramMutationContext", () => ({
    useIsDayLocked: () => false,
    useProposalMarkKeys: () => proposalMarkKeys,
}));

vi.mock("@/hooks/use-media-query", () => ({
    useMediaQuery: () => false,
}));

vi.mock("../HevyExerciseGif", () => ({
    HevyExerciseGif: () => <span data-testid="exercise-gif" />,
}));

vi.mock("../HevyExerciseDetailsDialog", () => ({
    HevyExerciseDetailsDialog: () => null,
}));

const makeExercise = (overrides: Partial<THevyExercise> = {}): THevyExercise => ({
    index: 0,
    title: "Chest Press (Machine)",
    notes: "",
    rest_seconds: "90",
    exercise_template_id: "ex-1",
    supersets_id: null,
    sets: [],
    ...overrides,
});

const day: THevyRoutine = {
    id: "1",
    folder_id: 0,
    order: "1",
    title: "Push",
    notes: "",
    exercises: [
        makeExercise({ builder_exercise_key: 1 }),
        makeExercise({
            index: 1,
            title: "Overhead Press (Barbell)",
            exercise_template_id: "ex-2",
            builder_exercise_key: 3,
        }),
    ],
};

function renderVisualizer(readOnly = false) {
    return render(
        <HevyExerciseVisualizer
            day={day}
            folder_id={0}
            editMode={false}
            selectedExercises={[]}
            toggleExerciseSelection={() => undefined}
            removeFromSuperset={() => undefined}
            readOnly={readOnly}
        />,
    );
}

describe("HevyExerciseVisualizer Proposal mark gutter", () => {
    beforeEach(() => {
        proposalMarkKeys.clear();
    });

    afterEach(() => {
        cleanup();
        proposalMarkKeys.clear();
    });

    it("reserves a gutter on every row and hashes only the marked one", () => {
        proposalMarkKeys.add(3);
        renderVisualizer();

        const gutters = screen.getAllByTestId("proposal-mark-gutter");
        expect(gutters).toHaveLength(2);
        const mark = screen.getByLabelText("Proposal mark");
        const markedGutter = mark.closest("[data-testid='proposal-mark-gutter']");
        expect(markedGutter).toBeTruthy();
        expect(markedGutter?.parentElement?.textContent).toContain("Overhead Press (Barbell)");
        expect(markedGutter?.parentElement?.className).toMatch(/bg-(white|extraLightGray)/);
        expect(screen.getByText("Overhead Press (Barbell)").previousElementSibling?.getAttribute("aria-label")).not.toBe(
            "Proposal mark",
        );
    });

    it("collapses the gutter when no Proposal marks are live", () => {
        renderVisualizer();

        expect(screen.queryByTestId("proposal-mark-gutter")).toBeNull();
        expect(screen.queryByLabelText("Proposal mark")).toBeNull();
    });

    it("does not paint a gutter on read-only rows", () => {
        proposalMarkKeys.add(3);
        renderVisualizer(true);

        expect(screen.queryByTestId("proposal-mark-gutter")).toBeNull();
        expect(screen.queryByLabelText("Proposal mark")).toBeNull();
    });
});
