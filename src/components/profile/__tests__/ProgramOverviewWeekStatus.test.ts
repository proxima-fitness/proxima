/**
 * Unit tests for Program overview week status derivation (ADR 0010 / 02).
 */
import { describe, expect, it } from "vitest";
import {
    defaultSelectedWeek,
    deriveCompletedWeeksFromScheduleHistory,
    deriveProgramOverviewWeekStatuses,
    mergeCompletedWeeks,
    resolveSelectedWeek,
    weekStatusLabel,
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

    it("marks highest incomplete linked week as current", () => {
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

    it("treats prior linked weeks without a complete flag as complete", () => {
        // Gate invariant: week 2 cannot link unless week 1 is complete.
        expect(deriveProgramOverviewWeekStatuses(3, [1, 2], [])).toEqual([
            { week: 1, status: "complete" },
            { week: 2, status: "current" },
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

describe("deriveCompletedWeeksFromScheduleHistory", () => {
    it("requires all expected distinct days for a week", () => {
        const expected = new Map([
            [1, 3],
            [2, 2],
        ]);
        const days = [
            { nthWeek: 1, nthDay: 1 },
            { nthWeek: 1, nthDay: 2 },
            { nthWeek: 1, nthDay: 3 },
            { nthWeek: 2, nthDay: 1 },
        ];
        expect(deriveCompletedWeeksFromScheduleHistory(days, expected)).toEqual([1]);
    });

    it("dedupes repeated day rows", () => {
        const expected = new Map([[1, 2]]);
        const days = [
            { nthWeek: 1, nthDay: 1 },
            { nthWeek: 1, nthDay: 1 },
            { nthWeek: 1, nthDay: 2 },
        ];
        expect(deriveCompletedWeeksFromScheduleHistory(days, expected)).toEqual([1]);
    });

    it("skips weeks with unknown or zero expected days", () => {
        const expected = new Map([[1, 0]]);
        expect(
            deriveCompletedWeeksFromScheduleHistory([{ nthWeek: 1, nthDay: 1 }], expected),
        ).toEqual([]);
    });
});

describe("mergeCompletedWeeks", () => {
    it("unions and sorts", () => {
        expect(mergeCompletedWeeks([2, 1], [3, 1])).toEqual([1, 2, 3]);
    });
});

describe("weekStatusLabel", () => {
    it("returns display labels", () => {
        expect(weekStatusLabel("not_exported")).toBe("Not exported");
        expect(weekStatusLabel("current")).toBe("Current");
        expect(weekStatusLabel("complete")).toBe("Complete");
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
