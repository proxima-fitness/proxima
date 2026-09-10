/**
 * Toolbar persist dispatch + Day complete identity (ADR 0013 / 04).
 */
import { describe, expect, it } from "vitest";
import {
    completedHevyRoutineIdsForWeek,
    isHevyEditArrival,
    mutationTargetsCompletedDay,
    persistModeForBuilder,
} from "../edit-persist";

const HEVY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const HEVY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function day(overrides: Partial<THevyRoutine> = {}): THevyRoutine {
    return {
        id: "1",
        folder_id: 0,
        order: "1",
        title: "Push",
        notes: "",
        exercises: [],
        hevyRoutineId: HEVY_A,
        ...overrides,
    };
}

describe("isHevyEditArrival", () => {
    it("is true only for edit=true and hevy=true", () => {
        expect(isHevyEditArrival(new URLSearchParams("edit=true&hevy=true"))).toBe(true);
        expect(isHevyEditArrival(new URLSearchParams("edit=true"))).toBe(false);
        expect(isHevyEditArrival(new URLSearchParams())).toBe(false);
    });
});

describe("persistModeForBuilder", () => {
    it("is Sync when an Edit session is present", () => {
        expect(persistModeForBuilder({ hasEditSession: true, isHevyEditArrival: false })).toBe(
            "sync",
        );
    });

    it("is Sync on Edit current week / Hevy-only URL even before session hydrates", () => {
        expect(persistModeForBuilder({ hasEditSession: false, isHevyEditArrival: true })).toBe(
            "sync",
        );
    });

    it("is Save on New path", () => {
        expect(persistModeForBuilder({ hasEditSession: false, isHevyEditArrival: false })).toBe(
            "save",
        );
    });
});

describe("completedHevyRoutineIdsForWeek", () => {
    it("intersects this week's linked IDs with workout routine IDs", () => {
        expect(
            completedHevyRoutineIdsForWeek({
                nthWeek: 3,
                initialRoutineIds: [HEVY_A, HEVY_B],
                workoutRoutineIds: [HEVY_A, "unrelated-routine"],
            }),
        ).toEqual([HEVY_A]);
    });

    it("keeps link order when several days are complete", () => {
        expect(
            completedHevyRoutineIdsForWeek({
                nthWeek: 1,
                initialRoutineIds: [HEVY_A, HEVY_B],
                workoutRoutineIds: [HEVY_B, HEVY_A],
            }),
        ).toEqual([HEVY_A, HEVY_B]);
    });

    it("returns nothing for Hevy-only (no week)", () => {
        expect(
            completedHevyRoutineIdsForWeek({
                nthWeek: null,
                initialRoutineIds: [HEVY_A],
                workoutRoutineIds: [HEVY_A],
            }),
        ).toEqual([]);
    });
});

describe("mutationTargetsCompletedDay", () => {
    it("is true when dayOrder is a Day complete day", () => {
        expect(
            mutationTargetsCompletedDay(
                [day()],
                { folderIds: [0], dayOrder: 1, title: "Nope" },
                [HEVY_A],
            ),
        ).toBe(true);
    });

    it("is false for add-day (no day target)", () => {
        expect(
            mutationTargetsCompletedDay([day()], { folderIds: [0] }, [HEVY_A]),
        ).toBe(false);
    });
});
