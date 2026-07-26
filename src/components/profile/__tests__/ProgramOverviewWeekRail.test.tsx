/**
 * Smoke tests for Program overview week rail selection (ADR 0020 / 02).
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ProgramOverviewWeekRail } from "../ProgramOverviewWeekRail";

const rows = [
    { week: 1, status: "complete" as const },
    { week: 2, status: "current" as const },
    { week: 3, status: "not_exported" as const },
];

describe("ProgramOverviewWeekRail", () => {
    afterEach(() => {
        cleanup();
    });

    it("marks the selected week and calls onSelectWeek", () => {
        const onSelectWeek = vi.fn();

        render(
            <ProgramOverviewWeekRail
                rows={rows}
                selectedWeek={2}
                onSelectWeek={onSelectWeek}
            />,
        );

        const selectedOptions = screen.getAllByRole("option", { selected: true });
        expect(selectedOptions.length).toBeGreaterThan(0);
        expect(selectedOptions[0]?.textContent).toMatch(/Week 2/);

        const week3Buttons = screen.getAllByRole("option", { name: /Week 3/i });
        fireEvent.click(week3Buttons[0]!);
        expect(onSelectWeek).toHaveBeenCalledWith(3);
    });
});
