/**
 * Empty Hevy-folder Week preview slot (ADR 0013 / C4).
 */
import { describe, it, expect, afterEach } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { WeekPreviewSlot } from "../ProgramOverviewWeekPreview";
import {
    EMPTY_IN_HEVY_FOLDER_EXPLAINER,
    EMPTY_IN_HEVY_FOLDER_TITLE,
} from "../WeekPreviewSources";

describe("WeekPreviewSlot empty Hevy folder", () => {
    afterEach(() => {
        cleanup();
    });

    it("shows an explainer empty state with the In Hevy badge", () => {
        render(
            <WeekPreviewSlot
                slot={{
                    source: "In Hevy",
                    routine: null,
                    emptyCopy: EMPTY_IN_HEVY_FOLDER_TITLE,
                }}
                nthWeek={1}
                hevyExercises={undefined}
            />,
        );

        expect(screen.getByText("In Hevy")).toBeTruthy();
        expect(screen.getByText(EMPTY_IN_HEVY_FOLDER_TITLE)).toBeTruthy();
        expect(screen.getByText(EMPTY_IN_HEVY_FOLDER_EXPLAINER)).toBeTruthy();
    });

    it("keeps Planned vs completed empty halves as short copy", () => {
        render(
            <WeekPreviewSlot
                slot={{
                    source: "Completed",
                    routine: null,
                    emptyCopy: "Not logged",
                }}
                nthWeek={1}
                hevyExercises={undefined}
            />,
        );

        expect(screen.getByText("Completed")).toBeTruthy();
        expect(screen.getByText("Not logged")).toBeTruthy();
        expect(screen.queryByText(EMPTY_IN_HEVY_FOLDER_TITLE)).toBeNull();
    });

    it("sizes Not logged / Not in the plan slots to fill a pair column", () => {
        render(
            <WeekPreviewSlot
                slot={{
                    source: "Planned",
                    routine: null,
                    emptyCopy: "Not in the plan",
                }}
                nthWeek={2}
                hevyExercises={undefined}
            />,
        );

        const root = screen.getByText("Not in the plan").closest("[data-day-source]");
        expect(root?.className).toContain("flex-1");
        expect(root?.className).toContain("h-full");
        expect(root?.className).toContain("min-h-[220px]");
    });
});
