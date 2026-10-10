// SPDX-License-Identifier: AGPL-3.0-only

import { describe, expect, it } from "vitest";
import {
    buildSundayStartCalendarGrid,
    formatLocalDateKey,
    getLocalDateKey,
    getLocalMonthUtcBounds,
    groupWorkoutsByLocalDate,
} from "../workout-history-calendar";

describe("getLocalMonthUtcBounds", () => {
    it("returns UTC bounds for a local month using timezone offset", () => {
        const bounds = getLocalMonthUtcBounds(2026, 5, 240);

        expect(bounds.startIso).toBe("2026-05-01T04:00:00.000Z");
        expect(bounds.endIso).toBe("2026-06-01T04:00:00.000Z");
    });
});

describe("getLocalDateKey", () => {
    it("uses the local calendar date for an ISO timestamp", () => {
        expect(getLocalDateKey("2026-05-04T15:30:00.000Z")).toBe(
            formatLocalDateKey(
                new Date("2026-05-04T15:30:00.000Z").getFullYear(),
                new Date("2026-05-04T15:30:00.000Z").getMonth() + 1,
                new Date("2026-05-04T15:30:00.000Z").getDate(),
            ),
        );
    });
});

describe("buildSundayStartCalendarGrid", () => {
    it("starts weeks on Sunday and includes 42 cells", () => {
        const grid = buildSundayStartCalendarGrid(2026, 5);

        expect(grid).toHaveLength(42);
        expect(grid[0].localDateKey).toBe("2026-04-26");
        expect(grid.find((cell) => cell.localDateKey === "2026-05-01")?.isCurrentMonth).toBe(true);
        expect(grid.at(-1)?.localDateKey).toBe("2026-06-06");
    });
});

describe("groupWorkoutsByLocalDate", () => {
    it("groups multiple workouts on the same local day newest-first", () => {
        const grouped = groupWorkoutsByLocalDate([
            {
                id: "a",
                title: "Morning",
                started_at: "2026-05-04T10:00:00.000Z",
                ended_at: "2026-05-04T11:00:00.000Z",
            },
            {
                id: "b",
                title: "Evening",
                started_at: "2026-05-04T22:00:00.000Z",
                ended_at: "2026-05-04T23:00:00.000Z",
            },
        ]);

        const dayKey = getLocalDateKey("2026-05-04T22:00:00.000Z");
        expect(grouped.get(dayKey)?.map((workout) => workout.id)).toEqual(["b", "a"]);
    });

    it("returns an empty map for no workouts", () => {
        expect(groupWorkoutsByLocalDate([]).size).toBe(0);
    });
});
