/**
 * Unit tests for Program overview week status derivation (ADR 0010 / 02).
 */
import { describe, expect, it } from "vitest";
import {
    defaultSelectedWeek,
    deriveCompletedWeeksFromLinks,
    deriveCompletedWeeksFromWorkoutRoutineIds,
    deriveEffectiveCompletedWeeks,
    deriveProgramOverviewWeekStatuses,
    findHevyProgramForWeek,
    mergeCompletedWeeks,
    missingHevyFolderWeeks,
    resolveSelectedWeek,
    weekStatusLabel,
    weeksNeedingAutoMark,
    weeksNeedingUncomplete,
} from "../ProgramOverviewWeekStatus";

describe("deriveProgramOverviewWeekStatuses", () => {
    it("returns empty when program length is invalid", () => {
        expect(deriveProgramOverviewWeekStatuses(0, [1], [])).toEqual([]);
        expect(deriveProgramOverviewWeekStatuses(-1, [1], [])).toEqual([]);
        expect(deriveProgramOverviewWeekStatuses(1.5, [1], [])).toEqual([]);
    });

    it("marks all weeks not exported when nothing is linked", () => {
        expect(deriveProgramOverviewWeekStatuses(3, [], [])).toEqual([
            { week: 1, status: "not_exported" },
            { week: 2, status: "not_exported" },
            { week: 3, status: "not_exported" },
        ]);
    });

    it("marks earliest incomplete linked week as current", () => {
        expect(deriveProgramOverviewWeekStatuses(4, [1], [])).toEqual([
            { week: 1, status: "current" },
            { week: 2, status: "not_exported" },
            { week: 3, status: "not_exported" },
            { week: 4, status: "not_exported" },
        ]);
    });

    it("marks completed weeks and advances current to next linked", () => {
        expect(deriveProgramOverviewWeekStatuses(4, [1, 2], [1])).toEqual([
            { week: 1, status: "complete" },
            { week: 2, status: "current" },
            { week: 3, status: "not_exported" },
            { week: 4, status: "not_exported" },
        ]);
    });

    it("shows no current when every linked week is complete", () => {
        expect(deriveProgramOverviewWeekStatuses(3, [1, 2], [1, 2])).toEqual([
            { week: 1, status: "complete" },
            { week: 2, status: "complete" },
            { week: 3, status: "not_exported" },
        ]);
    });

    it("keeps later linked incomplete weeks exported when an earlier week reopens", () => {
        expect(deriveProgramOverviewWeekStatuses(3, [1, 2], [])).toEqual([
            { week: 1, status: "current" },
            { week: 2, status: "exported" },
            { week: 3, status: "not_exported" },
        ]);
    });

    it("ignores linked/completed weeks outside program length", () => {
        expect(deriveProgramOverviewWeekStatuses(2, [1, 9], [9])).toEqual([
            { week: 1, status: "current" },
            { week: 2, status: "not_exported" },
        ]);
    });
});

describe("deriveCompletedWeeksFromWorkoutRoutineIds", () => {
    it("requires every linked routine id to have a matching Workout", () => {
        const links = [
            { nth_week: 1, hevy_routine_ids: ["a", "b", "c"] },
            { nth_week: 2, hevy_routine_ids: ["d", "e"] },
        ];
        expect(deriveCompletedWeeksFromWorkoutRoutineIds(links, ["a", "b", "c"])).toEqual([1]);
    });

    it("does not complete a week from a day-count alone", () => {
        // Two workouts exist, but they are not this week's linked IDs.
        const links = [{ nth_week: 1, hevy_routine_ids: ["a", "b"] }];
        expect(deriveCompletedWeeksFromWorkoutRoutineIds(links, ["x", "y"])).toEqual([]);
    });

    it("skips weeks with no linked routine ids", () => {
        const links = [{ nth_week: 1, hevy_routine_ids: [] }];
        expect(deriveCompletedWeeksFromWorkoutRoutineIds(links, ["a"])).toEqual([]);
    });
});

describe("deriveCompletedWeeksFromLinks", () => {
    it("returns weeks with completed_at set", () => {
        expect(
            deriveCompletedWeeksFromLinks([
                { nth_week: 2, completed_at: "2026-07-25T12:00:00Z" },
                { nth_week: 1, completed_at: null },
                { nth_week: 3, completed_at: "2026-07-26T12:00:00Z" },
            ]),
        ).toEqual([2, 3]);
    });

    it("returns empty when nothing complete", () => {
        expect(
            deriveCompletedWeeksFromLinks([{ nth_week: 1, completed_at: null }]),
        ).toEqual([]);
    });
});

describe("mergeCompletedWeeks", () => {
    it("unions and sorts", () => {
        expect(mergeCompletedWeeks([2, 1], [3, 1])).toEqual([1, 2, 3]);
    });
});

describe("deriveEffectiveCompletedWeeks", () => {
    const links = [
        {
            nth_week: 1,
            completed_at: "2026-09-01T00:00:00Z",
            hevy_routine_ids: ["a", "b"],
            exported_hevy_routine_ids: ["a", "b"],
        },
        {
            nth_week: 2,
            completed_at: null,
            hevy_routine_ids: ["c"],
            exported_hevy_routine_ids: ["c"],
        },
    ];

    it("keeps persisted complete when matching Workouts remain", () => {
        expect(deriveEffectiveCompletedWeeks(links, ["a"])).toEqual([1]);
    });

    it("drops persisted complete when complete-week Workouts are gone", () => {
        expect(deriveEffectiveCompletedWeeks(links, [])).toEqual([]);
    });

    it("includes auto-complete from live routine IDs without completed_at", () => {
        expect(deriveEffectiveCompletedWeeks(links, ["c"])).toEqual([2]);
    });
});

describe("weeksNeedingUncomplete", () => {
    it("returns persisted-complete weeks with no matching Workouts", () => {
        expect(
            weeksNeedingUncomplete(
                [
                    {
                        nth_week: 1,
                        completed_at: "2026-09-01T00:00:00Z",
                        hevy_routine_ids: ["a"],
                        exported_hevy_routine_ids: ["a"],
                    },
                    {
                        nth_week: 2,
                        completed_at: "2026-09-02T00:00:00Z",
                        hevy_routine_ids: ["b"],
                        exported_hevy_routine_ids: ["b"],
                    },
                ],
                ["b"],
            ),
        ).toEqual([1]);
    });
});

describe("weeksNeedingAutoMark", () => {
    it("returns auto weeks not yet persisted", () => {
        expect(weeksNeedingAutoMark([1, 2], [1])).toEqual([2]);
        expect(weeksNeedingAutoMark([1], [1])).toEqual([]);
    });
});

describe("weekStatusLabel", () => {
    it("returns display labels", () => {
        expect(weekStatusLabel("not_exported")).toBe("Not exported");
        expect(weekStatusLabel("current")).toBe("Current");
        expect(weekStatusLabel("complete")).toBe("Complete");
        expect(weekStatusLabel("exported")).toBe("Exported");
    });
});

describe("defaultSelectedWeek", () => {
    it("returns null for empty rows", () => {
        expect(defaultSelectedWeek([])).toBeNull();
    });

    it("prefers Current week", () => {
        expect(
            defaultSelectedWeek([
                { week: 1, status: "complete" },
                { week: 2, status: "current" },
                { week: 3, status: "not_exported" },
            ]),
        ).toBe(2);
    });

    it("falls back to week 1 when no Current", () => {
        expect(
            defaultSelectedWeek([
                { week: 1, status: "not_exported" },
                { week: 2, status: "not_exported" },
            ]),
        ).toBe(1);
        expect(
            defaultSelectedWeek([
                { week: 1, status: "complete" },
                { week: 2, status: "complete" },
            ]),
        ).toBe(1);
    });
});

describe("resolveSelectedWeek", () => {
    const rows = [
        { week: 1, status: "complete" as const },
        { week: 2, status: "current" as const },
        { week: 3, status: "not_exported" as const },
    ];

    it("keeps an explicit pick still in rows", () => {
        expect(resolveSelectedWeek(3, rows)).toBe(3);
    });

    it("falls back to default when pick missing or null", () => {
        expect(resolveSelectedWeek(null, rows)).toBe(2);
        expect(resolveSelectedWeek(9, rows)).toBe(2);
    });
});

describe("findHevyProgramForWeek", () => {
    const folder = (folderId: number, title: string): THevyProgramItem => ({
        program_title: title,
        program: [{ id: `r-${folderId}`, title: "1 - Push", folder_id: folderId, notes: "", exercises: [] }],
    });

    const hevyPrograms = [folder(11, "Week 1"), folder(22, "Week 2")];
    const links = [
        { nth_week: 1, hevy_folder_id: 11 },
        { nth_week: 2, hevy_folder_id: 22 },
    ];

    it("resolves the linked folder, not the title", () => {
        // Titles are decoration; the link is the only match key (ADR 0008).
        expect(findHevyProgramForWeek(hevyPrograms, links, 2)?.program_title).toBe("Week 2");
    });

    it("returns null when the week has no link", () => {
        expect(findHevyProgramForWeek(hevyPrograms, links, 3)).toBeNull();
    });

    it("returns null when the linked folder is gone from Hevy", () => {
        expect(findHevyProgramForWeek([folder(11, "Week 1")], links, 2)).toBeNull();
    });

    it("returns null for missing week or unfetched Hevy programs", () => {
        expect(findHevyProgramForWeek(hevyPrograms, links, null)).toBeNull();
        expect(findHevyProgramForWeek(undefined, links, 1)).toBeNull();
    });
});

describe("missingHevyFolderWeeks", () => {
    const folder = (folderId: number, title: string): THevyProgramItem => ({
        program_title: title,
        program: [{ id: `r-${folderId}`, title: "1 - Push", folder_id: folderId, notes: "", exercises: [] }],
    });
    const links = [
        { nth_week: 1, hevy_folder_id: 11 },
        { nth_week: 2, hevy_folder_id: 22 },
    ];

    it("returns empty when Hevy programs have not loaded", () => {
        expect(missingHevyFolderWeeks(undefined, links, [])).toEqual([]);
    });

    it("returns incomplete linked weeks whose folder is gone", () => {
        expect(missingHevyFolderWeeks([folder(11, "Week 1")], links, [])).toEqual([2]);
    });

    it("omits Week complete weeks even if the folder is gone", () => {
        expect(missingHevyFolderWeeks([], links, [1])).toEqual([2]);
    });
});
