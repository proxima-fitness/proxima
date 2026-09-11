/**
 * Compact mobile Week preview exercise list (layout v3 under md).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProgramOverviewMobileDayList } from "../ProgramOverviewMobileDayList";
import {
    EMPTY_IN_HEVY_FOLDER_EXPLAINER,
    EMPTY_IN_HEVY_FOLDER_TITLE,
} from "../WeekPreviewSources";

vi.mock("@/components/program-builder/hevy/HevyExerciseGif", () => ({
    HevyExerciseGif: () => <span data-testid="exercise-gif" />,
}));

vi.mock("@/components/program-builder/hevy/HevyExerciseDetailsDialog", () => ({
    HevyExerciseDetailsDialog: ({
        isOpen,
        exercise,
    }: {
        isOpen: boolean;
        exercise: THevyExerciseTemplate | undefined;
    }) =>
        isOpen ? (
            <div role="dialog" aria-label={exercise?.title ?? "Exercise details"}>
                details
            </div>
        ) : null,
}));

function makeSet(reps: number, start: number, end: number): THevySets {
    return {
        type: "normal",
        weight_kg: null,
        reps,
        distance_meters: null,
        duration_seconds: null,
        custom_metric: null,
        rpe: null,
        rep_range: { start, end },
    };
}

function makeExercise(title: string, index: number): THevyExercise {
    return {
        index,
        title,
        notes: "",
        rest_seconds: null,
        exercise_template_id: `t-${index}`,
        supersets_id: null,
        sets: [makeSet(10, 8, 12), makeSet(10, 8, 12), makeSet(10, 8, 12), makeSet(10, 8, 12)],
    };
}

function makeRoutine(title: string, exerciseTitles: string[]): THevyRoutine {
    return {
        id: "day-1",
        title,
        folder_id: 0,
        notes: "",
        order: "1",
        exercises: exerciseTitles.map((name, i) => makeExercise(name, i)),
    };
}

const hevyExercises: THevyExerciseTemplate[] = [
    {
        id: "t-0",
        title: "Bench press (barbell)",
        type: "weight_reps",
        primary_muscle_group: "chest",
        secondary_muscle_groups: [],
        is_custom: false,
        gif_id: "gif-0",
        instructions: ["Step 1"],
    } as THevyExerciseTemplate,
];

describe("ProgramOverviewMobileDayList", () => {
    afterEach(() => {
        cleanup();
    });

    it("shows the first three exercises and a +N more control", () => {
        render(
            <ProgramOverviewMobileDayList
                slots={[
                    {
                        source: "Planned",
                        routine: makeRoutine("Push day", [
                            "Bench press (barbell)",
                            "Incline bench press (dumbbell)",
                            "Triceps pushdown",
                            "Lateral raise",
                            "Cable fly",
                            "Overhead extension",
                        ]),
                        emptyCopy: null,
                    },
                ]}
                hevyExercises={hevyExercises}
            />,
        );

        expect(screen.getByText("Bench press (barbell)")).toBeTruthy();
        expect(screen.getByText("Incline bench press (dumbbell)")).toBeTruthy();
        expect(screen.getByText("Triceps pushdown")).toBeTruthy();
        expect(screen.queryByText("Lateral raise")).toBeNull();
        expect(screen.getByRole("button", { name: "+3 more exercises" })).toBeTruthy();
        expect(screen.getAllByText("4 sets · 8-12 reps").length).toBeGreaterThan(0);
    });

    it("expands when +N more is clicked", () => {
        render(
            <ProgramOverviewMobileDayList
                slots={[
                    {
                        source: "Planned",
                        routine: makeRoutine("Push day", [
                            "A",
                            "B",
                            "C",
                            "D",
                        ]),
                        emptyCopy: null,
                    },
                ]}
                hevyExercises={undefined}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: "+1 more exercise" }));
        expect(screen.getByText("D")).toBeTruthy();
        expect(screen.queryByRole("button", { name: /\+1 more/ })).toBeNull();
    });

    it("opens exercise details on row click", () => {
        render(
            <ProgramOverviewMobileDayList
                slots={[
                    {
                        source: "Planned",
                        routine: makeRoutine("Push day", ["Bench press (barbell)"]),
                        emptyCopy: null,
                    },
                ]}
                hevyExercises={hevyExercises}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /Bench press/ }));
        expect(screen.getByRole("dialog", { name: "Bench press (barbell)" })).toBeTruthy();
    });

    it("stacks Planned vs completed with source badges", () => {
        render(
            <ProgramOverviewMobileDayList
                slots={[
                    {
                        source: "Planned",
                        routine: makeRoutine("Push", ["Bench"]),
                        emptyCopy: null,
                    },
                    {
                        source: "Completed",
                        routine: null,
                        emptyCopy: "Not logged",
                    },
                ]}
                hevyExercises={undefined}
            />,
        );

        expect(screen.getByText("Planned")).toBeTruthy();
        expect(screen.getByText("Completed")).toBeTruthy();
        expect(screen.getByText("Not logged")).toBeTruthy();
    });

    it("shows empty Hevy folder explainer", () => {
        render(
            <ProgramOverviewMobileDayList
                slots={[
                    {
                        source: "In Hevy",
                        routine: null,
                        emptyCopy: EMPTY_IN_HEVY_FOLDER_TITLE,
                    },
                ]}
                hevyExercises={undefined}
            />,
        );

        expect(screen.getByText(EMPTY_IN_HEVY_FOLDER_TITLE)).toBeTruthy();
        expect(screen.getByText(EMPTY_IN_HEVY_FOLDER_EXPLAINER)).toBeTruthy();
    });
});
