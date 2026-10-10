// SPDX-License-Identifier: AGPL-3.0-only

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

    it("omits Not exported and Current from the visible rail and keeps them on the accessible name", () => {
        render(
            <ProgramOverviewWeekRail
                rows={rows}
                selectedWeek={2}
                onSelectWeek={() => undefined}
            />,
        );

        const week3Buttons = screen.getAllByRole("option", { name: "Week 3, Not exported" });
        expect(week3Buttons.length).toBeGreaterThan(0);
        expect(screen.queryAllByText("Not exported")).toHaveLength(0);

        const currentButtons = screen.getAllByRole("option", { name: "Week 2, Current" });
        expect(currentButtons.length).toBeGreaterThan(0);
        expect(screen.queryAllByText("Current")).toHaveLength(0);
    });

    it("puts a status-colored dot only on the selected week", () => {
        const { rerender } = render(
            <ProgramOverviewWeekRail
                rows={[
                    ...rows,
                    { week: 4, status: "exported" },
                ]}
                selectedWeek={2}
                onSelectWeek={() => undefined}
            />,
        );

        const current = screen.getAllByRole("option", { name: /Week 2/i })[0];
        const complete = screen.getAllByRole("option", { name: /Week 1/i })[0];
        const notExported = screen.getAllByRole("option", {
            name: "Week 3, Not exported",
        })[0];

        expect(current?.querySelector("[data-week-status-dot='current']")?.className).toContain(
            "bg-lightSecondary",
        );
        expect(complete?.querySelector("[data-week-status-dot]")).toBeNull();
        expect(notExported?.querySelector("[data-week-status-dot]")).toBeNull();

        rerender(
            <ProgramOverviewWeekRail
                rows={[
                    ...rows,
                    { week: 4, status: "exported" },
                ]}
                selectedWeek={3}
                onSelectWeek={() => undefined}
            />,
        );

        const selectedNotExported = screen.getAllByRole("option", {
            name: "Week 3, Not exported",
        })[0];
        expect(
            selectedNotExported?.querySelector("[data-week-status-dot='not_exported']")
                ?.className,
        ).toContain("bg-foreground/25");
        expect(
            screen.getAllByRole("option", { name: /Week 2/i })[0]?.querySelector(
                "[data-week-status-dot]",
            ),
        ).toBeNull();
    });

    it("fades the mobile scroller when there are many weeks", () => {
        const longRows = Array.from({ length: 12 }, (_, i) => ({
            week: i + 1,
            status: (i === 0 ? "current" : "not_exported") as const,
        }));

        render(
            <ProgramOverviewWeekRail
                rows={longRows}
                selectedWeek={1}
                onSelectWeek={() => undefined}
                layout="mobile"
            />,
        );

        const scroller = document.querySelector("[data-week-rail-scroll]");
        expect(scroller?.className).toContain("mask-image");
        expect(screen.queryByRole("button", { name: /Jump to week/ })).toBeNull();
    });
});
