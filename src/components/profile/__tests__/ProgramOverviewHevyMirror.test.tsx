/**
 * Hevy mirror subsection (ADR 0020 / 04).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { TProgramHevyWeekLink } from "@/api/program-hevy-links";

const navigateToEdit = vi.fn();

vi.mock("@/hooks/useNavigateToEditHevyProgram", () => ({
    useNavigateToEditHevyProgram: () => navigateToEdit,
}));

import {
    ProgramOverviewHevyMirror,
    buildMirrorFolders,
    partitionMirrorFolders,
} from "../ProgramOverviewHevyMirror";

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

describe("partitionMirrorFolders", () => {
    it("keeps Current primary and everything else secondary", () => {
        const folders = buildMirrorFolders(
            [makeHevyProgram(10, "Week 1"), makeHevyProgram(20, "Week 2"), makeHevyProgram(30, "Other")],
            [
                makeLink({ nth_week: 1, hevy_folder_id: 10 }),
                makeLink({ nth_week: 2, hevy_folder_id: 20 }),
            ],
            [1],
            false,
        );
        const { primary, secondary } = partitionMirrorFolders(folders);
        expect(primary).toHaveLength(1);
        expect(primary[0]?.folderId).toBe(20);
        expect(secondary.map((f) => f.folderId)).toEqual([10, 30]);
    });
});

describe("ProgramOverviewHevyMirror", () => {
    beforeEach(() => {
        navigateToEdit.mockReset();
        navigateToEdit.mockResolvedValue(undefined);
    });

    afterEach(() => {
        cleanup();
    });

    it("renders In Hevy heading — never My Hevy Programs or Hevy mirror", () => {
        render(
            <ProgramOverviewHevyMirror
                links={[makeLink({ nth_week: 1, hevy_folder_id: 10 })]}
                hevyPrograms={[makeHevyProgram(10, "Week 1 - Strength")]}
            />,
        );

        expect(screen.getByRole("heading", { name: "In Hevy" })).toBeTruthy();
        expect(screen.queryByText("My Hevy Programs")).toBeNull();
        expect(screen.queryByText("Hevy mirror")).toBeNull();
    });

    it("uses full width — no max-w-md centering", () => {
        const { container } = render(
            <ProgramOverviewHevyMirror
                links={[makeLink({ nth_week: 1, hevy_folder_id: 10 })]}
                hevyPrograms={[makeHevyProgram(10, "Week 1 - Strength")]}
            />,
        );

        const root = container.firstElementChild;
        expect(root?.className).toContain("w-full");
        expect(root?.className).not.toContain("max-w-md");
        expect(root?.className).not.toContain("mx-auto");
    });

    it("shows Current week copy primary and calls Edit handoff", async () => {
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
        expect(screen.queryByText("Week 1 - Strength")).toBeNull();
        fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
        expect(navigateToEdit).toHaveBeenCalledWith(current, {});
    });

    it("scopes a live linked row to Edit current week, passing link routine ids", () => {
        // ADR 0013 / 01 — linked folder hands off program + week + day order.
        const current = makeHevyProgram(20, "Week 2 - Strength");
        render(
            <ProgramOverviewHevyMirror
                programId={7}
                links={[
                    makeLink({ nth_week: 1, hevy_folder_id: 10 }),
                    makeLink({ nth_week: 2, hevy_folder_id: 20, hevy_routine_ids: ["r1", "r2"] }),
                ]}
                completedWeeks={[1]}
                hevyPrograms={[makeHevyProgram(10, "Week 1 - Strength"), current]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
        expect(navigateToEdit).toHaveBeenCalledWith(current, {
            programId: 7,
            nthWeek: 2,
            hevyRoutineIds: ["r1", "r2"],
        });
    });

    it("does not scope a Week complete row — that folder is history", () => {
        // Editing a completed week's folder is a plain Hevy-scope edit; claiming
        // program + week would make it look like Edit current week.
        const completed = makeHevyProgram(10, "Week 1 - Strength");
        render(
            <ProgramOverviewHevyMirror
                programId={7}
                links={[makeLink({ nth_week: 1, hevy_folder_id: 10 })]}
                completedWeeks={[1]}
                hevyPrograms={[completed]}
            />,
        );

        // No incomplete linked week → no Current row, so it sits behind the disclosure.
        fireEvent.click(screen.getByRole("button", { name: /Expand other weeks/i }));
        fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
        expect(navigateToEdit).toHaveBeenCalledWith(completed, {});
    });

    it("keeps other folders behind a collapsed disclosure", () => {
        render(
            <ProgramOverviewHevyMirror
                links={[
                    makeLink({ nth_week: 1, hevy_folder_id: 10 }),
                    makeLink({ nth_week: 2, hevy_folder_id: 20 }),
                ]}
                completedWeeks={[1]}
                hevyPrograms={[
                    makeHevyProgram(10, "Week 1 - Strength"),
                    makeHevyProgram(20, "Week 2 - Strength"),
                    makeHevyProgram(30, "Extra Split"),
                ]}
            />,
        );

        expect(screen.getByText("Week 2 - Strength")).toBeTruthy();
        expect(screen.queryByText("Week 1 - Strength")).toBeNull();
        expect(screen.queryByText("Extra Split")).toBeNull();

        fireEvent.click(
            screen.getByRole("button", { name: /Expand other weeks in Hevy/i }),
        );

        expect(screen.getByText("Week 1 - Strength")).toBeTruthy();
        expect(screen.getByText("Extra Split")).toBeTruthy();
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
        expect(screen.queryByRole("button", { name: /other weeks in Hevy/i })).toBeNull();
    });

    it("shows empty linked-state copy when no Hevy folders", () => {
        render(<ProgramOverviewHevyMirror links={[]} hevyPrograms={[]} />);

        expect(
            screen.getByText(/Week Export creates this program's Hevy week copy here/i),
        ).toBeTruthy();
    });
});
