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
        exported_hevy_routine_ids: overrides.exported_hevy_routine_ids ?? overrides.hevy_routine_ids ?? ["a"],
        completed_at: overrides.completed_at ?? null,
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

    it("puts every Hevy-only folder under Other folders — never In Hevy", () => {
        render(
            <ProgramOverviewHevyMirror
                hevyOnly
                hevyPrograms={[makeHevyProgram(10, "Custom Split")]}
            />,
        );

        expect(screen.queryByRole("heading", { name: "In Hevy" })).toBeNull();
        expect(screen.queryByText("My Hevy Programs")).toBeNull();
        expect(screen.queryByText("Hevy mirror")).toBeNull();
        expect(screen.queryByText("Custom Split")).toBeNull();

        fireEvent.click(
            screen.getByRole("button", { name: /Expand other folders in Hevy/i }),
        );

        expect(screen.getByText("Custom Split")).toBeTruthy();
    });

    it("uses full width — no max-w-md centering", () => {
        const { container } = render(
            <ProgramOverviewHevyMirror
                hevyOnly
                hevyPrograms={[makeHevyProgram(10, "Custom Split")]}
            />,
        );

        const root = container.firstElementChild;
        expect(root?.className).toContain("w-full");
        expect(root?.className).not.toContain("max-w-md");
        expect(root?.className).not.toContain("mx-auto");
    });

    it("hides the Current week folder — Edit Week N owns that entry", () => {
        const { container } = render(
            <ProgramOverviewHevyMirror
                programId={7}
                links={[makeLink({ nth_week: 1, hevy_folder_id: 10 })]}
                hevyPrograms={[makeHevyProgram(10, "Week 1 - Strength")]}
            />,
        );

        expect(container.innerHTML).toBe("");
        expect(screen.queryByText("Week 1 - Strength")).toBeNull();
        expect(screen.queryByRole("heading", { name: "In Hevy" })).toBeNull();
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

        expect(screen.queryByText("Week 2 - Strength")).toBeNull();
        expect(screen.queryByText("Week 1 - Strength")).toBeNull();
        expect(screen.queryByText("Extra Split")).toBeNull();

        fireEvent.click(
            screen.getByRole("button", { name: /Expand other folders in Hevy/i }),
        );

        expect(screen.getByText("Week 1 - Strength")).toBeTruthy();
        expect(screen.getByText("Extra Split")).toBeTruthy();
        expect(screen.queryByText("Week 2 - Strength")).toBeNull();
    });

    it("does not scope a Week complete row — that folder is history", () => {
        const completed = makeHevyProgram(10, "Week 1 - Strength");
        render(
            <ProgramOverviewHevyMirror
                programId={7}
                links={[makeLink({ nth_week: 1, hevy_folder_id: 10 })]}
                completedWeeks={[1]}
                hevyPrograms={[completed]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /Expand other folders in Hevy/i }));
        fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
        expect(navigateToEdit).toHaveBeenCalledWith(completed, {});
    });

    it("scopes a live linked Other-folders row that is not Current week", () => {
        const prior = makeHevyProgram(10, "Week 1 - Strength");
        render(
            <ProgramOverviewHevyMirror
                programId={7}
                links={[
                    makeLink({ nth_week: 1, hevy_folder_id: 10, hevy_routine_ids: ["r1"] }),
                    makeLink({ nth_week: 2, hevy_folder_id: 20 }),
                ]}
                completedWeeks={[]}
                hevyPrograms={[prior, makeHevyProgram(20, "Week 2 - Strength")]}
            />,
        );

        fireEvent.click(screen.getByRole("button", { name: /Expand other folders in Hevy/i }));
        fireEvent.click(screen.getByRole("button", { name: /Edit/i }));
        expect(navigateToEdit).toHaveBeenCalledWith(prior, {
            programId: 7,
            nthWeek: 1,
            hevyRoutineIds: ["r1"],
        });
    });

    it("lists Hevy-only folders under Other folders when hevyOnly", () => {
        render(
            <ProgramOverviewHevyMirror
                hevyOnly
                hevyPrograms={[makeHevyProgram(99, "Custom Split")]}
            />,
        );

        fireEvent.click(
            screen.getByRole("button", { name: /Expand other folders in Hevy/i }),
        );

        expect(screen.getByText("Custom Split")).toBeTruthy();
        expect(screen.getByText(/2 routines/)).toBeTruthy();
    });

    it("hides when a linked program has no other Hevy folders", () => {
        const { container } = render(
            <ProgramOverviewHevyMirror links={[]} hevyPrograms={[]} />,
        );

        expect(container.innerHTML).toBe("");
        expect(
            screen.queryByText(/Week Export creates this program's Hevy week copy here/i),
        ).toBeNull();
    });
});
