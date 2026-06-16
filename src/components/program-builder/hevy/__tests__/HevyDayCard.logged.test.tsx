import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { HevyDayCard } from "../HevyDayCard";
import { mapBackedUpWorkoutToHevyRoutine, PREVIEW_MAX_EXERCISES } from "@/api/workout-history-read";
import {
    backedUpWorkoutFixture,
    backedUpWorkoutWithManyExercisesFixture,
} from "@/api/__tests__/manual/backed-up-workout.fixture";

vi.mock("next-themes", () => ({
    useTheme: () => ({ resolvedTheme: "light" }),
}));

vi.mock("@/contexts/PoundsOrKgContext", () => ({
    usePoundsOrKgContext: () => ({ isInLbs: true }),
}));

vi.mock("@/contexts/ProgramMutationContext", () => ({
    useProgramMutation: () => ({ isAgentStreaming: false }),
    useIsAgentStreaming: () => false,
}));

vi.mock("@/hooks/use-media-query", () => ({
    useMediaQuery: () => false,
}));

vi.mock("framer-motion", () => ({
    motion: {
        div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
            <div {...props}>{children}</div>
        ),
    },
}));

vi.mock("../HevyExerciseGif", () => ({
    HevyExerciseGif: () => <span data-testid="exercise-gif" />,
}));

describe("HevyDayCard read-only variant", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanup();
    });

    it("renders title, date, duration, and exercises without builder chrome", () => {
        const day = mapBackedUpWorkoutToHevyRoutine(backedUpWorkoutFixture);

        render(<HevyDayCard variant="read-only" day={day} />);

        expect(screen.getByText("Upper Power")).toBeTruthy();
        expect(screen.getByText("Jun 10, 2024")).toBeTruthy();
        expect(screen.getByText("1h 15m")).toBeTruthy();
        expect(screen.getByText("Bench Press (Barbell)")).toBeTruthy();
        expect(screen.getByText("Overhead Press (Barbell)")).toBeTruthy();
        expect(screen.queryByText(/Day \d/)).toBeNull();
        expect(screen.queryByRole("button", { name: /Add exercise/i })).toBeNull();
        expect(screen.queryByRole("button", { name: /Create superset/i })).toBeNull();
    });

    it("shows See more exercises when preview is capped", () => {
        const fullWorkout = backedUpWorkoutWithManyExercisesFixture();
        const day = mapBackedUpWorkoutToHevyRoutine(fullWorkout, {
            previewMaxExercises: PREVIEW_MAX_EXERCISES,
        });
        const totalExerciseCount = fullWorkout.workout_exercises?.length ?? 0;

        const { container } = render(
            <HevyDayCard
                variant="read-only"
                day={day}
                totalExerciseCount={totalExerciseCount}
                workoutId={day.id}
            />,
        );

        const seeMore = screen.getByRole("link", { name: /See more exercises/i });
        expect(seeMore.getAttribute("href")).toBe(`/workout/${day.id}`);
        expect(within(container).getAllByTestId("exercise-gif")).toHaveLength(PREVIEW_MAX_EXERCISES);
    });

    it("wraps exercises with notes in hover tooltips and shows superset label when mapped", () => {
        const day = mapBackedUpWorkoutToHevyRoutine(backedUpWorkoutFixture);

        render(<HevyDayCard variant="read-only" day={day} />);

        expect(screen.getAllByText("Superset 1").length).toBeGreaterThanOrEqual(1);
        expect(screen.queryAllByLabelText("Exercise details")).toHaveLength(0);
    });
});
