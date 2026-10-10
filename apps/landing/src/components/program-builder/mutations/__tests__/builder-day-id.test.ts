// SPDX-License-Identifier: AGPL-3.0-only

/**
 * Builder day id minting on the Edit path (ADR 0013 / 02).
 *
 * Edit current week loads real Hevy routines, whose ids are UUIDs until the
 * arrival splits them onto `hevyRoutineId`. Anything that mints a day id from
 * `Number(id)` collides on `"NaN"` when it does not.
 */
import { describe, it, expect } from "vitest";
import { addDay, addRoutineAsDay, duplicateWeek, nextBuilderDayId } from "../handlers";

function routine(id: string, order: string, folderId = 0): THevyRoutine {
    return {
        id,
        folder_id: folderId,
        order,
        title: `Day ${order}`,
        notes: "",
        exercises: [],
    };
}

const UUID_WEEK = [
    routine("b459cba5-cd6d-463c-abb6-1f2b3c4d5e6f", "1"),
    routine("c72a1de9-11aa-4b3c-9d8e-0f1a2b3c4d5e", "2"),
];

describe("nextBuilderDayId", () => {
    it("skips non-numeric ids instead of coercing them to NaN", () => {
        expect(nextBuilderDayId(UUID_WEEK)).toBe(1);
    });

    it("continues from the highest numeric id", () => {
        expect(nextBuilderDayId([routine("1", "1"), routine("4", "2")])).toBe(5);
    });

    it("ignores non-numeric ids mixed in with numeric ones", () => {
        expect(nextBuilderDayId([routine("3", "1"), routine("not-a-number", "2")])).toBe(4);
    });

    it("starts at 1 for an empty program", () => {
        expect(nextBuilderDayId([])).toBe(1);
    });
});

describe("adding days to an Edit-loaded week", () => {
    it("mints distinct ids across repeated addDay calls", () => {
        const once = addDay(UUID_WEEK, 0);
        const twice = addDay(once, 0);

        const ids = twice.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).not.toContain("NaN");
    });

    it("mints distinct ids for addRoutineAsDay", () => {
        const once = addRoutineAsDay(UUID_WEEK, { exercises: [], title: "Pull", notes: "" }, 0);
        const twice = addRoutineAsDay(once, { exercises: [], title: "Legs", notes: "" }, 0);

        const ids = twice.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).not.toContain("NaN");
    });

    it("mints distinct ids when duplicating a week", () => {
        const duplicated = duplicateWeek(UUID_WEEK, 0, [1, 2]);

        const ids = duplicated.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
        expect(ids).not.toContain("NaN");
    });

    it("still numbers sequentially on a New-path week", () => {
        const week = [routine("1", "1"), routine("2", "2")];
        expect(addDay(week, 0).at(-1)?.id).toBe("3");
    });
});
