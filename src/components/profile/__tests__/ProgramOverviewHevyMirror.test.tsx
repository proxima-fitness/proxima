/**
 * Hevy mirror subsection (ADR 0010 / 04).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { TProgramHevyWeekLink } from "@/api/program-hevy-links";

const navigateToEdit = vi.fn();

vi.mock("@/hooks/useNavigateToEditHevyProgram", () => ({
    useNavigateToEditHevyProgram: () => navigateToEdit,
}));

import { ProgramOverviewHevyMirror } from "../ProgramOverviewHevyMirror";

function makeRoutine(folderId: number, title: string): THevyRoutine {
    return {
        id: `r-${folderId}-${title}`,
        title,
        folder_id: folderId,
        notes: "",
        exercises: [],
    };
}

function makeHevyProgram(folderId: number, title: string, routineCount = 2): THevyProgramItem {
    return {
        program_title: title,
        program: Array.from({ length: routineCount }, (_, i) =>
            makeRoutine(folderId, `Day ${i + 1}`),
        ),
    };
}

function makeLink(
    overrides: Partial<TProgramHevyWeekLink> & Pick<TProgramHevyWeekLink, "nth_week" | "hevy_folder_id">,
): TProgramHevyWeekLink {
    return {
        id: overrides.id ?? `link-${overrides.nth_week}`,
        user_id: "user-1",
        program_id: 11,
        nth_week: overrides.nth_week,
        hevy_folder_id: overrides.hevy_folder_id,
        hevy_routine_ids: overrides.hevy_routine_ids ?? ["a"],
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
    };
}

describe("ProgramOverviewHevyMirror", () => {
    beforeEach(() => {
        navigateToEdit.mockReset();
        navigateToEdit.mockResolvedValue(undefined);
    });

    afterEach(() => {
        cleanup();
    });

    it("renders Hevy mirror heading — never My Hevy Programs", () => {
        render(
            <ProgramOverviewHevyMirror
                links={[makeLink({ nth_week: 1, hevy_folder_id: 10 })]}
                hevyPrograms={[makeHevyProgram(10, "Week 1 - Strength")]}
            />,
        );

        expect(screen.getByRole("heading", { name: "Hevy mirror" })).toBeTruthy();
        expect(screen.queryByText("My Hevy Programs")).toBeNull();
    });

    it("highlights current week copy and calls Edit handoff", async () => {
        const current = makeHevyProgram(20, "Week 2 - Strength");
        render(
            <ProgramOverviewHevyMirror
                links={[
                    makeLink({ nth_week: 1, hevy_folder_id: 10 }),
                    makeLink({ nth_week: 2, hevy_folder_id: 20 }),
                ]}
                completedWeeks={[1]}
                hevyPrograms={[makeHevyProgram(10, "Week 1 - Strength"), current]}
            />,
        );

        expect(screen.getByText(/Week 2 · Current/)).toBeTruthy();
        fireEvent.click(screen.getAllByRole("button", { name: /Edit/i })[0]!);
        expect(navigateToEdit).toHaveBeenCalledWith(current);
    });

    it("lists Hevy-only folders when hevyOnly", () => {
        render(
            <ProgramOverviewHevyMirror
                hevyOnly
                hevyPrograms={[makeHevyProgram(99, "Custom Split")]}
            />,
        );

        expect(screen.getByText("Custom Split")).toBeTruthy();
        expect(screen.getByText(/2 routines/)).toBeTruthy();
    });

    it("shows empty linked-state copy when no Hevy folders", () => {
        render(<ProgramOverviewHevyMirror links={[]} hevyPrograms={[]} />);

        expect(
            screen.getByText(/Week Export creates this program's Hevy week copy here/i),
        ).toBeTruthy();
    });
});
